import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/engine/sender'
import { z } from 'zod'

const SendMessageSchema = z.object({
    mensagem: z.string().min(1).max(5000),
})

// POST /api/contatos/[id]/enviar-mensagem
// Dispara uma mensagem imediata via WhatsApp usando a instância da clínica e registra no histórico
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
        const { mensagem } = SendMessageSchema.parse(body)

        // 1. Obter dados do paciente e conferir ownership
        const contato = await prisma.contato.findFirst({
            where: { id: contatoId, clinicaId: cid }
        })

        if (!contato) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // 2. Obter credenciais de WhatsApp da clínica
        const clinica = await prisma.clinica.findUnique({
            where: { id: cid },
            select: {
                evolutionInstance: true,
                evolutionApikey: true,
                nomeClinica: true,
                nome: true,
            }
        })

        if (!clinica || !clinica.evolutionInstance) {
            return NextResponse.json({ 
                error: 'Sua clínica ainda não possui uma instância de WhatsApp configurada para disparos.' 
            }, { status: 400 })
        }

        // 3. Chamar o mensageiro técnico (Evolution API)
        const sendOpts = {
            instancia: clinica.evolutionInstance,
            telefone: contato.telefone,
            apikey: clinica.evolutionApikey || undefined
        }

        const sent = await sendText(sendOpts, mensagem)
        if (!sent) {
            return NextResponse.json({ error: 'Falha ao disparar mensagem. Verifique a conexão do seu WhatsApp.' }, { status: 500 })
        }

        // 4. Salvar na tabela de histórico de conversas
        const nomeRemetente = clinica.nomeClinica || clinica.nome || 'Clínica'
        await prisma.$executeRawUnsafe(`
            INSERT INTO historico_conversas (user_id, telefone_cliente, role, content, push_name, origem, created_at)
            VALUES ($1, $2, 'assistant', $3, $4, 'whatsapp', NOW())
        `, cid, contato.telefone, mensagem, nomeRemetente)

        // 5. Atualizar último contato e data no CRM
        await prisma.contato.update({
            where: { id: contatoId },
            data: {
                ultimoContato: new Date(),
                updatedAt: new Date()
            }
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Mensagem vazia ou inválida', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/contatos/[id]/enviar-mensagem] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao disparar mensagem' }, { status: 500 })
    }
}
