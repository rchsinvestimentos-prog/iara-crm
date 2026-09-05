import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as sender from '@/lib/engine/sender'
import * as aiEngine from '@/lib/engine/ai-engine'
import * as memory from '@/lib/engine/memory'
import * as calendar from '@/lib/engine/calendar'
import { parseFuncionalidades, type DadosClinica } from '@/lib/engine/types'

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

        // ============================================
        // SUGERIR: que horário foi combinado na conversa?
        // ============================================
        // A paciente já acertou dia e hora com a IARA antes de mandar o
        // comprovante. Fazer a doutora redigitar tudo seria atrito à toa —
        // ela confere e corrige se precisar.
        if (action === 'sugerir-agendamento') {
            const historico = await memory.getConversationHistory(clinica.id, contato.telefone, 20)
            const conversa = historico.slice().reverse()
                .map(m => `${m.role === 'user' ? 'PACIENTE' : 'IARA'}: ${m.content}`)
                .join('\n').slice(0, 6000)

            // O modelo erra "quinta que vem" quando só recebe a data crua —
            // no teste ele devolveu uma sexta. Dando o dia da semana de hoje e
            // os próximos sete dias por extenso, ele passa a acertar.
            const tz = clinica.timezone || 'America/Sao_Paulo'
            const agora = new Date()
            const proximosDias = Array.from({ length: 8 }, (_, i) => {
                const d = new Date(agora.getTime() + i * 86400000)
                const iso = d.toLocaleDateString('en-CA', { timeZone: tz })
                const semana = d.toLocaleDateString('pt-BR', { timeZone: tz, weekday: 'long' })
                return `${iso} = ${semana}${i === 0 ? ' (hoje)' : i === 1 ? ' (amanhã)' : ''}`
            }).join('\n')

            const sistema = `Leia a conversa e diga qual agendamento foi combinado.

Calendário (use exatamente estas datas, não calcule por conta própria):
${proximosDias}

Responda APENAS um JSON, sem texto em volta:
{"procedimento":"...","data":"AAAA-MM-DD","hora":"HH:MM","duracao":60}

Se algum dado não estiver claro na conversa, use null naquele campo. NÃO invente
data, hora nem procedimento que não tenham sido ditos. Se a cliente citou um dia
da semana, escolha a data que corresponde a esse dia na lista acima.`

            const r = await aiEngine.callAI(sistema, conversa)
            let sugestao: Record<string, unknown> | null = null
            try {
                const m = r.texto.match(/\{[\s\S]*\}/)
                if (m) sugestao = JSON.parse(m[0])
            } catch { /* modelo devolveu algo fora do formato */ }

            return NextResponse.json({ ok: true, sugestao })
        }

        // ============================================
        // APROVAR: comprovante conferido, pode marcar
        // ============================================
        if (action === 'aprovar-agendamento') {
            const { procedimento, data, hora, duracao, profissionalId } = body as {
                procedimento?: string; data?: string; hora?: string
                duracao?: number; profissionalId?: string
            }

            if (!procedimento || !data || !hora) {
                return NextResponse.json(
                    { error: 'Informe procedimento, data e horário para confirmar o agendamento.' },
                    { status: 400 }
                )
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) {
                return NextResponse.json({ error: 'Data ou horário em formato inválido.' }, { status: 400 })
            }
            if (!clinica.evolutionInstance) {
                return NextResponse.json({ error: 'Instância Evolution não configurada na clínica' }, { status: 500 })
            }

            // Duração: o que a doutora mandou, senão a do procedimento cadastrado.
            let minutos = Number(duracao) || 0
            if (!minutos) {
                const proc = await prisma.procedimento.findFirst({
                    where: { clinicaId: clinica.id, nome: procedimento },
                    select: { duracao: true },
                })
                minutos = proc?.duracao || 60
            }

            // A cliente está esperando desde que mandou o comprovante. Quem avisa
            // é a IARA, com a voz dela — não um texto de sistema.
            const [ano, mes, dia] = data.split('-').map(Number)
            const dataBonita = new Date(ano, mes - 1, dia)
                .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

            const systemPrompt = `Você é a ${clinica.nomeAssistente || 'Iara'}, assistente da clínica "${clinica.nomeClinica || 'a clínica'}".

A profissional acabou de conferir o comprovante de pagamento da cliente e APROVOU o agendamento:
- Procedimento: ${procedimento}
- Data: ${dataBonita}
- Horário: ${hora}

Escreva uma mensagem curta e carinhosa avisando que a profissional confirmou o comprovante
e que o horário está garantido. Repita data e horário para não restar dúvida.
Não invente nada além disso e não use marcadores entre colchetes.`

            const historico = await memory.getConversationHistory(clinica.id, contato.telefone, 10)
            const resposta = await aiEngine.callAI(systemPrompt, '[A profissional aprovou o comprovante]', undefined, historico)

            // Marca o agendamento pro motor de calendário: ele cria no Google,
            // grava no banco, move o contato no CRM e devolve o link .ics.
            const comMarcador = `${resposta.texto}\n[AGENDAR: ${procedimento} | ${data} | ${hora} | ${minutos}${profissionalId ? ` | ${profissionalId}` : ''}]`

            const textoFinal = await calendar.processarAgendamentos(
                clinica.id,
                comMarcador,
                clinica as unknown as DadosClinica,
                contato.nome || 'Paciente',
                contato.telefone
            )

            // Se o marcador continuou lá, o agendamento não foi criado — não
            // adianta mandar "está confirmado" pra cliente.
            if (textoFinal.includes('[AGENDAR:')) {
                return NextResponse.json(
                    { error: 'Não consegui criar o agendamento. Confira se existe profissional cadastrado.' },
                    { status: 500 }
                )
            }

            // O sinal já foi pago — é por isso que a doutora aprovou.
            await prisma.agendamento.updateMany({
                where: {
                    clinicaId: clinica.id,
                    telefone: contato.telefone,
                    data: new Date(ano, mes - 1, dia),
                    horario: hora,
                },
                data: { pixPago: true },
            })

            const enviado = await sender.sendText({
                instancia: clinica.evolutionInstance,
                telefone: contato.telefone,
                apikey: clinica.evolutionApikey || undefined,
            }, textoFinal)

            if (!enviado) {
                return NextResponse.json(
                    { error: 'Agendamento criado, mas a mensagem não saiu no WhatsApp. Avise a cliente.' },
                    { status: 500 }
                )
            }

            await memory.saveToHistory(clinica.id, contato.telefone, 'assistant', textoFinal)

            // Libera a IARA pra voltar a atender esta conversa.
            await prisma.$executeRaw`
                DELETE FROM status_conversa
                WHERE telefone_cliente = ${contato.telefone} AND user_id = ${clinica.id}
            `

            return NextResponse.json({ ok: true, respostaEnviada: textoFinal })
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
