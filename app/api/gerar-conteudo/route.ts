import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { gerarRoteiro, gerarPost, gerarMarca, analisarInstagram } from '@/lib/ai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { tipo, ...params } = body

    try {
        let resultado: any

        switch (tipo) {
            case 'roteiro':
                resultado = await gerarRoteiro(params.assunto, params.formato)
                return NextResponse.json({ sucesso: true, conteudo: resultado })

            case 'post':
                resultado = await gerarPost(params.tema, params.tipoPost)
                return NextResponse.json({ sucesso: true, conteudo: resultado })

            case 'raioX':
                resultado = await analisarInstagram(params.handle)
                return NextResponse.json({ sucesso: true, analise: resultado })

            case 'marca':
                resultado = await gerarMarca(params.nome, params.especialidade, params.estilo)
                return NextResponse.json({ sucesso: true, marca: resultado })

            default:
                return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
        }
    } catch (error: any) {
        console.error('Erro ao gerar conteúdo:', error)
        return NextResponse.json({
            error: 'Falha ao gerar conteúdo',
            detalhe: error.message
        }, { status: 500 })
    }
}
