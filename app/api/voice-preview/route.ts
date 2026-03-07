// ============================================
// API: Preview de vozes TTS
// ============================================
// Gera um áudio de demonstração com a voz selecionada
// usando a OpenAI TTS API (via fetch, sem lib).

import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// Frase de exemplo que a IARA falaria
const FRASE = 'Oii, tudo bem? Aqui é a secretária da Dra. Me conta, o que você tá buscando? Posso te ajudar com agendamento, tirar dúvidas sobre procedimentos ou qualquer outra coisa!'

export async function POST(request: NextRequest) {
    try {
        const { voice } = await request.json()

        if (!voice) {
            return NextResponse.json({ error: 'voice required' }, { status: 400 })
        }

        const validVoices = ['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']
        if (!validVoices.includes(voice)) {
            return NextResponse.json({ error: 'invalid voice' }, { status: 400 })
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
            return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        const base64 = buffer.toString('base64')

        return NextResponse.json({
            audio: `data:audio/mp3;base64,${base64}`,
            voice,
        })

    } catch (err: any) {
        console.error('[Voice Preview] Error:', err)
        return NextResponse.json({ error: err.message || 'TTS failed' }, { status: 500 })
    }
}
