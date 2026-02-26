import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================
// Bridge: Painel Prisma ↔ N8N PostgreSQL Tables
// ============================================
// O painel autentica via tabela `clinicas` (Prisma).
// O N8N grava dados na tabela `users` (raw SQL).
// Link: clinicas.instanceName ↔ users.evolution_instance

interface N8NUser {
    id: number
    nome_clinica: string
    nome_assistente: string
    nivel: number
    whatsapp_clinica: string
    whatsapp_doutora: string
    creditos_disponiveis: number
    status: string
}

/** Busca o user_id do N8N a partir do clinicaId do Prisma */
export async function getN8NUserId(clinicaId: string): Promise<number | null> {
    try {
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { instanceName: true },
        })

        if (!clinica?.instanceName) return null

        const result = await prisma.$queryRaw<{ id: number }[]>`
            SELECT id FROM users 
            WHERE LOWER(TRIM(evolution_instance)) = LOWER(TRIM(${clinica.instanceName}))
            LIMIT 1
        `

        return result[0]?.id ?? null
    } catch {
        return null
    }
}

/** Stats reais do dashboard */
export async function getStatsReais(userId: number) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeISO = hoje.toISOString()

    const [mensagensHoje, totalConversas, agendamentosHoje, creditos] = await Promise.all([
        prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count 
            FROM historico_conversas 
            WHERE user_id = ${userId} 
              AND created_at >= ${hojeISO}::timestamp
        `,
        prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(DISTINCT telefone_cliente)::bigint as count 
            FROM historico_conversas 
            WHERE user_id = ${userId}
        `,
        prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count 
            FROM agendamentos 
            WHERE user_id = ${userId} 
              AND data_agendamento >= ${hojeISO}::timestamp
              AND status != 'cancelado'
        `,
        prisma.$queryRaw<{ creditos_disponiveis: number }[]>`
            SELECT COALESCE(creditos_disponiveis, 0) as creditos_disponiveis 
            FROM users 
            WHERE id = ${userId}
        `,
    ])

    return {
        mensagensHoje: Number(mensagensHoje[0]?.count ?? 0),
        totalConversas: Number(totalConversas[0]?.count ?? 0),
        agendamentosHoje: Number(agendamentosHoje[0]?.count ?? 0),
        creditosRestantes: Number(creditos[0]?.creditos_disponiveis ?? 0),
    }
}

/** Gráfico de mensagens por dia (últimos N dias) */
export async function getGraficoMensagens(userId: number, dias: number = 30) {
    const result = await prisma.$queryRaw<{ dia: string; total: bigint }[]>`
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM-DD') as dia,
            COUNT(*)::bigint as total
        FROM historico_conversas
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '1 day' * ${dias}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY dia ASC
    `

    return result.map(r => ({
        dia: r.dia,
        total: Number(r.total),
    }))
}

/** Próximos agendamentos reais */
export async function getAgendamentosReais(userId: number, limite: number = 10) {
    const result = await prisma.$queryRaw<{
        id: number
        nome_paciente: string
        telefone: string
        procedimento: string
        data_agendamento: Date
        horario: string
        status: string
    }[]>`
        SELECT 
            id,
            COALESCE(nome_paciente, 'Paciente') as nome_paciente,
            COALESCE(telefone_paciente, '') as telefone,
            COALESCE(procedimento, 'Consulta') as procedimento,
            data_agendamento,
            COALESCE(horario, TO_CHAR(data_agendamento, 'HH24:MI')) as horario,
            COALESCE(status, 'pendente') as status
        FROM agendamentos
        WHERE user_id = ${userId}
          AND data_agendamento >= NOW()
          AND status != 'cancelado'
        ORDER BY data_agendamento ASC
        LIMIT ${limite}
    `

    return result
}

/** Conversas recentes (últimas mensagens por telefone) */
export async function getConversasRecentes(userId: number, limite: number = 10) {
    const result = await prisma.$queryRaw<{
        telefone: string
        push_name: string
        ultima_msg: string
        ultima_data: Date
    }[]>`
        SELECT DISTINCT ON (telefone_cliente)
            telefone_cliente as telefone,
            COALESCE(push_name, telefone_cliente) as push_name,
            COALESCE(mensagem, '') as ultima_msg,
            created_at as ultima_data
        FROM historico_conversas
        WHERE user_id = ${userId}
          AND origem = 'cliente'
        ORDER BY telefone_cliente, created_at DESC
        LIMIT ${limite}
    `

    return result.map(r => ({
        telefone: r.telefone,
        nome: r.push_name,
        ultimaMensagem: r.ultima_msg.slice(0, 80),
        ultimaData: r.ultima_data,
    }))
}

/** Dados do usuário N8N (nome, créditos, status) */
export async function getN8NUserData(userId: number): Promise<N8NUser | null> {
    const result = await prisma.$queryRaw<N8NUser[]>`
        SELECT 
            id,
            COALESCE(nome_clinica, '') as nome_clinica,
            COALESCE(nome_assistente, 'IARA') as nome_assistente,
            COALESCE(nivel, 1) as nivel,
            COALESCE(whatsapp_clinica, '') as whatsapp_clinica,
            COALESCE(whatsapp_doutora, '') as whatsapp_doutora,
            COALESCE(creditos_disponiveis, 0) as creditos_disponiveis,
            COALESCE(status, 'ativo') as status
        FROM users
        WHERE id = ${userId}
    `

    return result[0] ?? null
}
