import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { getN8NUserId, getStatsReais, getConversasRecentes, getN8NUserData } from '@/lib/n8n-queries'
import { prisma } from '@/lib/prisma'

// GET /api/stats — Dashboard KPIs (dados reais do N8N)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Buscar dados do Prisma (para plano e créditos do painel)
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Tentar buscar dados reais do N8N
        const n8nUserId = await getN8NUserId(clinicaId)

        if (n8nUserId) {
            // Dados reais do N8N
            const [stats, conversas, userData] = await Promise.all([
                getStatsReais(n8nUserId),
                getConversasRecentes(n8nUserId, 5),
                getN8NUserData(n8nUserId),
            ])

            return NextResponse.json({
                ...stats,
                plano: userData?.nivel ?? clinica.plano,
                nomeClinica: userData?.nome_clinica ?? clinica.nome,
                nomeIA: userData?.nome_assistente ?? clinica.nomeIA,
                conversasRecentes: conversas,
                fonte: 'n8n',  // indica que veio do banco real
            })
        }

        // Fallback: dados do Prisma (clínica ainda sem N8N)
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

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
            mensagensHoje: conversasHoje,
            agendamentosHoje,
            totalConversas,
            creditosRestantes: clinica.creditosTotal - clinica.creditosUsados,
            plano: clinica.plano,
            nomeClinica: clinica.nome,
            nomeIA: clinica.nomeIA,
            conversasRecentes: [],
            fonte: 'prisma',
        })
    } catch (err) {
        console.error('Erro em /api/stats:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
