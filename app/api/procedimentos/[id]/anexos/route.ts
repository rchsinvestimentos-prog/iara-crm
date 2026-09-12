import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomBytes } from 'crypto'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { resolve, relative, isAbsolute, extname } from 'path'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    normalizarAnexos,
    EXTENSOES_ANEXO,
    MOMENTOS,
    MAX_ANEXOS_POR_PROCEDIMENTO,
    MAX_BYTES_ANEXO,
    MAX_DESCRICAO_ANEXO,
    type AnexoProcedimento,
    type MomentoAnexo,
} from '@/lib/anexos-procedimento'

// Anexos do procedimento: foto, vídeo ou PDF que a IARA manda para a paciente.
// Ficam em UPLOADS_DIR/<clinica>/anexos/ (pasta protegida: só a clínica abre)
// e na coluna procedimentos.anexos. Esta rota é a única que grava essa coluna —
// o PUT de /api/procedimentos não mexe nela.

const UPLOADS_DIR = resolve(process.env.UPLOADS_DIR || '/app/uploads')
const MOMENTOS_VALIDOS = new Set<string>(MOMENTOS.map(m => m.valor))

type Ctx = { params: Promise<{ id: string }> }

/** Procedimento ativo desta clínica, com os anexos, ou uma resposta de erro. */
async function carregar(ctx: Ctx) {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return { erro: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) }

    const { id } = await ctx.params
    const procId = Number(id)
    if (!Number.isInteger(procId)) return { erro: NextResponse.json({ error: 'ID inválido' }, { status: 400 }) }

    const linhas = await prisma.$queryRaw<{ id: number; anexos: unknown }[]>`
        SELECT id, anexos FROM procedimentos
        WHERE id = ${procId} AND user_id = ${clinicaId} AND ativo = true
        LIMIT 1
    `
    if (!linhas[0]) return { erro: NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 }) }

    return { clinicaId, procId, anexos: normalizarAnexos(linhas[0].anexos), email: session?.user?.email }
}

async function gravar(procId: number, clinicaId: number, anexos: AnexoProcedimento[]) {
    await prisma.$executeRaw`
        UPDATE procedimentos SET anexos = ${JSON.stringify(anexos)}::jsonb
        WHERE id = ${procId} AND user_id = ${clinicaId}
    `
}

function publico(a: AnexoProcedimento) {
    return {
        id: a.id,
        tipo: a.tipo,
        nomeArquivo: a.nomeArquivo,
        tamanho: a.tamanho,
        descricao: a.descricao,
        momento: a.momento,
        criadoEm: a.criadoEm,
        url: `/api/uploads/${a.arquivo}`,
    }
}

function lerMomento(v: unknown): MomentoAnexo | null {
    return typeof v === 'string' && MOMENTOS_VALIDOS.has(v) ? (v as MomentoAnexo) : null
}

function lerDescricao(v: unknown): string {
    return typeof v === 'string' ? v.trim().slice(0, MAX_DESCRICAO_ANEXO) : ''
}

// GET — lista os anexos do procedimento
export async function GET(_: NextRequest, ctx: Ctx) {
    try {
        const r = await carregar(ctx)
        if ('erro' in r) return r.erro
        return NextResponse.json({ anexos: r.anexos.map(publico) })
    } catch (err) {
        console.error('[Anexos GET] Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST (multipart) — file, descricao, momento
export async function POST(request: NextRequest, ctx: Ctx) {
    try {
        const r = await carregar(ctx)
        if ('erro' in r) return r.erro

        if (r.anexos.length >= MAX_ANEXOS_POR_PROCEDIMENTO) {
            return NextResponse.json({ error: `Cada procedimento aceita até ${MAX_ANEXOS_POR_PROCEDIMENTO} anexos.` }, { status: 400 })
        }

        const form = await request.formData()
        const file = form.get('file')
        const descricao = lerDescricao(form.get('descricao'))
        const momento = lerMomento(form.get('momento'))

        if (!(file instanceof File)) return NextResponse.json({ error: 'Escolha um arquivo.' }, { status: 400 })
        if (!descricao) return NextResponse.json({ error: 'Escreva o que é o arquivo, para a IARA saber quando mandar.' }, { status: 400 })
        if (!momento) return NextResponse.json({ error: 'Escolha quando a IARA deve enviar.' }, { status: 400 })

        const ext = extname(file.name || '').toLowerCase()
        const formato = EXTENSOES_ANEXO[ext]
        if (!formato) {
            return NextResponse.json({ error: 'Formato não aceito. Use foto (JPG, PNG, WEBP), vídeo MP4 ou PDF.' }, { status: 400 })
        }
        if (file.size <= 0) return NextResponse.json({ error: 'Arquivo vazio.' }, { status: 400 })
        if (file.size > MAX_BYTES_ANEXO) {
            return NextResponse.json({ error: `Arquivo muito grande. Máximo ${MAX_BYTES_ANEXO / 1024 / 1024} MB (limite do WhatsApp).` }, { status: 400 })
        }

        const pasta = resolve(UPLOADS_DIR, String(r.clinicaId), 'anexos')
        await mkdir(pasta, { recursive: true })
        const nomeDisco = `${randomBytes(8).toString('hex')}${ext}`
        await writeFile(resolve(pasta, nomeDisco), Buffer.from(await file.arrayBuffer()))

        const nomeOriginal = (file.name || `anexo${ext}`).replace(/[\\/\r\n"]/g, '_').slice(0, 120)
        const novo: AnexoProcedimento = {
            id: randomBytes(4).toString('hex'),
            tipo: formato.tipo,
            nomeArquivo: nomeOriginal,
            arquivo: `${r.clinicaId}/anexos/${nomeDisco}`,
            mimetype: formato.mimetype,
            tamanho: file.size,
            descricao,
            momento,
            criadoEm: new Date().toISOString(),
        }
        await gravar(r.procId, r.clinicaId, [...r.anexos, novo])
        console.log(`[Anexos] 📎 ${novo.tipo} anexado ao procedimento ${r.procId} por ${r.email}`)

        return NextResponse.json({ ok: true, anexo: publico(novo) })
    } catch (err) {
        console.error('[Anexos POST] Erro:', err)
        return NextResponse.json({ error: 'Erro ao enviar o arquivo' }, { status: 500 })
    }
}

// PATCH (json) — { anexoId, descricao?, momento? }
export async function PATCH(request: NextRequest, ctx: Ctx) {
    try {
        const r = await carregar(ctx)
        if ('erro' in r) return r.erro

        const body = await request.json().catch(() => ({}))
        const alvo = r.anexos.find(a => a.id === body?.anexoId)
        if (!alvo) return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })

        if (body.descricao !== undefined) {
            const d = lerDescricao(body.descricao)
            if (!d) return NextResponse.json({ error: 'A descrição não pode ficar vazia.' }, { status: 400 })
            alvo.descricao = d
        }
        if (body.momento !== undefined) {
            const m = lerMomento(body.momento)
            if (!m) return NextResponse.json({ error: 'Momento inválido' }, { status: 400 })
            alvo.momento = m
        }
        await gravar(r.procId, r.clinicaId, r.anexos)
        return NextResponse.json({ ok: true, anexo: publico(alvo) })
    } catch (err) {
        console.error('[Anexos PATCH] Erro:', err)
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
    }
}

// DELETE ?anexoId=
export async function DELETE(request: NextRequest, ctx: Ctx) {
    try {
        const r = await carregar(ctx)
        if ('erro' in r) return r.erro

        const anexoId = new URL(request.url).searchParams.get('anexoId')
        const alvo = r.anexos.find(a => a.id === anexoId)
        if (!alvo) return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })

        await gravar(r.procId, r.clinicaId, r.anexos.filter(a => a.id !== alvo.id))

        // Só apaga arquivo que está mesmo na pasta de anexos desta clínica.
        const caminho = resolve(UPLOADS_DIR, alvo.arquivo)
        const rel = relative(resolve(UPLOADS_DIR, String(r.clinicaId), 'anexos'), caminho)
        if (rel && !rel.startsWith('..') && !isAbsolute(rel)) {
            await unlink(caminho).catch(() => { /* já não estava no disco */ })
        }
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[Anexos DELETE] Erro:', err)
        return NextResponse.json({ error: 'Erro ao apagar' }, { status: 500 })
    }
}
