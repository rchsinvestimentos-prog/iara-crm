import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/historico-creditos
 * Returns credit history + current balance for the authenticated clinic.
 * History is stored in configuracoes.creditHistory[] (last 200 events).
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { creditosDisponiveis: true, configuracoes: true },
        })

        const config = (clinica?.configuracoes as any) || {}
        const historico = (config.creditHistory || []).reverse() // most recent first

        return NextResponse.json({
            saldoAtual: clinica?.creditosDisponiveis || 0,
            historico,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
