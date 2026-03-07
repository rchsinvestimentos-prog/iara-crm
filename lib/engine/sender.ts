// ============================================
// SENDER — Envio de Mensagens
// ============================================
// Envia mensagens de volta pro WhatsApp via Evolution API.
// Era o F09 (Mensageiro) no n8n.
//
// COMO FUNCIONA:
// - Texto → POST /message/sendText/{instancia}
// - Áudio → POST /message/sendWhatsAppAudio/{instancia}
// - Imagem → POST /message/sendMedia/{instancia}

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

interface SendOptions {
    instancia: string
    telefone: string
    apikey?: string  // cada clínica pode ter sua própria apikey
}

/**
 * Envia texto pelo WhatsApp.
 */
export async function sendText(
    opts: SendOptions,
    texto: string
): Promise<boolean> {
    const { instancia, telefone, apikey } = opts

    if (!instancia || !telefone || !texto) {
        console.error('[Sender] Dados incompletos para enviar texto')
        return false
    }

    try {
        const numero = telefone.replace(/\D/g, '')
        const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instancia}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apikey || EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: numero,
                text: texto,
            }),
        })

        if (res.ok) {
            console.log(`[Sender] ✅ Texto enviado para ${numero} via ${instancia}`)
            return true
        } else {
            const err = await res.text()
            console.error(`[Sender] ❌ Erro ao enviar texto: ${err}`)
            return false
        }
    } catch (err) {
        console.error('[Sender] Erro:', err)
        return false
    }
}

/**
 * Envia áudio pelo WhatsApp (base64).
 */
export async function sendAudio(
    opts: SendOptions,
    audioBase64: string
): Promise<boolean> {
    const { instancia, telefone, apikey } = opts

    if (!instancia || !telefone || !audioBase64) {
        console.error('[Sender] Dados incompletos para enviar áudio')
        return false
    }

    try {
        const numero = telefone.replace(/\D/g, '')
        const res = await fetch(`${EVOLUTION_URL}/message/sendWhatsAppAudio/${instancia}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apikey || EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: numero,
                audio: audioBase64,
            }),
        })

        if (res.ok) {
            console.log(`[Sender] ✅ Áudio enviado para ${numero}`)
            return true
        } else {
            const err = await res.text()
            console.error(`[Sender] ❌ Erro ao enviar áudio: ${err}`)
            return false
        }
    } catch (err) {
        console.error('[Sender] Erro:', err)
        return false
    }
}

/**
 * Envia imagem pelo WhatsApp.
 */
export async function sendImage(
    opts: SendOptions,
    imageUrl: string,
    caption?: string
): Promise<boolean> {
    const { instancia, telefone, apikey } = opts

    try {
        const numero = telefone.replace(/\D/g, '')
        const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${instancia}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apikey || EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: numero,
                mediatype: 'image',
                media: imageUrl,
                caption: caption || '',
            }),
        })

        if (res.ok) {
            console.log(`[Sender] ✅ Imagem enviada para ${numero}`)
            return true
        } else {
            const err = await res.text()
            console.error(`[Sender] ❌ Erro ao enviar imagem: ${err}`)
            return false
        }
    } catch (err) {
        console.error('[Sender] Erro:', err)
        return false
    }
}
