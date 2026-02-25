import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const CreateProcSchema = z.object({
    nome: z.string().min(1).max(100),
    valor: z.number().min(0).max(100000),
    desconto: z.number().min(0).max(100).optional().default(0),
    parcelas: z.string().max(50).optional().nullable(),
    duracao: z.string().max(20).optional().nullable(),
})

const UpdateProcSchema = CreateProcSchema.extend({
    id: z.string().min(1),
})

// GET /api/procedimentos
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const procedimentos = await prisma.procedimento.findMany({
            where: { clinicaId, ativo: true },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(procedimentos)
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/procedimentos
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = CreateProcSchema.parse(body)

        const proc = await prisma.procedimento.create({
            data: { clinicaId, ...validated },
        })

        return NextResponse.json(proc)
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
        }
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 })
    }
}

// PUT /api/procedimentos
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = UpdateProcSchema.parse(body)

        // Verificar que o procedimento pertence à clínica
        const existing = await prisma.procedimento.findFirst({
            where: { id: validated.id, clinicaId },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
        }

        const { id, ...data } = validated
        const proc = await prisma.procedimento.update({
            where: { id },
            data,
        })

        return NextResponse.json(proc)
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
        }
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
}

// DELETE /api/procedimentos
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        // Verificar ownership antes de deletar
        const existing = await prisma.procedimento.findFirst({
            where: { id, clinicaId },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
        }

        await prisma.procedimento.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
    }
}
