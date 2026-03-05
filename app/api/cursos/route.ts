import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas
const CreateCursoSchema = z.object({
    nome: z.string().min(1).max(200),
    modalidade: z.enum(['presencial', 'online', 'hibrido']).default('presencial'),
    valor: z.number().min(0).max(1000000).default(0),
    duracao: z.string().max(50).optional().nullable(),
    vagas: z.number().min(0).max(10000).optional().nullable(),
    desconto: z.number().min(0).max(100).optional().default(0),
    parcelas: z.string().max(50).optional().nullable(),
    descricao: z.string().max(5000).optional().nullable(),
})

const UpdateCursoSchema = CreateCursoSchema.extend({
    id: z.string().min(1),
})

// GET /api/cursos
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cursos = await prisma.curso.findMany({
            where: { clinicaId: String(clinicaId), ativo: true },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json(cursos)
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/cursos
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = CreateCursoSchema.parse(body)

        const curso = await prisma.curso.create({
            data: { clinicaId: String(clinicaId), ...validated },
        })

        return NextResponse.json(curso)
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/cursos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 })
    }
}

// PUT /api/cursos
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = UpdateCursoSchema.parse(body)

        const existing = await prisma.curso.findFirst({
            where: { id: validated.id, clinicaId: String(clinicaId) },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
        }

        const { id, ...data } = validated
        const curso = await prisma.curso.update({
            where: { id },
            data,
        })

        return NextResponse.json(curso)
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[PUT /api/cursos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }
}

// DELETE /api/cursos
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

        const existing = await prisma.curso.findFirst({
            where: { id, clinicaId: String(clinicaId) },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })
        }

        await prisma.curso.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 })
    }
}
