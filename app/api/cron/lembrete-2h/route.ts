import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/lembrete-2h?secret=XXX
 *
 * Lembrete pré-consulta — envia WhatsApp 2h antes do agendamento.
 *
 * Frequência: a cada 30 min
 * URL: https://app.iara.click/api/cron/lembrete-2h?secret=SEU_SECRET
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Janela: agendamentos que acontecem em 1.5h a 2.5h a partir de agora
        const daqui90min = new Date(Date.now() + 90 * 60 * 1000)
        const daqui150min = new Date(Date.now() + 150 * 60 * 1000)

        // Buscar agendamentos nessa janela
        const agendamentos = await prisma.agendamento.findMany({
            where: {
                status: { in: ['confirmado', 'pendente'] },
                data: { gte: new Date(new Date().toISOString().split('T')[0]) }, // hoje
            },
            include: {
                clinica: {
                    select: {
                        id: true,
                        nomeClinica: true,
                        nomeAssistente: true,
                        evolutionInstance: true,
                        evolutionApikey: true,
                        linkMaps: true,
                        funcionalidades: true,
                        configuracoes: true,
                    },
                },
            },
        })

        let enviados = 0
        let pulados = 0
        let erros = 0

        for (const ag of agendamentos) {
            // Montar datetime real do agendamento
            const agDateTime = new Date(`${ag.data.toISOString().split('T')[0]}T${ag.horario}:00`)
            
            // Está na janela de 2h? (1.5h a 2.5h antes)
            if (agDateTime < daqui90min || agDateTime > daqui150min) { pulados++; continue }

            // Verificar toggle lembrete_2h
            let funcs: Record<string, boolean> = {}
            try {
                funcs = typeof ag.clinica.funcionalidades === 'string'
                    ? JSON.parse(ag.clinica.funcionalidades)
                    : (ag.clinica.funcionalidades || {})
            } catch { /* default */ }
            if (funcs.lembrete_2h === false) { pulados++; continue }

            // Verificar se já enviou lembrete 2h (via campo no agendamento)
            const config = (ag.clinica.configuracoes as any) || {}
            const lembretes2h: string[] = config.lembretes_2h || []
            if (lembretes2h.includes(ag.id)) { pulados++; continue }

            if (!ag.clinica.evolutionInstance || !ag.telefone) { pulados++; continue }

            const nomeIA = ag.clinica.nomeAssistente || 'IARA'
            const nomeClinica = ag.clinica.nomeClinica || 'Clínica'
            const primeiroNome = (ag.nomePaciente || 'Cliente').split(' ')[0]
            const hora = ag.horario

            const mensagem = `Oi ${primeiroNome}! 😊 Aqui é a ${nomeIA}, da ${nomeClinica}.

Só passando pra lembrar que seu agendamento é *daqui a 2 horas* (às *${hora}*)! ⏰

${ag.clinica.linkMaps ? `📍 ${ag.clinica.linkMaps}\n` : ''}Se precisar de algo, é só me chamar! 💛`

            try {
                const apiKey = ag.clinica.evolutionApikey || EVOLUTION_API_KEY
                const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${ag.clinica.evolutionInstance}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ number: ag.telefone.replace(/\D/g, ''), text: mensagem }),
                })
                if (res.ok) {
                    enviados++
                    // Marcar como enviado
                    const novoLembretes = [...lembretes2h, ag.id].slice(-500)
                    await prisma.clinica.update({
                        where: { id: ag.clinica.id },
                        data: { configuracoes: { ...config, lembretes_2h: novoLembretes } },
                    })
                }
                else erros++
            } catch { erros++ }
        }

        console.log(`[LEMBRETE-2H] ✅ ${enviados} enviados | ${pulados} pulados | ${erros} erros`)
        return NextResponse.json({ ok: true, enviados, pulados, erros })
    } catch (err: any) {
        console.error('[LEMBRETE-2H] ❌ Erro geral:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
