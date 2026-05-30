import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/iara/cofre — Endpoint para o N8N buscar COFRE + feedbacks
export async function GET() {
    try {
        const cofre = await prisma.$queryRawUnsafe('SELECT * FROM iara_cofre ORDER BY id DESC LIMIT 1') as any[]
        const feedbacks = await prisma.$queryRawUnsafe(
            "SELECT feedback, categoria FROM iara_feedbacks WHERE ativo = TRUE ORDER BY criado_em ASC"
        ) as any[]

        const cofreData = cofre[0]
        if (!cofreData) {
            return NextResponse.json({ error: 'COFRE não encontrado' }, { status: 404 })
        }

        // Monta o bloco de feedbacks como texto
        const feedbackTexto = feedbacks.length > 0
            ? feedbacks.map((f: { feedback: string; categoria: string }, i: number) =>
                `${i + 1}. [${f.categoria.toUpperCase()}] ${f.feedback}`
            ).join('\n')
            : 'Nenhum feedback adicional.'

        return NextResponse.json({
            leis_imutaveis: cofreData.leis_imutaveis,
            conhecimento_especialista: cofreData.conhecimento_especialista,
            arsenal_de_objecoes: cofreData.arsenal_de_objecoes,
            roteiro_vendas: cofreData.roteiro_vendas,
            feedbacks_da_dra: feedbackTexto,
            total_feedbacks: feedbacks.length,
            atualizado_em: cofreData.atualizado_em,
        })
    } catch (err) {
        console.error('Erro ao buscar COFRE para N8N:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
