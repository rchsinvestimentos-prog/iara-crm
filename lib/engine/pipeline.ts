// ============================================
// PIPELINE — O Orquestrador Completo
// ============================================
// Ponto de entrada: recebe mensagem, faz TUDO.
//
// FLUXO COMPLETO (baseado no n8n original):
// 1. Blacklist → tá bloqueado?
// 2. Catraca → clínica ativa? créditos?
// 3. É a dona? → pausa 10 min
// 4. Triagem de mídia → foto/vídeo → ack + alerta Dra
// 5. Pausa ativa? (dona falando ou mídia)
// 6. Horário de expediente
// 7. Cache → já respondeu isso?
// 8. Se áudio → transcreve (Whisper)
// 9. Busca contexto (histórico, procedimentos, feedbacks)
// 10. Monta prompt → chama IA
// 11. Salva no cache
// 12. Determina saída (texto ou áudio TTS)
// 13. Envia resposta
// 14. Salva no histórico
// 15. Desconta crédito

import * as catraca from './catraca'
import * as audio from './audio'
import * as memory from './memory'
import * as aiEngine from './ai-engine'
import * as sender from './sender'
import * as logger from './logger'
import type { MensagemRecebida, DadosClinica } from './types'
import { prisma } from '@/lib/prisma'
import { createHash } from 'crypto'

// ============================================
// MAIN PIPELINE
// ============================================

export async function processMessage(msg: MensagemRecebida): Promise<void> {
    const startTime = Date.now()

    // ================================================
    // 1. CATRACA — Pode processar?
    // ================================================
    const acesso = await catraca.checkAccess(msg.instancia, msg.telefone)

    if (!acesso.permitido) {
        if (acesso.mensagemBloqueio && acesso.motivo === 'sem_creditos' && acesso.clinica) {
            await sender.sendText(
                { instancia: msg.instancia, telefone: msg.telefone, apikey: acesso.clinica.evolutionApikey || undefined },
                acesso.mensagemBloqueio
            )
        }
        console.log(`[Pipeline] ⛔ Bloqueado: ${acesso.motivo} (inst: ${msg.instancia})`)
        return
    }

    const clinica = acesso.clinica!
    const isDoutora = acesso.isDoutora || false

    // ================================================
    // 2. BLACKLIST — Número bloqueado?
    // ================================================
    if (!isDoutora && isBlacklisted(clinica, msg.telefone, msg.canal)) {
        console.log(`[Pipeline] 🚫 Blacklist: ${msg.telefone}`)
        return // Silêncio total
    }

    // ================================================
    // 3. É A DONA / isFromMe? → Pausas
    // ================================================
    // isFromMe = Dra respondeu direto na conversa com a cliente
    // → Pausa 10 min (anti-duplicação) + Pausa 3h (Dra assumiu)
    // → Avisa a Dra que IARA vai pausar
    if (msg.isFromMe || isDoutora) {
        const sendOpts = { instancia: msg.instancia, telefone: msg.telefone, apikey: clinica.evolutionApikey || undefined }
        const nomeIA = clinica.nomeAssistente || 'Iara'

        // Se é feedback ("iara:" ou "feedback:") — não é intervenção humana
        if (isDoutora) {
            const feedback = memory.detectFeedback(msg.mensagem, msg.telefone, clinica.whatsappDoutora || '')
            if (feedback.isFeedback) {
                await memory.saveDraFeedback(clinica.id, feedback.regra)
                await sender.sendText(sendOpts, 'Perfeito, Dra! ✅ Feedback registrado.')
                return
            }
        }

        // Pausa 10 min (SEMPRE — anti-duplicação)
        await pausarConversa(clinica.id, msg.telefone, 10, 'intervencao_humana')

        // Se isFromMe (Dra respondeu direto ao cliente) → pausa 3h
        if (msg.isFromMe) {
            await pausarConversa(clinica.id, msg.telefone, 180, 'dra_assumiu')
            console.log(`[Pipeline] 👩‍⚕️ Dra assumiu → pausa 3h para ${msg.telefone}`)

            // Avisar a Dra que IARA vai pausar
            if (clinica.whatsappDoutora) {
                await sender.sendText(
                    { instancia: msg.instancia, telefone: clinica.whatsappDoutora, apikey: clinica.evolutionApikey || undefined },
                    `Dra, vi que você respondeu diretamente para *${msg.telefone}* 👩‍⚕️\n\nVou pausar o atendimento automático dessa cliente por *3 horas* pra você continuar tranquilamente.\n\nSe quiser que eu volte antes, é só me mandar:\n✅ *"${nomeIA} volta"* — retomo o atendimento agora\n⏰ *"${nomeIA} volta em X min"* — retomo em X minutos`
                )
            }
        } else {
            console.log(`[Pipeline] 👩‍⚕️ Intervenção humana → pausa 10 min para ${msg.telefone}`)
        }

        return
    }

    // ================================================
    // 4. TRIAGEM DE MÍDIA — Foto/Vídeo = Ack + Alerta Dra (SEM pausa)
    // ================================================
    if (msg.tipoMensagem === 'image' || msg.tipoMensagem === 'video') {
        await handleMediaTriage(clinica, msg)
        return // Não processa com IA — espera decisão da Dra
    }

    // ================================================
    // 5. PAUSA ATIVA? (dona falando ou mídia anterior)
    // ================================================
    const pausaAtiva = await checkPausa(clinica.id, msg.telefone)
    if (pausaAtiva) {
        console.log(`[Pipeline] ⏸️ Pausa ativa para ${msg.telefone}`)
        return // Silêncio — a dona tá atendendo
    }

    // ================================================
    // 6. HORÁRIO DE EXPEDIENTE
    // ================================================
    const horario = checkBusinessHours(clinica)
    if (!horario.aberto) {
        await handleForaDoHorario(clinica, msg, horario.msgFechado)
        console.log(`[Pipeline] 🌙 Fora do horário: ${horario.debugInfo}`)
        return
    }

    // ================================================
    // 7. SE ÁUDIO → TRANSCREVER
    // ================================================
    let textoMensagem = msg.mensagem
    let tipoEntrada: 'text' | 'audio' = msg.tipoMensagem === 'audio' ? 'audio' : 'text'

    if (msg.tipoMensagem === 'audio') {
        let audioData = msg.audioBase64

        if (!audioData) {
            console.log(`[Pipeline] 🎤 Sem base64 inline, baixando da Evolution... (instance: ${msg.instancia}, msgId: ${msg.requestId})`)
            audioData = await audio.downloadAudioFromEvolution(
                msg.instancia, msg.requestId, clinica.evolutionApikey || undefined, msg.rawMessage
            ) || undefined

            // Retry após 2s se falhou (a Evolution às vezes demora pra processar o media)
            if (!audioData) {
                console.log(`[Pipeline] 🔄 Retry download áudio em 2s...`)
                await new Promise(r => setTimeout(r, 2000))
                audioData = await audio.downloadAudioFromEvolution(
                    msg.instancia, msg.requestId, clinica.evolutionApikey || undefined, msg.rawMessage
                ) || undefined
            }
        }

        if (audioData) {
            const transcricao = await audio.transcribeAudio(audioData)
            if (transcricao) {
                textoMensagem = `[ÁUDIO RECEBIDO E TRANSCRITO PARA VOCÊ]: ${transcricao}`
                tipoEntrada = 'audio'
                console.log(`[Pipeline] ✅ Áudio transcrito: "${transcricao.slice(0, 60)}..."`)
            } else {
                // Whisper falhou na transcrição — pedir pra repetir de forma natural
                textoMensagem = '[A cliente enviou um áudio mas o sistema não conseguiu baixar o áudio. Peça com carinho para ela enviar a mensagem por texto, dizendo que no momento está com dificuldade em ouvir áudios.]'
                console.log(`[Pipeline] ⚠️ Whisper falhou na transcrição`)
            }
        } else {
            // Não conseguiu baixar o áudio de jeito nenhum
            textoMensagem = '[A cliente enviou um áudio mas o sistema não conseguiu baixar o áudio. Peça com carinho para ela enviar a mensagem por texto, dizendo que no momento está com dificuldade em ouvir áudios.]'
            console.log(`[Pipeline] ❌ Não conseguiu baixar áudio da Evolution`)
        }
    }

    // ================================================
    // 8. CACHE — Já respondeu isso recentemente?
    // ================================================
    const cacheHit = await checkCache(clinica.id, textoMensagem)
    if (cacheHit) {
        console.log(`[Pipeline] 💰 Cache hit! Economizando IA.`)
        // Usa resposta cacheada mas ainda envia e salva
        await finalizarResposta(clinica, msg, cacheHit, textoMensagem, tipoEntrada, startTime, true)
        return
    }

    // ================================================
    // 9. BUSCAR CONTEXTO
    // ================================================
    const [historico, procedimentosRaw, feedbacks, memoriaCliente] = await Promise.all([
        memory.getConversationHistory(clinica.id, msg.telefone),
        buscarProcedimentos(clinica.id),
        memory.getDraFeedbacks(clinica.id),
        memory.getClientMemory(clinica.id, msg.telefone),
    ])

    // ================================================
    // 10. MONTAR PROMPT + CHAMAR IA
    // ================================================
    const systemPrompt = aiEngine.buildSystemPrompt({
        clinica,
        mensagem: textoMensagem,
        pushName: msg.pushName,
        tipoEntrada,
        historico,
        procedimentos: procedimentosRaw,
        feedbacks,
        memoria: memoriaCliente,
    })

    const resposta = await aiEngine.callAI(
        systemPrompt,
        textoMensagem,
        (clinica.configuracoes as any)?.modelo_sonnet
    )

    // ================================================
    // 11. SALVAR NO CACHE
    // ================================================
    await saveCache(clinica.id, textoMensagem, resposta.texto, resposta.modelo)

    // ================================================
    // 12-15. FINALIZAR (enviar, salvar, descontar)
    // ================================================
    await finalizarResposta(clinica, msg, resposta.texto, textoMensagem, tipoEntrada, startTime, false)
}

// ============================================
// HELPERS
// ============================================

/** Finaliza: limpa texto, decide saída, envia, salva, desconta. */
async function finalizarResposta(
    clinica: DadosClinica,
    msg: MensagemRecebida,
    respostaTexto: string,
    textoMensagemOriginal: string,
    tipoEntrada: 'text' | 'audio',
    startTime: number,
    fromCache: boolean
) {
    // Determinar saída
    const configSaida = audio.determineOutputType(clinica, tipoEntrada === 'audio')

    let audioBase64Resposta: string | null = null
    if (configSaida.tipoSaida === 'audio') {
        audioBase64Resposta = await audio.generateTTS(respostaTexto, configSaida)
    }

    // Enviar
    const sendOpts = {
        instancia: msg.instancia,
        telefone: msg.telefone,
        apikey: clinica.evolutionApikey || undefined,
    }

    if (audioBase64Resposta) {
        await sender.sendAudio(sendOpts, audioBase64Resposta)
    } else {
        await sender.sendText(sendOpts, respostaTexto)
    }

    // Salvar no histórico
    await Promise.all([
        memory.saveToHistory(clinica.id, msg.telefone, 'user', textoMensagemOriginal, msg.pushName),
        memory.saveToHistory(clinica.id, msg.telefone, 'assistant', respostaTexto),
    ])

    // Descontar crédito
    await catraca.descontarCredito(clinica.id)

    // Log
    const elapsed = Date.now() - startTime
    await logger.logEvent(clinica.id, 'mensagem_processada', {
        telefone: msg.telefone,
        canal: msg.canal,
        tipoEntrada,
        tipoSaida: configSaida.tipoSaida,
        fromCache,
        tempoMs: elapsed,
    })

    console.log(`[Pipeline] ✅ ${elapsed}ms (cache: ${fromCache}, saída: ${configSaida.tipoSaida})`)
}

// ============================================
// BLACKLIST
// ============================================

function isBlacklisted(clinica: DadosClinica, telefone: string, canal: string): boolean {
    const cfg = (clinica.configuracoes as any) || {}

    if (canal === 'whatsapp') {
        const blocked: string[] = cfg.blacklist_whatsapp || []
        return blocked.some(n => telefone.includes(n.replace(/\D/g, '')))
    }

    if (canal === 'instagram') {
        const blocked: string[] = cfg.blacklist_instagram || []
        return blocked.some(ig => telefone.toLowerCase().includes(ig.toLowerCase()))
    }

    return false
}

// ============================================
// PAUSA (dona tá falando / mídia)
// ============================================

async function pausarConversa(userId: number, telefone: string, minutos: number, motivo: string): Promise<void> {
    try {
        await prisma.$executeRaw`
            INSERT INTO status_conversa (telefone_cliente, user_id, pausa_ate, motivo, updated_at)
            VALUES (${telefone}, ${userId}, NOW() + ${minutos + ' minutes'}::INTERVAL, ${motivo}, NOW())
            ON CONFLICT (telefone_cliente, user_id)
            DO UPDATE SET pausa_ate = NOW() + ${minutos + ' minutes'}::INTERVAL, motivo = ${motivo}, updated_at = NOW()
        `
    } catch (e) {
        console.error('[Pipeline] Erro ao pausar conversa:', e)
    }
}

async function checkPausa(userId: number, telefone: string): Promise<boolean> {
    try {
        const result = await prisma.$queryRaw<{ pausa_ate: Date }[]>`
            SELECT pausa_ate FROM status_conversa
            WHERE telefone_cliente = ${telefone} AND user_id = ${userId}
            LIMIT 1
        `
        if (result.length > 0 && result[0].pausa_ate) {
            return new Date() < new Date(result[0].pausa_ate)
        }
    } catch { }
    return false
}

// ============================================
// TRIAGEM DE MÍDIA (foto/vídeo)
// ============================================
// SEM pausa automática! A Dra decide o que fazer.
// Opções: mandar resposta pra IARA, assumir, ou pedir lembrete.

async function handleMediaTriage(clinica: DadosClinica, msg: MensagemRecebida): Promise<void> {
    const nomeCliente = msg.pushName || 'Cliente'
    const nomeIA = clinica.nomeAssistente || 'Iara'
    const sendOpts = { instancia: msg.instancia, telefone: msg.telefone, apikey: clinica.evolutionApikey || undefined }

    // 1. Avisa a cliente que recebeu (SEM pausar)
    await sender.sendText(sendOpts, `Recebi sua ${msg.tipoMensagem === 'image' ? 'foto' : 'vídeo'}! ✨ Já encaminhei agora mesmo pra Doutora analisar com carinho. Assim que ela ver, já te damos um retorno, tá? 😊`)

    // 2. Alerta a Dra no WhatsApp pessoal (com 3 opções)
    if (clinica.whatsappDoutora) {
        const alertaDra = `📸 *${nomeCliente}* mandou uma ${msg.tipoMensagem === 'image' ? 'foto' : 'vídeo'}\n📱 ${msg.telefone}\n\nDra, abra o WhatsApp da clínica pra ver a imagem.\n\n*O que eu faço?*\n\n1️⃣ *Me mande a resposta* — escreva ou mande áudio com o que devo dizer. Eu adapto e te mostro antes de enviar.\n\n2️⃣ *"Eu assumo"* — responda direto à cliente que eu pauso 3h.\n\n3️⃣ *"${nomeIA} lembre em X min"* — aviso a cliente que a Dra tá analisando e volto depois.`

        await sender.sendText(
            { instancia: msg.instancia, telefone: clinica.whatsappDoutora, apikey: clinica.evolutionApikey || undefined },
            alertaDra
        )
    }

    // 3. Salvar no histórico (NÃO pausa — a Dra decide)
    await memory.saveToHistory(clinica.id, msg.telefone, 'user', `[${msg.tipoMensagem.toUpperCase()} ENVIADO]`, msg.pushName)

    // 4. Log
    await logger.logEvent(clinica.id, 'midia_recebida', {
        telefone: msg.telefone,
        tipo: msg.tipoMensagem,
        pushName: msg.pushName,
    })

    console.log(`[Pipeline] 📸 Mídia de ${nomeCliente} → Dra alertada (sem pausa automática)`)
}

// ============================================
// HORÁRIO DE EXPEDIENTE
// ============================================

interface HorarioCheck {
    aberto: boolean
    msgFechado: string
    debugInfo: string
}

function checkBusinessHours(clinica: DadosClinica): HorarioCheck {
    const tz = clinica.timezone || 'America/Sao_Paulo'
    const agora = new Date(new Date().toLocaleString("en-US", { timeZone: tz }))
    const horaAtual = agora.getHours() + (agora.getMinutes() / 60)
    const diaSemana = agora.getDay() // 0=Dom, 6=Sab

    // Se 24h configurado
    const cfg = (clinica.configuracoes as any) || {}
    if (cfg.atendimento_24h === true) {
        return { aberto: true, msgFechado: '', debugInfo: '24h' }
    }

    // Determinar horário de hoje
    let horarioTexto = clinica.horarioSemana || '08:00 às 18:00'

    if (diaSemana === 0) { // Domingo
        if (!clinica.atendeDomingo) {
            return {
                aberto: false,
                msgFechado: buildMsgFechado(clinica, 'segunda'),
                debugInfo: `Dom ${horaAtual.toFixed(1)} - não atende dom`
            }
        }
        horarioTexto = (clinica as any).horarioDomingo || horarioTexto
    } else if (diaSemana === 6) { // Sábado
        if (!clinica.atendeSabado) {
            return {
                aberto: false,
                msgFechado: buildMsgFechado(clinica, 'segunda'),
                debugInfo: `Sab ${horaAtual.toFixed(1)} - não atende sab`
            }
        }
        horarioTexto = (clinica as any).horarioSabado || horarioTexto
    }

    // Parse "08:00 às 18:00"
    const { inicio, fim } = parseHorario(horarioTexto)

    if (horaAtual < inicio || horaAtual >= fim) {
        const horaFormatada = `${String(Math.floor(inicio)).padStart(2, '0')}:${String(Math.round((inicio % 1) * 60)).padStart(2, '0')}`
        return {
            aberto: false,
            msgFechado: buildMsgFechado(clinica, horaFormatada),
            debugInfo: `${horaAtual.toFixed(1)} fora de ${inicio}-${fim}`
        }
    }

    return { aberto: true, msgFechado: '', debugInfo: `${horaAtual.toFixed(1)} dentro de ${inicio}-${fim}` }
}

function parseHorario(texto: string): { inicio: number, fim: number } {
    // Suporta: "08:00 às 18:00", "08:00 as 18:00", "8:00-18:00", "09:00 - 17:30"
    const match = texto.match(/(\d{1,2}):(\d{2})\s*(?:às|as|a|-|–)\s*(\d{1,2}):(\d{2})/i)
    if (match) {
        return {
            inicio: parseInt(match[1]) + parseInt(match[2]) / 60,
            fim: parseInt(match[3]) + parseInt(match[4]) / 60,
        }
    }
    return { inicio: 8, fim: 18 } // Fallback
}

function buildMsgFechado(clinica: DadosClinica, voltaQuando: string): string {
    const nomeClinica = clinica.nomeClinica || 'o studio'
    const idioma = clinica.idioma || 'pt-BR'

    if (idioma === 'en-US') {
        return `Hey! 😊 We're currently closed. We'll be back at ${voltaQuando}. Leave your message and we'll reach out as soon as we open! ✨`
    }
    if (idioma === 'es') {
        return `¡Hola! 😊 En este momento estamos cerrados. Volvemos a las ${voltaQuando}. ¡Deja tu mensaje y te contactamos apenas abramos! ✨`
    }

    return `Oi, tudo bem? 😊\n\nEssa é uma resposta automática. No momento ${nomeClinica} está fechado, mas voltamos às *${voltaQuando}*.\n\nAssim que voltarmos, já chamamos você por aqui. É só aguardar! ✨`
}

async function handleForaDoHorario(clinica: DadosClinica, msg: MensagemRecebida, mensagem: string): Promise<void> {
    const sendOpts = { instancia: msg.instancia, telefone: msg.telefone, apikey: clinica.evolutionApikey || undefined }

    // Manda mensagem de fechado
    await sender.sendText(sendOpts, mensagem)

    // Salva na fila de recontato
    try {
        await prisma.$executeRaw`
            INSERT INTO fila_recontato (telefone, instancia, nome_cliente, user_id)
            VALUES (${msg.telefone}, ${msg.instancia}, ${msg.pushName || 'Cliente'}, ${clinica.id})
        `
    } catch { }

    // Salva no histórico
    await memory.saveToHistory(clinica.id, msg.telefone, 'user', msg.mensagem, msg.pushName)
}

// ============================================
// CACHE DE IA (economiza $$$)
// ============================================

function hashMensagem(msg: string): string {
    // Normaliza: lowercase, sem espaços extras, sem emojis
    const normalizada = msg.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '')
    return createHash('sha256').update(normalizada).digest('hex').substring(0, 16)
}

async function checkCache(userId: number, mensagem: string): Promise<string | null> {
    const hash = hashMensagem(mensagem)

    try {
        const result = await prisma.$queryRaw<{ resposta: string }[]>`
            SELECT resposta FROM cache_respostas
            WHERE user_id = ${userId}
              AND hash_mensagem = ${hash}
              AND expires_at > NOW()
            LIMIT 1
        `

        if (result.length > 0) {
            // Incrementa hit count
            await prisma.$executeRaw`
                UPDATE cache_respostas SET hits = hits + 1
                WHERE user_id = ${userId} AND hash_mensagem = ${hash}
            `
            return result[0].resposta
        }
    } catch { }

    return null
}

async function saveCache(userId: number, mensagem: string, resposta: string, modelo: string): Promise<void> {
    const hash = hashMensagem(mensagem)

    // Não cachear mensagens muito curtas (oi, ola, etc) — contexto varia muito
    if (mensagem.length < 15) return

    try {
        await prisma.$executeRaw`
            INSERT INTO cache_respostas (user_id, hash_mensagem, resposta, modelo, expires_at)
            VALUES (${userId}, ${hash}, ${resposta}, ${modelo}, NOW() + INTERVAL '6 hours')
            ON CONFLICT (user_id, hash_mensagem)
            DO UPDATE SET resposta = ${resposta}, modelo = ${modelo}, expires_at = NOW() + INTERVAL '6 hours'
        `
    } catch { }
}

// ============================================
// PROCEDIMENTOS (helper)
// ============================================

async function buscarProcedimentos(clinicaId: number) {
    try {
        const result = await prisma.$queryRaw<{
            id: string
            nome: string
            valor: number
            desconto: number
            parcelas: string | null
            duracao: string | null
        }[]>`
      SELECT id, nome, valor, desconto, parcelas, duracao
      FROM procedimentos
      WHERE "clinicaId" = ${String(clinicaId)}
        AND COALESCE(ativo, true) = true
      ORDER BY nome ASC
    `
        return result || []
    } catch {
        return []
    }
}
