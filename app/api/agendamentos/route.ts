import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { getN8NUserId, getAgendamentosReais } from '@/lib/n8n-queries'
import { prisma } from '@/lib/prisma'

// GET /api/agendamentos — Próximos agendamentos reais
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Tentar dados reais do N8N primeiro
        const n8nUserId = await getN8NUserId(clinicaId)

        if (n8nUserId) {
            const agendamentos = await getAgendamentosReais(n8nUserId, 10)
            return NextResponse.json({ agendamentos, fonte: 'n8n' })
        }

        // Fallback: dados Prisma
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                clinicaId,
                data: { gte: new Date() },
                status: { not: 'cancelado' },
            },
            orderBy: { data: 'asc' },
            take: 10,
        })

        return NextResponse.json({
            agendamentos: agendamentos.map(a => ({
                id: a.id,
                nome_paciente: a.nomePaciente,
                telefone: a.telefone || '',
                procedimento: a.procedimento,
                data_agendamento: a.data,
                horario: a.horario,
                status: a.status,
            })),
            fonte: 'prisma',
        })
    } catch (err) {
        console.error('Erro em /api/agendamentos:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
