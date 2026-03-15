import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/contatos — Lista contatos com filtros
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const etapa = searchParams.get('etapa')
        const busca = searchParams.get('busca')

        const where: Record<string, unknown> = { clinicaId }
        if (etapa) where.etapa = etapa
        if (busca) {
            where.OR = [
                { nome: { contains: busca, mode: 'insensitive' } },
                { telefone: { contains: busca } },
                { cpf: { contains: busca } },
                { email: { contains: busca, mode: 'insensitive' } },
            ]
        }

        const contatos = await prisma.contato.findMany({
            where: where as any,
            orderBy: { updatedAt: 'desc' },
            take: 500,
        })

        return NextResponse.json({ contatos })
    } catch (err) {
        console.error('Erro GET /api/contatos:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/contatos — Criar contato manual
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { nome, telefone, email, etapa, notas, tags, cpf, dataNascimento, memoriaIA } = body

        if (!nome || !telefone) {
            return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 })
        }

        const contato = await prisma.contato.upsert({
            where: { clinicaId_telefone: { clinicaId, telefone } },
            update: {
                nome,
                email,
                cpf: cpf || undefined,
                dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
                memoriaIA: memoriaIA || undefined,
                notas,
                tags: tags || [],
                etapa: etapa || undefined,
                updatedAt: new Date(),
            },
            create: {
                clinicaId,
                nome,
                telefone,
                email,
                cpf,
                dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
                memoriaIA,
                origem: 'manual',
                etapa: etapa || 'novo',
                notas,
                tags: tags || [],
            },
        })

        return NextResponse.json({ ok: true, contato })
    } catch (err) {
        console.error('Erro POST /api/contatos:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
