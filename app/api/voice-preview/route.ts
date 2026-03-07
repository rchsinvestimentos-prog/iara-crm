// ============================================
// API: Preview de vozes TTS + ElevenLabs
// ============================================
// Gera áudio de demonstração e cacheia no banco.
// Na 2ª vez, puxa do cache (instantâneo, sem custo).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

const FRASE = 'Oii, tudo bem? Aqui é a Iara, secretária da Doutora Ana. Me conta o que você tá precisando, posso te ajudar com agendamento, tirar dúvidas sobre procedimentos ou qualquer outra coisa!'

export async function POST(request: NextRequest) {
    try {
        const { voice, tipo } = await request.json()

        if (!voice) {
            return NextResponse.json({ error: 'voice required' }, { status: 400 })
        }

        const tipoFinal = tipo || 'tts'

        // ============================================
        // 1. Checar cache no banco
        // ============================================
        try {
            const cached = await prisma.$queryRawUnsafe<{ audio_base64: string }[]>(
                'SELECT audio_base64 FROM cache_voice_preview WHERE voice_id = $1 AND tipo = $2',
                voice, tipoFinal
            )
            if (cached.length > 0) {
                return NextResponse.json({
                    audio: `data:audio/mp3;base64,${cached[0].audio_base64}`,
                    voice, tipo: tipoFinal, cached: true,
                })
            }
        } catch {
            // Tabela pode não existir ainda — gera normalmente
        }

        // ============================================
        // 2. Gerar áudio
        // ============================================
        let audioBase64: string

        if (tipoFinal === 'elevenlabs') {
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
                    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
                }),
            })

            if (!res.ok) {
                const err = await res.text()
                console.error('[Voice Preview] ElevenLabs error:', err)
                return NextResponse.json({ error: 'ElevenLabs TTS failed' }, { status: 500 })
            }

            audioBase64 = Buffer.from(await res.arrayBuffer()).toString('base64')
        } else {
            const validVoices = ['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']
            if (!validVoices.includes(voice)) {
                return NextResponse.json({ error: 'invalid voice' }, { status: 400 })
            }
            if (!OPENAI_API_KEY) {
                return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
            }

            const res = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'tts-1', voice, input: FRASE, response_format: 'mp3', speed: 1.0 }),
            })

            if (!res.ok) {
                const err = await res.text()
                console.error('[Voice Preview] OpenAI error:', err)
                return NextResponse.json({ error: 'OpenAI TTS failed' }, { status: 500 })
            }

            audioBase64 = Buffer.from(await res.arrayBuffer()).toString('base64')
        }

        // ============================================
        // 3. Salvar no cache
        // ============================================
        try {
            await prisma.$executeRawUnsafe(
                `INSERT INTO cache_voice_preview (voice_id, tipo, audio_base64)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (voice_id, tipo) DO UPDATE SET audio_base64 = $3, created_at = NOW()`,
                voice, tipoFinal, audioBase64
            )
        } catch (err) {
            console.error('[Voice Preview] Erro salvando cache:', err)
        }

        return NextResponse.json({
            audio: `data:audio/mp3;base64,${audioBase64}`,
            voice, tipo: tipoFinal, cached: false,
        })
    } catch (err: any) {
        console.error('[Voice Preview] Error:', err)
        return NextResponse.json({ error: err.message || 'TTS failed' }, { status: 500 })
    }
}
