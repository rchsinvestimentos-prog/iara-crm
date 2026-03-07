// ============================================
// ÁUDIO — Transcrição + TTS
// ============================================
// Transcrever áudios recebidos (Whisper) e gerar áudios de resposta (TTS).
// Era o F05 (Transcrição) + F08 (Voz TTS) no n8n.
//
// PROVEDOR DE VOZ POR PLANO:
// - P1 (Secretária): OpenAI TTS "nova" — gratuito-ish, voz feminina natural
// - P2 (Estrategista): OpenAI TTS "nova" (ou ElevenLabs padrão se configurado)
// - P3+ (Designer/Audiovisual): ElevenLabs com voz clonada da Dra

import type { DadosClinica, ConfigSaida } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

// ============================================
// TRANSCRIÇÃO (Whisper)
// ============================================

/**
 * Transcreve áudio usando OpenAI Whisper.
 * 
 * Recebe: áudio em base64
 * Retorna: texto transcrito
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
    if (!audioBase64 || !OPENAI_API_KEY) {
        console.error('[Audio] Sem áudio base64 ou API key')
        return ''
    }

    try {
        // Converter base64 para buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64')

        // Montar FormData com o arquivo
        const formData = new FormData()
        const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' })
        formData.append('file', audioBlob, 'audio.ogg')
        formData.append('model', 'whisper-1')
        formData.append('language', 'pt') // detecta automatico se não for PT

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: formData,
        })

        if (!res.ok) {
            const err = await res.text()
            console.error('[Audio] Erro Whisper:', err)
            return ''
        }

        const data = await res.json()
        const texto = (data.text || '').trim()
        console.log(`[Audio] ✅ Transcrito: "${texto.slice(0, 80)}..."`)
        return texto

    } catch (err) {
        console.error('[Audio] Erro na transcrição:', err)
        return ''
    }
}

/**
 * Baixar áudio da Evolution API (base64).
 * Quando a Evolution manda o webhook, o áudio pode vir embutido ou precisar ser baixado.
 */
export async function downloadAudioFromEvolution(
    instanceName: string,
    messageId: string,
    apikey?: string,
    rawMessage?: any
): Promise<string | null> {
    const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
    const EVOLUTION_KEY = apikey || process.env.EVOLUTION_API_KEY || ''

    if (!EVOLUTION_URL) {
        console.error('[Audio] ❌ EVOLUTION_API_URL não configurada')
        return null
    }

    try {
        console.log(`[Audio] 📥 Baixando áudio da Evolution... (instance: ${instanceName}, msgId: ${messageId})`)
        const res = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_KEY,
            },
            body: JSON.stringify({
                message: rawMessage || { key: { id: messageId } },
                convertToMp4: false,
            }),
        })

        if (!res.ok) {
            const errText = await res.text().catch(() => 'no body')
            console.error(`[Audio] ❌ Erro ao baixar áudio da Evolution (status ${res.status}): ${errText.slice(0, 200)}`)
            return null
        }

        const data = await res.json()
        const base64 = data.base64 || null

        if (base64) {
            console.log(`[Audio] ✅ Audio baixado (${(base64.length / 1024).toFixed(0)}KB base64)`)
        } else {
            console.error('[Audio] ❌ Resposta OK mas base64 veio null/vazio:', JSON.stringify(data).slice(0, 200))
        }

        return base64

    } catch (err) {
        console.error('[Audio] Erro download:', err)
        return null
    }
}

// ============================================
// TTS (Text-to-Speech)
// ============================================

/**
 * Determina qual provedor de voz usar baseado no plano da clínica.
 * 
 * LÓGICA:
 * - P1: OpenAI TTS "nova" (quando a cliente envia áudio)
 * - P2: ElevenLabs padrão (se configurado, senão OpenAI)
 * - P3+: ElevenLabs com voz clonada (se enviou áudio pra clonar)
 * 
 * SÓ GERA ÁUDIO se a cliente enviou áudio primeiro (respeita o canal).
 */
export function determineOutputType(
    clinica: DadosClinica,
    clienteEnviouAudio: boolean
): ConfigSaida {
    // Se não veio áudio, responde com texto
    if (!clienteEnviouAudio) {
        return { tipoSaida: 'text', provedorVoz: null, voiceId: null }
    }

    const nivel = clinica.nivel || 1
    const cfg = (clinica.configuracoes as any) || {}
    const integ = (clinica.integracoes as any) || {}

    const voiceEleven = cfg.eleven_voice_id || integ.eleven_voice_id || integ.elevenlabs_voice_id || null
    const voiceClonada = cfg.voice_id_clonada || clinica.vozClonada || null
    const usarClonada = cfg.usar_voz_clonada === true || String(cfg.preferir_voz || '').toLowerCase() === 'clonada'

    if (nivel <= 1) {
        // P1: OpenAI TTS com voz "nova" (feminina, natural)
        return {
            tipoSaida: 'audio',
            provedorVoz: 'openai_tts',
            voiceId: cfg.openai_voice_id || 'nova',
        }
    }

    // P2+: ElevenLabs
    const voiceId = usarClonada && voiceClonada ? voiceClonada : (voiceEleven || voiceClonada)

    // Se não tem voice_id configurado, cai pro OpenAI
    if (!voiceId) {
        return {
            tipoSaida: 'audio',
            provedorVoz: 'openai_tts',
            voiceId: 'nova',
        }
    }

    return {
        tipoSaida: 'audio',
        provedorVoz: 'elevenlabs',
        voiceId,
    }
}

/**
 * Gera áudio a partir de texto usando OpenAI TTS.
 * Retorna: áudio em base64 (mp3)
 */
export async function generateTTS_OpenAI(
    texto: string,
    voiceId: string = 'nova'
): Promise<string | null> {
    if (!OPENAI_API_KEY || !texto) return null

    try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: texto,
                voice: voiceId,
                response_format: 'mp3',
            }),
        })

        if (!res.ok) {
            console.error('[TTS-OpenAI] ❌ Erro:', await res.text())
            return null
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        const base64 = buffer.toString('base64')
        console.log(`[TTS-OpenAI] ✅ Áudio gerado (${(buffer.length / 1024).toFixed(0)}KB)`)
        return base64

    } catch (err) {
        console.error('[TTS-OpenAI] Erro:', err)
        return null
    }
}

/**
 * Gera áudio a partir de texto usando ElevenLabs.
 * Retorna: áudio em base64 (mp3)
 */
export async function generateTTS_ElevenLabs(
    texto: string,
    voiceId: string
): Promise<string | null> {
    if (!ELEVENLABS_API_KEY || !voiceId || !texto) return null

    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: texto,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        })

        if (!res.ok) {
            console.error('[TTS-ElevenLabs] ❌ Erro:', await res.text())
            return null
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        const base64 = buffer.toString('base64')
        console.log(`[TTS-ElevenLabs] ✅ Áudio gerado (${(buffer.length / 1024).toFixed(0)}KB)`)
        return base64

    } catch (err) {
        console.error('[TTS-ElevenLabs] Erro:', err)
        return null
    }
}

/**
 * Gera TTS com o provedor correto baseado na config.
 * 
 * Wrapper que chama OpenAI ou ElevenLabs.
 */
export async function generateTTS(
    texto: string,
    config: ConfigSaida
): Promise<string | null> {
    if (config.tipoSaida !== 'audio' || !config.provedorVoz) return null

    if (config.provedorVoz === 'elevenlabs' && config.voiceId) {
        // Tenta ElevenLabs primeiro
        const audio = await generateTTS_ElevenLabs(texto, config.voiceId)
        if (audio) return audio
        // Fallback pro OpenAI
        console.log('[TTS] Fallback ElevenLabs → OpenAI')
        return generateTTS_OpenAI(texto, 'nova')
    }

    return generateTTS_OpenAI(texto, config.voiceId || 'nova')
}
