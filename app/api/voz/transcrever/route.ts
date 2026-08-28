import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transcribeAudio } from '@/lib/engine/audio'

/**
 * POST /api/voz/transcrever
 * Body: { audioBase64: string }
 *
 * Converte um áudio gravado no navegador em texto, pelo mesmo Whisper que a
 * IARA usa quando a paciente manda áudio no WhatsApp.
 *
 * Serve ao simulador: gravar e mandar áudio testa também a compreensão, não
 * só a resposta. Sotaque, ruído de fundo e nome de procedimento mal
 * pronunciado só aparecem como problema quando se testa por voz.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!(session?.user as { email?: string })?.email) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { audioBase64 } = await request.json()
        if (!audioBase64) return NextResponse.json({ error: 'Áudio vazio' }, { status: 400 })

        // ~15MB em base64 — bem acima de um áudio de WhatsApp, e evita que um
        // envio gigante trave a rota.
        if (String(audioBase64).length > 20_000_000) {
            return NextResponse.json({ error: 'Áudio muito longo' }, { status: 413 })
        }

        const texto = await transcribeAudio(audioBase64)
        if (!texto) {
            return NextResponse.json({ error: 'Não consegui entender o áudio' }, { status: 502 })
        }

        return NextResponse.json({ texto })
    } catch (err) {
        console.error('[Transcrever] Erro:', err)
        return NextResponse.json({ error: 'Erro ao transcrever' }, { status: 500 })
    }
}
