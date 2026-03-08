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
                const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

                // Contar contatos novos no mês
                const contatosNovos = await prisma.contato.count({
                    where: {
                        clinicaId: clinica.id,
                        createdAt: { gte: new Date(agora.getFullYear(), agora.getMonth(), 1) },
                    },
                })

                // Créditos usados = mensais - disponíveis
                const creditosUsados = (clinica.creditosMensais || 1000) - (clinica.creditosDisponiveis || 0)

                // Tempo economizado: ~3 min por atendimento
                const tempoMinutos = creditosUsados * 3
                const tempoHoras = Math.round(tempoMinutos / 60)

                // Faturamento estimado: ~R$150 por agendamento potencial (10% dos atendimentos)
                const agendamentosEstimados = Math.round(creditosUsados * 0.1)
                const faturamentoEstimado = agendamentosEstimados * 150

                const nomeIA = clinica.nomeAssistente || 'IARA'
                const dias = Math.ceil((new Date(clinica.proximaRenovacao!).getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))

                // Montar mensagem persuasiva
                const msg = `Dra, sua assinatura da *${nomeIA}* renova em *${dias} dia${dias > 1 ? 's' : ''}*! 💫

📊 *Resumo do seu mês com a ${nomeIA}:*

💬 *${creditosUsados}* atendimentos realizados
👥 *${contatosNovos}* contatos novos captados
⏰ *${tempoHoras}h* economizadas em atendimento
📅 *~${agendamentosEstimados}* agendamentos potenciais
💰 *~R$ ${faturamentoEstimado.toLocaleString('pt-BR')}* em faturamento estimado

A ${nomeIA} trabalhou *24h por dia, 7 dias por semana* pra você, sem folga, sem reclamar 😄

Sua renovação é automática. Qualquer dúvida, é só me chamar! 🤗`

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
