import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/followup-abandono?secret=XXX
 *
 * Recupera leads abandonados — clientes que conversaram mas nunca
 * agendaram e ficaram sem responder há 24-48h.
 *
 * Frequência: 1x por dia às 10:00
 * URL: https://app.iara.click/api/cron/followup-abandono?secret=SEU_SECRET
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Buscar clínicas ativas
        const clinicas = await prisma.clinica.findMany({
            where: { status: 'ativo', evolutionInstance: { not: null } },
            select: {
                id: true,
                nomeClinica: true,
                nomeAssistente: true,
                evolutionInstance: true,
                evolutionApikey: true,
                funcionalidades: true,
                configuracoes: true,
            },
        })

        let enviados = 0
        let pulados = 0
        let erros = 0

        for (const clinica of clinicas) {
            // Verificar toggle followup_abandono
            let funcs: Record<string, boolean> = {}
            try {
                funcs = typeof clinica.funcionalidades === 'string'
                    ? JSON.parse(clinica.funcionalidades)
                    : (clinica.funcionalidades || {})
            } catch { /* default */ }
            if (funcs.followup_abandono === false) { pulados++; continue }

            const config = (clinica.configuracoes as any) || {}
            if (config.whatsappStatus !== 'open') { pulados++; continue }

            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'Clínica'
            const instanceName = clinica.evolutionInstance!
            const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY

            // Rastrear quem já recebeu followup (evita spam)
            const followupEnviados: string[] = config.followup_enviados || []

            // Buscar contatos que conversaram recentemente (24-48h atrás) mas NÃO agendaram
            try {
                const h48atras = new Date(Date.now() - 48 * 60 * 60 * 1000)
                const h24atras = new Date(Date.now() - 24 * 60 * 60 * 1000)

                // Contatos que interagiram na janela de 24-48h e NÃO estão na etapa 'agendada'
                const leads = await prisma.contato.findMany({
                    where: {
                        clinicaId: clinica.id,
                        updatedAt: { gte: h48atras, lte: h24atras },
                        etapa: { notIn: ['agendada', 'atendida', 'bloqueado'] },
                        telefone: { not: null },
                    },
                    select: { id: true, nome: true, telefone: true },
                    take: 10, // Limite por clínica por dia
                })

                for (const lead of leads) {
                    if (!lead.telefone) continue
                    // Já enviou followup pra esse lead?
                    const followupKey = `${lead.id}_${new Date().toISOString().split('T')[0]}`
                    if (followupEnviados.includes(followupKey)) continue

                    const primeiroNome = (lead.nome || 'Cliente').split(' ')[0]

                    const mensagem = `Oi ${primeiroNome}! 😊 Aqui é a ${nomeIA}, da ${nomeClinica}.

Vi que a gente ficou de conversar e não quero que você perca essa oportunidade! 💫

Quer que eu te ajude a encontrar o melhor horário? É rapidinho! 📅`

                    try {
                        const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                            body: JSON.stringify({ number: lead.telefone.replace(/\D/g, ''), text: mensagem }),
                        })
                        if (res.ok) {
                            enviados++
                            followupEnviados.push(followupKey)

                            // Marcar etapa como 'followup'
                            await prisma.contato.update({
                                where: { id: lead.id },
                                data: { etapa: 'followup', updatedAt: new Date() },
                            })
                        }
                        else erros++
                    } catch { erros++ }
                }

                // Salvar followup_enviados (limitar a 2000 pra não crescer infinitamente)
                if (followupEnviados.length > 0) {
                    await prisma.clinica.update({
                        where: { id: clinica.id },
                        data: { configuracoes: { ...config, followup_enviados: followupEnviados.slice(-2000) } },
                    })
                }
            } catch (e) {
                console.error(`[FOLLOWUP] Erro clínica ${clinica.id}:`, e)
                erros++
            }
        }

        console.log(`[FOLLOWUP] ✅ ${enviados} enviados | ${pulados} pulados | ${erros} erros`)
        return NextResponse.json({ ok: true, enviados, pulados, erros })
    } catch (err: any) {
        console.error('[FOLLOWUP] ❌ Erro geral:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
