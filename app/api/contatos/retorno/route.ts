import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/contatos/retorno — Agendar retorno para um contato
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { contatoId, data, mensagem } = await req.json()

        if (!contatoId || !data) {
            return NextResponse.json({ error: 'contatoId e data são obrigatórios' }, { status: 400 })
        }

        const retornoData = new Date(data)
        if (isNaN(retornoData.getTime())) {
            return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
        }

        // Verificar se o contato pertence à clínica
        const contato = await prisma.contato.findFirst({
            where: { id: contatoId, clinicaId },
        })

        if (!contato) {
            return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        }

        // Atualizar com os dados do retorno
        const updated = await prisma.contato.update({
            where: { id: contatoId },
            data: {
                retornoData,
                retornoMensagem: mensagem || `Olá ${contato.nome}! 😊 Estamos entrando em contato conforme combinado. Tem alguma dúvida ou gostaria de agendar?`,
                retornoEnviado: false,
            }
        })

        return NextResponse.json({
            sucesso: true,
            retorno: {
                id: updated.id,
                nome: updated.nome,
                data: updated.retornoData,
                mensagem: updated.retornoMensagem,
            }
        })

    } catch (err) {
        console.error('Erro POST /api/contatos/retorno:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/contatos/retorno — Listar retornos agendados
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const retornos = await prisma.contato.findMany({
            where: {
                clinicaId,
                retornoData: { not: null },
                retornoEnviado: false,
            },
            select: {
                id: true,
                nome: true,
                telefone: true,
                retornoData: true,
                retornoMensagem: true,
                etapa: true,
            },
            orderBy: { retornoData: 'asc' },
            take: 50,
        })

        return NextResponse.json({ retornos })

    } catch (err) {
        console.error('Erro GET /api/contatos/retorno:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
