import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health check endpoint — verifica se o sistema tá rodando.
 * Usado por: EasyPanel, Uptime Robot, cron monitoring.
 * 
 * GET /api/health
 * Retorna: { status, timestamp, db, evolution, uptime }
 */
export async function GET() {
    const checks: Record<string, any> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
    }

    // Check DB
    try {
        await prisma.$queryRaw`SELECT 1`
        checks.db = 'ok'
    } catch {
        checks.db = 'error'
        checks.status = 'degraded'
    }

    // Check Evolution API
    try {
        const evoUrl = process.env.EVOLUTION_API_URL
        if (evoUrl) {
            const res = await fetch(`${evoUrl}/instance/fetchInstances`, {
                headers: { 'apikey': process.env.EVOLUTION_API_KEY || '' },
                signal: AbortSignal.timeout(5000),
            })
            checks.evolution = res.ok ? 'ok' : `error (${res.status})`
        } else {
            checks.evolution = 'not_configured'
        }
    } catch {
        checks.evolution = 'unreachable'
        checks.status = 'degraded'
    }

    // Métricas rápidas
    try {
        const [totalClinicas, clinicasAtivas] = await Promise.all([
            prisma.clinica.count(),
            prisma.clinica.count({ where: { status: 'ativo' } }),
        ])
        checks.clinicas = { total: totalClinicas, ativas: clinicasAtivas }
    } catch {
        checks.clinicas = 'error'
    }

    const statusCode = checks.status === 'ok' ? 200 : 503
    return NextResponse.json(checks, { status: statusCode })
}
