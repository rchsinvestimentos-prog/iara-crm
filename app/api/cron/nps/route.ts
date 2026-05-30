import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/nps?secret=XXX
 * 
 * NPS automático — 24h após agendamento confirmado.
 * Envia mensagem WhatsApp pedindo avaliação (0-10) e review Google.
 * 
 * Frequência: 1x por dia às 10:00
 * URL cron-job.org: https://app.iara.click/api/cron/nps?secret=SEU_SECRET
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Janela: agendamentos ONTEM (entre 24h e 48h atrás)
        const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const anteontem = new Date(Date.now() - 48 * 60 * 60 * 1000)

        // Buscar agendamentos confirmados de ontem que tenham telefone
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                status: 'confirmado',
                telefone: { not: null },
                data: {
                    gte: anteontem,
                    lte: ontem,
                },
                // Exclui agendamentos de clínicas inativas
                clinica: { status: 'ativo' },
            },
            include: {
                clinica: {
                    select: {
                        id: true,
                        nomeClinica: true,
                        nomeAssistente: true,
                        instanceName: true,
                        whatsappStatus: true,
                        status: true,
                        configuracoes: true,
                        // Link Google Maps/Review — salvo em configuracoes
                    },
                },
            },
        })

        let enviados = 0
        let pulados = 0
        let erros = 0

        for (const agend of agendamentos) {
            const clinica = agend.clinica
            if (!clinica || clinica.status !== 'ativo') { pulados++; continue }
            if (!clinica.instanceName || clinica.whatsappStatus !== 'open') { pulados++; continue }
            if (!agend.telefone) { pulados++; continue }

            // Verificar se NPS já foi enviado (guarda em configuracoes.npsEnviados[])
            const config = (clinica.configuracoes as any) || {}
            const npsEnviados: string[] = config.npsEnviados || []
            if (npsEnviados.includes(agend.id)) { pulados++; continue }

            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'Clínica'
            const primeiroNome = (agend.nomePaciente || 'Cliente').split(' ')[0]
            const linkGoogle = config.linkGoogleReview || ''

            const mensagem = `Oi ${primeiroNome}! 😊 Aqui é a ${nomeIA}, da ${nomeClinica}.

Passando rapidinho pra saber como foi sua experiência ontem! 💛

De 0 a 10, como você avalia nosso atendimento?${linkGoogle ? `\n\nSe puder também deixar uma avaliaçãozinha no Google, ajuda muito a gente! ⭐\n${linkGoogle}` : ''}`

            try {
                const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${clinica.instanceName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': EVOLUTION_API_KEY,
                    },
                    body: JSON.stringify({
                        number: agend.telefone.replace(/\D/g, ''),
                        text: mensagem,
                    }),
                })

                if (res.ok) {
                    enviados++
                    // Marcar NPS como enviado nas configurações da clínica
                    npsEnviados.push(agend.id)
                    await prisma.clinica.update({
                        where: { id: clinica.id },
                        data: {
                            configuracoes: { ...config, npsEnviados: npsEnviados.slice(-500) },
                        },
                    })
                } else {
                    erros++
                    console.warn(`[NPS] Erro envio ${agend.telefone}:`, await res.text())
                }
            } catch (e) {
                erros++
                console.error(`[NPS] Falha ${agend.id}:`, e)
            }
        }

        console.log(`[NPS] ✅ ${enviados} enviados | ${pulados} pulados | ${erros} erros`)

        return NextResponse.json({
            ok: true,
            enviados,
            pulados,
            erros,
            total: agendamentos.length,
        })
    } catch (err: any) {
        console.error('[NPS] ❌ Erro geral:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
