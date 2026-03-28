// ============================================
// WEBHOOK GUARDIAN — Cron Self-Healing
// ============================================
// Roda a cada 5 minutos via EasyPanel cron ou Uptime Robot.
// Verifica TODAS as instâncias ativas e corrige webhooks quebrados.
//
// GET /api/cron/webhook-guardian
//
// Este é o coração da resiliência do sistema.
// Se a Evolution reiniciar, se o deploy resetar configs,
// se qualquer coisa acontecer — o Guardian corrige em até 5 minutos.

import { NextResponse } from 'next/server'
import { ensureAllWebhooks } from '@/lib/engine/webhook-sync'

// Proteger com secret para não ser chamado por qualquer um
const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: Request) {
    // Verificar secret (se configurado)
    if (CRON_SECRET) {
        const { searchParams } = new URL(request.url)
        const secret = searchParams.get('secret')
        if (secret !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    try {
        console.log('[Guardian] 🛡️ Iniciando verificação de webhooks...')

        const report = await ensureAllWebhooks()

        // Log resumo
        if (report.totalFixed > 0) {
            console.log(`[Guardian] 🔧 ${report.totalFixed} webhook(s) CORRIGIDO(s) de ${report.totalChecked} verificados`)
        } else if (report.totalErrors > 0) {
            console.log(`[Guardian] ⚠️ ${report.totalErrors} erro(s) de ${report.totalChecked} verificados`)
        } else {
            console.log(`[Guardian] ✅ Todos ${report.totalChecked} webhook(s) estão OK`)
        }

        // Salvar log no banco para auditoria
        try {
            const { prisma } = await import('@/lib/prisma')
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS guardian_log (
                    id SERIAL PRIMARY KEY,
                    total_checked INT,
                    total_fixed INT,
                    total_errors INT,
                    report JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `)
            await prisma.$executeRaw`
                INSERT INTO guardian_log (total_checked, total_fixed, total_errors, report, created_at)
                VALUES (${report.totalChecked}, ${report.totalFixed}, ${report.totalErrors}, ${JSON.stringify(report)}::jsonb, NOW())
            `
            // Limpar logs antigos (manter últimos 7 dias)
            await prisma.$executeRaw`
                DELETE FROM guardian_log WHERE created_at < NOW() - INTERVAL '7 days'
            `
        } catch { /* tabela pode não existir na primeira vez */ }

        return NextResponse.json(report)

    } catch (err: any) {
        console.error('[Guardian] ❌ Erro fatal:', err)
        return NextResponse.json({
            error: err.message,
            timestamp: new Date().toISOString()
        }, { status: 500 })
    }
}
