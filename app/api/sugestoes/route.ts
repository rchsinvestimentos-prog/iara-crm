import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/sugestoes — Listar sugestões do cliente logado
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('user_id')

        if (!userId) {
            return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })
        }

        const result = await prisma.$queryRawUnsafe(
            `SELECT id, tipo, mensagem, arquivo_url, arquivo_nome, status, resposta_admin, respondido_em, criado_em
             FROM sugestoes_clientes 
             WHERE user_id = $1 
             ORDER BY criado_em DESC`,
            parseInt(userId)
        ) as any[]

        return NextResponse.json({ sugestoes: result })
    } catch (err) {
        console.error('Erro ao buscar sugestões:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/sugestoes — Cliente envia nova sugestão
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { user_id, nome_clinica, tipo, mensagem, arquivo_url, arquivo_nome } = body

        if (!user_id || (!mensagem && !arquivo_url)) {
            return NextResponse.json({ error: 'Envie uma mensagem ou arquivo' }, { status: 400 })
        }

        const result = await prisma.$queryRawUnsafe(
            `INSERT INTO sugestoes_clientes (user_id, nome_clinica, tipo, mensagem, arquivo_url, arquivo_nome)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            parseInt(user_id), nome_clinica || '', tipo || 'texto', mensagem || '', arquivo_url || null, arquivo_nome || null
        ) as any[]

        return NextResponse.json({ sugestao: result[0] })
    } catch (err) {
        console.error('Erro ao criar sugestão:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
