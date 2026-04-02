// ============================================
// AGENT — Motor Principal da IARA Agent (Conversa com a Dra)
// ============================================
// A IARA como consultora estratégica e executora.
// Conversa com a Dra, sugere ideias, e executa ações
// via tool_use (Claude) / function calling (GPT fallback).
//
// MOTOR PRINCIPAL: Claude Sonnet (Anthropic) — mesmo padrão do ai-engine.ts
// FALLBACK: GPT-4o (OpenAI) — só se Claude falhar 3x
//
// Funciona via WhatsApp (isDoutora) e Painel (chat).

import { prisma } from '@/lib/prisma'
import { saveDraMessage, getDraHistoryForPrompt } from './dra-memory'
import { AGENT_TOOLS_CLAUDE, AGENT_TOOLS_OPENAI, executeTool } from './dra-tools'
import { classifyIntent, type ClassifiedIntent } from './intent-classifier'
import type { DadosClinica } from '@/lib/engine/types'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// ============================================
// SYSTEM PROMPT — Personalidade de consultora
// ============================================

function buildAgentSystemPrompt(
    clinica: DadosClinica,
    dadosResumo: string
): string {
    const nomeIA = clinica.nomeAssistente || 'IARA'
    const nomeClinica = clinica.nomeClinica || 'a clínica'
    const nomeDra = clinica.nomeDoutora || 'Doutora'
    const tratamento = clinica.tratamentoDoutora || 'Dra.'

    return `Você é a ${nomeIA}, assistente de marketing e gestão da clínica "${nomeClinica}".
Você conversa com ${tratamento} ${nomeDra} como uma sócia de confiança, parceira de negócios.

🧠 SUAS ESPECIALIDADES:
- Marketing digital para clínicas de estética
- Estratégias de reativação e fidelização de clientes
- Campanhas sazonais e datas comemorativas do mercado de estética
- Copy persuasiva para WhatsApp (gatilhos mentais, urgência, exclusividade)
- Análise de base de clientes e identificação de oportunidades
- Pós-atendimento e experiência do cliente
- Cross-selling e up-selling de procedimentos estéticos

📊 DADOS ATUAIS DA CLÍNICA:
${dadosResumo}

🛠️ FERRAMENTAS DISPONÍVEIS:
Você tem acesso a ferramentas para executar ações reais no sistema. Use-as quando a ${tratamento} pedir ou quando fizer sentido na conversa.

📋 REGRAS:
1. Seja PROATIVA: sugira ideias sem ser perguntada. Você é consultora, não assistente passiva.
2. Quando a ${tratamento} pedir uma ação (campanha, envio, etc), CONFIRME os detalhes antes de executar.
   Exemplo: "Perfeito! Vou criar uma campanha de aniversário com a seguinte mensagem: [prévia]. Posso enviar pra todos os contatos ou quer filtrar por alguma etapa?"
3. Você tem MEMÓRIA PERMANENTE — referencie conversas e decisões anteriores quando relevante.
4. Use linguagem de marketing: gatilhos mentais, senso de urgência, exclusividade.
5. Fale como uma profissional de marketing que ENTENDE o mercado de estética.
6. Quando sugerir campanhas/mensagens, já traga o texto PRONTO para a ${tratamento} aprovar.
7. Formate suas respostas de forma clara e visual (emojis, listas, destaques).
8. Mantenha suas respostas concisas e objetivas — a ${tratamento} é ocupada.

🚫 NÃO FAÇA:
- Não seja genérica. Personalize com os dados que você tem.
- Não execute ações irreversíveis sem confirmação explícita da ${tratamento}.
- Não invente dados — use as ferramentas para buscar informações reais.
- Não aja fora do escopo da clínica.

IDIOMA: Português brasileiro, tom profissional mas amigável.`
}

// ============================================
// BUSCAR DADOS RESUMIDOS DA CLÍNICA
// ============================================

async function getClinicaSummary(clinicaId: number): Promise<string> {
    try {
        const [contatos, agendamentos, campanhas] = await Promise.all([
            prisma.contato.groupBy({
                by: ['etapa'],
                where: { clinicaId },
                _count: true,
            }),
            prisma.agendamento.count({
                where: {
                    clinicaId,
                    data: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
                },
            }),
            prisma.campanha.count({
                where: { clinicaId },
            }),
        ])

        const totalContatos = contatos.reduce((s, c) => s + c._count, 0)
        const porEtapa = contatos.map(c => `${c.etapa || 'sem etapa'}: ${c._count}`).join(', ')

        return `- ${totalContatos} contatos no CRM (${porEtapa})
- ${agendamentos} agendamentos nos próximos 7 dias
- ${campanhas} campanhas realizadas`
    } catch {
        return '- Dados indisponíveis momentaneamente'
    }
}

// ============================================
// PROCESSAR MENSAGEM DA DRA
// ============================================

export interface AgentResponse {
    texto: string
    intent: ClassifiedIntent
    toolsExecuted: string[]
    modelo: string
    fallback: boolean
}

/**
 * Processa uma mensagem da Dra e retorna a resposta da IARA.
 * Motor principal: Claude Sonnet com tool_use nativo.
 * Fallback: GPT-4o com function calling.
 */
export async function processaDraMensagem(
    clinica: DadosClinica,
    mensagem: string,
    canal: 'whatsapp' | 'painel' = 'painel'
): Promise<AgentResponse> {
    const toolsExecuted: string[] = []

    try {
        // 1. Classificar intenção
        const intent = classifyIntent(mensagem)
        console.log(`[Agent] 🧠 Intent: ${intent.tipo} (${intent.confianca}) — "${mensagem.slice(0, 60)}..."`)

        // 2. Buscar contexto
        const [historico, dadosResumo] = await Promise.all([
            getDraHistoryForPrompt(clinica.id, 30),
            getClinicaSummary(clinica.id),
        ])

        // 3. Montar system prompt
        const systemPrompt = buildAgentSystemPrompt(clinica, dadosResumo)

        // 4. Tentar Claude (3 tentativas) → Fallback GPT
        let resultado: { texto: string; modelo: string; fallback: boolean } | null = null

        // === CLAUDE (principal) ===
        for (let tentativa = 1; tentativa <= 3; tentativa++) {
            try {
                resultado = await callClaudeAgent(systemPrompt, mensagem, historico, clinica, toolsExecuted)
                if (resultado) break
            } catch (err) {
                console.error(`[Agent] Claude tentativa ${tentativa}/3:`, (err as Error).message?.slice(0, 80))
                if (tentativa < 3) await sleep(2000)
            }
        }

        // === GPT FALLBACK ===
        if (!resultado) {
            console.log('[Agent] ⚠️ Fallback para GPT-4o')
            try {
                resultado = await callGPTAgent(systemPrompt, mensagem, historico, clinica, toolsExecuted)
            } catch (err) {
                console.error('[Agent] GPT fallback também falhou:', err)
            }
        }

        // === Se tudo falhar ===
        if (!resultado) {
            resultado = {
                texto: 'Desculpa, tive um problema técnico agora. 😅 Pode repetir?',
                modelo: 'fallback',
                fallback: true,
            }
        }

        // 5. Salvar na memória
        const metadata: Record<string, any> = {}
        if (toolsExecuted.length > 0) {
            metadata.tools_executadas = toolsExecuted
            metadata.intent = intent.tipo
        }
        metadata.modelo = resultado.modelo

        await saveDraMessage(clinica.id, 'dra', mensagem, canal)
        await saveDraMessage(clinica.id, 'iara', resultado.texto, canal, metadata)

        console.log(`[Agent] ✅ Resposta via ${resultado.modelo} (${toolsExecuted.length} tools, ${resultado.texto.length} chars)`)

        return {
            texto: resultado.texto,
            intent,
            toolsExecuted,
            modelo: resultado.modelo,
            fallback: resultado.fallback,
        }

    } catch (err) {
        console.error('[Agent] ❌ Erro fatal:', err)
        await saveDraMessage(clinica.id, 'dra', mensagem, canal).catch(() => {})

        return {
            texto: 'Desculpa, tive um problema técnico agora. 😅 Pode repetir o que você precisa?',
            intent: classifyIntent(mensagem),
            toolsExecuted: [],
            modelo: 'error',
            fallback: true,
        }
    }
}

// ============================================
// CLAUDE — Motor Principal (tool_use nativo)
// ============================================

async function callClaudeAgent(
    systemPrompt: string,
    mensagem: string,
    historico: { role: string; content: string }[],
    clinica: DadosClinica,
    toolsExecuted: string[]
): Promise<{ texto: string; modelo: string; fallback: boolean } | null> {
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada')

    const modelo = 'claude-sonnet-4-5'

    // Montar mensagens no formato Claude
    const messages: any[] = [
        ...historico.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
        })),
        { role: 'user', content: mensagem },
    ]

    // Loop de tool_use (Claude pode chamar múltiplas ferramentas)
    const maxIterations = 5
    let iterations = 0

    while (iterations < maxIterations) {
        iterations++

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: modelo,
                max_tokens: 2000,
                temperature: 0.7,
                system: systemPrompt,
                messages,
                tools: AGENT_TOOLS_CLAUDE,
            }),
            signal: AbortSignal.timeout(60000),
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`)
        }

        const data = await res.json()

        // Processar resposta: pode ter texto + tool_use blocks
        const textBlocks = (data.content || []).filter((b: any) => b.type === 'text')
        const toolBlocks = (data.content || []).filter((b: any) => b.type === 'tool_use')

        // Se não tem tool calls, retornar o texto
        if (toolBlocks.length === 0) {
            const texto = textBlocks.map((b: any) => b.text).join('\n').trim()
            return texto ? { texto, modelo, fallback: false } : null
        }

        // Executar tool calls
        messages.push({ role: 'assistant', content: data.content })

        const toolResults: any[] = []
        for (const tool of toolBlocks) {
            console.log(`[Agent/Claude] 🔧 Tool: ${tool.name}`, tool.input)
            toolsExecuted.push(tool.name)

            const result = await executeTool(clinica, tool.name, tool.input || {})
            toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: result,
            })
        }

        messages.push({ role: 'user', content: toolResults })

        // Se stop_reason é 'end_turn', parar mesmo com tool results pendentes
        if (data.stop_reason === 'end_turn' && textBlocks.length > 0) {
            const texto = textBlocks.map((b: any) => b.text).join('\n').trim()
            return texto ? { texto, modelo, fallback: false } : null
        }

        // Caso contrário, continuar o loop (Claude vai processar os resultados)
    }

    return null
}

// ============================================
// GPT — Fallback (function calling)
// ============================================

async function callGPTAgent(
    systemPrompt: string,
    mensagem: string,
    historico: { role: string; content: string }[],
    clinica: DadosClinica,
    toolsExecuted: string[]
): Promise<{ texto: string; modelo: string; fallback: boolean } | null> {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada')

    const modelo = 'gpt-4o'

    // Montar mensagens no formato OpenAI
    const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...historico.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
        })),
        { role: 'user', content: mensagem },
    ]

    // Loop de function calling
    const maxIterations = 5
    let iterations = 0

    while (iterations < maxIterations) {
        iterations++

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: modelo,
                max_tokens: 2000,
                temperature: 0.7,
                messages,
                tools: AGENT_TOOLS_OPENAI,
                tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(60000),
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`GPT ${res.status}: ${err.slice(0, 200)}`)
        }

        const data = await res.json()
        const choice = data.choices?.[0]
        const assistantMsg = choice?.message

        if (!assistantMsg) return null

        // Se não tem tool_calls, retornar texto
        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
            const texto = (assistantMsg.content || '').trim()
            return texto ? { texto, modelo, fallback: true } : null
        }

        // Executar tool calls
        messages.push(assistantMsg)

        for (const toolCall of assistantMsg.tool_calls) {
            const toolName = toolCall.function.name
            const toolArgs = JSON.parse(toolCall.function.arguments || '{}')

            console.log(`[Agent/GPT] 🔧 Tool: ${toolName}`, toolArgs)
            toolsExecuted.push(toolName)

            const result = await executeTool(clinica, toolName, toolArgs)

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result,
            })
        }
    }

    return null
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
