import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/midia/clonar-avatar — Envia vídeo para HeyGen e cria avatar
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true, nome: true },
        })

        if (!clinica || clinica.plano < 4) {
            return NextResponse.json({ error: 'Avatar em vídeo disponível apenas no Plano Audiovisual (4)', planoAtual: clinica?.plano }, { status: 403 })
        }

        const formData = await request.formData()
        const video = formData.get('video') as File

        if (!video) {
            return NextResponse.json({ error: 'Envie um vídeo de 2-5 minutos (rosto frontal, boa iluminação)' }, { status: 400 })
        }

        // Step 1: Upload video to HeyGen
        const uploadForm = new FormData()
        uploadForm.append('file', video)

        const uploadRes = await fetch('https://api.heygen.com/v1/talking_photo.upload', {
            method: 'POST',
            headers: {
                'X-Api-Key': process.env.HEYGEN_API_KEY || '',
            },
            body: uploadForm,
        })

        if (!uploadRes.ok) {
            const err = await uploadRes.text()
            console.error('HeyGen upload error:', err)
            return NextResponse.json({ error: 'Erro ao enviar vídeo para HeyGen', detalhes: err }, { status: 500 })
        }

        const uploadData = await uploadRes.json()
        const avatarId = uploadData.data?.talking_photo_id || uploadData.data?.avatar_id || ''

        if (!avatarId) {
            return NextResponse.json({ error: 'HeyGen não retornou ID do avatar', response: uploadData }, { status: 500 })
        }

        // Salvar avatar_id no banco N8N
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE users SET avatar_id = $1, avatar_provider = 'heygen', updated_at = NOW() WHERE nome_clinica ILIKE $2`,
                avatarId, `%${clinica.nome}%`
            )
        } catch { /* column might not exist */ }

        return NextResponse.json({
            ok: true,
            avatarId,
            mensagem: `Avatar da ${clinica.nome} criado! A IARA agora pode gerar vídeos com seu rosto.`,
        })
    } catch (err) {
        console.error('Erro em /api/midia/clonar-avatar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/midia/clonar-avatar — Status do avatar
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true },
        })

        let avatarId = null
        try {
            const result = await prisma.$queryRawUnsafe(
                `SELECT avatar_id FROM users WHERE nome_clinica ILIKE $1 LIMIT 1`,
                `%${clinicaId}%`
            ) as { avatar_id: string }[]
            if (Array.isArray(result) && result.length > 0) {
                avatarId = result[0].avatar_id
            }
        } catch { /* column might not exist */ }

        return NextResponse.json({
            avatarId,
            temAvatar: !!avatarId,
            plano: clinica?.plano || 1,
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
