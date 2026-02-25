import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/stats
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const [conversasHoje, agendamentosHoje, totalConversas] = await Promise.all([
            prisma.conversa.count({
                where: { clinicaId, updatedAt: { gte: hoje } },
            }),
            prisma.agendamento.count({
                where: { clinicaId, data: { gte: hoje } },
            }),
            prisma.conversa.count({
                where: { clinicaId },
            }),
        ])

        return NextResponse.json({
            conversasHoje,
            agendamentosHoje,
            totalConversas,
            creditosRestantes: clinica.creditosTotal - clinica.creditosUsados,
            plano: clinica.plano,
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
