import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { idiomaDaPaciente } from '@/lib/engine/idioma'
import { lembreteVespera, diaPorExtenso, horaCurta } from '@/lib/mensagens-paciente'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/lembrete?secret=XXX
 *
 * Lembrete pré-consulta — envia WhatsApp 24h antes do agendamento.
 *
 * Lia os agendamentos de configuracoes.agendamentos[], gravado pelo N8N na
 * época em que a IARA rodava lá. Ninguém escreve nesse campo desde a
 * migração: o cron encontrava lista vazia, pulava todas as clínicas e
 * respondia sucesso. Ficava verde no painel sem ter mandado nada.
 *
 * Agora lê a tabela agendamentos_v2, a mesma que o lembrete de 2h usa.
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
                funcionalidades: true,
                idioma: true,
            },
        })

        let enviados = 0
        let pulados = 0
        let erros = 0

        for (const clinica of clinicas) {
            const config = (clinica.configuracoes as any) || {}

            // WhatsApp conectado? (status gravado no config pelo webhook)
            if (config.whatsappStatus !== 'open') { pulados++; continue }

            // Toggle lembrete_24h desligado? Pular
            let funcsLembrete: Record<string, boolean> = {}
            try {
                funcsLembrete = typeof (clinica as any).funcionalidades === 'string'
                    ? JSON.parse((clinica as any).funcionalidades)
                    : ((clinica as any).funcionalidades || {})
            } catch { /* default */ }
            if (funcsLembrete.lembrete_24h === false) { pulados++; continue }

            const lembretes: string[] = config.lembretes || []

            // Agendamentos desta clínica na janela de amanhã. 'pendente' entra
            // junto de 'confirmado': quem marcou e ainda não confirmou é
            // justamente quem mais precisa do lembrete.
            const agendamentos = await prisma.agendamento.findMany({
                where: {
                    clinicaId: clinica.id,
                    status: { in: ['confirmado', 'pendente'] },
                    data: { gte: amanha_inicio, lte: amanha_fim },
                },
                select: { id: true, data: true, telefone: true, nomePaciente: true },
            })

            const pendentes = agendamentos.filter(ag => ag.telefone && !lembretes.includes(ag.id))
            if (pendentes.length === 0) { pulados++; continue }

            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'Clínica'
            const instanceName = clinica.evolutionInstance!
            const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY
            const linkMaps = clinica.linkMaps || ''
            const novoLembretes = [...lembretes]

            for (const agend of pendentes) {
                // Idioma em que a paciente conversa (espanhol, inglês...), senão o da clínica
                const idioma = await idiomaDaPaciente(clinica.id, agend.telefone, clinica.idioma)
                const primeiroNome = (agend.nomePaciente || 'Cliente').split(' ')[0]
                const dataAgend = new Date(agend.data)
                const hora = horaCurta(dataAgend, idioma)
                const dia = diaPorExtenso(dataAgend, idioma)

                const mensagem = lembreteVespera({ idioma, nome: primeiroNome, nomeIA, nomeClinica, dia, hora, linkMaps })

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
