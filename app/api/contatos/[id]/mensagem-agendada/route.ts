import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/contatos/[id]/mensagem-agendada
 * Agenda uma mensagem para ser enviada pelo cron de retorno.
 * Reutiliza os campos retornoData / retornoMensagem / retornoEnviado do Contato.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await req.json()
        const { data, mensagem, tipo } = body

        if (!data || !mensagem?.trim()) {
            return NextResponse.json(
                { error: 'Data e mensagem são obrigatórios' },
                { status: 400 }
            )
        }

        const dataAgendada = new Date(data)
        if (isNaN(dataAgendada.getTime())) {
            return NextResponse.json({ error: 'Data inválida' }, { status: 400 })
        }

        if (dataAgendada <= new Date()) {
            return NextResponse.json(
                { error: 'A data deve ser no futuro' },
                { status: 400 }
            )
        }

        // Verificar posse do contato
        const contato = await prisma.contato.findFirst({
            where: { id: parseInt(params.id), clinicaId },
        })

        if (!contato) {
            return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
        }

        // Salvar usando infraestrutura de retorno existente
        const updated = await prisma.contato.update({
            where: { id: parseInt(params.id) },
            data: {
                retornoData: dataAgendada,
                retornoMensagem: mensagem.trim(),
                retornoEnviado: false,
                updatedAt: new Date(),
            },
        })

        return NextResponse.json({
            ok: true,
            agendada: {
                id: updated.id,
                nome: updated.nome,
                data: updated.retornoData,
                mensagem: updated.retornoMensagem,
                tipo: tipo || 'mensagem',
            },
        })
    } catch (err) {
        console.error('Erro POST /api/contatos/[id]/mensagem-agendada:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

/**
 * DELETE /api/contatos/[id]/mensagem-agendada
 * Cancela uma mensagem agendada
 */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        await prisma.contato.updateMany({
            where: { id: parseInt(params.id), clinicaId },
            data: {
                retornoData: null,
                retornoMensagem: null,
                retornoEnviado: false,
            },
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro DELETE /api/contatos/[id]/mensagem-agendada:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
