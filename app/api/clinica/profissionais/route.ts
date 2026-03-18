import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Limites por plano
function getMaxProfissionais(plano: string | null | undefined, nivel: number): number {
    const p = plano?.toLowerCase() || ''
    if (p.includes('4') || nivel >= 4) return 11 // dona + 10
    if (p.includes('3') || nivel >= 3) return 6  // dona + 5
    if (p.includes('2') || nivel >= 2) return 4  // dona + 3
    return 1 // plano 1: só a dona
}

// GET: Listar profissionais da clínica
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true, plano: true, nivel: true }
    })

    if (!clinica) {
        return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const profissionais = await prisma.profissional.findMany({
        where: { clinicaId: clinica.id },
        include: { procedimentos: { where: { ativo: true } } },
        orderBy: [{ isDono: 'desc' }, { ordem: 'asc' }, { createdAt: 'asc' }]
    })

    const max = getMaxProfissionais(clinica.plano, clinica.nivel)

    return NextResponse.json({
        profissionais,
        total: profissionais.length,
        max,
        plano: clinica.plano,
        nivel: clinica.nivel,
    })
}

// POST: Criar profissional
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true, plano: true, nivel: true, nomeDoutora: true, nome: true, diferenciais: true }
    })

    if (!clinica) {
        return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const max = getMaxProfissionais(clinica.plano, clinica.nivel)
    const count = await prisma.profissional.count({ where: { clinicaId: clinica.id } })

    if (count >= max) {
        return NextResponse.json({
            error: `Limite de ${max} profissional(is) atingido. Faça upgrade do plano para adicionar mais.`
        }, { status: 403 })
    }

    const body = await req.json()

    // Primeira vez? Criar a dona automaticamente se não existe
    if (count === 0 && !body.isDono) {
        // Auto-criar a dona primeiro
        await prisma.profissional.create({
            data: {
                clinicaId: clinica.id,
                nome: clinica.nomeDoutora || clinica.nome || 'Dona da Clínica',
                bio: clinica.diferenciais || null,
                isDono: true,
                ativo: true,
                ordem: 0,
            }
        })
    }

    const profissional = await prisma.profissional.create({
        data: {
            clinicaId: clinica.id,
            nome: body.nome,
            bio: body.bio || null,
            especialidade: body.especialidade || null,
            whatsapp: body.whatsapp || null,
            horarioSemana: body.horarioSemana || null,
            almocoSemana: body.almocoSemana || null,
            atendeSabado: body.atendeSabado ?? null,
            horarioSabado: body.horarioSabado || null,
            almocoSabado: body.almocoSabado || null,
            atendeDomingo: body.atendeDomingo ?? null,
            horarioDomingo: body.horarioDomingo || null,
            almocoDomingo: body.almocoDomingo || null,
            intervaloAtendimento: body.intervaloAtendimento ?? null,
            ausencias: body.ausencias || [],
            isDono: body.isDono || false,
            ativo: true,
            ordem: body.ordem ?? count,
        }
    })

    return NextResponse.json(profissional, { status: 201 })
}

// PUT: Atualizar profissional
export async function PUT(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true }
    })

    if (!clinica) {
        return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    if (!body.id) {
        return NextResponse.json({ error: 'ID do profissional é obrigatório' }, { status: 400 })
    }

    // Verificar que pertence à clínica
    const existing = await prisma.profissional.findFirst({
        where: { id: body.id, clinicaId: clinica.id }
    })

    if (!existing) {
        return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    const updated = await prisma.profissional.update({
        where: { id: body.id },
        data: {
            ...(body.nome !== undefined && { nome: body.nome }),
            ...(body.bio !== undefined && { bio: body.bio }),
            ...(body.especialidade !== undefined && { especialidade: body.especialidade }),
            ...(body.whatsapp !== undefined && { whatsapp: body.whatsapp }),
            ...(body.horarioSemana !== undefined && { horarioSemana: body.horarioSemana }),
            ...(body.almocoSemana !== undefined && { almocoSemana: body.almocoSemana }),
            ...(body.atendeSabado !== undefined && { atendeSabado: body.atendeSabado }),
            ...(body.horarioSabado !== undefined && { horarioSabado: body.horarioSabado }),
            ...(body.almocoSabado !== undefined && { almocoSabado: body.almocoSabado }),
            ...(body.atendeDomingo !== undefined && { atendeDomingo: body.atendeDomingo }),
            ...(body.horarioDomingo !== undefined && { horarioDomingo: body.horarioDomingo }),
            ...(body.almocoDomingo !== undefined && { almocoDomingo: body.almocoDomingo }),
            ...(body.intervaloAtendimento !== undefined && { intervaloAtendimento: body.intervaloAtendimento }),
            ...(body.ausencias !== undefined && { ausencias: body.ausencias }),
            ...(body.ativo !== undefined && { ativo: body.ativo }),
            ...(body.ordem !== undefined && { ordem: body.ordem }),
        }
    })

    return NextResponse.json(updated)
}

// DELETE: Remover profissional (não permite remover a dona)
export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true }
    })

    if (!clinica) {
        return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) {
        return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    const profissional = await prisma.profissional.findFirst({
        where: { id, clinicaId: clinica.id }
    })

    if (!profissional) {
        return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    if (profissional.isDono) {
        return NextResponse.json({ error: 'Não é possível remover a dona da clínica' }, { status: 403 })
    }

    // Desvincular procedimentos
    await prisma.procedimento.updateMany({
        where: { profissionalId: id },
        data: { profissionalId: null }
    })

    await prisma.profissional.delete({ where: { id } })

    return NextResponse.json({ ok: true })
}
