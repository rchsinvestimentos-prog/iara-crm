// ============================================
// API: Preview de vozes TTS + ElevenLabs
// ============================================
// Gera áudio de demonstração via OpenAI TTS ou ElevenLabs.

import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

const FRASE = 'Oii, tudo bem? Aqui é a secretária da Dra. Me conta, o que você tá buscando? Posso te ajudar com agendamento, tirar dúvidas sobre procedimentos ou qualquer outra coisa!'

export async function POST(request: NextRequest) {
    try {
        const { voice, tipo } = await request.json()

        if (!voice) {
            return NextResponse.json({ error: 'voice required' }, { status: 400 })
        }

        let audioBase64: string

        if (tipo === 'elevenlabs') {
            // ============================================
            // ElevenLabs TTS
            // ============================================
            if (!ELEVENLABS_API_KEY) {
                return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 })
            }

            const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                    text: FRASE,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.3,
                    },
                }),
            })

            if (!res.ok) {
                const err = await res.text()
                console.error('[Voice Preview] ElevenLabs error:', err)
                return NextResponse.json({ error: 'ElevenLabs TTS failed' }, { status: 500 })
            }

            const buffer = Buffer.from(await res.arrayBuffer())
            audioBase64 = buffer.toString('base64')

        } else {
            // ============================================
            // OpenAI TTS
            // ============================================
            const validVoices = ['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']
            if (!validVoices.includes(voice)) {
                return NextResponse.json({ error: 'invalid voice' }, { status: 400 })
            }

            if (!OPENAI_API_KEY) {
                return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
            }

            const res = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    voice,
                    input: FRASE,
                    response_format: 'mp3',
                    speed: 1.0,
                }),
            })

            if (!res.ok) {
                const err = await res.text()
                console.error('[Voice Preview] OpenAI error:', err)
                return NextResponse.json({ error: 'OpenAI TTS failed' }, { status: 500 })
            }

            const buffer = Buffer.from(await res.arrayBuffer())
            audioBase64 = buffer.toString('base64')
        }

        return NextResponse.json({
            audio: `data:audio/mp3;base64,${audioBase64}`,
            voice,
            tipo: tipo || 'tts',
        })

    } catch (err: any) {
        console.error('[Voice Preview] Error:', err)
        return NextResponse.json({ error: err.message || 'TTS failed' }, { status: 500 })
    }
}
