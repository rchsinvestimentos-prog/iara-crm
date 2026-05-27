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
import { parseFuncionalidades } from './types'

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
    cursosAtivos?: { nome: string; modalidade: string; valor: number; duracao: string | null; descricao: string | null; link: string | null }[]
    combosAtivos?: { nome: string; descricao: string | null; valorOriginal: number; valorCombo: number; procedimentos: string[] }[]
}

/**
 * Monta o system prompt completo da IARA.
 * 
 * Junta tudo: identidade + procedimentos + feedbacks + memória
 * + cofre (leis, arsenal, roteiro) + como falar.
 * Obs: Histórico agora é passado diretamente na array de mensagens da API.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
    const { clinica, mensagem, pushName, tipoEntrada, procedimentos, feedbacks, memoria, agendaContext, profissionais, cursosAtivos, combosAtivos } = ctx

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
    
    // Data de hoje para a IA saber calcular "amanhã", "próxima semana", etc.
    const agora = new Date()
    const tz = clinica.timezone || 'America/Sao_Paulo'
    const dataHojeFormatada = agora.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    const hojeISO = agora.toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
    
    // Calcular amanhã
    const amanha = new Date(agora.getTime() + 24 * 60 * 60 * 1000)
    const amanhaISO = amanha.toLocaleDateString('en-CA', { timeZone: tz })

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
                if (proc.duracao) catalogoTexto += ` (${proc.duracao}min)`
                catalogoTexto += '\n'
                if (proc.descricao) catalogoTexto += `  ℹ️ ${proc.descricao}\n`
            })
        } else {
            catalogoTexto += `${labels.semCatalogo}\n`
        }
    }

    // --- Instrução de Agendamento (OBRIGATÓRIA em todos os modos) ---
    catalogoTexto += `\n📅 COMO AGENDAR (REGRA OBRIGATÓRIA):
📆 HOJE é ${dataHojeFormatada} (${hojeISO}). Amanhã = ${amanhaISO}.
Quando a cliente CONFIRMAR data + horário, você DEVE incluir NO FINAL da sua resposta este marcador exatamente assim:
[AGENDAR:NomeDoProcedimento|YYYY-MM-DD|HH:MM|DuracaoEmMinutos${multiProf ? '|IdDoProfissional' : ''}]
Exemplos:
- "Perfeito, agendei!" [AGENDAR:Micropigmentação|${hojeISO}|14:00|60${multiProf ? '|prof-id-aqui' : ''}]
- "Confirmado para amanhã às 10h!" [AGENDAR:Botox|${amanhaISO}|10:00|30${multiProf ? '|prof-id-aqui' : ''}]
IMPORTANTE: O sistema remove esse marcador de forma 100% automática antes do envio, garantindo que a cliente NÃO o veja. Por isso, você DEVE sim colocá-lo no final do seu texto sempre que confirmar um horário, caso contrário a consulta não será marcada no sistema!
`


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
    // NOTA: feedbacks NÃO são mais injetados aqui no meio do prompt.
    // Eles são movidos para o FINAL do prompt com prioridade máxima (seção "INSTRUÇÕES DA DONA").
    
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

    // --- Cursos da Clínica ---
    let cursosTexto = ''
    const cursos = cursosAtivos || []
    if (cursos.length > 0) {
        const moedaLocal = clinica.moeda === 'USD' ? '$' : clinica.moeda === 'EUR' ? '€' : 'R$'
        cursosTexto = `\n🎓 CURSOS QUE A CLÍNICA VENDE:\n`
        cursos.forEach(c => {
            cursosTexto += `• ${c.nome}`
            if (c.modalidade) cursosTexto += ` (${c.modalidade})`
            if (c.valor) cursosTexto += ` — ${moedaLocal} ${c.valor}`
            if (c.duracao) cursosTexto += ` | Duração: ${c.duracao}`
            cursosTexto += '\n'
            if (c.descricao) cursosTexto += `  ℹ️ ${c.descricao}\n`
            if (c.link) cursosTexto += `  🔗 Link: ${c.link}\n`
        })
        cursosTexto += `⚠️ Se a cliente perguntar sobre cursos, apresente as opções acima. Se tiver link, envie o link para inscrição.\n`
    }

    // --- Combos da Clínica ---
    let combosTexto = ''
    const combos = combosAtivos || []
    if (combos.length > 0) {
        const moedaLocal = clinica.moeda === 'USD' ? '$' : clinica.moeda === 'EUR' ? '€' : 'R$'
        combosTexto = `\n📦 COMBOS DE PROCEDIMENTOS DISPONÍVEIS:\n`
        combos.forEach(c => {
            combosTexto += `• Combo: ${c.nome}`
            if (c.valorCombo) combosTexto += ` — Por apenas ${moedaLocal} ${c.valorCombo}`
            if (c.valorOriginal) combosTexto += ` (Valor original: ${moedaLocal} ${c.valorOriginal})`
            combosTexto += `\n`
            if (c.descricao) combosTexto += `  ℹ️ Descrição: ${c.descricao}\n`
            if (c.procedimentos.length > 0) combosTexto += `  Procedimentos inclusos: ${c.procedimentos.join(', ')}\n`
        })
        combosTexto += `⚠️ Se a cliente perguntar sobre combos ou quiser fazer múltiplos procedimentos que estão inclusos em algum combo, ofereça e explique o combo acima.\n`
    }

    // --- Estilo de Atendimento (Direta vs Consultiva) ---
    const estilo = clinica.estiloAtendimento || 'direta'
    const regraEstilo = estilo === 'consultiva'
        ? `\n🎯 ESTILO: CONSULTIVO\nAntes de falar preços ou agenda, busque entender a NECESSIDADE da cliente:\n- O que incomoda ela hoje?\n- Há quanto tempo tem esse problema?\n- Já fez algo semelhante antes?\nDepois de entender, RECOMEENDE o procedimento ideal com base nos cadastrados e agende.\nFluxo: Entender → Recomendar → Preço → Agendar.`
        : `\n🎯 ESTILO: DIRETO\nFoco máximo em AGENDAR. Quando a cliente perguntar preço, responda com o valor + ofereça agenda.\nSem enrolação. Poucas perguntas. Fluxo rápido: Preço → Agenda → Confirmação.`

    // --- Informações da Clínica (diferenciais, endereço, políticas, etc.) ---
    const infoClinica: string[] = []
    if (clinica.diferenciais) infoClinica.push(`Diferenciais: ${clinica.diferenciais}`)
    if (clinica.endereco) infoClinica.push(`Endereço/Localização: ${clinica.endereco}`)
    if (clinica.cuidadosPos) infoClinica.push(`Cuidados pós-procedimento padrão: ${clinica.cuidadosPos}`)
    if (clinica.politicaCancelamento) infoClinica.push(`Política de cancelamento: ${clinica.politicaCancelamento}`)
    // funcionalidades: NÃO injetar JSON bruto — os toggles são usados programaticamente pelo pipeline
    // Bio e especialidade da profissional principal
    if (!multiProf && profissionais && profissionais.length === 1) {
        const prof = profissionais[0]
        if (prof.bio) infoClinica.push(`Sobre a profissional: ${prof.bio}`)
        if (prof.especialidade) infoClinica.push(`Especialidade: ${prof.especialidade}`)
    }
    // Horário de funcionamento geral
    if (clinica.horarioInicio && clinica.horarioFim) {
        let horarioStr = `Horário de funcionamento: ${clinica.horarioInicio} às ${clinica.horarioFim}`
        if (clinica.almocoSemana) horarioStr += ` (almoço: ${clinica.almocoSemana})`
        if (clinica.atendeSabado && clinica.horarioSabado) {
            horarioStr += ` | Sábado: ${clinica.horarioSabado}`
            if (clinica.almocoSabado) horarioStr += ` (almoço: ${clinica.almocoSabado})`
        }
        if (clinica.atendeDomingo && clinica.horarioDomingo) {
            horarioStr += ` | Domingo: ${clinica.horarioDomingo}`
            if (clinica.almocoDomingo) horarioStr += ` (almoço: ${clinica.almocoDomingo})`
        }
        if (clinica.atendeFeriado && clinica.horarioFeriado) {
            horarioStr += ` | Feriados: ${clinica.horarioFeriado}`
        }
        infoClinica.push(horarioStr)
    }
    if (clinica.antecedenciaMinima) infoClinica.push(`Antecedência mínima para agendar: ${clinica.antecedenciaMinima}`)

    // --- Formas de pagamento ---
    if (clinica.formasPagamento && typeof clinica.formasPagamento === 'object') {
        const fp = clinica.formasPagamento as any
        const formas: string[] = []
        if (fp.pix) {
            let pixStr = 'Pix'
            if (fp.chavePix && String(fp.chavePix).trim() !== '') {
                pixStr += ` (Chave PIX: ${String(fp.chavePix).trim()})`
            }
            formas.push(pixStr)
        }
        if (fp.dinheiro) formas.push('Dinheiro')
        if (fp.credito) formas.push(`Cartão de crédito${fp.parcelasMax ? ` (até ${fp.parcelasMax}x)` : ''}`)
        if (fp.debito) formas.push('Cartão de débito')
        if (fp.transferencia) formas.push('Transferência bancária')
        if (fp.outros) formas.push(fp.outros)
        if (formas.length > 0) infoClinica.push(`Formas de pagamento aceitas: ${formas.join(', ')}`)
    }

    // --- Descontos ---
    if (clinica.aceitaDescontos) {
        infoClinica.push(`Desconto: Pode oferecer até ${clinica.descontoMaximo || 10}% de desconto se a cliente negociar. Use com moderação para fechar o agendamento.`)
    } else if (clinica.aceitaDescontos === false) {
        infoClinica.push(`Desconto: NÃO oferecemos descontos. Se a cliente pedir, diga que os valores já são justos e competitivos.`)
    }

    // --- Regras dos toggles de funcionalidades ---
    const funcs = parseFuncionalidades(clinica.funcionalidades)
    if (!funcs.dar_desconto) {
        infoClinica.push(`⛔ REGRA: NÃO ofereça NENHUM tipo de desconto, promoção ou abatimento. Se a cliente pedir desconto, diga que os valores já são especiais e justos.`)
    }
    if (!funcs.parcelamento) {
        infoClinica.push(`⛔ REGRA: NÃO mencione parcelamento ou divisão de pagamento. Se a cliente perguntar, diga que o pagamento é à vista.`)
    }
    if (funcs.enviar_endereco && clinica.endereco) {
        infoClinica.push(`📍 REGRA: Ao confirmar um agendamento, SEMPRE envie o endereço da clínica para a cliente.`)
    }

    const sobreClinicaTexto = infoClinica.length > 0
        ? `\n📋 SOBRE A CLÍNICA (use essas informações quando a cliente perguntar):\n${infoClinica.map(i => `- ${i}`).join('\n')}\n`
        : ''

    // --- Tom de conversa (humor, emojis, tom) ---
    const configTom: string[] = []
    if (clinica.tomAtendimento && clinica.tomAtendimento !== 'padrao') {
        const tons: Record<string, string> = {
            'formal': 'Use tom formal e profissional. Evite gírias e coloquialismos.',
            'informal': 'Use tom informal e próximo. Gírias leves são bem-vindas.',
            'amigavel': 'Use tom amigável e acolhedor. Seja próxima e calorosa.',
            'descontraido': 'Use tom descontraído e leve. Bom humor natural.',
            'luxo': 'Use tom sofisticado e premium. Linguagem elegante e refinada.',
        }
        if (tons[clinica.tomAtendimento]) configTom.push(tons[clinica.tomAtendimento])
    }
    if (clinica.humor) {
        const humorMap: Record<string, string> = {
            'nenhum': 'ZERO humor — seja 100% direta e profissional. Sem brincadeiras, piadas ou descontração.',
            'pouco': 'Humor discreto — seja profissional com leve descontração quando apropriado.',
            'amigavel': 'Humor amigável — seja leve e acolhedora, com naturalidade.',
            'moderado': 'Humor moderado — use bom humor para deixar a conversa agradável.',
            'muito': 'Humor alto — seja descontraída, use expressões engraçadas e divertidas.',
        }
        configTom.push(humorMap[clinica.humor] || `Nível de humor: ${clinica.humor}`)
    }
    // Config de emojis (será reforçada no final do prompt)
    const emojiLevel = clinica.emojis || 'moderado'
    if (emojiLevel) {
        const emojiConfig: Record<string, string> = {
            'nenhum': 'NÃO use emojis em NENHUMA circunstância. ZERO emojis.',
            'pouco': 'Use emojis com moderação (máximo 1-2 por mensagem).',
            'moderado': 'Use emojis normalmente para dar vida às mensagens.',
            'muito': 'Use bastante emojis para dar vida e expressão às mensagens.',
        }
        if (emojiConfig[emojiLevel]) configTom.push(emojiConfig[emojiLevel])
    }
    if (clinica.mensagemBoasVindas) configTom.push(`Na PRIMEIRA mensagem com uma cliente NOVA, use esta saudação personalizada: "${clinica.mensagemBoasVindas}"`)
    if (clinica.fraseDespedida) configTom.push(`Ao encerrar a conversa (após confirmar agendamento), finalize com: "${clinica.fraseDespedida}"`)

    const configTomTexto = configTom.length > 0
        ? `\n🎨 PERSONALIZAÇÃO DE TOM:\n${configTom.map(t => `- ${t}`).join('\n')}\n`
        : ''

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
    // A regra precisa estar NO INÍCIO do prompt para máxima compliance
    const regraHistorico = temHistorico
        ? `\n🚨🚨🚨 REGRA #0 — PRIORIDADE MÁXIMA — LEIA ANTES DE TUDO:
VOCÊS JÁ ESTÃO NO MEIO DE UMA CONVERSA (${historico.length} mensagens trocadas).
PROIBIDO começar sua resposta com "Oi", "Olá", "Oi ${ctx.pushName}", "Tudo bem?", ou qualquer saudação.
PROIBIDO se apresentar ("Sou a ${clinica.nomeAssistente || 'IARA'}..."). A cliente JÁ sabe quem você é.
Comece direto respondendo o que a cliente pediu. Sem saudação. Sem apresentação.
EXCEÇÃO ÚNICA: se a cliente mandou uma saudação ("oi", "boa tarde"), responda com no máximo "Oi!" e vá direto ao ponto.
🚨🚨🚨`
        : ''

    // --- Regra de escopo (condicional se clínica vende cursos) ---
    const vendemCursos = (cursosAtivos || []).length > 0
    const escopoTexto = vendemCursos
        ? `🚫 ESCOPO OBRIGATÓRIO (LEIA COM ATENÇÃO MÁXIMA):
- Você SÓ existe para AGENDAR procedimentos estéticos/clínicos listados no CATÁLOGO abaixo E para divulgar/vender os CURSOS da clínica. NADA MAIS. [V3]
- Você SÓ fala sobre os procedimentos listados no CATÁLOGO e os CURSOS listados abaixo. Qualquer outro serviço, área ou tema que NÃO esteja no catálogo → "Não oferecemos esse serviço. Posso te ajudar com nossos procedimentos ou cursos?"
- NUNCA INICIE conversa sobre: marketing, posicionamento, branding, redes sociais, faturamento, consultoria, mentoria, estratégia digital, ou QUALQUER tema que não seja agendamento de procedimento estético ou os cursos da clínica.
- AMNÉSIA DE CATÁLOGO: O CATÁLOGO abaixo é a ÚNICA fonte da verdade atualizada neste exato segundo. Se o histórico da conversa mencionar qualquer procedimento, preço ou profissional que NÃO ESTEJA mais no catálogo abaixo, IGNORE O HISTÓRICO. Assuma que o serviço foi descontinuado ou que você cometeu um erro anteriormente.`
        : `🚫 ESCOPO OBRIGATÓRIO (LEIA COM ATENÇÃO MÁXIMA):
- Você SÓ existe para AGENDAR procedimentos estéticos/clínicos listados no CATÁLOGO abaixo. NADA MAIS. [V2]
- Você SÓ fala sobre os procedimentos listados no CATÁLOGO abaixo. Qualquer outro serviço, área ou tema que NÃO esteja no catálogo → "Não oferecemos esse serviço. Posso te ajudar com nossos procedimentos?"
- NUNCA INICIE conversa sobre: marketing, posicionamento, branding, redes sociais, faturamento, consultoria, mentoria, cursos de negócios, estratégia digital, ou QUALQUER tema que não seja agendamento de procedimento estético.
- AMNÉSIA DE CATÁLOGO: O CATÁLOGO abaixo é a ÚNICA fonte da verdade atualizada neste exato segundo. Se o histórico da conversa mencionar qualquer procedimento, preço ou profissional que NÃO ESTEJA mais no catálogo abaixo, IGNORE O HISTÓRICO. Assuma que o serviço foi descontinuado ou que você cometeu um erro anteriormente.`

    // --- Sanitizar emojis do cofre quando config diz 'nenhum' ---
    let cofreLeisFinais = cofre.leisImutaveis
    let cofreRoteiroFinal = cofre.roteiroVendas
    let cofreObjecoesFinal = cofre.arsenalDeObjecoes
    let comoFalarFinal = labels.comoFalar
    if (emojiLevel === 'nenhum') {
        const stripEmojis = (text: string): string => text
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
            .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
            .replace(/[\u{2600}-\u{26FF}]/gu, '')
            .replace(/[\u{2700}-\u{27BF}]/gu, '')
            .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
            .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
            .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
            .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
            .replace(/[\u{200D}]/gu, '')
            .replace(/[\u{20E3}]/gu, '')
            .replace(/[\u{E0020}-\u{E007F}]/gu, '')
            .replace(/[\u{2702}-\u{27B0}]/gu, '')
            .replace(/[\u{FE0F}]/gu, '')
            .replace(/\s{2,}/g, ' ')
        cofreLeisFinais = stripEmojis(cofreLeisFinais)
        cofreRoteiroFinal = stripEmojis(cofreRoteiroFinal)
        cofreObjecoesFinal = stripEmojis(cofreObjecoesFinal)
        comoFalarFinal = stripEmojis(comoFalarFinal)
    }

    // --- Bloco de configurações da dona (prioridade máxima, vai no FINAL do prompt) ---
    const configDonaLinhas: string[] = []
    // Feedbacks do painel (campo clinica.feedbacks)
    if (temFeedbackPainel) {
        configDonaLinhas.push(`- ${feedbackPainelTexto}`)
    }
    // Feedbacks realtime (tabela feedback_iara via WhatsApp)
    feedbacks.forEach((fb) => {
        configDonaLinhas.push(`- ${fb.regra}`)
    })
    // Config de emojis reforçada
    if (emojiLevel === 'nenhum') {
        configDonaLinhas.push('- PROIBIDO usar emojis. ZERO emojis na resposta. Sem exceção.')
    } else if (emojiLevel === 'pouco') {
        configDonaLinhas.push('- Use no MÁXIMO 1-2 emojis por mensagem. Moderação total.')
    }
    // Tom reforçado
    if (clinica.tomAtendimento === 'formal') {
        configDonaLinhas.push('- Tom FORMAL. Nada de gírias, "vc", "tá", "pra". Linguagem profissional.')
    }

    const configDonaTexto = configDonaLinhas.length > 0
        ? `\n🚨🚨🚨 INSTRUÇÕES DA DONA DA CLÍNICA — PRIORIDADE MÁXIMA 🚨🚨🚨
Essas instruções foram definidas PELA DONA DA CLÍNICA e TÊM PRIORIDADE SOBRE QUALQUER OUTRA REGRA DESTE PROMPT.
Se algo abaixo contradisser regras anteriores, OBEDEÇA O QUE ESTÁ AQUI:
${configDonaLinhas.join('\n')}
🚨🚨🚨 FIM DAS INSTRUÇÕES DA DONA — PRIORIDADE MÁXIMA 🚨🚨🚨`
        : ''

    return `${roleDesc}
${regraHistorico}
🎯 SUA META #1: AGENDAR. Toda conversa deve caminhar para um agendamento.

${escopoTexto}
- NUNCA mencione o nome da clínica ou da profissional como se fosse um(a) consultor(a), mentor(a) ou especialista em marketing. Você é SECRETÁRIA. Sua única função é agendar procedimentos.
- Se a cliente chega com mensagem genérica (ex: "oi", "olá"), responda com acolhimento + pergunte qual procedimento ela tem interesse. NÃO invente contexto sobre o que a cliente "quer" ou "precisa".
- Se a mensagem contém um @ (Instagram), NÃO faça análise do perfil. NÃO comente sobre o perfil. Apenas acolha e pergunte como pode ajudar com os procedimentos.
- NUNCA compartilhe, copie, invente ou repita números de telefone/WhatsApp de NENHUMA fonte, nem da mensagem da cliente.
- Se a mensagem da cliente parecer um formulário (campos "Nome:", "WhatsApp:", "Instagram:") → responda só "Oi [nome]! Obrigada pelo contato! Como posso te ajudar?"

💰 REGRAS DE PREÇO E CATÁLOGO:
- NUNCA liste todos os procedimentos com preços de uma vez como um cardápio. Isso soa robotizado e não vende.
- Se a cliente perguntar "quais serviços/procedimentos vocês fazem?": diga de forma natural os NOMES dos principais procedimentos (sem preço!) e pergunte qual desperta mais o interesse dela.
- SÓ fale o preço DEPOIS de: (1) entender o que ela busca, (2) explicar como o procedimento resolve o problema DELA, (3) mostrar o valor/transformação.
- Se a cliente insistir no preço direto: diga o valor com confiança + parcelas se houver. Sem enrolar.
- NUNCA mostre o preço entre parênteses com duração como se fosse uma tabela. Fale naturalmente: "O investimento é de R$ X, e a sessão dura Y minutos."

🔍 SONDAGEM OBRIGATÓRIA (antes de falar de procedimento):
- Quando a cliente demonstra interesse em algo, faça pelo menos UMA pergunta de sondagem antes de apresentar a solução:
  → "Você já fez esse procedimento antes?"
  → "O que te incomoda hoje?"
  → "Tem alguma referência de como gostaria que ficasse?"
- Essa pergunta ajuda a personalizar a resposta e mostrar cuidado.
- NÃO faça mais do que 1 pergunta por mensagem.
${regraEstilo}${regraFaixa}${catalogoTexto}${promoTexto}${memoriaTexto}${sobreClinicaTexto}${configTomTexto}
${linhaProf}${horarioContext}${agendaTexto}${cursosTexto}${combosTexto}${cofreLeisFinais}

${funcs.vendas_7_passos ? cofreRoteiroFinal : '(Método de vendas desativado pela clínica — foque em informar preços e agendar diretamente.)'}

${cofreObjecoesFinal}

${comoFalarFinal}
NÃO VÁ DIRETO PARA A SONDAGEM. Primeiro, acolhimento. Siga PASSO A PASSO, uma mensagem por vez.
EXCEÇÃO: Se a cliente quer AGENDAR e já sabe o que quer, é FECHAMENTO — não enrole.
NOME DA CLIENTE COM QUEM VOCÊ ESTÁ FALANDO AGORA: ${nomeCliente}
${tipoEntrada === 'audio' ? `\n🎤 REGRA DE ÁUDIO: Sua resposta será convertida em VOZ. Escreva TODAS as palavras POR EXTENSO:\n- NUNCA use: HRS, h, min, Dra., Dr., nº, R$, %, etc.\n- Escreva: "horas", "minutos", "Doutora", "Doutor", "número", "reais", "por cento"\n- Escreva números de telefone dígito por dígito\n- NÃO use emojis (eles não são falados)\n` : ''}
${temHistorico ? `\n🔁 LEMBRETE FINAL: NÃO comece com "Oi" — esta conversa já está em andamento.` : ''}
${configDonaTexto}`
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
