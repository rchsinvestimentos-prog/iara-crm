// ============================================
// PIPELINE — O Orquestrador
// ============================================
// Este é o ponto de entrada principal. Recebe uma mensagem
// e faz TUDO de ponta a ponta:
//
// Mensagem → Catraca → Transcrição → IA → TTS → Envio
//
// Era o F04 (Maestro) + entrelaçamento de todos workflows.
// Agora é UMA função que coordena tudo.

import * as catraca from './catraca'
import * as audio from './audio'
import * as memory from './memory'
import * as aiEngine from './ai-engine'
import * as sender from './sender'
import * as logger from './logger'
import type { MensagemRecebida, DadosClinica } from './types'
import { prisma } from '@/lib/prisma'

/**
 * Processa uma mensagem de ponta a ponta.
 * 
 * FLUXO COMPLETO:
 * 1. Catraca — pode processar?
 * 2. É feedback da Dra? → salva e responde
 * 3. Se áudio → transcreve (Whisper)
 * 4. Busca contexto (histórico, procedimentos, feedbacks, memória)
 * 5. Monta prompt → chama IA
 * 6. Determina saída (texto ou áudio TTS)
 * 7. Envia resposta via Evolution API
 * 8. Salva no histórico
 * 9. Desconta 1 crédito
 */
export async function processMessage(msg: MensagemRecebida): Promise<void> {
    const startTime = Date.now()

    // ================================================
    // 1. CATRACA — Pode processar?
    // ================================================
    const acesso = await catraca.checkAccess(msg.instancia, msg.telefone)

    if (!acesso.permitido) {
        // Se tem mensagem de bloqueio e motivo é crédito, manda pro cliente
        if (acesso.mensagemBloqueio && acesso.motivo === 'sem_creditos' && acesso.clinica) {
            await sender.sendText(
                {
                    instancia: msg.instancia,
                    telefone: msg.telefone,
                    apikey: acesso.clinica.evolutionApikey || undefined,
                },
                acesso.mensagemBloqueio
            )
        }
        console.log(`[Pipeline] ⛔ Bloqueado: ${acesso.motivo} (instancia: ${msg.instancia})`)
        return
    }

    const clinica = acesso.clinica!
    const isDoutora = acesso.isDoutora || false

    // ================================================
    // 2. É FEEDBACK DA DRA?
    // ================================================
    if (isDoutora) {
        const feedback = memory.detectFeedback(
            msg.mensagem,
            msg.telefone,
            clinica.whatsappDoutora || ''
        )

        if (feedback.isFeedback) {
            await memory.saveDraFeedback(clinica.id, feedback.regra)
            await sender.sendText(
                {
                    instancia: msg.instancia,
                    telefone: msg.telefone,
                    apikey: clinica.evolutionApikey || undefined,
                },
                'Perfeito, Dra! ✅ Feedback registrado e aplicado nas próximas conversas.'
            )
            await logger.logEvent(clinica.id, 'feedback', { regra: feedback.regra })
            return
        }
    }

    // ================================================
    // 3. SE ÁUDIO → TRANSCREVER
    // ================================================
    let textoMensagem = msg.mensagem
    let tipoEntrada: 'text' | 'audio' = msg.tipoMensagem === 'audio' ? 'audio' : 'text'

    if (msg.tipoMensagem === 'audio') {
        let audioData = msg.audioBase64

        // Se não veio o base64 direto, tenta baixar da Evolution
        if (!audioData) {
            audioData = await audio.downloadAudioFromEvolution(
                msg.instancia,
                msg.requestId,
                clinica.evolutionApikey || undefined
            ) || undefined
        }

        if (audioData) {
            const transcricao = await audio.transcribeAudio(audioData)
            if (transcricao) {
                textoMensagem = transcricao
                tipoEntrada = 'audio'
            } else {
                // Se não conseguiu transcrever, informa
                textoMensagem = msg.mensagem || '[áudio não transcrito]'
            }
        }
    }

    // ================================================
    // 4. BUSCAR CONTEXTO
    // ================================================
    const [historico, procedimentosRaw, feedbacks, memoriaCliente] = await Promise.all([
        memory.getConversationHistory(clinica.id, msg.telefone),
        buscarProcedimentos(clinica.id),
        memory.getDraFeedbacks(clinica.id),
        memory.getClientMemory(clinica.id, msg.telefone),
    ])

    // ================================================
    // 5. MONTAR PROMPT + CHAMAR IA
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
    // 6. DETERMINAR TIPO DE SAÍDA (texto ou áudio)
    // ================================================
    const configSaida = audio.determineOutputType(clinica, tipoEntrada === 'audio')

    let audioBase64Resposta: string | null = null
    if (configSaida.tipoSaida === 'audio') {
        audioBase64Resposta = await audio.generateTTS(resposta.texto, configSaida)
    }

    // ================================================
    // 7. ENVIAR RESPOSTA
    // ================================================
    const sendOpts = {
        instancia: msg.instancia,
        telefone: msg.telefone,
        apikey: clinica.evolutionApikey || undefined,
    }

    if (audioBase64Resposta) {
        await sender.sendAudio(sendOpts, audioBase64Resposta)
    } else {
        await sender.sendText(sendOpts, resposta.texto)
    }

    // ================================================
    // 8. SALVAR NO HISTÓRICO
    // ================================================
    await Promise.all([
        memory.saveToHistory(clinica.id, msg.telefone, 'user', textoMensagem, msg.pushName),
        memory.saveToHistory(clinica.id, msg.telefone, 'assistant', resposta.texto),
    ])

    // ================================================
    // 9. DESCONTAR CRÉDITO
    // ================================================
    if (!isDoutora) {
        await catraca.descontarCredito(clinica.id)
    }

    // ================================================
    // LOG FINAL
    // ================================================
    const elapsed = Date.now() - startTime
    await logger.logEvent(clinica.id, 'mensagem_processada', {
        telefone: msg.telefone,
        canal: msg.canal,
        tipoEntrada,
        tipoSaida: configSaida.tipoSaida,
        modelo: resposta.modelo,
        fallback: resposta.fallback,
        tempoMs: elapsed,
    })

    console.log(`[Pipeline] ✅ Processado em ${elapsed}ms (${resposta.modelo}, saída: ${configSaida.tipoSaida})`)
}

// ============================================
// HELPERS
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
