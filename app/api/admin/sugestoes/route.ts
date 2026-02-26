import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/sugestoes — Listar TODAS as sugestões (admin)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const status = searchParams.get('status')

        let result: any[]

        if (status && status !== 'todos') {
            result = await prisma.$queryRawUnsafe(
                `SELECT s.*, u.email 
                 FROM sugestoes_clientes s 
                 LEFT JOIN users u ON s.user_id = u.id
                 WHERE s.status = $1
                 ORDER BY s.criado_em DESC`,
                status
            ) as any[]
        } else {
            result = await prisma.$queryRawUnsafe(
                `SELECT s.*, u.email 
                 FROM sugestoes_clientes s 
                 LEFT JOIN users u ON s.user_id = u.id
                 ORDER BY s.criado_em DESC`
            ) as any[]
        }

        return NextResponse.json({ sugestoes: result })
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

        if (resposta_admin && status) {
            const result = await prisma.$queryRawUnsafe(
                `UPDATE sugestoes_clientes SET status = $1, resposta_admin = $2, respondido_em = NOW() WHERE id = $3 RETURNING *`,
                status, resposta_admin, parseInt(id)
            ) as any[]
            return NextResponse.json({ sugestao: result[0] })
        } else if (status) {
            const result = await prisma.$queryRawUnsafe(
                `UPDATE sugestoes_clientes SET status = $1 WHERE id = $2 RETURNING *`,
                status, parseInt(id)
            ) as any[]
            return NextResponse.json({ sugestao: result[0] })
        } else if (resposta_admin) {
            const result = await prisma.$queryRawUnsafe(
                `UPDATE sugestoes_clientes SET resposta_admin = $1, respondido_em = NOW() WHERE id = $2 RETURNING *`,
                resposta_admin, parseInt(id)
            ) as any[]
            return NextResponse.json({ sugestao: result[0] })
        }

        return NextResponse.json({ error: 'Nenhuma alteração enviada' }, { status: 400 })
    } catch (err) {
        console.error('Erro ao atualizar sugestão:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
