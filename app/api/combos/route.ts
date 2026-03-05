import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateComboSchema = z.object({
    nome: z.string().min(1).max(200),
    descricao: z.string().max(5000).optional().nullable(),
    valorOriginal: z.number().min(0).default(0),
    valorCombo: z.number().min(0).default(0),
    procedimentoIds: z.array(z.string()).min(1, 'Selecione pelo menos 1 procedimento'),
})

const UpdateComboSchema = CreateComboSchema.extend({
    id: z.string().min(1),
})

// GET /api/combos
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const combos = await prisma.combo.findMany({
            where: { clinicaId: String(clinicaId), ativo: true },
            include: { procedimentos: true },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(combos)
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/combos
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { procedimentoIds, ...validated } = CreateComboSchema.parse(body)

        const combo = await prisma.combo.create({
            data: {
                clinicaId: String(clinicaId),
                ...validated,
                procedimentos: {
                    create: procedimentoIds.map(pid => ({ procedimentoId: pid })),
                },
            },
            include: { procedimentos: true },
        })

        return NextResponse.json(combo)
    } catch (err) {
        if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        console.error('[POST /api/combos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 })
    }
}

// PUT /api/combos
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { id, procedimentoIds, ...validated } = UpdateComboSchema.parse(body)

        const existing = await prisma.combo.findFirst({ where: { id, clinicaId: String(clinicaId) } })
        if (!existing) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 })

        // Delete old relations and recreate
        await prisma.comboProcedimento.deleteMany({ where: { comboId: id } })

        const combo = await prisma.combo.update({
            where: { id },
            data: {
                ...validated,
                procedimentos: {
                    create: procedimentoIds.map(pid => ({ procedimentoId: pid })),
                },
            },
            include: { procedimentos: true },
        })

        return NextResponse.json(combo)
    } catch (err) {
        if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        console.error('[PUT /api/combos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
}

// DELETE /api/combos
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const existing = await prisma.combo.findFirst({ where: { id, clinicaId: String(clinicaId) } })
        if (!existing) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 })

        await prisma.combo.update({ where: { id }, data: { ativo: false } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
    }
}
