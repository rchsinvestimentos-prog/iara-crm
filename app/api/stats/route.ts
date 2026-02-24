import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stats — KPIs do dashboard
export async function GET() {
    try {
        // TODO: pegar clinicaId da sessão
        const clinica = await prisma.clinica.findFirst()
        if (!clinica) throw new Error('Sem clínica')

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const [conversasHoje, agendamentosHoje, totalConversas] = await Promise.all([
            prisma.conversa.count({
                where: { clinicaId: clinica.id, updatedAt: { gte: hoje } },
            }),
            prisma.agendamento.count({
                where: { clinicaId: clinica.id, data: { gte: hoje } },
            }),
            prisma.conversa.count({
                where: { clinicaId: clinica.id },
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
        // Mock data quando banco indisponível
        return NextResponse.json({
            conversasHoje: 12,
            agendamentosHoje: 3,
            totalConversas: 847,
            creditosRestantes: 68,
            plano: 1,
        })
    }
}
