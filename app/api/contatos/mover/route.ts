import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/contatos/mover — Move contato de etapa (Kanban drag)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { contatoId, etapa } = await request.json()
        if (!contatoId || !etapa) {
            return NextResponse.json({ error: 'contatoId e etapa são obrigatórios' }, { status: 400 })
        }

        const contato = await prisma.contato.updateMany({
            where: { id: contatoId, clinicaId },
            data: { etapa, updatedAt: new Date() },
        })

        if (contato.count === 0) {
            return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro POST /api/contatos/mover:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
