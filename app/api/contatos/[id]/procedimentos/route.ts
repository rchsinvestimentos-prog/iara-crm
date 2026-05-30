import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const LogProcedureSchema = z.object({
    procedimento: z.string().min(1).max(255),
    valor: z.number().min(0).optional(),
    data: z.string(),
    observacao: z.string().max(2000).optional().nullable(),
})

// POST /api/contatos/[id]/procedimentos
// Registra um procedimento realizado manualmente para o paciente no prontuário/linha do tempo
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        const { id } = await context.params
        const contatoId = Number(id)

        if (isNaN(contatoId)) {
            return NextResponse.json({ error: 'ID de paciente inválido' }, { status: 400 })
        }

        const body = await request.json()
        const validated = LogProcedureSchema.parse(body)

        // 1. Obter contato do paciente
        const contato = await prisma.contato.findFirst({
            where: { id: contatoId, clinicaId: cid }
        })

        if (!contato) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // 2. Obter o primeiro profissional cadastrado da clínica para vincular o agendamento
        const profissional = await prisma.profissional.findFirst({
            where: { clinicaId: cid, ativo: true }
        })

        if (!profissional) {
            return NextResponse.json({ 
                error: 'Sua clínica precisa ter pelo menos um profissional cadastrado antes de registrar procedimentos.' 
            }, { status: 400 })
        }

        // 3. Salvar como agendamento com status "realizado"
        const agendamento = await prisma.agendamento.create({
            data: {
                clinicaId: cid,
                profissionalId: profissional.id,
                contatoId,
                nomePaciente: contato.nome || 'Paciente',
                telefone: contato.telefone,
                procedimento: validated.procedimento,
                data: new Date(validated.data),
                horario: '12:00', // Padrão
                duracao: 30,
                valor: validated.valor || 0,
                status: 'realizado',
                origem: 'painel',
                observacao: validated.observacao,
            }
        })

        // 4. Regenerar o resumo clínico com base nos novos dados em segundo plano se necessário
        // (Apenas salvamos, a injeção consultará o banco dinamicamente na próxima conversa)

        return NextResponse.json({ ok: true, agendamento })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/contatos/[id]/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao registrar procedimento' }, { status: 500 })
    }
}
