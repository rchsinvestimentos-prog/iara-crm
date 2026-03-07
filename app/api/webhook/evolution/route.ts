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
import { processMessage } from '@/lib/engine'
import type { MensagemRecebida } from '@/lib/engine'
import { randomUUID } from 'crypto'

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
        let tipoMensagem: MensagemRecebida['tipoMensagem'] = 'text'
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
            // Se a Evolution mandou o base64 inline (webhook Base64 habilitado)
            audioBase64 = data.message?.base64 || data.base64 || undefined
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
        }

        // Processa de forma assíncrona (não bloqueia o webhook)
        // A Evolution espera resposta rápida, o processamento pode demorar
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
