import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/engine/sender'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Lembrete de renovação inteligente.
 * Roda 1x por dia — envia lembrete 3 dias antes do vencimento.
 * 
 * GET /api/cron/lembrete-renovacao?secret=XXX
 * 
 * LÓGICA:
 * 1. Busca clínicas com proxima_renovacao entre 1 e 3 dias a partir de agora
 * 2. Calcula métricas do mês (atendimentos, agendamentos, tempo economizado)
 * 3. Monta mensagem persuasiva mostrando ROI da IARA
 * 4. Envia via WhatsApp pra dona da clínica
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const agora = new Date()
        const em3dias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

        // Buscar clínicas que renovam nos próximos 3 dias
        const clinicas = await prisma.clinica.findMany({
            where: {
                status: 'ativo',
                proximaRenovacao: {
                    gte: agora,
                    lte: em3dias,
                },
                whatsappDoutora: { not: null },
            },
            select: {
                id: true,
                nomeClinica: true,
                nomeAssistente: true,
                whatsappDoutora: true,
                evolutionInstance: true,
                evolutionApikey: true,
                nivel: true,
                creditosMensais: true,
                creditosDisponiveis: true,
                totalAtendimentos: true,
                proximaRenovacao: true,
            },
        })

        if (clinicas.length === 0) {
            return NextResponse.json({ ok: true, message: 'Nenhuma clínica para lembrar.', enviados: 0 })
        }

        const resultados: any[] = []

        for (const clinica of clinicas) {
            try {
                // Calcular métricas do mês
                const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

                // Contar contatos novos nos últimos 30 dias
                const contatosNovos = await prisma.contato.count({
                    where: {
                        clinicaId: clinica.id,
                        createdAt: { gte: trintaDiasAtras },
                    },
                })

                // Buscar agendamentos nos últimos 30 dias para extrair faturamento real e procedimentos
                const agendamentos = await prisma.agendamento.findMany({
                    where: {
                        clinicaId: clinica.id,
                        data: { gte: trintaDiasAtras },
                        status: { in: ['confirmado', 'realizado', 'pendente'] },
                    },
                    select: {
                        valor: true,
                        procedimento: true,
                    }
                })

                const faturamentoReal = agendamentos.reduce((acc, a) => acc + Number(a.valor || 0), 0)
                const agendamentosRealizados = agendamentos.length

                // Créditos usados = mensais - disponíveis
                const creditosUsados = (clinica.creditosMensais || 1000) - (clinica.creditosDisponiveis || 0)

                // Estimativas inteligentes para dados vazios
                const agendamentosEstimados = agendamentosRealizados || Math.max(1, Math.round(creditosUsados * 0.08))
                const faturamentoEstimado = faturamentoReal || (agendamentosEstimados * 150)

                // Tempo economizado: ~4.5 min por atendimento (incluindo triagem e tirar dúvidas)
                const tempoHoras = Math.max(2, Math.round((creditosUsados * 4.5) / 60))

                // Encontrar o procedimento mais desejado
                const counts: Record<string, number> = {}
                let procedimentoMaisDesejado = ''
                let maxCount = 0
                for (const a of agendamentos) {
                    if (a.procedimento) {
                        const p = a.procedimento.trim()
                        counts[p] = (counts[p] || 0) + 1
                        if (counts[p] > maxCount) {
                            maxCount = counts[p]
                            procedimentoMaisDesejado = p
                        }
                    }
                }
                if (!procedimentoMaisDesejado) {
                    procedimentoMaisDesejado = 'Avaliação Geral'
                }

                // Sugestão com base no procedimento mais procurado
                let sugestao = 'Que tal criar uma promoção ou combo unindo seus procedimentos mais procurados para impulsionar ainda mais a agenda?'
                const proc = procedimentoMaisDesejado.toLowerCase()
                if (proc.includes('botox') || proc.includes('toxina')) {
                    sugestao = 'Vimos que a aplicação de Toxina Botulínica está em alta na sua clínica! Que tal criar uma campanha de retorno de 4 ou 6 meses para suas clientes que já fizeram e impulsionar a sua agenda?'
                } else if (proc.includes('labial') || proc.includes('preenchimento')) {
                    sugestao = 'O Preenchimento Labial é o seu procedimento mais desejado deste mês! Sugerimos lançar um combo unindo o Preenchimento com uma Revitalização Labial para elevar o ticket médio.'
                } else if (proc.includes('bioestimulador') || proc.includes('colageno')) {
                    sugestao = 'Bioestimuladores de Colágeno estão com excelente procura! Que tal fazer um post informativo no Instagram e deixar a IARA capitaneando os novos leads com um cupom especial?'
                } else if (proc.includes('limpeza') || proc.includes('pele')) {
                    sugestao = 'Limpeza de Pele é um ótimo procedimento de entrada! Que tal programar uma campanha de recorrência mensal automática para fidelizar essas clientes no seu CRM?'
                } else if (proc.includes('consulta') || proc.includes('avaliacao')) {
                    sugestao = 'Avaliações e Consultas são a sua principal porta de entrada. Que tal incentivar o agendamento oferecendo um bônus especial de primeira consulta nas mensagens da IARA?'
                }

                const nomeIA = clinica.nomeAssistente || 'IARA'
                const dias = Math.ceil((new Date(clinica.proximaRenovacao!).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))

                // Montar mensagem persuasiva
                const msg = `Dra, sua assinatura da *${nomeIA}* renova em *${dias} dia${dias > 1 ? 's' : ''}*! 💫 E veja o quanto trabalhamos juntas para impulsionar sua clínica nos últimos 30 dias:

📊 *Resumo Mensal da ${nomeIA}:*
💬 *${creditosUsados}* atendimentos realizados no piloto automático
👥 *${contatosNovos}* novos contatos qualificados e salvos no CRM
⏱️ *${tempoHoras} horas* de atendimento economizadas para sua equipe
📅 *${agendamentosEstimados}* agendamentos marcados/iniciados
💰 *R$ ${faturamentoEstimado.toLocaleString('pt-BR')}* em faturamento previsto/gerado

🌟 *Procedimento mais desejado do mês:*
👉 *${procedimentoMaisDesejado}*

💡 *Minha sugestão para o próximo mês:*
${sugestao}

A ${nomeIA} trabalhou 24h por dia, 7 dias por semana pra você, sem folga, sem reclamar! Sua renovação é automática. Qualquer dúvida, conte conosco! 💜`

                // Enviar via WhatsApp
                if (clinica.whatsappDoutora && clinica.evolutionInstance) {
                    await sendText(
                        {
                            instancia: clinica.evolutionInstance,
                            telefone: clinica.whatsappDoutora,
                            apikey: clinica.evolutionApikey || undefined,
                        },
                        msg
                    )

                    resultados.push({
                        clinicaId: clinica.id,
                        nome: clinica.nomeClinica,
                        diasParaRenovacao: dias,
                        atendimentos: creditosUsados,
                        status: 'enviado',
                    })

                    console.log(`[Lembrete] ✅ ${clinica.nomeClinica} — renovação em ${dias} dia(s)`)
                }

                // Delay entre mensagens
                await new Promise(r => setTimeout(r, 2000))
            } catch (err) {
                console.error(`[Lembrete] ❌ Erro clínica ${clinica.id}:`, err)
                resultados.push({ clinicaId: clinica.id, status: 'erro' })
            }
        }

        return NextResponse.json({
            ok: true,
            message: `${resultados.filter(r => r.status === 'enviado').length} lembretes enviados.`,
            detalhes: resultados,
        })

    } catch (err: any) {
        console.error('[Lembrete] ❌ Erro geral:', err)
        return NextResponse.json({ error: 'Erro no lembrete', message: err.message }, { status: 500 })
    }
}
