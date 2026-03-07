// ============================================
// AI ENGINE — O Cérebro da IARA
// ============================================
// Aqui é onde monta o prompt e chama a IA.
// Era o F06 (IA Texto / Cérebro) no n8n.
//
// FLUXO:
// 1. buildSystemPrompt() → monta o prompt completo
// 2. callAI() → chama Claude ou GPT
// 3. extractResponse() → extrai e limpa a resposta
//
// COMO MUDAR O COMPORTAMENTO DA IA:
// → Edite o cofre.ts (personalidade e regras)
// → Ou mude via painel: clinica.configuracoes.cofre_iara

import { getCofreParaClinica, getLabels } from './cofre'
import type { DadosClinica, Procedimento, FeedbackDra, MemoriaCliente, RespostaIA } from './types'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// ============================================
// MONTAR O PROMPT
// ============================================

interface PromptContext {
    clinica: DadosClinica
    mensagem: string
    pushName?: string
    tipoEntrada: 'text' | 'audio'
    historico: { role: string; content: string }[]
    procedimentos: Procedimento[]
    feedbacks: FeedbackDra[]
    memoria: MemoriaCliente | null
    agendaContext?: string | null
}

/**
 * Monta o system prompt completo da IARA.
 * 
 * Junta tudo: identidade + procedimentos + feedbacks + memória
 * + cofre (leis, arsenal, roteiro) + como falar.
 * Obs: Histórico agora é passado diretamente na array de mensagens da API.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
    const { clinica, mensagem, pushName, tipoEntrada, procedimentos, feedbacks, memoria, agendaContext } = ctx

    const nivel = clinica.nivel || 1
    const idioma = (nivel >= 2 ? clinica.idioma : 'pt-BR') || 'pt-BR'
    const labels = getLabels(idioma)
    const cofre = getCofreParaClinica(clinica)

    const nomeAssistente = clinica.nomeAssistente || 'IARA'
    const nomeClinica = clinica.nomeClinica || 'Clínica'
    const nomeCliente = pushName ? pushName.split(' ')[0] : labels.cliente.toLowerCase()
    const moeda = clinica.moeda === 'USD' ? '$' : clinica.moeda === 'EUR' ? '€' : 'R$'

    // --- Profissional responsável ---
    const nomeDoutora = clinica.nomeDoutora || null
    const tratamento = clinica.tratamentoDoutora || 'Pelo nome'
    const nomeProfissional = nomeDoutora
        ? tratamento === 'Pelo nome'
            ? nomeDoutora.split(' ')[0]
            : `${tratamento} ${nomeDoutora.split(' ')[0]}`
        : null

    // --- Identidade ---
    const roleDesc = typeof labels.voceE === 'function'
        ? labels.voceE(nomeAssistente, nomeClinica)
        : `Você é ${nomeAssistente}, secretária da ${nomeClinica}.`

    // --- Catálogo de Procedimentos ---
    let catalogoTexto = `\n💅 ${labels.procedimentosPrecos}:\n`
    if (procedimentos.length > 0) {
        procedimentos.slice(0, 10).forEach((proc) => {
            catalogoTexto += `• ${proc.nome}`
            if (proc.valor) catalogoTexto += ` — ${moeda} ${proc.valor}`
            if (proc.duracao) catalogoTexto += ` (${proc.duracao})`
            catalogoTexto += '\n'
        })
    } else {
        catalogoTexto += `${labels.semCatalogo}\n`
    }

    // --- Feedbacks da Dra ---
    // Dois tipos: (1) instruções permanentes do painel (clinica.feedbacks) e (2) comandos realtime via WhatsApp (feedback_iara table)
    let feedbackTexto = ''
    const temFeedbackPainel = clinica.feedbacks && clinica.feedbacks.trim().length > 0
    const temFeedbackRealtime = feedbacks.length > 0
    if (temFeedbackPainel || temFeedbackRealtime) {
        feedbackTexto = `\n🧠 ${labels.orientacoesDra}:\n`
        // Instruções do painel (campo "Instruções Extras / Feedbacks")
        if (temFeedbackPainel) {
            feedbackTexto += `- ${clinica.feedbacks!.trim()}\n`
        }
        // Comandos realtime enviados via WhatsApp pela Dra
        feedbacks.forEach((fb) => {
            feedbackTexto += `- ${fb.regra}\n`
        })
    }

    // --- Memória da Cliente ---
    let memoriaTexto = ''
    if (memoria?.resumoGeral) {
        memoriaTexto = `\n🧠 ${labels.sabemosSobre}:\n- ${memoria.resumoGeral}\n`
        if (memoria.procedimentosRealizados.length > 0) {
            memoriaTexto += `- ${labels.jaFez}: ${memoria.procedimentosRealizados.join(', ')}\n`
        }
    }

    // --- Montagem final ---
    const linhaProf = nomeProfissional
        ? `PROFISSIONAL RESPONSÁVEL: ${nomeProfissional} (${tratamento === 'Pelo nome' ? 'refira-se pelo primeiro nome apenas' : `use o tratamento "${tratamento}"`})\n`
        : ''
    const agendaTexto = agendaContext ? `\n${agendaContext}\n` : ''
    return `${roleDesc}
${catalogoTexto}${feedbackTexto}${memoriaTexto}
${linhaProf}${agendaTexto}${cofre.leisImutaveis}

${cofre.roteiroVendas}

${cofre.arsenalDeObjecoes}

${labels.comoFalar}

NÃO VÁ DIRETO PARA A SONDAGEM. Primeiro, acolhimento. Siga PASSO A PASSO, uma mensagem por vez.
EXCEÇÃO: Se a cliente quer AGENDAR e já sabe o que quer, é FECHAMENTO — não enrole.
NOME DA CLIENTE COM QUEM VOCÊ ESTÁ FALANDO AGORA: ${nomeCliente}`
}

// ============================================
// CHAMAR A IA
// ============================================

/**
 * Chama Claude Sonnet (principal) com fallback pra GPT-4o-mini.
 * 
 * Retentativa: Claude tenta 3x, depois cai pro GPT.
 */
export async function callAI(
    systemPrompt: string,
    mensagemUsuario: string,
    modelOverride?: string,
    historico?: { role: string; content: string }[],
    tipoEntrada?: 'text' | 'audio'
): Promise<RespostaIA> {

    // 1. Tentar Claude Sonnet
    const modelo = modelOverride || 'claude-sonnet-4-20250514'

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
            const resposta = await callClaude(systemPrompt, mensagemUsuario, modelo, historico, tipoEntrada)
            if (resposta) {
                return { texto: resposta, modelo, fallback: false }
            }
        } catch (err) {
            console.error(`[AI] Claude tentativa ${tentativa}/3 falhou:`, (err as Error).message?.slice(0, 80))
            if (tentativa < 3) await sleep(2000)
        }
    }

    // 2. Fallback pro GPT-4o-mini
    console.log('[AI] ⚠️ Fallback para GPT-4o-mini')
    try {
        const resposta = await callGPT(systemPrompt, mensagemUsuario, historico, tipoEntrada)
        if (resposta) {
            return { texto: resposta, modelo: 'gpt-4o-mini', fallback: true }
        }
    } catch (err) {
        console.error('[AI] GPT fallback também falhou:', err)
    }

    // 3. Se tudo falhar, resposta genérica
    return {
        texto: 'Desculpe, deu um erro aqui. Pode repetir? 😊',
        modelo: 'fallback',
        fallback: true,
    }
}

// ============================================
// Chamadas de API (internas)
// ============================================

function prepararMensagens(mensagemOriginal: string, historico?: { role: string; content: string }[], tipoEntrada?: 'text' | 'audio') {
    // O histórico vem do banco: mais recente primeiro. Limitamos a 12 e invertemos para cronológico.
    const historyLimit = 12
    const historicoLimpo = (historico || []).slice(0, historyLimit).reverse().map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
    }))

    const finalMsg = tipoEntrada === 'audio'
        ? `[A CLIENTE ENVIOU ESTE ÁUDIO, ESTA É A TRANSCRIÇÃO]: "${mensagemOriginal}"`
        : mensagemOriginal

    return [...historicoLimpo, { role: 'user', content: finalMsg }]
}

async function callClaude(
    system: string,
    message: string,
    model: string,
    historico?: { role: string; content: string }[],
    tipoEntrada?: 'text' | 'audio'
): Promise<string | null> {
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada')

    const messages = prepararMensagens(message, historico, tipoEntrada)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 800,
            temperature: 0.5,
            system,
            messages,
        }),
        signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Claude ${res.status}: ${err.slice(0, 200)}`)
    }

    const data = await res.json()

    // Claude retorna: { content: [{ type: "text", text: "..." }] }
    if (Array.isArray(data.content)) {
        const texto = data.content
            .filter((item: any) => item && item.type === 'text')
            .map((item: any) => item.text || '')
            .join('\n')
            .replace(/\*\*/g, '') // remove markdown bold
            .trim()

        return texto || null
    }

    return null
}

async function callGPT(
    system: string,
    message: string,
    historico?: { role: string; content: string }[],
    tipoEntrada?: 'text' | 'audio'
): Promise<string | null> {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada')

    const histMessages = prepararMensagens(message, historico, tipoEntrada)
    const messages = [
        { role: 'system', content: system },
        ...histMessages
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            temperature: 0.5,
            messages,
        }),
        signal: AbortSignal.timeout(45000),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`GPT ${res.status}: ${err.slice(0, 200)}`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.replace(/\*\*/g, '').trim() || null
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
