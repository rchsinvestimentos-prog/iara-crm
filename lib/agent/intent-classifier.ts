// ============================================
// AGENT — Classificador de Intenções da Dra
// ============================================
// Quando a Dra manda mensagem, decide se é:
// - feedback (instrução pra IA seguir)
// - conversa estratégica (brainstorm, planejamento)
// - comando (execução de ação)
// - consulta (buscar dados)

export type IntentType = 'feedback' | 'estrategica' | 'comando' | 'consulta'

export interface ClassifiedIntent {
    tipo: IntentType
    confianca: number // 0-1
    mensagemOriginal: string
    mensagemLimpa: string // sem prefixos
}

// Padrões de feedback (já existentes no memory.ts)
const FEEDBACK_PATTERNS = /^(fb:|feedback:|aprenda:|anote:|corrija:)/i
const FEEDBACK_KEYWORDS = /\b(feedback|aprenda|anote|corrija|sempre diga|nunca diga|sempre faça|nunca faça)\b/i

// Padrões de comando (execução imediata)
const COMANDO_PATTERNS = /\b(dispara|executa|manda|envia|cria|faz|agenda|move|cancela|ativa|desativa|liga|desliga)\b/i
const COMANDO_DIRETO = /^(iara,?\s*)?(dispara|executa|manda|envia|cria|faz)\b/i

// Padrões de consulta (buscar informação)
const CONSULTA_PATTERNS = /\b(quantos?|quantas?|quais?|qual|como est[áa]|como tá|me mostra|me diz|relatório|resumo|lista)\b/i

// Padrão de conversa estratégica (brainstorm, ideias)
const ESTRATEGIA_PATTERNS = /\b(quero|queria|ideia|sugest|campanha|promoção|marketing|estratégia|pensei|pensa|como pod|o que acha|vamos)\b/i

/**
 * Classifica a intenção de uma mensagem da Dra.
 *
 * HIERARQUIA:
 * 1. Feedback explícito (fb:, feedback:) → sempre feedback
 * 2. Comando direto (dispara, executa, cria) → comando
 * 3. Consulta (quantos, qual, me mostra) → consulta
 * 4. Estratégia (quero, ideia, campanha) → estratégica
 * 5. Fallback → estratégica (Dra conversando naturalmente)
 */
export function classifyIntent(mensagem: string): ClassifiedIntent {
    const msg = (mensagem || '').trim()
    const msgLower = msg.toLowerCase()

    // 1. Feedback explícito (prioridade máxima)
    if (FEEDBACK_PATTERNS.test(msg)) {
        return {
            tipo: 'feedback',
            confianca: 0.95,
            mensagemOriginal: msg,
            mensagemLimpa: msg.replace(FEEDBACK_PATTERNS, '').trim(),
        }
    }

    // Feedback por keywords (menor confiança)
    if (FEEDBACK_KEYWORDS.test(msgLower) && msg.length < 200) {
        return {
            tipo: 'feedback',
            confianca: 0.7,
            mensagemOriginal: msg,
            mensagemLimpa: msg,
        }
    }

    // 2. Comando direto
    if (COMANDO_DIRETO.test(msgLower)) {
        return {
            tipo: 'comando',
            confianca: 0.9,
            mensagemOriginal: msg,
            mensagemLimpa: msg.replace(/^(iara,?\s*)/i, '').trim(),
        }
    }

    // Comando por presença de verbo de ação (contexto de execução)
    if (COMANDO_PATTERNS.test(msgLower) && !ESTRATEGIA_PATTERNS.test(msgLower)) {
        return {
            tipo: 'comando',
            confianca: 0.6,
            mensagemOriginal: msg,
            mensagemLimpa: msg.replace(/^(iara,?\s*)/i, '').trim(),
        }
    }

    // 3. Consulta
    if (CONSULTA_PATTERNS.test(msgLower)) {
        return {
            tipo: 'consulta',
            confianca: 0.8,
            mensagemOriginal: msg,
            mensagemLimpa: msg.replace(/^(iara,?\s*)/i, '').trim(),
        }
    }

    // 4. Conversa estratégica (default para mensagens longas ou com keywords)
    if (ESTRATEGIA_PATTERNS.test(msgLower) || msg.length > 50) {
        return {
            tipo: 'estrategica',
            confianca: 0.75,
            mensagemOriginal: msg,
            mensagemLimpa: msg.replace(/^(iara,?\s*)/i, '').trim(),
        }
    }

    // 5. Fallback → estratégica
    return {
        tipo: 'estrategica',
        confianca: 0.5,
        mensagemOriginal: msg,
        mensagemLimpa: msg.replace(/^(iara,?\s*)/i, '').trim(),
    }
}

/**
 * Verifica se a mensagem deve ir para o Agent Dra (vs. feedback legacy)
 * Retorna true para: estratégica, comando, consulta
 * Retorna false para: feedback (fluxo existente do memory.ts)
 */
export function shouldRouteToAgent(mensagem: string): boolean {
    const intent = classifyIntent(mensagem)
    return intent.tipo !== 'feedback'
}
