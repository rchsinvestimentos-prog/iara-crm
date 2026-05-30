// ============================================
// ADMIN: Pré-gerar TODAS as vozes de uma vez
// ============================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

const FRASE = 'Oii, tudo bem? Aqui é a Iara, secretária da Doutora Ana. Me conta o que você tá precisando, posso te ajudar com agendamento, tirar dúvidas sobre procedimentos ou qualquer outra coisa!'

const TODAS_VOZES = [
    { voice: 'nova', tipo: 'tts', nome: 'Nova' },
    { voice: 'shimmer', tipo: 'tts', nome: 'Shimmer' },
    { voice: 'alloy', tipo: 'tts', nome: 'Alloy' },
    { voice: '7eUAxNOneHxqfyRS77mW', tipo: 'elevenlabs', nome: 'Carla' },
    { voice: 'lWq4KDY8znfkV0DrK8Vb', tipo: 'elevenlabs', nome: 'Yasmin' },
    { voice: 'oi8rgjIfLgJRsQ6rbZh3', tipo: 'elevenlabs', nome: 'Amanda' },
    { voice: 'a7l5EMFEpTRuD82NW0rC', tipo: 'elevenlabs', nome: 'Rhay' },
    { voice: 'rthJ5Dw4ng8Orz8mYafh', tipo: 'elevenlabs', nome: 'Luana' },
    { voice: 'OB6x7EbXYlhG4DDTB1XU', tipo: 'elevenlabs', nome: 'Michelle' },
    { voice: 'x3mAOLD9WzlmrFCwA1S3', tipo: 'elevenlabs', nome: 'Evellyn' },
    { voice: 'GFPGeIuI7dxt6YeFLE7l', tipo: 'elevenlabs', nome: 'Ayres' },
    { voice: 'RGymW84CSmfVugnA5tvA', tipo: 'elevenlabs', nome: 'Roberta' },
    { voice: '5EtawPduB139avoMLQgH', tipo: 'elevenlabs', nome: 'Thais' },
    { voice: 'e06XicPETIbfUaeHM9zH', tipo: 'elevenlabs', nome: 'Fabi' },
    { voice: 'UZ8QqWVrz7tMdxiglcLh', tipo: 'elevenlabs', nome: 'Livia' },
]

export async function POST() {
    const resultados: { nome: string; tipo: string; status: string }[] = []

    for (const voz of TODAS_VOZES) {
        try {
            const cached = await prisma.$queryRawUnsafe<{ id: number }[]>(
                'SELECT id FROM cache_voice_preview WHERE voice_id = $1 AND tipo = $2',
                voz.voice, voz.tipo
            )
            if (cached.length > 0) {
                resultados.push({ nome: voz.nome, tipo: voz.tipo, status: '⏭️ já existe' })
                continue
            }

            let audioBase64: string

            if (voz.tipo === 'elevenlabs') {
                const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz.voice}`, {
                    method: 'POST',
                    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
                    body: JSON.stringify({ text: FRASE, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 } }),
                })
                if (!res.ok) { resultados.push({ nome: voz.nome, tipo: voz.tipo, status: `❌ ElevenLabs ${res.status}` }); continue }
                audioBase64 = Buffer.from(await res.arrayBuffer()).toString('base64')
            } else {
                const res = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'tts-1', voice: voz.voice, input: FRASE, response_format: 'mp3', speed: 1.0 }),
                })
                if (!res.ok) { resultados.push({ nome: voz.nome, tipo: voz.tipo, status: `❌ OpenAI ${res.status}` }); continue }
                audioBase64 = Buffer.from(await res.arrayBuffer()).toString('base64')
            }

            await prisma.$executeRawUnsafe(
                `INSERT INTO cache_voice_preview (voice_id, tipo, audio_base64)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (voice_id, tipo) DO UPDATE SET audio_base64 = $3, created_at = NOW()`,
                voz.voice, voz.tipo, audioBase64
            )

            resultados.push({ nome: voz.nome, tipo: voz.tipo, status: '✅ gerado e salvo' })
        } catch (err: any) {
            resultados.push({ nome: voz.nome, tipo: voz.tipo, status: `❌ ${err.message}` })
        }
    }

    return NextResponse.json({
        total: TODAS_VOZES.length,
        sucesso: resultados.filter(r => r.status.includes('✅') || r.status.includes('⏭️')).length,
        falhou: resultados.filter(r => r.status.includes('❌')).length,
        resultados,
    })
}
