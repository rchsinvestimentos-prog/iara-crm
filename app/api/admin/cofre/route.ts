import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /api/admin/cofre — Buscar COFRE + Feedbacks ativos
export async function GET() {
    try {
        const cofre = await pool.query('SELECT * FROM iara_cofre ORDER BY id DESC LIMIT 1')
        const feedbacks = await pool.query('SELECT * FROM iara_feedbacks ORDER BY criado_em DESC')

        return NextResponse.json({
            cofre: cofre.rows[0] || null,
            feedbacks: feedbacks.rows || [],
        })
    } catch (err) {
        console.error('Erro ao buscar COFRE:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PUT /api/admin/cofre — Atualizar o COFRE
export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { leis_imutaveis, conhecimento_especialista, arsenal_de_objecoes, roteiro_vendas } = body

        const result = await pool.query(
            `UPDATE iara_cofre 
             SET leis_imutaveis = $1, 
                 conhecimento_especialista = $2, 
                 arsenal_de_objecoes = $3, 
                 roteiro_vendas = $4, 
                 atualizado_em = NOW()
             WHERE id = (SELECT id FROM iara_cofre ORDER BY id LIMIT 1)
             RETURNING *`,
            [leis_imutaveis, conhecimento_especialista, arsenal_de_objecoes, roteiro_vendas]
        )

        return NextResponse.json({ cofre: result.rows[0] })
    } catch (err) {
        console.error('Erro ao atualizar COFRE:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/admin/cofre — Adicionar feedback
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { feedback, categoria } = body

        if (!feedback) {
            return NextResponse.json({ error: 'Feedback é obrigatório' }, { status: 400 })
        }

        const result = await pool.query(
            'INSERT INTO iara_feedbacks (feedback, categoria) VALUES ($1, $2) RETURNING *',
            [feedback, categoria || 'comportamento']
        )

        return NextResponse.json({ feedback: result.rows[0] })
    } catch (err) {
        console.error('Erro ao criar feedback:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE /api/admin/cofre — Remover/desativar feedback
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
        }

        await pool.query('UPDATE iara_feedbacks SET ativo = FALSE WHERE id = $1', [id])

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro ao remover feedback:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
