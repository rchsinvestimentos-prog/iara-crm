import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { transcribeAudio } from '@/lib/engine/audio'

/**
 * POST /api/voz/transcrever
 * Body: { audioBase64: string, mimeType?: string }
 *
 * Converte um áudio gravado no navegador em texto, pela mesma transcrição que a
 * IARA usa quando a paciente manda áudio no WhatsApp (em qualquer idioma).
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

        if (!process.env.OPENAI_API_KEY) {
            console.error('[Transcrever] OPENAI_API_KEY ausente — transcrição desligada')
            return NextResponse.json({ error: 'A transcrição de áudio não está configurada no servidor. Digite a mensagem e avise o suporte.' }, { status: 500 })
        }

        const { audioBase64, mimeType } = await request.json()
        if (!audioBase64) return NextResponse.json({ error: 'Áudio vazio' }, { status: 400 })

        // ~15MB em base64 — bem acima de um áudio de WhatsApp, e evita que um
        // envio gigante trave a rota.
        if (String(audioBase64).length > 20_000_000) {
            return NextResponse.json({ error: 'Áudio muito longo' }, { status: 413 })
        }

        // O navegador grava webm (Chrome) ou mp4 (iPhone); o Whisper lê o formato
        // pela extensão do nome. Sem o tipo, segue como antes (ogg).
        const tipo = String(mimeType || '').split(';')[0].trim().toLowerCase()
        const extensao = tipo.includes('webm') ? 'webm'
            : tipo.includes('mp4') || tipo.includes('m4a') || tipo.includes('aac') ? 'mp4'
            : tipo.includes('mpeg') ? 'mp3'
            : tipo.includes('wav') ? 'wav'
            : 'ogg'
        // O idioma da clínica só é usado se a transcrição principal falhar e
        // cair na reserva (que precisa saber o idioma de antemão).
        let idiomaClinica: string | null = null
        try {
            const clinicaId = await getClinicaId(session)
            const clinica = clinicaId
                ? await prisma.clinica.findUnique({ where: { id: clinicaId }, select: { idioma: true } })
                : null
            idiomaClinica = clinica?.idioma ?? null
        } catch (err) {
            console.error('[Transcrever] Não consegui ler o idioma da clínica — reserva fica em português:', err)
        }
        const texto = await transcribeAudio(audioBase64, tipo || 'audio/ogg', `audio.${extensao}`, idiomaClinica)
        if (!texto) {
            return NextResponse.json({ error: 'Não consegui entender o áudio' }, { status: 502 })
        }

        return NextResponse.json({ texto })
    } catch (err) {
        console.error('[Transcrever] Erro:', err)
        return NextResponse.json({ error: 'Erro ao transcrever' }, { status: 500 })
    }
}
