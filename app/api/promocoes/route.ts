import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreatePromocaoSchema = z.object({
    nome: z.string().min(1).max(200),
    descricao: z.string().max(5000).optional().nullable(),
    instrucaoIara: z.string().max(5000).optional().nullable(),
    tipoDesconto: z.enum(['percentual', 'valor_fixo']).default('percentual'),
    valorDesconto: z.number().min(0).max(100000).default(0),
    dataInicio: z.string(),
    dataFim: z.string(),
    procedimentoIds: z.array(z.string()).optional().default([]),
})

const UpdatePromocaoSchema = CreatePromocaoSchema.extend({
    id: z.string().min(1),
})

// GET /api/promocoes
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const promocoes = await prisma.promocao.findMany({
            where: { clinicaId: String(clinicaId), ativo: true },
            include: { procedimentos: true },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(promocoes)
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/promocoes
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { procedimentoIds, ...validated } = CreatePromocaoSchema.parse(body)

        const promo = await prisma.promocao.create({
            data: {
                clinicaId: String(clinicaId),
                ...validated,
                dataInicio: new Date(validated.dataInicio),
                dataFim: new Date(validated.dataFim),
                procedimentos: {
                    create: procedimentoIds.map(pid => ({ procedimentoId: pid })),
                },
            },
            include: { procedimentos: true },
        })

        return NextResponse.json(promo)
    } catch (err) {
        if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        console.error('[POST /api/promocoes] Erro:', err)
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 })
    }
}

// PUT /api/promocoes
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { id, procedimentoIds, ...validated } = UpdatePromocaoSchema.parse(body)

        const existing = await prisma.promocao.findFirst({ where: { id, clinicaId: String(clinicaId) } })
        if (!existing) return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })

        // Delete old relations and recreate
        await prisma.promocaoProcedimento.deleteMany({ where: { promocaoId: id } })

        const promo = await prisma.promocao.update({
            where: { id },
            data: {
                ...validated,
                dataInicio: new Date(validated.dataInicio),
                dataFim: new Date(validated.dataFim),
                procedimentos: {
                    create: procedimentoIds.map(pid => ({ procedimentoId: pid })),
                },
            },
            include: { procedimentos: true },
        })

        return NextResponse.json(promo)
    } catch (err) {
        if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        console.error('[PUT /api/promocoes] Erro:', err)
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
}

// DELETE /api/promocoes
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const existing = await prisma.promocao.findFirst({ where: { id, clinicaId: String(clinicaId) } })
        if (!existing) return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })

        await prisma.promocao.update({ where: { id }, data: { ativo: false } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
    }
}
