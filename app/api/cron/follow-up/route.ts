import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/engine/sender'

const CRON_SECRET = process.env.CRON_SECRET || ''

// GET /api/cron/follow-up?secret=XXX
// Motor de agendamento e disparos Next.js centralizado.
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        console.log('[Cron Follow-Up] Iniciando varredura recorrente de réguas de relacionamento...')
        
        // 1. Carregar clínicas ativas com WhatsApp conectado e nível de plano Pro/Premium (nivel >= 2)
        const clinicas = await prisma.clinica.findMany({
            where: {
                status: 'ativo',
                nivel: { gte: 2 },
                evolutionInstance: { not: null }
            },
            include: {
                contatos: true
            }
        })

        let totalEnviados = 0
        let totalErros = 0

        const agora = new Date()

        for (const clinica of clinicas) {
            const cid = clinica.id
            const instance = clinica.evolutionInstance!
            const apikey = clinica.evolutionApikey || undefined

            // Buscar configurações de follow-up ativas para esta clínica
            const activeConfigs = await prisma.followUpConfig.findMany({
                where: { clinicaId: cid, ativo: true }
            })

            if (activeConfigs.length === 0) continue

            // Criar mapa rápido de configurações por tipo
            const configsMap = new Map(activeConfigs.map(c => [c.tipo, c]))

            // ==========================================
            // GATILHO A: 24h antes do Atendimento (Ficha Anamnese + Lembrete)
            // ==========================================
            const configAnamnese = configsMap.get('anamnese_24h')
            if (configAnamnese) {
                const amanhaInicio = new Date(agora.getTime() + 20 * 60 * 60 * 1000)
                const amanhaFim = new Date(agora.getTime() + 28 * 60 * 60 * 1000)

                // Buscar agendamentos marcados para amanhã pendentes de envio
                const agendamentosAmanha = await prisma.agendamento.findMany({
                    where: {
                        clinicaId: cid,
                        status: 'confirmado',
                        data: { gte: amanhaInicio, lte: amanhaFim }
                    }
                })

                for (const ag of agendamentosAmanha) {
                    // Verificar se já enviamos lembrete no log (salvamos no Json configuracoes da clínica)
                    const configClinica = (clinica.configuracoes as any) || {}
                    const lembretesEnviados = configClinica.lembretesAnamnese || []
                    if (lembretesEnviados.includes(ag.id)) continue

                    // Buscar se o procedimento tem alguma ficha de anamnese vinculada
                    // Para simplificar, buscamos qualquer ModeloAnamnese da clínica
                    // que possua o nome ou id deste procedimento nos vinculados
                    const modelosAnamnese = await prisma.modeloAnamnese.findMany({
                        where: { clinicaId: cid, ativo: true }
                    })

                    const modeloVinculado = modelosAnamnese.find(m => {
                        const ids = Array.isArray(m.procedimentoIds) ? (m.procedimentoIds as any[]) : []
                        // Busca por correspondência exata ou parcial
                        return ids.length > 0 // Vincular qualquer modelo genérico se houver
                    }) || modelosAnamnese[0]

                    if (!modeloVinculado) continue

                    // Gerar o link seguro
                    const linkAnamnese = `${process.env.NEXTAUTH_URL || 'http://localhost:3333'}/anamnese/${modeloVinculado.id}?contatoId=${ag.contatoId}`

                    // Format message
                    const primeiroNome = ag.nomePaciente.split(' ')[0]
                    let msg = configAnamnese.mensagem
                        .replace(/{nome_cliente}/g, primeiroNome)
                        .replace(/{link_anamnese}/g, linkAnamnese)

                    // Enviar
                    const sent = await sendText({ instancia: instance, telefone: ag.telefone, apikey }, msg)
                    if (sent) {
                        totalEnviados++
                        // Gravar no histórico de conversas
                        await registrarHistoricoConversa(cid, ag.telefone, msg, clinica.nomeClinica || clinica.nome || 'IARA')
                        // Logar envio de lembrete
                        await prisma.clinica.update({
                            where: { id: cid },
                            data: {
                                configuracoes: {
                                    ...configClinica,
                                    lembretesAnamnese: [...lembretesEnviados, ag.id]
                                }
                            }
                        })
                    } else {
                        totalErros++
                    }
                }
            }

            // ==========================================
            // GATILHO B: Lembrete do Dia (lembrete_dia)
            // ==========================================
            const configLembreteDia = configsMap.get('lembrete_dia')
            if (configLembreteDia) {
                const hojeInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0)
                const hojeFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59)

                const agendamentosHoje = await prisma.agendamento.findMany({
                    where: {
                        clinicaId: cid,
                        status: 'confirmado',
                        data: { gte: hojeInicio, lte: hojeFim }
                    }
                })

                for (const ag of agendamentosHoje) {
                    const configClinica = (clinica.configuracoes as any) || {}
                    const lembretesDia = configClinica.lembretesDia || []
                    if (lembretesDia.includes(ag.id)) continue

                    let msg = configLembreteDia.mensagem
                        .replace(/{nome_cliente}/g, ag.nomePaciente.split(' ')[0])
                        .replace(/{horario}/g, ag.horario)
                        .replace(/{endereco_clinica}/g, clinica.endereco || 'nossa clínica')
                        .replace(/{link_maps}/g, clinica.linkMaps || 'Google Maps')

                    const sent = await sendText({ instancia: instance, telefone: ag.telefone, apikey }, msg)
                    if (sent) {
                        totalEnviados++
                        await registrarHistoricoConversa(cid, ag.telefone, msg, clinica.nomeClinica || clinica.nome || 'IARA')
                        await prisma.clinica.update({
                            where: { id: cid },
                            data: {
                                configuracoes: {
                                    ...configClinica,
                                    lembretesDia: [...lembretesDia, ag.id]
                                }
                            }
                        })
                    } else {
                        totalErros++
                    }
                }
            }

            // ==========================================
            // GATILHO C: Pós-Procedimento 24h (pos_24h)
            // ==========================================
            const configPos24 = configsMap.get('pos_24h')
            if (configPos24) {
                const ontemInicio = new Date(agora.getTime() - 28 * 60 * 60 * 1000)
                const ontemFim = new Date(agora.getTime() - 20 * 60 * 60 * 1000)

                const agendamentosOntem = await prisma.agendamento.findMany({
                    where: {
                        clinicaId: cid,
                        status: 'realizado',
                        data: { gte: ontemInicio, lte: ontemFim }
                    }
                })

                for (const ag of agendamentosOntem) {
                    const configClinica = (clinica.configuracoes as any) || {}
                    const lembretesPos = configClinica.lembretesPos || []
                    if (lembretesPos.includes(ag.id)) continue

                    let msg = configPos24.mensagem
                        .replace(/{nome_cliente}/g, ag.nomePaciente.split(' ')[0])
                        .replace(/{link_avaliacao_google}/g, clinica.linkMaps || 'Google Reviews')

                    const sent = await sendText({ instancia: instance, telefone: ag.telefone, apikey }, msg)
                    if (sent) {
                        totalEnviados++
                        await registrarHistoricoConversa(cid, ag.telefone, msg, clinica.nomeClinica || clinica.nome || 'IARA')
                        await prisma.clinica.update({
                            where: { id: cid },
                            data: {
                                configuracoes: {
                                    ...configClinica,
                                    lembretesPos: [...lembretesPos, ag.id]
                                }
                            }
                        })
                    } else {
                        totalErros++
                    }
                }
            }

            // ==========================================
            // GATILHOS DE RETORNO (30 dias, 3 meses, 6 meses)
            // ==========================================
            const gatilhosRetorno = ['retorno_30d', 'pos_3meses', 'pos_6meses']
            for (const tipo of gatilhosRetorno) {
                const config = configsMap.get(tipo)
                if (!config || !config.diasDelay) continue

                const delayDays = config.diasDelay
                const dataGatilhoInicio = new Date(agora.getTime() - (delayDays + 1) * 24 * 60 * 60 * 1000)
                const dataGatilhoFim = new Date(agora.getTime() - (delayDays - 1) * 24 * 60 * 60 * 1000)

                const agendamentosPassados = await prisma.agendamento.findMany({
                    where: {
                        clinicaId: cid,
                        status: 'realizado',
                        data: { gte: dataGatilhoInicio, lte: dataGatilhoFim }
                    }
                })

                for (const ag of agendamentosPassados) {
                    const configClinica = (clinica.configuracoes as any) || {}
                    const retornosEnviados = configClinica.retornosEnviados || {}
                    const chavesEnviadas = retornosEnviados[tipo] || []
                    if (chavesEnviadas.includes(ag.id)) continue

                    // Para retorno_30d, filtrar apenas se o procedimento do agendamento estiver na lista selecionada
                    if (tipo === 'retorno_30d' && Array.isArray(config.procedimentoIds) && (config.procedimentoIds as any[]).length > 0) {
                        // Buscar procedimento
                        const proc = await prisma.procedimento.findFirst({
                            where: { nome: ag.procedimento, clinicaId: cid }
                        })
                        if (!proc || !(config.procedimentoIds as any[]).includes(proc.id)) {
                            continue // Pular pois o procedimento não é elegível para retorno
                        }
                    }

                    let msg = config.mensagem
                        .replace(/{nome_cliente}/g, ag.nomePaciente.split(' ')[0])

                    const sent = await sendText({ instancia: instance, telefone: ag.telefone, apikey }, msg)
                    if (sent) {
                        totalEnviados++
                        await registrarHistoricoConversa(cid, ag.telefone, msg, clinica.nomeClinica || clinica.nome || 'IARA')
                        
                        // Atualizar a lista de enviados
                        const novaLista = [...chavesEnviadas, ag.id]
                        await prisma.clinica.update({
                            where: { id: cid },
                            data: {
                                configuracoes: {
                                    ...configClinica,
                                    retornosEnviados: {
                                        ...retornosEnviados,
                                        [tipo]: novaLista
                                    }
                                }
                            }
                        })
                    } else {
                        totalErros++
                    }
                }
            }
        }

        console.log(`[Cron Follow-Up] Varredura concluída. ${totalEnviados} mensagens enviadas. ${totalErros} erros.`)
        return NextResponse.json({ ok: true, enviados: totalEnviados, erros: totalErros })
    } catch (err: any) {
        console.error('[Cron Follow-Up] Erro geral:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * Função utilitária para gravar envios automáticos no chat log da clínica
 */
async function registrarHistoricoConversa(clinicaId: number, telefone: string, content: string, pushName: string) {
    try {
        await prisma.$executeRawUnsafe(`
            INSERT INTO historico_conversas (user_id, telefone_cliente, role, content, push_name, origem, created_at)
            VALUES ($1, $2, 'assistant', $3, $4, 'whatsapp', NOW())
        `, clinicaId, telefone, content, pushName)
    } catch (err) {
        console.error('[Cron Follow-Up - Registro Histórico] Erro:', err)
    }
}
