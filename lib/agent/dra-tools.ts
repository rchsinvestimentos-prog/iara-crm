// ============================================
// AGENT — Ferramentas da IARA (Tool Use)
// ============================================
// Define as ferramentas que a IARA pode executar
// quando conversa com a Dra. Usa function calling
// do OpenAI/Claude para mapear intenção → ação.

import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/engine/sender'
import type { DadosClinica } from '@/lib/engine/types'

// ============================================
// DEFINIÇÃO DAS TOOLS (base compartilhada)
// ============================================

const TOOLS_BASE = [
    {
        name: 'consultar_contatos',
        description: 'Consulta contatos no CRM da clínica. Use para responder perguntas como "quantos leads novos", "quem são os contatos na etapa X".',
        input_schema: {
            type: 'object',
            properties: {
                etapa: { type: 'string', description: 'Filtrar por etapa: novo, interessado, agendou, atendida, fidelizada, sumiu' },
                dias_sem_contato: { type: 'number', description: 'Filtrar contatos sem interação há X dias' },
                limite: { type: 'number', description: 'Máximo de contatos a retornar (default: 10)' },
            },
        },
    },
    {
        name: 'consultar_agendamentos',
        description: 'Consulta agendamentos da clínica. Use para responder sobre a agenda, horários livres, próximos atendimentos.',
        input_schema: {
            type: 'object',
            properties: {
                periodo: { type: 'string', description: 'Período: hoje, amanha, semana, mes' },
                status: { type: 'string', description: 'Status: pendente, confirmado, realizado, cancelado' },
            },
        },
    },
    {
        name: 'criar_campanha',
        description: 'Cria uma campanha de disparo em massa para contatos. Use quando a Dra pedir para enviar uma mensagem para vários contatos.',
        input_schema: {
            type: 'object',
            properties: {
                nome: { type: 'string', description: 'Nome da campanha' },
                mensagem: { type: 'string', description: 'Mensagem a ser enviada' },
                filtro_etapa: { type: 'string', description: 'Filtrar contatos por etapa (opcional)' },
                disparar_agora: { type: 'boolean', description: 'Se true, dispara imediatamente. Se false, cria como rascunho.' },
            },
            required: ['nome', 'mensagem'],
        },
    },
    {
        name: 'enviar_mensagem',
        description: 'Envia uma mensagem de WhatsApp para um contato específico.',
        input_schema: {
            type: 'object',
            properties: {
                telefone: { type: 'string', description: 'Número do telefone do contato' },
                mensagem: { type: 'string', description: 'Mensagem a enviar' },
            },
            required: ['telefone', 'mensagem'],
        },
    },
    {
        name: 'mover_contato_crm',
        description: 'Move um contato para outra etapa no CRM.',
        input_schema: {
            type: 'object',
            properties: {
                telefone: { type: 'string', description: 'Telefone do contato' },
                nova_etapa: { type: 'string', description: 'Nova etapa: novo, interessado, agendou, atendida, fidelizada, sumiu' },
            },
            required: ['telefone', 'nova_etapa'],
        },
    },
    {
        name: 'agendar_retorno',
        description: 'Agenda um follow-up futuro para um contato.',
        input_schema: {
            type: 'object',
            properties: {
                telefone: { type: 'string', description: 'Telefone do contato' },
                data: { type: 'string', description: 'Data do retorno (formato ISO)' },
                mensagem: { type: 'string', description: 'Mensagem do retorno' },
            },
            required: ['telefone', 'data', 'mensagem'],
        },
    },
    {
        name: 'resumo_clinica',
        description: 'Gera um resumo dos dados da clínica: contatos por etapa, agendamentos da semana, campanhas recentes. Use quando a Dra pedir um panorama geral.',
        input_schema: {
            type: 'object',
            properties: {},
        },
    },
]

// Formato Claude (tool_use nativo)
export const AGENT_TOOLS_CLAUDE = TOOLS_BASE.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
}))

// Formato OpenAI (function calling)
export const AGENT_TOOLS_OPENAI = TOOLS_BASE.map(t => ({
    type: 'function' as const,
    function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
    },
}))

// ============================================
// EXECUTORES DAS TOOLS
// ============================================

export async function executeTool(
    clinica: DadosClinica,
    toolName: string,
    args: Record<string, any>
): Promise<string> {
    console.log(`[Agent/Tools] 🔧 Executando: ${toolName}`, args)

    switch (toolName) {
        case 'consultar_contatos':
            return await toolConsultarContatos(clinica.id, args)
        case 'consultar_agendamentos':
            return await toolConsultarAgendamentos(clinica.id, args)
        case 'criar_campanha':
            return await toolCriarCampanha(clinica, args)
        case 'enviar_mensagem':
            return await toolEnviarMensagem(clinica, args)
        case 'mover_contato_crm':
            return await toolMoverContato(clinica.id, args)
        case 'agendar_retorno':
            return await toolAgendarRetorno(clinica.id, args)
        case 'resumo_clinica':
            return await toolResumoClinica(clinica.id)
        default:
            return `Ferramenta "${toolName}" não reconhecida.`
    }
}

// --- Consultar Contatos ---
async function toolConsultarContatos(clinicaId: number, args: any): Promise<string> {
    try {
        const where: any = { clinicaId }
        if (args.etapa) where.etapa = args.etapa

        let contatos = await prisma.contato.findMany({
            where,
            orderBy: { ultimoContato: 'desc' },
            take: args.limite || 10,
            select: { nome: true, telefone: true, etapa: true, ultimoContato: true, tags: true },
        })

        // Filtrar por dias sem contato
        if (args.dias_sem_contato) {
            const limite = new Date()
            limite.setDate(limite.getDate() - args.dias_sem_contato)
            contatos = contatos.filter(c => !c.ultimoContato || c.ultimoContato < limite)
        }

        if (contatos.length === 0) return 'Nenhum contato encontrado com esses critérios.'

        const lista = contatos.map(c =>
            `• ${c.nome || 'Sem nome'} (${c.telefone}) — Etapa: ${c.etapa || 'sem etapa'}${c.ultimoContato ? `, Último contato: ${c.ultimoContato.toLocaleDateString('pt-BR')}` : ''}`
        ).join('\n')

        return `Encontrei ${contatos.length} contato(s):\n${lista}`
    } catch (err) {
        console.error('[Tool/ConsultarContatos]', err)
        return 'Erro ao consultar contatos.'
    }
}

// --- Consultar Agendamentos ---
async function toolConsultarAgendamentos(clinicaId: number, args: any): Promise<string> {
    try {
        const agora = new Date()
        let dataInicio = new Date(agora)
        let dataFim = new Date(agora)

        switch (args.periodo) {
            case 'hoje':
                dataFim.setHours(23, 59, 59)
                break
            case 'amanha':
                dataInicio.setDate(dataInicio.getDate() + 1)
                dataInicio.setHours(0, 0, 0)
                dataFim.setDate(dataFim.getDate() + 1)
                dataFim.setHours(23, 59, 59)
                break
            case 'semana':
                dataFim.setDate(dataFim.getDate() + 7)
                break
            case 'mes':
                dataFim.setMonth(dataFim.getMonth() + 1)
                break
            default:
                dataFim.setDate(dataFim.getDate() + 7)
        }

        const where: any = {
            clinicaId,
            data: { gte: dataInicio, lte: dataFim },
        }
        if (args.status) where.status = args.status

        const agendamentos = await prisma.agendamento.findMany({
            where,
            orderBy: { data: 'asc' },
            take: 20,
            select: { nomePaciente: true, procedimento: true, data: true, horario: true, status: true },
        })

        if (agendamentos.length === 0) return `Nenhum agendamento para o período "${args.periodo || 'semana'}".`

        const lista = agendamentos.map(a =>
            `• ${a.data.toLocaleDateString('pt-BR')} ${a.horario} — ${a.nomePaciente}: ${a.procedimento} (${a.status})`
        ).join('\n')

        return `${agendamentos.length} agendamento(s) para ${args.periodo || 'a semana'}:\n${lista}`
    } catch (err) {
        console.error('[Tool/ConsultarAgendamentos]', err)
        return 'Erro ao consultar agendamentos.'
    }
}

// --- Criar Campanha ---
async function toolCriarCampanha(clinica: DadosClinica, args: any): Promise<string> {
    try {
        const where: any = { clinicaId: clinica.id }
        if (args.filtro_etapa) where.etapa = args.filtro_etapa

        const contatos = await prisma.contato.findMany({
            where,
            select: { telefone: true, nome: true },
        })

        if (contatos.length === 0) return 'Nenhum contato encontrado para a campanha.'

        const campanha = await prisma.campanha.create({
            data: {
                clinicaId: clinica.id,
                nome: args.nome,
                mensagem: args.mensagem,
                filtroEtapa: args.filtro_etapa || null,
                status: args.disparar_agora ? 'enviando' : 'rascunho',
                envios: {
                    create: contatos.map(c => ({
                        telefone: c.telefone,
                        nome: c.nome,
                    })),
                },
            },
        })

        if (args.disparar_agora) {
            // Disparar em background (não bloqueia a resposta)
            dispararCampanhaBackground(clinica, campanha.id, contatos, args.mensagem)
        }

        return `✅ Campanha "${args.nome}" criada com ${contatos.length} contato(s)!${args.disparar_agora ? ' Disparo iniciado.' : ' Status: rascunho — me peça pra disparar quando quiser.'}`
    } catch (err) {
        console.error('[Tool/CriarCampanha]', err)
        return 'Erro ao criar campanha.'
    }
}

// Disparo assíncrono
async function dispararCampanhaBackground(
    clinica: DadosClinica,
    campanhaId: string,
    contatos: { telefone: string; nome: string | null }[],
    mensagem: string
) {
    const instancia = clinica.evolutionInstance
    if (!instancia) return

    let enviados = 0
    for (const c of contatos) {
        try {
            await sendText(
                { instancia, telefone: c.telefone, apikey: clinica.evolutionApikey || undefined },
                mensagem
            )
            enviados++
        } catch {}
        await new Promise(r => setTimeout(r, 1500))
    }

    await prisma.campanha.update({
        where: { id: campanhaId },
        data: { status: 'concluida', totalEnvios: enviados },
    })
    console.log(`[Tool/Campanha] ✅ Campanha ${campanhaId} finalizada: ${enviados}/${contatos.length} enviados`)
}

// --- Enviar Mensagem ---
async function toolEnviarMensagem(clinica: DadosClinica, args: any): Promise<string> {
    try {
        if (!clinica.evolutionInstance) return 'Erro: clínica sem instância Evolution configurada.'

        const ok = await sendText(
            { instancia: clinica.evolutionInstance, telefone: args.telefone, apikey: clinica.evolutionApikey || undefined },
            args.mensagem
        )
        return ok
            ? `✅ Mensagem enviada para ${args.telefone}!`
            : '❌ Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.'
    } catch (err) {
        console.error('[Tool/EnviarMensagem]', err)
        return 'Erro ao enviar mensagem.'
    }
}

// --- Mover Contato no CRM ---
async function toolMoverContato(clinicaId: number, args: any): Promise<string> {
    try {
        const contato = await prisma.contato.findFirst({
            where: { clinicaId, telefone: { contains: args.telefone.replace(/\D/g, '') } },
        })
        if (!contato) return `Contato com telefone ${args.telefone} não encontrado.`

        await prisma.contato.update({
            where: { id: contato.id },
            data: { etapa: args.nova_etapa },
        })
        return `✅ ${contato.nome || contato.telefone} movido para etapa "${args.nova_etapa}".`
    } catch (err) {
        console.error('[Tool/MoverContato]', err)
        return 'Erro ao mover contato.'
    }
}

// --- Agendar Retorno ---
async function toolAgendarRetorno(clinicaId: number, args: any): Promise<string> {
    try {
        const contato = await prisma.contato.findFirst({
            where: { clinicaId, telefone: { contains: args.telefone.replace(/\D/g, '') } },
        })
        if (!contato) return `Contato com telefone ${args.telefone} não encontrado.`

        await prisma.contato.update({
            where: { id: contato.id },
            data: {
                retornoData: new Date(args.data),
                retornoMensagem: args.mensagem,
                retornoEnviado: false,
            },
        })
        return `✅ Retorno agendado para ${contato.nome || contato.telefone} em ${new Date(args.data).toLocaleDateString('pt-BR')}.`
    } catch (err) {
        console.error('[Tool/AgendarRetorno]', err)
        return 'Erro ao agendar retorno.'
    }
}

// --- Resumo da Clínica ---
async function toolResumoClinica(clinicaId: number): Promise<string> {
    try {
        // Contatos por etapa
        const contatos = await prisma.contato.groupBy({
            by: ['etapa'],
            where: { clinicaId },
            _count: true,
        })
        const totalContatos = contatos.reduce((s, c) => s + c._count, 0)
        const etapas = contatos.map(c => `  ${c.etapa || 'sem etapa'}: ${c._count}`).join('\n')

        // Agendamentos da semana
        const agora = new Date()
        const fimSemana = new Date(agora)
        fimSemana.setDate(fimSemana.getDate() + 7)
        const agendSemana = await prisma.agendamento.count({
            where: { clinicaId, data: { gte: agora, lte: fimSemana } },
        })

        // Campanhas recentes
        const campanhas = await prisma.campanha.findMany({
            where: { clinicaId },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { nome: true, status: true, totalEnvios: true, createdAt: true },
        })

        let resumo = `📊 RESUMO DA CLÍNICA\n\n`
        resumo += `👥 ${totalContatos} contatos no CRM:\n${etapas}\n\n`
        resumo += `📅 ${agendSemana} agendamentos nos próximos 7 dias\n\n`

        if (campanhas.length > 0) {
            resumo += `📣 Últimas campanhas:\n`
            campanhas.forEach(c => {
                resumo += `  • ${c.nome} (${c.status}) — ${c.totalEnvios} envios — ${c.createdAt.toLocaleDateString('pt-BR')}\n`
            })
        }

        return resumo
    } catch (err) {
        console.error('[Tool/Resumo]', err)
        return 'Erro ao gerar resumo.'
    }
}
