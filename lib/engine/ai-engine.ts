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
import type { DadosClinica, Procedimento, FeedbackDra, MemoriaCliente, RespostaIA, ProfissionalAtivo } from './types'

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
    profissionais?: ProfissionalAtivo[]
    clinicaAbertaAgora?: boolean
    promocoesAtivas?: { nome: string; descricao: string | null; instrucaoIara: string | null; procedimentos: string[] }[]
}

/**
 * Monta o system prompt completo da IARA.
 * 
 * Junta tudo: identidade + procedimentos + feedbacks + memória
 * + cofre (leis, arsenal, roteiro) + como falar.
 * Obs: Histórico agora é passado diretamente na array de mensagens da API.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
    const { clinica, mensagem, pushName, tipoEntrada, procedimentos, feedbacks, memoria, agendaContext, profissionais } = ctx

    const nivel = clinica.nivel || 1

    // --- Auto-detect idioma da cliente (multilíngue) ---
    // Se a clínica tem idioma configurado, usa esse.
    // Se não, detecta automaticamente pelo texto da mensagem.
    const detectLanguage = (msg: string): string => {
        const m = msg.toLowerCase()
        // Inglês
        if (/\b(hello|hi|hey|how|what|where|when|why|please|thank|appointment|price|schedule)\b/.test(m)) return 'en-US'
        // Espanhol
        if (/\b(hola|buenos|cómo|qué|cuánto|quisiera|precio|cita|gracias|necesito)\b/.test(m)) return 'es-ES'
        // Italiano
        if (/\b(ciao|buongiorno|quanto|che|come|quando|appuntamento|grazie|vorrei)\b/.test(m)) return 'it-IT'
        // Francês
        if (/\b(bonjour|salut|comment|combien|quand|rendez-vous|merci|je voudrais)\b/.test(m)) return 'fr-FR'
        return 'pt-BR'
    }

    const idiomaClinica = clinica.idioma || 'pt-BR'
    // Mantém idioma da clínica se configurado, senão auto-detecta
    const idioma = idiomaClinica !== 'pt-BR' ? idiomaClinica : detectLanguage(mensagem)
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

    // --- Catálogo de Procedimentos (multi-profissional vs single) ---
    let catalogoTexto = ''
    const multiProf = profissionais && profissionais.length > 1

    if (multiProf) {
        catalogoTexto = `\n👩‍⚕️ PROFISSIONAIS DA CLÍNICA (${profissionais!.length}):\n`
        for (const prof of profissionais!) {
            catalogoTexto += `\n• **${prof.nome}**`
            if (prof.especialidade) catalogoTexto += ` — ${prof.especialidade}`
            if (prof.bio) catalogoTexto += `\n  Bio: ${prof.bio}`
            catalogoTexto += '\n'
            if (prof.procedimentos.length > 0) {
                catalogoTexto += `  Procedimentos:\n`
                for (const proc of prof.procedimentos.slice(0, 10)) {
                    catalogoTexto += `    - ${proc.nome}`
                    if (proc.valorMin && proc.valorMax) {
                        catalogoTexto += ` — ${moeda} ${proc.valorMin} a ${moeda} ${proc.valorMax} (avaliação necessária)`
                    } else if (proc.valor) {
                        catalogoTexto += ` — ${moeda} ${proc.valor}`
                    }
                    if (proc.duracao) catalogoTexto += ` (${proc.duracao})`
                    catalogoTexto += '\n'
                }
            }
        }
        catalogoTexto += `\n⚠️ REGRA MULTI-PROFISSIONAL:`
        catalogoTexto += `\n- Se a cliente pedir um procedimento que MAIS DE UM profissional faz, PERGUNTE com qual profissional ela prefere.`
        catalogoTexto += `\n- Se SÓ UM profissional faz aquele procedimento, direcione direto sem perguntar.`
        catalogoTexto += `\n- Ao agendar, use o formato: [AGENDAR:Procedimento|YYYY-MM-DD|HH:MM|Duracao|ProfissionalId]`
        catalogoTexto += `\n`
    } else {
        catalogoTexto = `\n💅 ${labels.procedimentosPrecos}:\n`
        if (procedimentos.length > 0) {
            procedimentos.slice(0, 10).forEach((proc) => {
                catalogoTexto += `• ${proc.nome}`
                if (proc.valorMin && proc.valorMax) {
                    catalogoTexto += ` — ${moeda} ${proc.valorMin} a ${moeda} ${proc.valorMax} (avaliação necessária)`
                } else if (proc.valor) {
                    catalogoTexto += ` — ${moeda} ${proc.valor}`
                }
                if (proc.duracao) catalogoTexto += ` (${proc.duracao})`
                catalogoTexto += '\n'
                if (proc.descricao) catalogoTexto += `  ℹ️ ${proc.descricao}\n`
            })
        } else {
            catalogoTexto += `${labels.semCatalogo}\n`
        }
    }

    // --- Regra de Preço Faixa (valor_min/valor_max) ---
    const temFaixa = procedimentos.some(p => p.valorMin && p.valorMax)
    const regraFaixa = temFaixa ? `
⚠️ REGRA DE PREÇO FAIXA:
Alguns procedimentos têm preço variável (faixa de/até). Para esses:
- Informe que "os valores podem variar de X a Y, dependendo do caso"
- Diga: "Para te passar o valor exato, preciso que a ${nomeProfissional || 'profissional'} avalie pessoalmente."
- SEMPRE puxe para agendar uma avaliação.
` : ''

    // --- Feedbacks da Dra ---
    // Dois tipos: (1) instruções permanentes do painel (clinica.feedbacks) e (2) comandos realtime via WhatsApp (feedback_iara table)
    let feedbackTexto = ''
    
    // Normalizar feedbacks do painel — pode ser string JSON, array, ou null
    let feedbackPainelTexto = ''
    if (clinica.feedbacks) {
        try {
            const raw = clinica.feedbacks
            if (typeof raw === 'string') {
                // Tenta parsear como JSON array (ex: '["regra1","regra2"]')
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                    feedbackPainelTexto = parsed.filter((f: any) => typeof f === 'string' && f.trim()).join('\n- ')
                } else {
                    feedbackPainelTexto = raw.trim()
                }
            } else if (Array.isArray(raw)) {
                // Já é array (ex: vindo do override do simulador)
                feedbackPainelTexto = (raw as string[]).filter(f => typeof f === 'string' && f.trim()).join('\n- ')
            }
        } catch {
            // Se o JSON.parse falhar, usa como string simples
            feedbackPainelTexto = String(clinica.feedbacks).trim()
        }
    }
    
    const temFeedbackPainel = feedbackPainelTexto.length > 0
    const temFeedbackRealtime = feedbacks.length > 0
    if (temFeedbackPainel || temFeedbackRealtime) {
        feedbackTexto = `\n🧠 ${labels.orientacoesDra}:\n`
        // Instruções do painel (campo "Instruções Extras / Feedbacks")
        if (temFeedbackPainel) {
            feedbackTexto += `- ${feedbackPainelTexto}\n`
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

    // --- Promoções Ativas ---
    let promoTexto = ''
    const promos = ctx.promocoesAtivas || []
    if (promos.length > 0) {
        promoTexto = `\n🏷️ PROMOÇÕES ATIVAS (CHEQUE SEMPRE ANTES DE DAR PREÇO):\n`
        promos.forEach(p => {
            promoTexto += `• ${p.nome}`
            if (p.descricao) promoTexto += ` — ${p.descricao}`
            promoTexto += `\n`
            if (p.instrucaoIara) promoTexto += `  📝 Instrução: ${p.instrucaoIara}\n`
            if (p.procedimentos.length > 0) promoTexto += `  Procedimentos inclusos: ${p.procedimentos.join(', ')}\n`
        })
        promoTexto += `⚠️ SEMPRE verifique se o procedimento que a cliente quer está em promoção. Se estiver, INFORME a promoção.\n`
    }

    // --- Estilo de Atendimento (Direta vs Consultiva) ---
    const estilo = clinica.estiloAtendimento || 'direta'
    const regraEstilo = estilo === 'consultiva'
        ? `\n🎯 ESTILO: CONSULTIVO\nAntes de falar preços ou agenda, busque entender a NECESSIDADE da cliente:\n- O que incomoda ela hoje?\n- Há quanto tempo tem esse problema?\n- Já fez algo semelhante antes?\nDepois de entender, RECOMEENDE o procedimento ideal com base nos cadastrados e agende.\nFluxo: Entender → Recomendar → Preço → Agendar.`
        : `\n🎯 ESTILO: DIRETO\nFoco máximo em AGENDAR. Quando a cliente perguntar preço, responda com o valor + ofereça agenda.\nSem enrolação. Poucas perguntas. Fluxo rápido: Preço → Agenda → Confirmação.`

    // --- Montagem final ---
    const linhaProf = nomeProfissional
        ? `PROFISSIONAL RESPONSÁVEL: ${nomeProfissional} (${tratamento === 'Pelo nome' ? 'refira-se pelo primeiro nome apenas' : `use o tratamento "${tratamento}"`})\n`
        : ''
    const agendaTexto = agendaContext ? `\n${agendaContext}\n` : ''
    
    // --- Horário de Funcionamento (importante quando "Sempre Ligada" estiver ativa) ---
    const horarioContext = (ctx.clinicaAbertaAgora !== undefined && !ctx.clinicaAbertaAgora)
        ? `\n⏰ INFORMAÇÃO CRÍTICA DE EXPEDIENTE: A CLÍNICA ESTÁ FECHADA NESTE EXATO MOMENTO.\n- Se a cliente pedir para vir agora ou quiser atendimento imediato, explique que a clínica está fechada e só reabrirá no próximo dia útil/horário comercial.\n- Você AINDA DEVE agendar para dias futuros normalmente. Apenas deixe claro que não há ninguém fisicamente lá agora.\n`
        : ''

    // --- Regra anti-cumprimento-repetitivo ---
    const historico = ctx.historico || []
    const temHistorico = historico.length > 0
    const regraHistorico = temHistorico
        ? `\n⚠️ REGRA CRÍTICA — NÃO REPITA SAUDAÇÃO NEM SE APRESENTE:
Vocês JÁ estão conversando (há ${historico.length} mensagens no histórico).
- NÃO cumprimente de novo ("Oi", "Tudo bem?", "Olá", etc).
- NÃO se apresente de novo ("Sou a ${clinica.nomeAssistente || 'IARA'}, secretária de..."). Ela JÁ sabe quem você é.
- NÃO pergunte "o que te trouxe aqui?" se ela JÁ disse o que quer no histórico.
- Continue a conversa naturalmente no EXATO PONTO onde parou. Releia o histórico e continue.
- Se a cliente voltou depois de um tempo (ex: "oi boa tarde"), responda algo como: "Oi [nome]! Continuando sobre [assunto anterior]..." — retome de onde parou.
Só cumprimente/apresente se for a PRIMEIRÍSSIMA mensagem (histórico = 0 mensagens).`
        : ''

    return `${roleDesc}
🎯 SUA META #1: AGENDAR. Toda conversa deve caminhar para um agendamento.

🚫 ESCOPO OBRIGATÓRIO (LEIA COM ATENÇÃO MÁXIMA):
- Você SÓ existe para AGENDAR procedimentos estéticos/clínicos listados no CATÁLOGO abaixo. NADA MAIS.
- Você SÓ fala sobre os procedimentos listados no CATÁLOGO abaixo. Qualquer outro serviço, área ou tema que NÃO esteja no catálogo → "Não oferecemos esse serviço. Posso te ajudar com nossos procedimentos?"
- NUNCA INICIE conversa sobre: marketing, posicionamento, branding, redes sociais, faturamento, consultoria, mentoria, cursos de negócios, estratégia digital, ou QUALQUER tema que não seja agendamento de procedimento estético.
- NUNCA mencione o nome da clínica ou da profissional como se fosse um(a) consultor(a), mentor(a) ou especialista em marketing. Você é SECRETÁRIA. Sua única função é agendar procedimentos.
- Se a cliente chega com mensagem genérica (ex: "oi", "olá"), responda com acolhimento + pergunte qual procedimento ela tem interesse. NÃO invente contexto sobre o que a cliente "quer" ou "precisa".
- Se a mensagem contém um @ (Instagram), NÃO faça análise do perfil. NÃO comente sobre o perfil. Apenas acolha e pergunte como pode ajudar com os procedimentos.
- NUNCA compartilhe, copie, invente ou repita números de telefone/WhatsApp de NENHUMA fonte, nem da mensagem da cliente.
- Se a mensagem da cliente parecer um formulário (campos "Nome:", "WhatsApp:", "Instagram:") → responda só "Oi [nome]! Obrigada pelo contato 😊 Como posso te ajudar?"

💰 REGRAS DE PREÇO E CATÁLOGO:
- NUNCA liste todos os procedimentos com preços de uma vez como um cardápio. Isso soa robotizado e não vende.
- Se a cliente perguntar "quais serviços/procedimentos vocês fazem?": diga de forma natural os NOMES dos principais procedimentos (sem preço!) e pergunte qual desperta mais o interesse dela.
- SÓ fale o preço DEPOIS de: (1) entender o que ela busca, (2) explicar como o procedimento resolve o problema DELA, (3) mostrar o valor/transformação.
- Se a cliente insistir no preço direto: diga o valor com confiança + parcelas se houver. Sem enrolar.
- NUNCA mostre o preço entre parênteses com duração como se fosse uma tabela. Fale naturalmente: "O investimento é de R$ X, e a sessão dura Y minutes."

🔍 SONDAGEM OBRIGATÓRIA (antes de falar de procedimento):
- Quando a cliente demonstra interesse em algo, faça pelo menos UMA pergunta de sondagem antes de apresentar a solução:
  → "Você já fez esse procedimento antes?"
  → "O que te incomoda hoje?"
  → "Tem alguma referência de como gostaria que ficasse?"
- Essa pergunta ajuda a personalizar a resposta e mostrar cuidado.
- NÃO faça mais do que 1 pergunta por mensagem.
${regraEstilo}${regraFaixa}${catalogoTexto}${promoTexto}${feedbackTexto}${memoriaTexto}
${linhaProf}${horarioContext}${agendaTexto}${cofre.leisImutaveis}

${cofre.roteiroVendas}

${cofre.arsenalDeObjecoes}

${labels.comoFalar}
${regraHistorico}
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
    const modelo = modelOverride || 'claude-sonnet-4-5'

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
    // O histórico vem do banco: mais recente primeiro. Limitamos a 20 e invertemos para cronológico.
    // ANTES: era 12 — insuficiente para conversas ativas, IA perdia contexto e se re-apresentava.
    const historyLimit = 20
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
