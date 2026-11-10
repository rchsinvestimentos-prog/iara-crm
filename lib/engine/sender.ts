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

// Ids das mensagens que a própria IARA mandou. O WhatsApp pode devolver o
// envio como mensagem "fromMe" (do número da clínica); sem esta lista, o
// webhook confundiria a resposta da IARA com a doutora assumindo a conversa
// e pausaria a IARA depois de cada resposta. Guarda por 10 minutos.
const ENVIADAS_PELA_IARA: Map<string, number> =
    ((globalThis as any).__iaraEnviadas ??= new Map<string, number>())
const VALIDADE_ENVIADA_MS = 10 * 60 * 1000

async function lembrarEnvio(res: Response): Promise<void> {
    try {
        const corpo: any = await res.json()
        const id = corpo?.key?.id
        if (typeof id !== 'string' || !id) return
        const agora = Date.now()
        ENVIADAS_PELA_IARA.set(id, agora)
        if (ENVIADAS_PELA_IARA.size > 5000) {
            for (const [k, t] of ENVIADAS_PELA_IARA) if (agora - t > VALIDADE_ENVIADA_MS) ENVIADAS_PELA_IARA.delete(k)
        }
    } catch {
        // Resposta sem JSON: o envio deu certo, só não dá para reconhecer o eco.
    }
}

/** A mensagem com este id foi mandada pela própria IARA nos últimos 10 min? */
export function foiEnviadaPelaIara(id: string | undefined | null): boolean {
    if (!id) return false
    const t = ENVIADAS_PELA_IARA.get(id)
    return t !== undefined && Date.now() - t < VALIDADE_ENVIADA_MS
}

interface SendOptions {
    instancia: string
    telefone: string
    apikey?: string  // cada clínica pode ter sua própria apikey
}

/**
 * Normaliza o número para o padrão internacional com prefixo '55' caso seja brasileiro de 10 ou 11 dígitos.
 */
function normalizarTelefone(tel: string): string {
    const limpo = tel.replace(/\D/g, '')
    if (limpo.length === 10 || limpo.length === 11) {
        return `55${limpo}`
    }
    return limpo
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
        const numero = normalizarTelefone(telefone)
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
            await lembrarEnvio(res)
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
        const numero = normalizarTelefone(telefone)
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
            await lembrarEnvio(res)
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
 * Envia arquivo (foto, vídeo ou PDF) pelo WhatsApp, em base64.
 * Usado pelos anexos do procedimento: o arquivo fica em UPLOADS_DIR, que é
 * protegido por login — a Evolution não conseguiria baixar por link.
 */
export async function sendMedia(
    opts: SendOptions,
    arquivo: {
        mediatype: 'image' | 'video' | 'document'
        mimetype: string
        base64: string
        fileName: string
        caption?: string
    }
): Promise<boolean> {
    const { instancia, telefone, apikey } = opts

    if (!instancia || !telefone || !arquivo.base64) {
        console.error('[Sender] Dados incompletos para enviar arquivo')
        return false
    }

    try {
        const numero = normalizarTelefone(telefone)
        const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${instancia}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apikey || EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: numero,
                mediatype: arquivo.mediatype,
                mimetype: arquivo.mimetype,
                media: arquivo.base64,
                fileName: arquivo.fileName,
                caption: arquivo.caption || '',
            }),
        })

        if (res.ok) {
            await lembrarEnvio(res)
            console.log(`[Sender] ✅ ${arquivo.mediatype} enviado para ${numero} (${arquivo.fileName})`)
            return true
        } else {
            const err = await res.text()
            console.error(`[Sender] ❌ Erro ao enviar ${arquivo.mediatype}: ${err.slice(0, 300)}`)
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
        const numero = normalizarTelefone(telefone)
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
            await lembrarEnvio(res)
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
