import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'

// Volume do EasyPanel, montado em /app/uploads. Antes ficava em public/, que
// é descartado a cada deploy.
const UPLOADS_ROOT = process.env.UPLOADS_DIR || '/app/uploads'
const UPLOAD_DIR = path.join(UPLOADS_ROOT, 'avatars')
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// A foto da clínica fica em configuracoes.foto_url.
//
// Esta rota lia e gravava "fotoUrl" na tabela da clínica, mas esse campo só
// existe nas tabelas de profissional e de contato. O Prisma recusava e a
// rota devolvia "Erro interno" em todo envio — a foto de perfil da clínica
// nunca funcionou. Passou despercebido porque o build ignora erro de tipo.
//
// Guardar em configuracoes, e não criar a coluna, é de propósito: coluna nova
// exige rodar /api/setup-db depois do deploy, e esquecer isso já derrubou o
// login de todas as clínicas duas vezes.

async function lerConfig(clinicaId: number) {
  const c = await prisma.clinica.findUnique({ where: { id: clinicaId }, select: { configuracoes: true } })
  return (c?.configuracoes as Record<string, unknown> | null) || {}
}

async function apagarArquivoAntigo(url: unknown) {
  if (typeof url !== 'string') return
  if (url.startsWith('/api/uploads/avatars/')) {
    await unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {})
  }
}

/**
 * POST /api/auth/foto-perfil
 * Body: FormData com campo "file"
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
    }

    await mkdir(UPLOAD_DIR, { recursive: true })

    const cfg = await lerConfig(clinicaId)
    await apagarArquivoAntigo(cfg.foto_url)

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const fileName = `clinica-${clinicaId}-${Date.now()}.${ext}`
    await writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(await file.arrayBuffer()))
    const url = `/api/uploads/avatars/${fileName}`

    await prisma.clinica.update({
      where: { id: clinicaId },
      data: { configuracoes: { ...cfg, foto_url: url } as any },
    })

    console.log(`[FotoPerfil] ✅ Avatar atualizado para clínica ${clinicaId}: ${url}`)
    return NextResponse.json({ ok: true, url })
  } catch (err: any) {
    console.error('[FotoPerfil] ❌ Erro ao fazer upload:', err)
    return NextResponse.json({ error: 'Erro interno ao salvar imagem' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/foto-perfil
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const cfg = await lerConfig(clinicaId)
    await apagarArquivoAntigo(cfg.foto_url)
    const { foto_url: _removida, ...resto } = cfg

    await prisma.clinica.update({
      where: { id: clinicaId },
      data: { configuracoes: resto as any },
    })

    console.log(`[FotoPerfil] 🗑️ Avatar removido para clínica ${clinicaId}`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[FotoPerfil] ❌ Erro ao remover foto:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
