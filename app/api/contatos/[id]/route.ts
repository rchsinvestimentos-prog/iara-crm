import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/contatos/[id] — Editar contato
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { nome, telefone, email, notas, tags, etapa, cpf, dataNascimento, memoriaIA } = body

        const contato = await prisma.contato.updateMany({
            where: { id: parseInt(params.id), clinicaId },
            data: {
                ...(nome !== undefined && { nome }),
                ...(telefone !== undefined && { telefone }),
                ...(email !== undefined && { email }),
                ...(cpf !== undefined && { cpf }),
                ...(dataNascimento !== undefined && { dataNascimento: dataNascimento ? new Date(dataNascimento) : null }),
                ...(memoriaIA !== undefined && { memoriaIA }),
                ...(notas !== undefined && { notas }),
                ...(tags !== undefined && { tags }),
                ...(etapa !== undefined && { etapa }),
                updatedAt: new Date(),
            },
        })

        if (contato.count === 0) {
            return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro PATCH /api/contatos/[id]:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE /api/contatos/[id] — Deletar contato
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const result = await prisma.contato.deleteMany({
            where: { id: parseInt(params.id), clinicaId },
        })

        if (result.count === 0) {
            return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro DELETE /api/contatos/[id]:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
