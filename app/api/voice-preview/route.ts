// ============================================
// API: Preview de vozes TTS
// ============================================
// Gera um áudio de demonstração com a voz selecionada
// usando a OpenAI TTS API.

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Frases de exemplo que a IARA falaria
const FRASES: Record<string, string> = {
    'pt-BR': 'Oii, tudo bem? 😊 Aqui é a secretária da Dra. Me conta, o que você tá buscando? Posso te ajudar com agendamento, tirar dúvidas sobre procedimentos ou qualquer outra coisa!',
    'en-US': "Hi there! I'm the Doctor's secretary. How can I help you today? I can assist with scheduling, answer questions about procedures, or anything else you need!",
    'es': '¡Hola! Soy la secretaria de la Dra. ¿En qué puedo ayudarte? Puedo asistirte con citas, resolver dudas sobre procedimientos o cualquier otra cosa.',
}

export async function POST(request: NextRequest) {
    try {
        const { voice, tipo } = await request.json()

        if (!voice) {
            return NextResponse.json({ error: 'voice required' }, { status: 400 })
        }

        // Para vozes TTS (OpenAI)
        const validTTSVoices = ['nova', 'shimmer', 'alloy', 'echo', 'fable', 'onyx']
        if (!validTTSVoices.includes(voice)) {
            return NextResponse.json({ error: 'invalid voice' }, { status: 400 })
        }

        const frase = FRASES['pt-BR']

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: frase,
            response_format: 'mp3',
            speed: 1.0,
        })

        const buffer = Buffer.from(await mp3.arrayBuffer())
        const base64 = buffer.toString('base64')

        return NextResponse.json({
            audio: `data:audio/mp3;base64,${base64}`,
            voice,
            tipo: tipo || 'tts',
        })

    } catch (err: any) {
        console.error('[Voice Preview] Error:', err)
        return NextResponse.json({ error: err.message || 'TTS failed' }, { status: 500 })
    }
}
