import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/contatos/[id]/retorno — Agendar mensagem de retorno
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data, mensagem } = await request.json()

        if (!data || !mensagem) {
            return NextResponse.json({ error: 'Data e mensagem são obrigatórios' }, { status: 400 })
        }

        const result = await prisma.contato.updateMany({
            where: { id: params.id, clinicaId },
            data: {
                retornoData: new Date(data),
                retornoMensagem: mensagem,
                retornoEnviado: false,
                etapa: 'retorno',
                updatedAt: new Date(),
            },
        })

        if (result.count === 0) {
            return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro POST /api/contatos/[id]/retorno:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
