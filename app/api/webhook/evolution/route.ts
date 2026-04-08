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
import { ensureWebhook } from '@/lib/engine/webhook-sync'

// Deduplicação: cache de requestIds já processados (evita resposta duplicada)
const processedMessages = new Map<string, number>()
const DEDUP_TTL_MS = 60_000 // 60 segundos

// Limpar cache de dedup periodicamente
setInterval(() => {
    const now = Date.now()
    for (const [key, ts] of processedMessages) {
        if (now - ts > DEDUP_TTL_MS) processedMessages.delete(key)
    }
}, 30_000)

// Secret pra autenticar o webhook (opcional, mas recomendado)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Log mínimo para diagnóstico
        const webhookEvent = body.event || ''
        const webhookInstance = body.instance || body.instanceName || ''

        // LOG PERSISTENTE — registrar CADA webhook que chega
        try {
            const logPayload = JSON.stringify({
                event: webhookEvent,
                instance: webhookInstance,
                remoteJid: body.data?.key?.remoteJid || null,
                fromMe: body.data?.key?.fromMe || false,
                msgId: body.data?.key?.id || null,
                messageType: body.data?.messageType || null,
                hasMessage: !!body.data?.message,
                state: body.data?.state || body.data?.instance?.state || null,
                ts: new Date().toISOString(),
            })
            await prisma.$executeRawUnsafe(`
                INSERT INTO webhook_debug_log (payload, created_at)
                VALUES ($1, NOW())
            `, logPayload)
        } catch { /* tabela pode não existir */ }

        // Validar secret (se configurado)
        if (WEBHOOK_SECRET) {
            const secret = request.nextUrl.searchParams.get('secret')
            if (secret !== WEBHOOK_SECRET) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        // ================================================
        // TRATAR CONNECTION_UPDATE — Self-Healing
        // ================================================
        // Quando a Evolution reconecta, garante webhook ativo automaticamente
        if (webhookEvent === 'connection.update') {
            const state = body.data?.state || body.data?.instance?.state
            console.log(`[Webhook] 🔌 CONNECTION_UPDATE: ${webhookInstance} → ${state}`)

            if (state === 'open' && webhookInstance) {
                // Instância reconectou — garantir webhook ativo
                ensureWebhook(webhookInstance).then(r => {
                    if (r.webhookFixed) console.log(`[Webhook] 🔧 Webhook auto-corrigido para ${webhookInstance}`)
                }).catch(() => {})

                // Sincronizar status no banco
                try {
                    await prisma.$executeRaw`
                        UPDATE instancias_clinica SET status_conexao = 'conectado'
                        WHERE evolution_instance = ${webhookInstance}
                    `
                } catch { /* silenciar */ }
            } else if (state === 'close' && webhookInstance) {
                // Instância desconectou
                try {
                    await prisma.$executeRaw`
                        UPDATE instancias_clinica SET status_conexao = 'desconectado'
                        WHERE evolution_instance = ${webhookInstance}
                    `
                } catch { /* silenciar */ }
            }

            return NextResponse.json({ ok: true, handled: 'connection_update', state })
        }

        // ================================================
        // FILTRAR EVENTOS — Só processar MESSAGES_UPSERT
        // ================================================
        if (webhookEvent !== 'messages.upsert') {
            return NextResponse.json({ ok: true, ignored: webhookEvent || 'unknown_event' })
        }

        const data = body.data || {}
        const key = data.key || {}
        const message = data.message || {}
        const instance = webhookInstance

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
        // DEDUPLICAÇÃO — Evitar resposta duplicada
        // ================================================
        const msgId = key.id || ''
        const dedupKey = `${instance}:${key.remoteJid}:${msgId}`
        if (msgId && processedMessages.has(dedupKey)) {
            return NextResponse.json({ ok: true, ignored: 'duplicate' })
        }
        if (msgId) processedMessages.set(dedupKey, Date.now())

        // ================================================
        // NORMALIZAR PAYLOAD
        // ================================================
        // WhatsApp usa vários formatos de JID: @s.whatsapp.net, @c.us, @lid (novo formato 2025+)
        const rawJid = key.remoteJid || ''
        const telefone = rawJid.replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '').replace(/@lid$/, '').replace(/@g\.us$/, '')
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
                // Buscar API key da instância
                let evoApikey: string | undefined
                try {
                    const clinicaFull = await prisma.clinica.findFirst({
                        where: { id: clinica.id },
                        select: { evolutionApikey: true }
                    })
                    evoApikey = clinicaFull?.evolutionApikey || undefined
                } catch { /* usar env fallback */ }

                autoCaptureCRM({
                    clinicaId: clinica.id,
                    telefone,
                    pushName,
                    canal: 'whatsapp',
                    instancia: instance,
                    evolutionApikey: evoApikey,
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
