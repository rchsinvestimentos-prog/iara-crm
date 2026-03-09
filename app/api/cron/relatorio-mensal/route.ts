import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/relatorio-mensal?secret=XXX
 *
 * Relatório mensal — envia resumo do mês via WhatsApp para a Dra.
 * Inclui: mensagens, agendamentos, leads novos, créditos usados, ROI.
 * 
 * Frequência: Todo dia 1 às 09:00
 * URL: https://app.iara.click/api/cron/relatorio-mensal?secret=SEU_SECRET
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const clinicas = await prisma.clinica.findMany({
            where: { status: 'ativo', evolutionInstance: { not: null } },
            select: {
                id: true,
                nomeClinica: true,
                nomeAssistente: true,
                whatsappDoutora: true,
                evolutionInstance: true,
                evolutionApikey: true,
                configuracoes: true,
                creditosDisponiveis: true,
                creditosMensais: true,
            },
        })

        let enviados = 0
        let erros = 0

        // Mês anterior
        const agora = new Date()
        const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
        const nomeMes = mesAnterior.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

        for (const clinica of clinicas) {
            if (!clinica.whatsappDoutora || !clinica.evolutionInstance) continue

            const config = (clinica.configuracoes as any) || {}
            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'sua clínica'

            // Coletar métricas do mês (de configuracoes)
            const stats = config.statsMensal || {}
            const mensagens = stats.mensagens || 0
            const agendamentos = stats.agendamentos || 0
            const leadsNovos = stats.leadsNovos || 0
            const creditosUsados = stats.creditosUsados || 0
            const audiosTranscritos = stats.audiosTranscritos || 0

            // Calcular estimativas
            const tempoEconomizado = Math.round((mensagens * 2 + audiosTranscritos * 5) / 60) // em horas
            const faturamentoEstimado = agendamentos * 350 // ticket médio R$350

            const mensagem = `📊 *Relatório Mensal — ${nomeMes}*
━━━━━━━━━━━━━━━━

Oi! Aqui é a ${nomeIA}, da ${nomeClinica}. Veja o que fizemos juntas no último mês:

💬 *${mensagens}* mensagens respondidas
📅 *${agendamentos}* agendamentos realizados
👤 *${leadsNovos}* novos leads capturados
🎙️ *${audiosTranscritos}* áudios transcritos
💳 *${creditosUsados}* créditos utilizados

━━━━━━━━━━━━━━━━
📈 *Estimativas de ROI:*
⏱️ ~${tempoEconomizado}h de tempo economizado
💰 ~R$ ${faturamentoEstimado.toLocaleString('pt-BR')} em faturamento estimado

*Saldo atual:* ${clinica.creditosDisponiveis || 0} créditos

💜 Continue assim! Sua clínica está crescendo com IA.

📱 Acesse o painel: app.iara.click`

            try {
                const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY
                const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${clinica.evolutionInstance}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({
                        number: clinica.whatsappDoutora.replace(/\D/g, ''),
                        text: mensagem,
                    }),
                })
                if (res.ok) {
                    enviados++
                    // Resetar stats mensais
                    await prisma.clinica.update({
                        where: { id: clinica.id },
                        data: {
                            configuracoes: {
                                ...config,
                                statsMensal: { mensagens: 0, agendamentos: 0, leadsNovos: 0, creditosUsados: 0, audiosTranscritos: 0 },
                                ultimoRelatorio: agora.toISOString(),
                            },
                        },
                    })
                } else erros++
            } catch { erros++ }
        }

        console.log(`[RELATORIO MENSAL] ✅ ${enviados} enviados | ${erros} erros`)
        return NextResponse.json({ ok: true, enviados, erros, total: clinicas.length })
    } catch (err: any) {
        console.error('[RELATORIO MENSAL] ❌ Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
