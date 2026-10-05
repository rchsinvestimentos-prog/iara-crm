import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as sender from '@/lib/engine/sender'
import * as aiEngine from '@/lib/engine/ai-engine'
import * as memory from '@/lib/engine/memory'
import * as calendar from '@/lib/engine/calendar'
import { parseFuncionalidades, type DadosClinica } from '@/lib/engine/types'
import {
    decidirMidias, midiasPendentesDoContato, adiarLembrete, instanciaDaClinica,
    nomeDaDoutora, semEmojiSePreciso, type ComoDecidiu,
} from '@/lib/triagem'

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
        // Fotos que estavam na tela da doutora quando ela decidiu. Foto que
        // chegou depois continua esperando (e sendo lembrada).
        const midiasNaTela: string[] = Array.isArray(body.midiaIds) ? body.midiaIds.map(String).slice(0, 50) : []
        const decidirTela = async (como: ComoDecidiu) => {
            const ids = midiasNaTela.length > 0
                ? midiasNaTela
                : (await midiasPendentesDoContato(clinica.id, contato.id)).map(m => m.id)
            return decidirSemTravar(clinica.id, contato.id, ids, como)
        }

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
            const restantes = await decidirTela('respondida')

            return NextResponse.json({ ok: true, respostaEnviada: respostaFinal, restantes })
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
            const restantes = await decidirTela('agendou')

            return NextResponse.json({ ok: true, respostaEnviada: textoFinal, restantes })
        }

        // ============================================
        // ME LEMBRE EM X MIN: a doutora está ocupada
        // ============================================
        // A cliente fica sabendo; a IARA continua o atendimento normal (sem
        // falar das fotos) e a doutora recebe o próximo lembrete em X minutos.
        if (action === 'lembrar') {
            const mins = Number(minutos) || 30
            console.log(`[Triage API] ⏳ Doutora pediu lembrete de ${contato.telefone} em ${mins} minutos`)

            let lembreteAgendado = true
            try {
                await adiarLembrete(clinica.id, contato.id, mins)
            } catch (err) {
                lembreteAgendado = false
                console.error(`[Triage API] Erro ao agendar lembrete de ${contato.telefone}:`, err)
            }

            const textoCliente = semEmojiSePreciso(clinica,
                `${capitalizar(nomeDaDoutora(clinica))} está em atendimento neste momento, mas assim que possível volta a falar com você sobre a sua foto 😊`)
            const clienteAvisada = await avisarCliente(clinica, contato.telefone, textoCliente)

            return NextResponse.json({ ok: true, lembreteAgendado, clienteAvisada })
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
            // Pausa gravada primeiro; só então a cliente ouve que a doutora vai assumir
            const textoCliente = semEmojiSePreciso(clinica,
                `${capitalizar(nomeDaDoutora(clinica))} vai assumir o seu atendimento e já vem falar com você 😊`)
            const clienteAvisada = await avisarCliente(clinica, contato.telefone, textoCliente)

            const restantes = await decidirTela('assumiu')

            return NextResponse.json({ ok: true, clienteAvisada, restantes })
        }

        // ============================================
        // PREPARAR: a doutora comentou foto por foto
        // ============================================
        // A IARA junta os comentários numa mensagem só e devolve para a doutora
        // aprovar. Nada sai para a cliente aqui.
        if (action === 'preparar') {
            const comentarios = lerComentarios(body.comentarios)
            if (comentarios.length === 0) {
                return NextResponse.json({ error: 'Comente pelo menos uma foto antes de preparar a mensagem.' }, { status: 400 })
            }

            // Mesmo jeito de chamar a profissional que a IARA usa no atendimento (ai-engine)
            const formaTratamento = clinica.tratamentoDoutora || 'Pelo nome'
            const primeiroNome = clinica.nomeDoutora?.split(' ')[0]
            const tratamento = !primeiroNome ? 'a Doutora'
                : formaTratamento === 'Pelo nome' ? primeiroNome
                : `${formaTratamento} ${primeiroNome}`
            const listaFotos = comentarios.length === 1
                ? `Comentário sobre a foto:\n${comentarios[0].comentario}`
                : comentarios.map((c, i) => `Foto ${i + 1}: ${c.comentario}`).join('\n')

            const systemPrompt = `Você é a ${clinica.nomeAssistente || 'IARA'}, assistente virtual da clínica "${clinica.nomeClinica || 'a clínica'}".
A cliente mandou ${comentarios.length === 1 ? 'uma foto' : `${comentarios.length} fotos`} e ${tratamento} avaliou. Abaixo estão os comentários dela.

Escreva UMA mensagem de WhatsApp para a cliente que passe TODOS os comentários, na mesma ordem.
${comentarios.length > 1 ? 'Quando precisar diferenciar as fotos, diga "na primeira foto", "na segunda foto" etc.' : ''}
- Fale como a assistente da clínica: carinhosa, natural, profissional, emojis moderados.
- Diga que foi ${tratamento} quem avaliou.
- NÃO invente nada além do que ${tratamento} disse: nada de preço, prazo, diagnóstico ou promessa que não esteja nos comentários.
- Sem saudação longa (vocês já estão conversando). Responda só com o texto da mensagem, sem aspas e sem explicações.`

            const historico = await memory.getConversationHistory(clinica.id, contato.telefone, 10)
            const response = await aiEngine.callAI(systemPrompt, `[Comentários da Doutora]\n${listaFotos}`, undefined, historico)
            const proposta = (response.texto || '').trim()
            if (!proposta) {
                return NextResponse.json({ error: 'A IARA não conseguiu escrever a mensagem agora. Tente de novo.' }, { status: 502 })
            }
            return NextResponse.json({ ok: true, proposta })
        }

        // ============================================
        // ENVIAR: a doutora aprovou (ou escreveu) o texto
        // ============================================
        // Sai exatamente o texto que a doutora viu na tela — aprovado da IARA
        // ou escrito por ela em "Deixa que eu ajusto". Os comentários por foto
        // ficam no histórico como nota interna, para a IARA continuar sabendo.
        if (action === 'enviar') {
            const texto = typeof body.texto === 'string' ? body.texto.trim() : ''
            if (!texto) {
                return NextResponse.json({ error: 'A mensagem está vazia.' }, { status: 400 })
            }
            if (texto.length > 4000) {
                return NextResponse.json({ error: 'Mensagem longa demais para o WhatsApp (máximo 4000 letras).' }, { status: 400 })
            }
            if (!clinica.evolutionInstance) {
                return NextResponse.json({ error: 'Instância Evolution não configurada na clínica' }, { status: 500 })
            }

            const enviado = await sender.sendText({
                instancia: clinica.evolutionInstance,
                telefone: contato.telefone,
                apikey: clinica.evolutionApikey || undefined,
            }, texto)
            if (!enviado) {
                return NextResponse.json({ error: 'Erro ao disparar mensagem para o WhatsApp da cliente' }, { status: 500 })
            }

            // A mensagem já saiu: daqui em diante nada pode virar erro na tela
            // (a doutora mandaria de novo). Só registra.
            const comentarios = lerComentarios(body.comentarios)
            let notaSalva = true
            if (comentarios.length > 0) {
                const nota = `[NOTA INTERNA — avaliação da Doutora sobre as fotos que a cliente mandou. A cliente NÃO recebeu este texto.]\n`
                    + comentarios.map((c, i) => comentarios.length === 1 ? c.comentario : `Foto ${i + 1}: ${c.comentario}`).join('\n')
                try {
                    await memory.saveNotaInterna(clinica.id, contato.telefone, nota)
                } catch (err) {
                    notaSalva = false
                    console.error(`[Triage API] Erro ao salvar nota interna de ${contato.telefone} — a IARA não vai saber dos comentários:`, err)
                }
            }
            await memory.saveToHistory(clinica.id, contato.telefone, 'assistant', texto)

            try {
                await prisma.$executeRaw`
                    DELETE FROM status_conversa
                    WHERE telefone_cliente = ${contato.telefone} AND user_id = ${clinica.id}
                `
            } catch (err) {
                console.error(`[Triage API] Erro ao liberar a IARA para ${contato.telefone} depois do envio:`, err)
            }
            // Só as fotos comentadas (e as marcadas "não precisa de resposta")
            // saem da lista; a que ficou sem comentário segue sendo lembrada
            const semResposta: string[] = Array.isArray(body.semResposta) ? body.semResposta.map(String).slice(0, 50) : []
            await decidirSemTravar(clinica.id, contato.id, comentarios.map(c => c.midiaId), 'respondida')
            const restantes = await decidirSemTravar(clinica.id, contato.id, semResposta, 'sem_resposta')
            console.log(`[Triage API] ✉️ Resposta da triagem enviada para ${contato.telefone} (${body.literal ? 'texto da doutora' : 'texto da IARA aprovado'}); faltam ${restantes ?? '?'} foto(s)`)
            return NextResponse.json({ ok: true, restantes, notaSalva })
        }

        // ============================================
        // NÃO FAZER NADA: a foto não pede resposta
        // ============================================
        // Nada é enviado à cliente. As fotos saem do quadro e os lembretes
        // param (a pausa antiga de triagem, se ainda existir, é desfeita).
        if (action === 'nada') {
            await prisma.$executeRaw`
                DELETE FROM status_conversa
                WHERE telefone_cliente = ${contato.telefone} AND user_id = ${clinica.id}
                  AND motivo = 'triagem_pendente'
            `
            const ids = midiasNaTela.length > 0
                ? midiasNaTela
                : (await midiasPendentesDoContato(clinica.id, contato.id)).map(m => m.id)
            // Aqui a falha vira erro na tela: nada foi enviado, a doutora pode tentar de novo
            const restantes = await decidirMidias(clinica.id, contato.id, ids, 'nada')
            console.log(`[Triage API] 🙅 Doutora marcou "não fazer nada" para ${contato.telefone} (${ids.length} foto(s)); faltam ${restantes}`)
            return NextResponse.json({ ok: true, restantes })
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

    } catch (err: any) {
        console.error('[POST /api/contatos/[id]/triagem] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao processar ação de triagem', detalhe: err.message }, { status: 500 })
    }
}

// A mensagem já saiu para a cliente: falhar aqui não pode virar erro na tela
// (a doutora mandaria de novo). Tenta duas vezes; se não der, as fotos seguem
// na lista (e nos lembretes) — fica registrado. null = não deu para saber.
async function decidirSemTravar(clinicaId: number, contatoId: number, ids: string[], como: ComoDecidiu): Promise<number | null> {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
        try {
            return await decidirMidias(clinicaId, contatoId, ids, como)
        } catch (err) {
            console.error(`[Triage API] Erro ao marcar ${ids.length} foto(s) do contato ${contatoId} como "${como}" (tentativa ${tentativa}/2):`, err)
        }
    }
    return null
}

// Aviso curto para a cliente quando a doutora assume ou pede um tempo.
// Não trava a ação da doutora se falhar — devolve false para a tela avisar.
async function avisarCliente(clinica: DadosClinica | any, telefone: string, texto: string): Promise<boolean> {
    try {
        const instancia = await instanciaDaClinica(clinica)
        if (!instancia) {
            console.error(`[Triage API] Clínica ${clinica.id} sem instância — aviso para ${telefone} não saiu`)
            return false
        }
        const ok = await sender.sendText({ instancia, telefone, apikey: clinica.evolutionApikey || undefined }, texto)
        if (!ok) {
            console.error(`[Triage API] Falha ao avisar a cliente ${telefone}`)
            return false
        }
        await memory.saveToHistory(clinica.id, telefone, 'assistant', texto)
        return true
    } catch (err) {
        console.error(`[Triage API] Erro ao avisar a cliente ${telefone}:`, err)
        return false
    }
}

function capitalizar(t: string): string {
    return t.charAt(0).toUpperCase() + t.slice(1)
}

// Comentários da doutora por foto, na ordem em que as fotos chegaram.
// Foto sem comentário fica de fora da mensagem (decisão do Rafael, 03/10).
function lerComentarios(bruto: unknown): { midiaId: string; comentario: string }[] {
    if (!Array.isArray(bruto)) return []
    return bruto
        .filter((c): c is { midiaId: unknown; comentario: unknown } => !!c && typeof c === 'object')
        .map(c => ({ midiaId: String(c.midiaId ?? ''), comentario: typeof c.comentario === 'string' ? c.comentario.trim().slice(0, 2000) : '' }))
        .filter(c => c.comentario.length > 0)
        .slice(0, 30)
}
