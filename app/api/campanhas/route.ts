import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/campanhas — Lista campanhas
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId }, select: { nivel: true } })
        if (!clinica || clinica.nivel < 4) {
            return NextResponse.json({ error: 'Recurso exclusivo do Plano 4' }, { status: 403 })
        }

        const campanhas = await prisma.campanha.findMany({
            where: { clinicaId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { envios: true } } },
        })

        return NextResponse.json({ campanhas })
    } catch (err) {
        console.error('Erro GET /api/campanhas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/campanhas — Criar campanha
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true },
        })
        if (!clinica || clinica.nivel < 4) {
            return NextResponse.json({ error: 'Recurso exclusivo do Plano 4' }, { status: 403 })
        }

        const { nome, mensagem, filtroEtapa } = await request.json()

        if (!nome || !mensagem) {
            return NextResponse.json({ error: 'Nome e mensagem são obrigatórios' }, { status: 400 })
        }

        // Buscar contatos que vão receber
        const whereContatos: Record<string, unknown> = { clinicaId }
        if (filtroEtapa) whereContatos.etapa = filtroEtapa

        const contatos = await prisma.contato.findMany({
            where: whereContatos as any,
            select: { telefone: true, nome: true },
        })

        if (contatos.length === 0) {
            return NextResponse.json({ error: 'Nenhum contato encontrado para esta etapa' }, { status: 400 })
        }

        // Criar campanha + envios
        const campanha = await prisma.campanha.create({
            data: {
                clinicaId,
                nome,
                mensagem,
                filtroEtapa,
                envios: {
                    create: contatos.map(c => ({
                        telefone: c.telefone,
                        nome: c.nome,
                    })),
                },
            },
            include: { _count: { select: { envios: true } } },
        })

        return NextResponse.json({ ok: true, campanha })
    } catch (err) {
        console.error('Erro POST /api/campanhas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
