import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        
        const contatoId = parseInt(params.id)
        if (isNaN(contatoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

        // Find the contact to ensure it belongs to the clinic
        const contato = await prisma.contato.findUnique({
            where: { id: contatoId }
        })

        if (!contato) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        
        const midias = await prisma.midiaContato.findMany({
            where: { contatoId: contatoId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ midias })
    } catch (error) {
        console.error('Erro ao buscar mídias:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        
        const contatoId = parseInt(params.id)
        if (isNaN(contatoId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

        const contato = await prisma.contato.findUnique({
            where: { id: contatoId }
        })

        if (!contato || !contato.clinicaId) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })

        const body = await req.json()
        const { url, tipo, titulo, anotacoes } = body

        if (!url) return NextResponse.json({ error: 'URL/Base64 da mídia é obrigatória' }, { status: 400 })

        const novaMidia = await prisma.midiaContato.create({
            data: {
                contatoId,
                clinicaId: contato.clinicaId,
                url,
                tipo: tipo || 'imagem',
                titulo: titulo || null,
                anotacoes: anotacoes || null
            }
        })

        return NextResponse.json({ midia: novaMidia }, { status: 201 })
    } catch (error) {
        console.error('Erro ao salvar mídia:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
