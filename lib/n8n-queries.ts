import { prisma } from '@/lib/prisma'

// ============================================
// Queries — Tabela Unificada "users" (iara_production)
// ============================================
// clinicaId = users.id diretamente (sem bridge!)

/** Stats reais do dashboard */
export async function getStatsReais(userId: number) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeISO = hoje.toISOString()

    // Cada query em try-catch individual — se uma tabela não existir, não quebra tudo
    let mensagensHoje = 0
    let totalConversas = 0
    let agendamentosHoje = 0

    try {
        const r = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count 
            FROM historico_conversas 
            WHERE user_id = ${userId} 
              AND created_at >= ${hojeISO}::timestamp
        `
        mensagensHoje = Number(r[0]?.count ?? 0)
    } catch (e) { console.error('Stats: erro em mensagensHoje:', e) }

    try {
        const r = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(DISTINCT telefone_cliente)::bigint as count 
            FROM historico_conversas 
            WHERE user_id = ${userId}
        `
        totalConversas = Number(r[0]?.count ?? 0)
    } catch (e) { console.error('Stats: erro em totalConversas:', e) }

    try {
        const r = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count 
            FROM agendamentos 
            WHERE user_id = ${userId} 
              AND data_agendamento >= ${hojeISO}::timestamp
              AND status != 'cancelado'
        `
        agendamentosHoje = Number(r[0]?.count ?? 0)
    } catch (e) { console.error('Stats: erro em agendamentosHoje:', e) }

    // Créditos direto do Prisma (mesma tabela!)
    const clinica = await prisma.clinica.findUnique({
        where: { id: userId },
        select: { creditosDisponiveis: true },
    })

    return {
        mensagensHoje,
        totalConversas,
        agendamentosHoje,
        creditosRestantes: clinica?.creditosDisponiveis ?? 0,
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

    return result.map((r: { dia: string; total: bigint }) => ({
        dia: r.dia,
        total: Number(r.total),
    }))
}

/** Próximos agendamentos reais */
export async function getAgendamentosReais(userId: number, limite: number = 10) {
    return prisma.$queryRaw<{
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
}

/** Conversas recentes */
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

    return result.map((r: { telefone: string; push_name: string; ultima_msg: string; ultima_data: Date }) => ({
        telefone: r.telefone,
        nome: r.push_name,
        ultimaMensagem: r.ultima_msg.slice(0, 80),
        ultimaData: r.ultima_data,
    }))
}

/** Dados da clínica (direto do Prisma, mesma tabela) */
export async function getClinicaData(userId: number) {
    const clinica = await prisma.clinica.findUnique({
        where: { id: userId },
    })

    if (!clinica) return null

    return {
        id: clinica.id,
        nome_clinica: clinica.nomeClinica || clinica.nome,
        nome_assistente: clinica.nomeAssistente || 'IARA',
        nivel: clinica.nivel,
        whatsapp_clinica: clinica.whatsappClinica || '',
        whatsapp_doutora: clinica.whatsappDoutora || '',
        creditos_disponiveis: clinica.creditosDisponiveis ?? 0,
        status: clinica.status || 'ativo',
    }
}
