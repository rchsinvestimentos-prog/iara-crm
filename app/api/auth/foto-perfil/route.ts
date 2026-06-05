import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * POST /api/auth/foto-perfil
 * Faz upload de foto de perfil da clínica logada.
 * Body: FormData com campo "file"
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
    }

    // Garantir que o diretório existe
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Remover foto anterior se existir
    const clinica = await prisma.clinica.findUnique({
      where: { id: clinicaId },
      select: { fotoUrl: true },
    })

    if (clinica?.fotoUrl && clinica.fotoUrl.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), 'public', clinica.fotoUrl)
      await unlink(oldPath).catch(() => {}) // Ignora se não existir
    }

    // Gerar nome único para o arquivo
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const fileName = `clinica-${clinicaId}-${Date.now()}.${ext}`
    const filePath = path.join(UPLOAD_DIR, fileName)
    const publicUrl = `/uploads/avatars/${fileName}`

    // Salvar arquivo no disco
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Atualizar a clínica no banco
    await prisma.clinica.update({
      where: { id: clinicaId },
      data: { fotoUrl: publicUrl },
    })

    console.log(`[FotoPerfil] ✅ Avatar atualizado para clínica ${clinicaId}: ${publicUrl}`)

    return NextResponse.json({ ok: true, url: publicUrl })
  } catch (err: any) {
    console.error('[FotoPerfil] ❌ Erro ao fazer upload:', err)
    return NextResponse.json({ error: 'Erro interno ao salvar imagem' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/foto-perfil
 * Remove a foto de perfil da clínica logada.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findUnique({
      where: { id: clinicaId },
      select: { fotoUrl: true },
    })

    if (clinica?.fotoUrl && clinica.fotoUrl.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), 'public', clinica.fotoUrl)
      await unlink(oldPath).catch(() => {})
    }

    await prisma.clinica.update({
      where: { id: clinicaId },
      data: { fotoUrl: null },
    })

    console.log(`[FotoPerfil] 🗑️ Avatar removido para clínica ${clinicaId}`)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[FotoPerfil] ❌ Erro ao remover foto:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
