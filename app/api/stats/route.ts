import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/stats — Dashboard KPIs, totalmente fault-tolerant
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 1. Buscar dados da clínica (operação crítica)
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: {
                id: true,
                nomeClinica: true,
                nome: true,
                nomeAssistente: true,
                nivel: true,
                creditosDisponiveis: true,
            },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const hojeISO = hoje.toISOString()

        // 2. Stats operacionais (cada uma com try-catch individual)
        let mensagensHoje = 0
        let totalConversas = 0
        let agendamentosHoje = 0
        let conversasRecentes: unknown[] = []

        try {
            const r = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint as count 
                FROM historico_conversas 
                WHERE user_id = ${clinicaId} 
                  AND created_at >= ${hojeISO}::timestamp
            `
            mensagensHoje = Number(r[0]?.count ?? 0)
        } catch { /* tabela pode não ter dados ainda */ }

        try {
            const r = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(DISTINCT telefone_cliente)::bigint as count 
                FROM historico_conversas 
                WHERE user_id = ${clinicaId}
            `
            totalConversas = Number(r[0]?.count ?? 0)
        } catch { /* tabela pode não ter dados ainda */ }

        try {
            const r = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint as count 
                FROM agendamentos 
                WHERE user_id = ${clinicaId}
                  AND data_agendamento >= ${hojeISO}::timestamp
                  AND status != 'cancelado'
            `
            agendamentosHoje = Number(r[0]?.count ?? 0)
        } catch { /* tabela pode não ter dados ainda */ }

        try {
            conversasRecentes = await prisma.$queryRaw`
                SELECT DISTINCT ON (telefone_cliente)
                    telefone_cliente as telefone,
                    COALESCE(push_name, telefone_cliente) as nome,
                    COALESCE(mensagem, '') as ultimaMensagem,
                    created_at as ultimaData
                FROM historico_conversas
                WHERE user_id = ${clinicaId}
                ORDER BY telefone_cliente, created_at DESC
                LIMIT 5
            `
        } catch { /* sem conversas ainda */ }

        return NextResponse.json({
            mensagensHoje,
            totalConversas,
            agendamentosHoje,
            creditosRestantes: clinica.creditosDisponiveis ?? 0,
            plano: clinica.nivel,
            nomeClinica: clinica.nomeClinica || clinica.nome,
            nomeIA: clinica.nomeAssistente || 'IARA',
            conversasRecentes,
            fonte: 'unificado',
        })
    } catch (err) {
        console.error('Erro crítico em /api/stats:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
