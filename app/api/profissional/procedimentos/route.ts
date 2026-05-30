import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isProfissional, getProfissionalId, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/profissional/procedimentos
 * Lista procedimentos do profissional logado
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT id, nome, preco_normal as valor, preco_minimo as desconto,
                   parcelamento_padrao as parcelas, duracao_minutos as duracao,
                   descricao, pos_procedimento as "posProcedimento", ativo
            FROM procedimentos
            WHERE profissional_id = $1 AND ativo = true
            ORDER BY created_at DESC
        `, profId)

        return NextResponse.json(rows.map(r => ({
            ...r,
            valor: Number(r.valor),
            desconto: Number(r.desconto),
        })))
    } catch (err: any) {
        console.error('[Prof/procedimentos] GET:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * POST /api/profissional/procedimentos
 * Cria procedimento vinculado ao profissional
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const profId = getProfissionalId(session)
        let clinicaId = await getClinicaId(session)

        // Fallback: buscar clinica_id do profissional no banco
        if (!clinicaId && profId) {
            const prof = await prisma.$queryRawUnsafe<any[]>(
                `SELECT clinica_id FROM profissionais WHERE id = $1`, profId
            )
            if (prof[0]?.clinica_id) clinicaId = Number(prof[0].clinica_id)
        }

        if (!profId || !clinicaId) return NextResponse.json({ error: 'IDs não encontrados' }, { status: 404 })

        const body = await request.json()
        const { nome, valor, desconto, parcelas, duracao, descricao, posProcedimento } = body

        if (!nome || nome.trim().length === 0) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        }

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            INSERT INTO procedimentos 
                (user_id, profissional_id, nome, preco_normal, preco_minimo, parcelamento_padrao, duracao_minutos, descricao, pos_procedimento, ativo, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
            RETURNING id, nome, preco_normal as valor, preco_minimo as desconto,
                      parcelamento_padrao as parcelas, duracao_minutos as duracao,
                      descricao, pos_procedimento as "posProcedimento"
        `,
            Number(clinicaId), profId, nome.trim(),
            Number(valor) || 0, Number(desconto) || 0,
            parcelas ? Number(parcelas) : null,
            duracao ? Number(duracao) : null,
            descricao || null, posProcedimento || null
        )

        return NextResponse.json({
            ...rows[0],
            valor: Number(rows[0].valor),
            desconto: Number(rows[0].desconto),
        })
    } catch (err: any) {
        console.error('[Prof/procedimentos] POST:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * PUT /api/profissional/procedimentos
 * Atualiza procedimento do profissional
 */
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const body = await request.json()
        const { id, nome, valor, desconto, parcelas, duracao, descricao, posProcedimento } = body

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        // Verify ownership
        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM procedimentos WHERE id = $1 AND profissional_id = $2`, id, profId
        )
        if (!existing[0]) return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })

        await prisma.$executeRawUnsafe(`
            UPDATE procedimentos SET
                nome = $1, preco_normal = $2, preco_minimo = $3,
                parcelamento_padrao = $4, duracao_minutos = $5,
                descricao = $6, pos_procedimento = $7
            WHERE id = $8 AND profissional_id = $9
        `,
            nome?.trim() || '', Number(valor) || 0, Number(desconto) || 0,
            parcelas ? Number(parcelas) : null, duracao ? Number(duracao) : null,
            descricao || null, posProcedimento || null,
            id, profId
        )

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/procedimentos] PUT:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * DELETE /api/profissional/procedimentos
 * Soft-delete procedimento do profissional
 */
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
            `UPDATE procedimentos SET ativo = false WHERE id = $1 AND profissional_id = $2`,
            Number(id), profId
        )

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/procedimentos] DELETE:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
