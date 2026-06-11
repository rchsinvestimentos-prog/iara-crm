import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/contatos/[id]/marcacoes — Lista marcações do paciente
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const cid = Number(clinicaId)
        const { id } = await context.params
        const contatoId = Number(id)

        if (isNaN(contatoId)) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
        }

        const marcacoes = await prisma.marcacaoEstetica.findMany({
            where: { contatoId, clinicaId: cid },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ marcacoes })
    } catch (err: any) {
        console.error('[GET /api/contatos/[id]/marcacoes] Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/contatos/[id]/marcacoes — Cria uma nova marcação estética
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const cid = Number(clinicaId)
        const { id } = await context.params
        const contatoId = Number(id)

        if (isNaN(contatoId)) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
        }

        const body = await request.json()
        const { titulo, pontos, modelo } = body

        if (!pontos || !Array.isArray(pontos)) {
            return NextResponse.json({ error: 'Pontos de marcação inválidos' }, { status: 400 })
        }

        const marcacao = await prisma.marcacaoEstetica.create({
            data: {
                clinicaId: cid,
                contatoId,
                titulo: titulo || 'Marcação Estética',
                pontos,
                modelo: modelo || 'face'
            }
        })

        return NextResponse.json({ ok: true, marcacao })
    } catch (err: any) {
        console.error('[POST /api/contatos/[id]/marcacoes] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao salvar marcação', detalhe: err.message }, { status: 500 })
    }
}
