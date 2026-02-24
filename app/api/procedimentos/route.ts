import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/procedimentos — lista procedimentos da clínica
export async function GET() {
    try {
        const clinica = await prisma.clinica.findFirst()
        if (!clinica) throw new Error('Sem clínica')

        const procedimentos = await prisma.procedimento.findMany({
            where: { clinicaId: clinica.id, ativo: true },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(procedimentos)
    } catch {
        return NextResponse.json([
            { id: '1', nome: 'Micropigmentação Fio a Fio', valor: 497, desconto: 10, parcelas: '3x sem juros', duracao: '2h' },
            { id: '2', nome: 'Sombreado', valor: 397, desconto: 20, parcelas: '3x sem juros', duracao: '1h30' },
            { id: '3', nome: 'Lip Blush (Lábios)', valor: 597, desconto: 0, parcelas: '5x sem juros', duracao: '2h30' },
        ])
    }
}

// POST /api/procedimentos — adicionar procedimento
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const clinica = await prisma.clinica.findFirst()
        if (!clinica) throw new Error('Sem clínica')

        const proc = await prisma.procedimento.create({
            data: {
                clinicaId: clinica.id,
                nome: body.nome,
                valor: body.valor,
                desconto: body.desconto || 0,
                parcelas: body.parcelas,
                duracao: body.duracao,
            },
        })

        return NextResponse.json(proc)
    } catch {
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 })
    }
}

// PUT /api/procedimentos — atualizar procedimento
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()

        const proc = await prisma.procedimento.update({
            where: { id: body.id },
            data: {
                nome: body.nome,
                valor: body.valor,
                desconto: body.desconto,
                parcelas: body.parcelas,
                duracao: body.duracao,
            },
        })

        return NextResponse.json(proc)
    } catch {
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
}

// DELETE /api/procedimentos — deletar procedimento (soft delete)
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        await prisma.procedimento.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
    }
}
