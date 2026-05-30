import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getResumoUso } from '@/lib/feature-limits'

// GET /api/uso-features — Retorna resumo de uso de todas as features no mês
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true },
        })
        const nivel = clinica?.nivel ?? 1

        const resumo = await getResumoUso(clinicaId, nivel)

        return NextResponse.json({ nivel, resumo })
    } catch (err) {
        console.error('Erro GET /api/uso-features:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
