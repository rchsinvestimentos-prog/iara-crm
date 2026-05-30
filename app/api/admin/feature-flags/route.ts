import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET — retorna todas as feature flags
// Usado tanto pelo admin (para o painel) quanto pelo sidebar do cliente
export async function GET() {
    try {
        const flags = await prisma.featureFlag.findMany({
            orderBy: { featureId: 'asc' },
        })

        // Transforma em mapa { featureId: boolean } para fácil consumo
        const map: Record<string, boolean> = {}
        flags.forEach(f => { map[f.featureId] = f.habilitado })

        return NextResponse.json({ flags: map, raw: flags })
    } catch (error) {
        console.error('[GET /api/admin/feature-flags] Erro:', error)
        return NextResponse.json({ error: 'Erro ao buscar feature flags' }, { status: 500 })
    }
}

// PUT — toggle de uma feature flag (somente admin)
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || (session.user as any)?.userType !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { featureId, habilitado } = body

        if (!featureId || typeof habilitado !== 'boolean') {
            return NextResponse.json({ error: 'featureId e habilitado são obrigatórios' }, { status: 400 })
        }

        const flag = await prisma.featureFlag.upsert({
            where: { featureId },
            update: { habilitado, updatedAt: new Date() },
            create: { featureId, habilitado },
        })

        return NextResponse.json({ ok: true, flag })
    } catch (error) {
        console.error('[PUT /api/admin/feature-flags] Erro:', error)
        return NextResponse.json({ error: 'Erro ao atualizar feature flag' }, { status: 500 })
    }
}

// POST — bulk update (toggle-all de uma categoria)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || (session.user as any)?.userType !== 'admin') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { features } = body // Array de { featureId, habilitado }

        if (!Array.isArray(features)) {
            return NextResponse.json({ error: 'features deve ser um array' }, { status: 400 })
        }

        const results = await Promise.all(
            features.map(({ featureId, habilitado }: { featureId: string; habilitado: boolean }) =>
                prisma.featureFlag.upsert({
                    where: { featureId },
                    update: { habilitado, updatedAt: new Date() },
                    create: { featureId, habilitado },
                })
            )
        )

        return NextResponse.json({ ok: true, updated: results.length })
    } catch (error) {
        console.error('[POST /api/admin/feature-flags] Erro:', error)
        return NextResponse.json({ error: 'Erro ao atualizar feature flags' }, { status: 500 })
    }
}
