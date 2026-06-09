import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as sender from '@/lib/engine/sender'
import * as aiEngine from '@/lib/engine/ai-engine'
import * as memory from '@/lib/engine/memory'
import { parseFuncionalidades } from '@/lib/engine/types'

// POST /api/contatos/[id]/triagem
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
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
        }

        // 1. Buscar contato e clinica
        const contato = await prisma.contato.findFirst({
            where: { id: contatoId, clinicaId: cid }
        })

        if (!contato) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { id: cid }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // 2. Ler parâmetros do body
        const body = await request.json()
        const { action, mensagem, minutos } = body

        if (!action) {
            return NextResponse.json({ error: 'Ação é obrigatória' }, { status: 400 })
        }

        // 3. Processar ações
        if (action === 'responder') {
            if (!mensagem || !mensagem.trim()) {
                return NextResponse.json({ error: 'Mensagem é obrigatória para a ação de responder' }, { status: 400 })
            }

            console.log(`[Triage API] 📝 Doutora enviou instrução de resposta: "${mensagem}"`)

            // A) Chamar a IA para formatar a resposta
            const systemPrompt = `Você é a IARA, assistente virtual da clínica "${clinica.nomeClinica || 'a clínica'}".
A Doutora acabou de analisar a foto/procedimento que a cliente enviou e te deu a seguinte instrução:
"${mensagem}"

Escreva uma resposta carinhosa, empática, natural e profissional para a cliente seguindo exatamente a instrução da Doutora.
Fale como a assistente Iara (use emojis moderados e seja amigável).
Seja objetiva, vá direto ao ponto e não invente nada além do que a Doutora falou.`

            const historico = await memory.getConversationHistory(clinica.id, contato.telefone, 10)
            const response = await aiEngine.callAI(systemPrompt, `[Instrução da Doutora]: ${mensagem}`, undefined, historico)
            const respostaFinal = response.texto

            // B) Disparar o WhatsApp para a cliente
            const sendOpts = {
                instancia: clinica.evolutionInstance || '',
                telefone: contato.telefone,
                apikey: clinica.evolutionApikey || undefined
            }

            if (!sendOpts.instancia) {
                return NextResponse.json({ error: 'Instância Evolution não configurada na clínica' }, { status: 500 })
            }

            const enviado = await sender.sendText(sendOpts, respostaFinal)
            if (!enviado) {
                return NextResponse.json({ error: 'Erro ao disparar mensagem para o WhatsApp do cliente' }, { status: 500 })
            }

            // C) Salvar no histórico de conversa
            await memory.saveToHistory(clinica.id, contato.telefone, 'assistant', respostaFinal)

            // D) Excluir pausa de triagem no banco de dados
            await prisma.$executeRaw`
                DELETE FROM status_conversa
                WHERE telefone_cliente = ${contato.telefone} AND user_id = ${clinica.id}
            `

            return NextResponse.json({ ok: true, respostaEnviada: respostaFinal })
        }

        if (action === 'lembrar') {
            const mins = Number(minutos) || 30
            console.log(`[Triage API] ⏳ Adiada triagem para ${contato.telefone} por ${mins} minutos`)

            // Atualizar o tempo da pausa temporária por triagem pendente
            await prisma.$executeRaw`
                INSERT INTO status_conversa (telefone_cliente, user_id, pausa_ate, motivo, updated_at)
                VALUES (${contato.telefone}, ${clinica.id}, NOW() + ${mins + ' minutes'}::INTERVAL, 'triagem_pendente', NOW())
                ON CONFLICT (telefone_cliente, user_id)
                DO UPDATE SET pausa_ate = NOW() + ${mins + ' minutes'}::INTERVAL, motivo = 'triagem_pendente', updated_at = NOW()
            `

            return NextResponse.json({ ok: true, adiadoAte: new Date(Date.now() + mins * 60 * 1000).toISOString() })
        }

        if (action === 'assumir') {
            console.log(`[Triage API] 👩‍⚕️ Doutora assumiu atendimento de ${contato.telefone}`)

            // A) Pausar IA por 3 horas (180 min) com motivo 'dra_assumiu' no status_conversa
            await prisma.$executeRaw`
                INSERT INTO status_conversa (telefone_cliente, user_id, pausa_ate, motivo, updated_at)
                VALUES (${contato.telefone}, ${clinica.id}, NOW() + '180 minutes'::INTERVAL, 'dra_assumiu', NOW())
                ON CONFLICT (telefone_cliente, user_id)
                DO UPDATE SET pausa_ate = NOW() + '180 minutes'::INTERVAL, motivo = 'dra_assumiu', updated_at = NOW()
            `

            // B) Atualizar iaPausada no contato para sincronizar o status no CRM
            await prisma.contato.update({
                where: { id: contato.id },
                data: { iaPausada: true }
            })

            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

    } catch (err: any) {
        console.error('[POST /api/contatos/[id]/triagem] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao processar ação de triagem', detalhe: err.message }, { status: 500 })
    }
}
