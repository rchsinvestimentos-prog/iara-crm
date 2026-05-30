import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isProfissional, getProfissionalId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/profissional/ferias
 * 
 * Salva as ausências (férias/folgas) do profissional logado.
 * Body: { ausencias: [{inicio, fim, motivo}] }
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

        const body = await request.json()
        const { ausencias } = body

        if (!Array.isArray(ausencias)) {
            return NextResponse.json({ error: 'ausencias deve ser um array' }, { status: 400 })
        }

        await prisma.$executeRawUnsafe(`
            UPDATE profissionais SET ausencias = $1::jsonb WHERE id = $2
        `, JSON.stringify(ausencias), profId)

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Profissional/ferias] Erro PUT:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
