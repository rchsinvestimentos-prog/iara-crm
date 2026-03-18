// ============================================
// CALENDAR — Agendamento com Google Calendar
// ============================================
// Conecta o google-calendar.ts ao pipeline da IARA.
// Fornece: contexto de agenda, verificação de disponibilidade, criação de eventos.

import { getCalendarEvents, createCalendarEvent, getCalendarTokens } from '@/lib/google-calendar'
import type { DadosClinica, ProfissionalAtivo } from './types'

// ============================================
// BUSCAR CONTEXTO DA AGENDA
// ============================================

/**
 * Busca compromissos das próximas 48h e formata para injetar no prompt.
 * Retorna string formatada OU null se calendário não está conectado.
 */
export async function getAgendaContext(
    clinicaId: number,
    clinica: DadosClinica,
    profissionais?: ProfissionalAtivo[]
): Promise<string | null> {
    // Verificar se tem calendário conectado (da clínica ou de pelo menos 1 profissional)
    const tokensClinica = await getCalendarTokens(clinicaId)
    const multiProf = profissionais && profissionais.length > 1
    if (!tokensClinica && !multiProf) return null

    const tz = clinica.timezone || 'America/Sao_Paulo'
    const now = new Date()

    // Buscar eventos das próximas 48h
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

    try {
        // Montar horários da clínica
        const horarios = montarHorarios(clinica)
        const intervalo = clinica.intervaloAtendimento ?? 15
        const antecedencia = clinica.antecedenciaMinima || 'Sem restrição'

        let texto = `📅 AGENDA REAL (Google Calendar conectado)\n`
        texto += `Horário de atendimento: ${horarios}\n`
        texto += `Intervalo entre procedimentos: ${intervalo} minutos\n`
        texto += `Antecedência mínima para agendar: ${antecedencia}\n`
        texto += `Data/Hora atual: ${formatDateBR(now, tz)}\n\n`

        if (multiProf) {
            // MULTI-PROFISSIONAL: buscar agenda de cada um
            for (const prof of profissionais!) {
                // Verificar ausências/férias
                const ausencias = prof.ausencias || []
                const emFerias = ausencias.some(a => {
                    const ini = new Date(a.inicio)
                    const fim = new Date(a.fim)
                    return now >= ini && now <= fim
                })

                if (emFerias) {
                    texto += `📅 Agenda de ${prof.nome}: ❌ DE FÉRIAS (não ofereça este profissional)\n\n`
                    continue
                }

                // Buscar eventos do profissional (usa calendar da clínica se não tem próprio)
                const eventos = await getCalendarEvents(clinicaId, timeMin, timeMax)
                texto += `📅 Agenda de ${prof.nome} (ID: ${prof.id}):\n`
                if (eventos.length === 0) {
                    texto += `  Próximas 48h: NENHUM compromisso. Agenda livre!\n\n`
                } else {
                    for (const ev of eventos) {
                        const start = ev.start?.dateTime || ev.start?.date
                        const end = ev.end?.dateTime || ev.end?.date
                        if (start) {
                            const startDate = new Date(start)
                            const endDate = end ? new Date(end) : null
                            const durMin = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : null
                            texto += `  • ${formatDateBR(startDate, tz)}`
                            if (durMin) texto += ` (${durMin}min)`
                            if (ev.summary) texto += ` — ${ev.summary}`
                            texto += `\n`
                        }
                    }
                    texto += `\n`
                }
            }
        } else {
            // SINGLE: comportamento original
            const eventos = await getCalendarEvents(clinicaId, timeMin, timeMax)
            console.log(`[Calendar] 📅 ${eventos.length} eventos encontrados nas próximas 48h`)

            if (eventos.length === 0) {
                texto += `Próximas 48h: NENHUM compromisso. Agenda livre!\n`
            } else {
                texto += `Compromissos nas próximas 48h:\n`
                for (const ev of eventos) {
                    const start = ev.start?.dateTime || ev.start?.date
                    const end = ev.end?.dateTime || ev.end?.date
                    if (start) {
                        const startDate = new Date(start)
                        const endDate = end ? new Date(end) : null
                        const durMin = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : null
                        texto += `• ${formatDateBR(startDate, tz)}`
                        if (durMin) texto += ` (${durMin}min)`
                        if (ev.summary) texto += ` — ${ev.summary}`
                        texto += `\n`
                    }
                }
            }
        }

        texto += `\n⚙️ REGRAS DE AGENDAMENTO:\n`
        texto += `- Ao confirmar agendamento, use EXATAMENTE este formato na sua resposta:\n`
        if (multiProf) {
            texto += `  [AGENDAR:NomeProcedimento|YYYY-MM-DD|HH:MM|DuracaoMinutos|ProfissionalId]\n`
            texto += `  Exemplo: [AGENDAR:Micropigmentação|2026-03-10|11:00|120|abc123]\n`
        } else {
            texto += `  [AGENDAR:NomeProcedimento|YYYY-MM-DD|HH:MM|DuracaoMinutos]\n`
            texto += `  Exemplo: [AGENDAR:Micropigmentação|2026-03-10|11:00|120]\n`
        }
        texto += `- O marcador [AGENDAR:...] será processado internamente — a cliente NÃO verá este marcador\n`
        texto += `- ANTES de agendar, SEMPRE mostre um resumo para a cliente confirmar (procedimento, data, hora, valor)\n`
        texto += `- DEPOIS que a cliente confirmar, inclua o marcador [AGENDAR:...] e envie resumo final com endereço: ${clinica.endereco || '(endereço não cadastrado)'}\n`
        texto += `- Se o horário pedido está OCUPADO (veja compromissos acima), sugira a alternativa livre mais próxima\n`
        texto += `- Cada procedimento bloqueia a agenda pelo tempo de duração + ${intervalo}min de intervalo\n`
        texto += `- Quando a cliente quer AGENDAR, é FECHAMENTO. Não enrole com sondagem. Pergunte o procedimento, verifique a agenda, mostre resumo e agende.\n`

        return texto
    } catch (err) {
        console.error('[Calendar] Erro ao buscar agenda:', err)
        return null
    }
}

// ============================================
// PROCESSAR AGENDAMENTO PÓS-IA
// ============================================

interface AgendamentoDetectado {
    procedimento: string
    data: string      // YYYY-MM-DD
    hora: string      // HH:MM
    duracao: number    // minutos
    profissionalId: string | null
}

/**
 * Detecta e processa marcadores [AGENDAR:...] na resposta da IA.
 * Retorna a resposta limpa (sem marcadores) e cria eventos no Google Calendar.
 */
export async function processarAgendamentos(
    clinicaId: number,
    respostaIA: string,
    clinica: DadosClinica,
    nomeCliente: string
): Promise<string> {
    const regex = /\[AGENDAR:([^|]+)\|(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})\|(\d+)(?:\|([^\]]+))?\]/g
    const matches = [...respostaIA.matchAll(regex)]

    if (matches.length === 0) return respostaIA

    let respostaLimpa = respostaIA
    const tz = clinica.timezone || 'America/Sao_Paulo'

    for (const match of matches) {
        const agendamento: AgendamentoDetectado = {
            procedimento: match[1].trim(),
            data: match[2],
            hora: match[3],
            duracao: parseInt(match[4]) || 60,
            profissionalId: match[5]?.trim() || null,
        }

        console.log(`[Calendar] 📝 Agendamento detectado: ${agendamento.procedimento} em ${agendamento.data} às ${agendamento.hora} (${agendamento.duracao}min)`)

        // Criar evento no Google Calendar
        const startDateTime = `${agendamento.data}T${agendamento.hora}:00`
        const endDate = new Date(`${agendamento.data}T${agendamento.hora}:00`)
        endDate.setMinutes(endDate.getMinutes() + agendamento.duracao)
        const endDateTime = endDate.toISOString().split('.')[0]

        try {
            const evento = await createCalendarEvent(clinicaId, {
                summary: `${agendamento.procedimento} — ${nomeCliente}`,
                description: `Agendado pela IARA via WhatsApp.\nCliente: ${nomeCliente}\nProcedimento: ${agendamento.procedimento}\nDuração: ${agendamento.duracao}min`,
                startDateTime,
                endDateTime,
                timeZone: tz,
            })

            if (evento) {
                console.log(`[Calendar] ✅ Evento criado: ${evento.id || 'ok'}`)
            } else {
                console.error(`[Calendar] ❌ Falha ao criar evento`)
            }
        } catch (err) {
            console.error('[Calendar] Erro ao criar evento:', err)
        }

        // Remover marcador da mensagem
        respostaLimpa = respostaLimpa.replace(match[0], '')
    }

    // Limpar espaços extras
    return respostaLimpa.replace(/\n{3,}/g, '\n\n').trim()
}

// ============================================
// HELPERS
// ============================================

function montarHorarios(clinica: DadosClinica): string {
    const parts: string[] = []

    if (clinica.horarioSemana) {
        parts.push(`Seg-Sex: ${clinica.horarioSemana}`)
    }
    if (clinica.atendeSabado && clinica.horarioSabado) {
        parts.push(`Sáb: ${clinica.horarioSabado}`)
    } else {
        parts.push(`Sáb: Não atende`)
    }
    if (clinica.atendeDomingo && clinica.horarioDomingo) {
        parts.push(`Dom: ${clinica.horarioDomingo}`)
    } else {
        parts.push(`Dom: Não atende`)
    }

    return parts.join(' | ') || 'Não configurado'
}

function formatDateBR(date: Date, tz: string): string {
    try {
        return date.toLocaleString('pt-BR', {
            timeZone: tz,
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return date.toISOString()
    }
}
