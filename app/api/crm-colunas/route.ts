import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_COLUMNS = [
    { nome: 'Novo', slug: 'novo', cor: '#6B7280', ordem: 0 },
    { nome: 'Importado', slug: 'importado', cor: '#94A3B8', ordem: 1 },
    { nome: 'Em conversa', slug: 'em_conversa', cor: '#3B82F6', ordem: 2 },
    { nome: 'Interessada', slug: 'interessada', cor: '#F59E0B', ordem: 3 },
    { nome: 'Agendada', slug: 'agendada', cor: '#8B5CF6', ordem: 4 },
    { nome: 'Atendida', slug: 'atendida', cor: '#10B981', ordem: 5 },
    { nome: 'Retorno', slug: 'retorno', cor: '#EC4899', ordem: 6 },
    { nome: 'Stand By', slug: 'stand_by', cor: '#9CA3AF', ordem: 7 },
    { nome: 'Fidelizada', slug: 'fidelizada', cor: '#D99773', ordem: 8 },
]

// GET /api/crm-colunas — Lista colunas (cria defaults se não existir)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        let colunas = await prisma.crmColuna.findMany({
            where: { clinicaId },
            orderBy: { ordem: 'asc' },
        })

        // Se não tem colunas, cria as default
        if (colunas.length === 0) {
            await prisma.crmColuna.createMany({
                data: DEFAULT_COLUMNS.map(c => ({ ...c, clinicaId })),
            })
            colunas = await prisma.crmColuna.findMany({
                where: { clinicaId },
                orderBy: { ordem: 'asc' },
            })
        }

        return NextResponse.json({ colunas })
    } catch (err) {
        console.error('Erro GET /api/crm-colunas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/crm-colunas — Criar nova coluna
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { nome, cor } = await request.json()
        if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

        const slug = nome.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        const maxOrdem = await prisma.crmColuna.findFirst({
            where: { clinicaId },
            orderBy: { ordem: 'desc' },
            select: { ordem: true },
        })

        const coluna = await prisma.crmColuna.create({
            data: { clinicaId, nome, slug, cor: cor || '#D99773', ordem: (maxOrdem?.ordem ?? 0) + 1 },
        })

        return NextResponse.json({ ok: true, coluna })
    } catch (err) {
        console.error('Erro POST /api/crm-colunas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH /api/crm-colunas — Atualizar coluna (nome, cor, ordem)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id, nome, cor, ordem } = await request.json()
        if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

        await prisma.crmColuna.updateMany({
            where: { id, clinicaId },
            data: {
                ...(nome !== undefined && { nome }),
                ...(cor !== undefined && { cor }),
                ...(ordem !== undefined && { ordem }),
            },
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro PATCH /api/crm-colunas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE /api/crm-colunas — Deletar coluna
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id } = await request.json()
        if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

        await prisma.crmColuna.deleteMany({ where: { id, clinicaId } })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro DELETE /api/crm-colunas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
