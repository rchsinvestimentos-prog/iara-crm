import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas — types match actual DB columns
const CreateProcSchema = z.object({
    nome: z.string().min(1).max(100),
    valor: z.number().min(0).max(999999),
    desconto: z.number().min(0).max(999999).optional().default(0),
    parcelas: z.number().int().min(0).max(999).optional().nullable(),
    duracao: z.number().int().min(0).max(1440).optional().nullable(),
    descricao: z.string().max(5000).optional().nullable(),
})

const UpdateProcSchema = CreateProcSchema.extend({
    id: z.number().int(),
})

// GET /api/procedimentos
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        const procedimentos = await prisma.procedimento.findMany({
            where: { clinicaId: cid, ativo: true },
            orderBy: { createdAt: 'desc' },
        })

        // Convert Decimal to number for JSON serialization
        const result = procedimentos.map(p => ({
            ...p,
            valor: Number(p.valor),
            desconto: Number(p.desconto),
        }))

        return NextResponse.json(result)
    } catch (err) {
        console.error('[GET /api/procedimentos] Erro:', err)
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
            data: {
                clinicaId: Number(clinicaId),
                nome: validated.nome,
                valor: validated.valor,
                desconto: validated.desconto,
                parcelas: validated.parcelas ?? null,
                duracao: validated.duracao ?? null,
                descricao: validated.descricao ?? null,
            },
        })

        return NextResponse.json({
            ...proc,
            valor: Number(proc.valor),
            desconto: Number(proc.desconto),
        })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao criar', details: String(err) }, { status: 500 })
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
            where: { id: validated.id, clinicaId: Number(clinicaId) },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
        }

        const { id, ...data } = validated
        const proc = await prisma.procedimento.update({
            where: { id },
            data,
        })

        return NextResponse.json({
            ...proc,
            valor: Number(proc.valor),
            desconto: Number(proc.desconto),
        })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[PUT /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao atualizar', details: String(err) }, { status: 500 })
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
        const idStr = searchParams.get('id')
        if (!idStr) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const id = Number(idStr)
        if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

        // Verificar ownership antes de deletar
        const existing = await prisma.procedimento.findFirst({
            where: { id, clinicaId: Number(clinicaId) },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
        }

        await prisma.procedimento.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[DELETE /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao deletar', details: String(err) }, { status: 500 })
    }
}
