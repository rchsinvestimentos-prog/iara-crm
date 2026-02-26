import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/midia/clonar-voz — Envia áudio para ElevenLabs e clona voz
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true, nome: true },
        })

        if (!clinica || clinica.plano < 3) {
            return NextResponse.json({ error: 'Voz clonada disponível a partir do Plano Designer (3)', planoAtual: clinica?.plano }, { status: 403 })
        }

        const formData = await request.formData()
        const audio = formData.get('audio') as File
        const nomeVoz = formData.get('nome') as string || clinica.nome || 'Dra'

        if (!audio) {
            return NextResponse.json({ error: 'Envie um arquivo de áudio' }, { status: 400 })
        }

        // Preparar FormData para ElevenLabs
        const elevenLabsForm = new FormData()
        elevenLabsForm.append('name', `IARA - ${nomeVoz}`)
        elevenLabsForm.append('description', `Voz clonada da ${nomeVoz} para IARA`)
        elevenLabsForm.append('files', audio)

        // Chamar API ElevenLabs — Add Voice
        const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
            },
            body: elevenLabsForm,
        })

        if (!res.ok) {
            const err = await res.text()
            console.error('ElevenLabs error:', err)
            return NextResponse.json({ error: 'Erro ao clonar voz na ElevenLabs', detalhes: err }, { status: 500 })
        }

        const data = await res.json()
        const voiceId = data.voice_id

        // Salvar voice_id no banco
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                voiceId: voiceId,
                voiceProvider: 'elevenlabs',
            } as Record<string, unknown>,
        })

        // Também salvar no banco N8N
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE users SET voice_id = $1, voice_provider = 'elevenlabs', updated_at = NOW() WHERE nome_clinica ILIKE $2`,
                voiceId, `%${clinica.nome}%`
            )
        } catch { /* N8N table might not have these columns yet */ }

        return NextResponse.json({
            ok: true,
            voiceId,
            mensagem: `Voz da ${nomeVoz} clonada com sucesso! A IARA agora responde com sua voz.`,
        })
    } catch (err) {
        console.error('Erro em /api/midia/clonar-voz:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/midia/clonar-voz — Status da voz clonada
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true },
        })

        // Tentar buscar voice_id do banco
        let voiceId = null
        try {
            const result = await prisma.$queryRawUnsafe(
                `SELECT voice_id FROM users WHERE nome_clinica ILIKE $1 LIMIT 1`,
                `%${clinicaId}%`
            ) as { voice_id: string }[]
            if (Array.isArray(result) && result.length > 0) {
                voiceId = result[0].voice_id
            }
        } catch { /* column might not exist */ }

        return NextResponse.json({
            voiceId,
            temVoz: !!voiceId,
            plano: clinica?.plano || 1,
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
