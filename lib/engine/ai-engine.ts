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
}

/**
 * Monta o system prompt completo da IARA.
 * 
 * Junta tudo: identidade + procedimentos + feedbacks + memória
 * + histórico + cofre (leis, arsenal, roteiro) + como falar.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
    const { clinica, mensagem, pushName, tipoEntrada, historico, procedimentos, feedbacks, memoria } = ctx

    const nivel = clinica.nivel || 1
    const idioma = (nivel >= 2 ? clinica.idioma : 'pt-BR') || 'pt-BR'
    const labels = getLabels(idioma)
    const cofre = getCofreParaClinica(clinica)

    const nomeAssistente = clinica.nomeAssistente || 'IARA'
    const nomeClinica = clinica.nomeClinica || 'Clínica'
    const nomeCliente = pushName ? pushName.split(' ')[0] : labels.cliente.toLowerCase()
    const moeda = clinica.moeda === 'USD' ? '$' : clinica.moeda === 'EUR' ? '€' : 'R$'

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
    let feedbackTexto = ''
    if (feedbacks.length > 0) {
        feedbackTexto = `\n🧠 ${labels.orientacoesDra}:\n`
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

    // --- Histórico da Conversa ---
    let historicoTexto = ''
    const limiteHistorico = 10
    const historicoRecente = historico.slice(0, limiteHistorico)

    if (historicoRecente.length > 0) {
        historicoTexto = `\n📋 ${labels.conversaAteAgora}:\n`
            // O histórico vem do mais recente pro mais antigo, precisamos inverter
            ;[...historicoRecente].reverse().forEach((item) => {
                const role = item.role === 'user' ? labels.cliente : nomeAssistente
                const content = (item.content || '').replace(/\s+/g, ' ').trim().slice(0, 500)
                historicoTexto += `${role}: ${content}\n`
            })
    } else {
        historicoTexto = `\n${labels.primeiroContato}\n`
    }

    // --- Mensagem da Cliente (com marcação de áudio) ---
    const veioDeAudio = tipoEntrada === 'audio'
    const mensagemPrompt = veioDeAudio
        ? `[${labels.audioLabel}]\n"${mensagem}"`
        : mensagem

    // --- "Responda como..." ---
    const respondaComo = typeof labels.respondaComo === 'function'
        ? labels.respondaComo(nomeCliente, mensagemPrompt, nomeAssistente)
        : `A cliente "${nomeCliente}" acabou de enviar:\n"${mensagemPrompt}"\n\nResponda como ${nomeAssistente}:`

    // --- Montagem final ---
    return `${roleDesc}
${catalogoTexto}${feedbackTexto}${memoriaTexto}${historicoTexto}
${cofre.leisImutaveis}

${cofre.roteiroVendas}

${cofre.arsenalDeObjecoes}

${labels.comoFalar}

${respondaComo}`
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
    modelOverride?: string
): Promise<RespostaIA> {

    // 1. Tentar Claude Sonnet
    const modelo = modelOverride || 'claude-sonnet-4-20250514'

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
        try {
            const resposta = await callClaude(systemPrompt, mensagemUsuario, modelo)
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
        const resposta = await callGPT(systemPrompt, mensagemUsuario)
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

async function callClaude(
    system: string,
    message: string,
    model: string
): Promise<string | null> {
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY não configurada')

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
            messages: [{ role: 'user', content: message }],
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
    message: string
): Promise<string | null> {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada')

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
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: message },
            ],
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
