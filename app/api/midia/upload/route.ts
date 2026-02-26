import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Diretório de uploads — montado como volume Docker em produção
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads'

// POST /api/midia/upload — Upload de fotos, áudios ou vídeos
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true, nome: true },
        })
        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const formData = await request.formData()
        const file = formData.get('file') as File
        const tipo = formData.get('tipo') as string || 'foto' // 'foto' | 'audio' | 'video'

        if (!file) {
            return NextResponse.json({ error: 'Envie um arquivo' }, { status: 400 })
        }

        // Validar tipo e tamanho
        const maxSize: Record<string, number> = {
            foto: 10 * 1024 * 1024,    // 10MB
            audio: 25 * 1024 * 1024,   // 25MB (ElevenLabs precisa 1-3 min)
            video: 200 * 1024 * 1024,  // 200MB (HeyGen precisa 2-5 min)
        }

        if (file.size > (maxSize[tipo] || maxSize.foto)) {
            return NextResponse.json({
                error: `Arquivo muito grande. Máximo: ${Math.round((maxSize[tipo] || maxSize.foto) / 1024 / 1024)}MB`
            }, { status: 400 })
        }

        // Validar plano
        if (tipo === 'audio' && clinica.plano < 3) {
            return NextResponse.json({ error: 'Upload de áudio para clonagem disponível no Plano 3+' }, { status: 403 })
        }
        if (tipo === 'video' && clinica.plano < 4) {
            return NextResponse.json({ error: 'Upload de vídeo para avatar disponível no Plano 4' }, { status: 403 })
        }

        // Criar diretório da clínica
        const clinicaDir = join(UPLOADS_DIR, String(clinicaId))
        const tipoDir = join(clinicaDir, tipo)

        if (!existsSync(tipoDir)) {
            await mkdir(tipoDir, { recursive: true })
        }

        // Gerar nome único
        const ext = file.name.split('.').pop() || 'bin'
        const timestamp = Date.now()
        const filename = `${tipo}_${timestamp}.${ext}`
        const filepath = join(tipoDir, filename)

        // Salvar arquivo
        const bytes = await file.arrayBuffer()
        await writeFile(filepath, Buffer.from(bytes))

        // URL relativa para acessar
        const url = `/uploads/${clinicaId}/${tipo}/${filename}`

        return NextResponse.json({
            ok: true,
            url,
            filename,
            tipo,
            tamanho: file.size,
            mensagem: tipo === 'audio'
                ? 'Áudio salvo! Agora clique em "Clonar Voz" para enviar à ElevenLabs.'
                : tipo === 'video'
                    ? 'Vídeo salvo! Agora clique em "Criar Avatar" para enviar ao HeyGen.'
                    : 'Foto salva com sucesso!',
        })
    } catch (err) {
        console.error('Erro upload:', err)
        return NextResponse.json({ error: 'Erro interno no upload' }, { status: 500 })
    }
}

// GET /api/midia/upload — Listar arquivos da clínica
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const tipo = searchParams.get('tipo') || 'foto'

        const tipoDir = join(UPLOADS_DIR, String(clinicaId), tipo)

        if (!existsSync(tipoDir)) {
            return NextResponse.json({ arquivos: [] })
        }

        const { readdir, stat } = await import('fs/promises')
        const files = await readdir(tipoDir)

        const arquivos = await Promise.all(
            files.map(async (f) => {
                const s = await stat(join(tipoDir, f))
                return {
                    nome: f,
                    url: `/uploads/${clinicaId}/${tipo}/${f}`,
                    tamanho: s.size,
                    data: s.mtime,
                }
            })
        )

        return NextResponse.json({
            arquivos: arquivos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        })
    } catch {
        return NextResponse.json({ arquivos: [] })
    }
}
