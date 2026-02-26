import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /api/admin/sugestoes — Listar TODAS as sugestões (admin)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')

        let query = `SELECT s.*, u.email 
                      FROM sugestoes_clientes s 
                      LEFT JOIN users u ON s.user_id = u.id`
        const params: string[] = []

        if (status && status !== 'todos') {
            query += ' WHERE s.status = $1'
            params.push(status)
        }

        query += ' ORDER BY s.criado_em DESC'

        const result = await pool.query(query, params)

        return NextResponse.json({ sugestoes: result.rows })
    } catch (err) {
        console.error('Erro ao buscar sugestões admin:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PUT /api/admin/sugestoes — Responder ou mudar status
export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { id, status, resposta_admin } = body

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
        }

        const updates: string[] = []
        const values: (string | number)[] = []
        let idx = 1

        if (status) {
            updates.push(`status = $${idx++}`)
            values.push(status)
        }
        if (resposta_admin) {
            updates.push(`resposta_admin = $${idx++}`)
            values.push(resposta_admin)
            updates.push(`respondido_em = NOW()`)
        }

        values.push(id)

        const result = await pool.query(
            `UPDATE sugestoes_clientes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        )

        return NextResponse.json({ sugestao: result.rows[0] })
    } catch (err) {
        console.error('Erro ao atualizar sugestão:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
