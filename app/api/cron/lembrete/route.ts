import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/lembrete?secret=XXX
 *
 * Lembrete pré-consulta — envia WhatsApp 24h antes do agendamento.
 * Lê agendamentos de configuracoes.agendamentos[] (gravados pelo N8N quando
 * a cliente agenda via IARA).
 *
 * Frequência: 1x por dia às 08:00
 * URL: https://app.iara.click/api/cron/lembrete?secret=SEU_SECRET
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const amanha_inicio = new Date(Date.now() + 20 * 60 * 60 * 1000)
        const amanha_fim = new Date(Date.now() + 28 * 60 * 60 * 1000)

        // Buscar clínicas ativas (sem filtro whatsappStatus — verificamos via config)
        const clinicas = await prisma.clinica.findMany({
            where: { status: 'ativo', evolutionInstance: { not: null } },
            select: {
                id: true,
                nomeClinica: true,
                nomeAssistente: true,
                evolutionInstance: true,
                evolutionApikey: true,
                linkMaps: true,
                configuracoes: true,
            },
        })

        let enviados = 0
        let pulados = 0
        let erros = 0

        for (const clinica of clinicas) {
            const config = (clinica.configuracoes as any) || {}

            // WhatsApp conectado? (status gravado no config pelo webhook)
            if (config.whatsappStatus !== 'open') { pulados++; continue }

            const agendamentos: any[] = config.agendamentos || []
            const lembretes: string[] = config.lembretes || []
            if (agendamentos.length === 0) { pulados++; continue }

            // Filtrar agendamentos amanhã ainda não lembrados
            const pendentes = agendamentos.filter(ag => {
                if (!ag.data || !ag.telefone || ag.status !== 'confirmado') return false
                const data = new Date(ag.data)
                return data >= amanha_inicio && data <= amanha_fim && !lembretes.includes(ag.id)
            })

            if (pendentes.length === 0) continue

            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'Clínica'
            const instanceName = clinica.evolutionInstance!
            const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY
            const linkMaps = clinica.linkMaps || ''
            const novoLembretes = [...lembretes]

            for (const agend of pendentes) {
                const primeiroNome = (agend.nome || agend.nomePaciente || 'Cliente').split(' ')[0]
                const dataAgend = new Date(agend.data)
                const hora = dataAgend.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const dia = dataAgend.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

                const mensagem = `Oi ${primeiroNome}! 😊 Aqui é a ${nomeIA}, da ${nomeClinica}.

Passando para lembrar do seu agendamento de amanhã! 📅

🗓 *${dia}* às *${hora}*${linkMaps ? `\n📍 ${linkMaps}` : ''}

Se precisar remarcar ou tiver alguma dúvida, é só falar aqui! 💛`

                try {
                    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                        body: JSON.stringify({ number: agend.telefone.replace(/\D/g, ''), text: mensagem }),
                    })
                    if (res.ok) { enviados++; novoLembretes.push(agend.id) }
                    else erros++
                } catch { erros++ }
            }

            if (novoLembretes.length > lembretes.length) {
                await prisma.clinica.update({
                    where: { id: clinica.id },
                    data: { configuracoes: { ...config, lembretes: novoLembretes.slice(-1000) } },
                })
            }
        }

        console.log(`[LEMBRETE] ✅ ${enviados} enviados | ${pulados} pulados | ${erros} erros`)
        return NextResponse.json({ ok: true, enviados, pulados, erros })
    } catch (err: any) {
        console.error('[LEMBRETE] ❌ Erro geral:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
