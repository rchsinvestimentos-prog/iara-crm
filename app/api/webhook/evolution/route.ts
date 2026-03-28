// ============================================
// WEBHOOK — Evolution API
// ============================================
// Recebe TODAS as mensagens de WhatsApp.
// Substitui o F01 (Entrada Webhook) + F02 (Receptor Central) do n8n.
//
// A Evolution API manda um POST pra essa URL toda vez que chega
// uma mensagem nova. A gente filtra o que interessa e manda pro pipeline.
//
// COMO CONFIGURAR NA EVOLUTION:
// URL: https://app.iara.click/api/webhook/evolution
// Events: MESSAGES_UPSERT
// Webhook Base64: ENABLED (pra receber áudios inline)

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { autoCaptureCRM } from '@/lib/auto-capture'
import { processMessage } from '@/lib/engine'
import type { MensagemRecebida } from '@/lib/engine'

// Secret pra autenticar o webhook (opcional, mas recomendado)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validar secret (se configurado)
        if (WEBHOOK_SECRET) {
            const secret = request.nextUrl.searchParams.get('secret')
            if (secret !== WEBHOOK_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        // ================================================
        // EXTRAIR DADOS DO PAYLOAD DA EVOLUTION
        // ================================================
        // A Evolution manda vários tipos de evento. A gente só quer MESSAGES_UPSERT.
        const event = body.event || ''

        if (event !== 'messages.upsert') {
            return NextResponse.json({ ok: true, ignored: true })
        }

        const data = body.data || {}
        const key = data.key || {}
        const message = data.message || {}
        const instance = body.instance || body.instanceName || ''

        // ================================================
        // FILTRAR MENSAGENS QUE NÃO INTERESSAM
        // ================================================

        // fromMe = mensagem enviada pela dona da clínica
        // NÃO ignorar — precisamos detectar pra pausar a IARA
        const isFromMe = key.fromMe === true

        // Ignorar ACKs (confirmação de leitura)
        if (data.messageType === 'protocolMessage' || data.messageType === 'senderKeyDistributionMessage') {
            return NextResponse.json({ ok: true, ignored: 'protocol' })
        }

        // Ignorar status/stories
        if (key.remoteJid?.endsWith('@broadcast') || key.remoteJid?.includes('status@')) {
            return NextResponse.json({ ok: true, ignored: 'broadcast' })
        }

        // ================================================
        // NORMALIZAR PAYLOAD
        // ================================================
        const telefone = (key.remoteJid || '').replace('@s.whatsapp.net', '').replace('@c.us', '')
        if (!telefone || telefone.length < 8) {
            return NextResponse.json({ ok: true, ignored: 'telefone_invalido' })
        }

        const pushName = data.pushName || ''

        // Detectar tipo de mensagem
        let tipoMensagem: 'text' | 'audio' | 'image' | 'video' | 'document' = 'text'
        let textoMensagem = ''
        let audioBase64: string | undefined

        if (message.conversation) {
            // Mensagem de texto simples
            tipoMensagem = 'text'
            textoMensagem = message.conversation
        } else if (message.extendedTextMessage?.text) {
            // Texto com formatação/citação
            tipoMensagem = 'text'
            textoMensagem = message.extendedTextMessage.text
        } else if (message.audioMessage) {
            // Áudio
            tipoMensagem = 'audio'
            textoMensagem = '' // será transcrito pelo pipeline

            // LOG DE DEBUG PARA DESCOBRIR O FORMATO DA EVOLUTION V2
            console.log(`[Webhook] 🚨 DEBUG AUDIO RECEIVED:`, JSON.stringify(body).slice(0, 1000))

            // Salvar payload no banco para debug (temporário)
            try {
                const debugPayload = JSON.stringify(body).slice(0, 5000)
                await prisma.$executeRaw`
                    INSERT INTO debug_logs (tipo, payload, created_at)
                    VALUES ('audio_webhook', ${debugPayload}::text, NOW())
                    ON CONFLICT DO NOTHING
                `
            } catch (dbErr) {
                console.log('[Webhook] Debug log save failed (tabela pode não existir):', dbErr)
            }

            // Tentar extrair base64 de todos os paths possíveis da Evolution API
            audioBase64 = data.message?.base64
                || data.base64
                || message.audioMessage?.base64
                || body.data?.message?.base64
                || undefined

            console.log(`[Webhook] 🎤 Áudio recebido. Base64 inline (data.message.base64: ${!!data.message?.base64}, data.base64: ${!!data.base64}, message.base64: ${!!message.base64}): ${audioBase64 ? 'SIM (' + audioBase64.length + ' chars)' : 'NÃO'}, messageId: ${key.id}`)
        } else if (message.imageMessage) {
            tipoMensagem = 'image'
            textoMensagem = message.imageMessage.caption || '[imagem]'
        } else if (message.videoMessage) {
            tipoMensagem = 'video'
            textoMensagem = message.videoMessage.caption || '[vídeo]'
        } else if (message.documentMessage) {
            tipoMensagem = 'document'
            textoMensagem = message.documentMessage.fileName || '[documento]'
        } else {
            // Tipo de mensagem não suportado (sticker, location, etc.)
            return NextResponse.json({ ok: true, ignored: 'tipo_nao_suportado' })
        }

        // ================================================
        // AUTO-CAPTURE CRM
        // ================================================
        // Cria/atualiza contato no CRM quando recebe msg de cliente
        if (!isFromMe && telefone) {
            // Descobrir qual clínica é baseado na instância
            // Primeiro tenta tabela clinica (legado), depois instancias_clinica (novo)
            let clinica = await prisma.clinica.findFirst({
                where: { evolutionInstance: instance },
                select: { id: true }
            })

            // Fallback: buscar na instancias_clinica
            if (!clinica) {
                const instanciaRow = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT user_id FROM instancias_clinica WHERE evolution_instance = $1 AND ativo = true LIMIT 1`,
                    instance
                )
                if (instanciaRow.length > 0) {
                    clinica = { id: instanciaRow[0].user_id }
                }
            }

            if (clinica) {
                autoCaptureCRM({
                    clinicaId: clinica.id,
                    telefone,
                    pushName,
                    canal: 'whatsapp',
                }).catch(err => console.error('[Webhook] AutoCapture error:', err))
            }
        }

        // ================================================
        // MONTAR MENSAGEM E PROCESSAR
        // ================================================
        const mensagem: MensagemRecebida = {
            telefone,
            pushName,
            mensagem: textoMensagem,
            tipoMensagem,
            instancia: instance,
            audioBase64,
            requestId: key.id || randomUUID(),
            canal: 'whatsapp',
            timestamp: Date.now(),
            isFromMe,
            rawMessage: data  // Full object with key + message (Evolution API needs this)
        }

        // Processa de forma assíncrona (não bloqueia o webhook)
        processMessage(mensagem).catch((err) => {
            console.error('[Webhook] ❌ Erro no pipeline:', err)
        })

        return NextResponse.json({ ok: true, requestId: mensagem.requestId })

    } catch (err) {
        console.error('[Webhook] ❌ Erro ao processar webhook:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// Health check — pra testar se o endpoint tá rodando
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        service: 'iara-webhook-evolution',
        timestamp: new Date().toISOString(),
    })
}
