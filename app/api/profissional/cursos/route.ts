import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isProfissional, getProfissionalId, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT id, nome, modalidade, valor, duracao, vagas, desconto,
                   parcelas, descricao, link, ativo, "createdAt" as created_at
            FROM cursos
            WHERE profissional_id = $1 AND ativo = true
            ORDER BY "createdAt" DESC
        `, profId)

        return NextResponse.json(rows)
    } catch (err: any) {
        console.error('[Prof/cursos] GET:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        const profId = getProfissionalId(session)
        const clinicaId = await getClinicaId(session)
        if (!profId || !clinicaId) return NextResponse.json({ error: 'IDs não encontrados' }, { status: 404 })

        const body = await request.json()
        const { nome, modalidade, valor, duracao, vagas, desconto, parcelas, descricao, link } = body

        if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            INSERT INTO cursos
                ("clinicaId", profissional_id, nome, modalidade, valor, duracao, vagas, desconto, parcelas, descricao, link, ativo, "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
            RETURNING *
        `,
            String(clinicaId), profId, nome.trim(),
            modalidade || 'presencial',
            Number(valor) || 0,
            duracao || null,
            vagas ? Number(vagas) : null,
            Number(desconto) || 0,
            parcelas || null,
            descricao || null,
            link || null
        )

        return NextResponse.json(rows[0])
    } catch (err: any) {
        console.error('[Prof/cursos] POST:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const body = await request.json()
        const { id, nome, modalidade, valor, duracao, vagas, desconto, parcelas, descricao, link } = body
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM cursos WHERE id = $1 AND profissional_id = $2`, id, profId
        )
        if (!existing[0]) return NextResponse.json({ error: 'Curso não encontrado' }, { status: 404 })

        await prisma.$executeRawUnsafe(`
            UPDATE cursos SET
                nome = $1, modalidade = $2, valor = $3, duracao = $4,
                vagas = $5, desconto = $6, parcelas = $7,
                descricao = $8, link = $9
            WHERE id = $10 AND profissional_id = $11
        `,
            nome?.trim() || '', modalidade || 'presencial',
            Number(valor) || 0, duracao || null,
            vagas ? Number(vagas) : null, Number(desconto) || 0,
            parcelas || null, descricao || null, link || null,
            id, profId
        )

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/cursos] PUT:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        await prisma.$executeRawUnsafe(
            `UPDATE cursos SET ativo = false WHERE id = $1 AND profissional_id = $2`, id, profId
        )

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/cursos] DELETE:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
