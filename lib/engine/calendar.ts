// ============================================
// CALENDAR — Agendamento com Google Calendar
// ============================================
// Conecta o google-calendar.ts ao pipeline da IARA.
// Fornece: contexto de agenda, verificação de disponibilidade, criação de eventos.
// DUAL-WRITE: cria tanto no Agendamento interno quanto no Google Calendar.

import {
    getCalendarEvents,
    getCalendarEventsForProfissional,
    getCalendarTokens,
    getCalendarTokensForProfissional,
    createCalendarEventForProfissional,
    createCalendarEvent,
} from '@/lib/google-calendar'
import type { DadosClinica, ProfissionalAtivo } from './types'
import { parseFuncionalidades } from './types'
import { prisma } from '@/lib/prisma'

// ============================================
// BUSCAR CONTEXTO DA AGENDA
// ============================================

/**
 * Busca compromissos das próximas 48h e formata para injetar no prompt.
 * Consulta AMBAS as fontes: tabela interna + Google Calendar (desduplicando por googleEventId).
 */
export async function getAgendaContext(
    clinicaId: number,
    clinica: DadosClinica,
    profissionais?: ProfissionalAtivo[]
): Promise<string | null> {
    // Verificar se tem calendário conectado (da clínica ou de pelo menos 1 profissional)
    const tokensClinica = await getCalendarTokens(clinicaId)
    const multiProf = profissionais && profissionais.length > 1

    // Se não tem Google Calendar E não tem multi-prof, verificar se tem agendamentos internos pelo menos
    const now = new Date()
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

    // Buscar agendamentos internos (sempre disponível)
    const agendamentosInternos = await prisma.agendamento.findMany({
        where: {
            clinicaId,
            data: { gte: now, lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
            status: { notIn: ['cancelado', 'reagendado'] },
        },
        include: {
            profissional: { select: { id: true, nome: true } },
        },
        orderBy: [{ data: 'asc' }, { horario: 'asc' }],
    })

    if (!tokensClinica && !multiProf && agendamentosInternos.length === 0) return null

    const tz = clinica.timezone || 'America/Sao_Paulo'

    try {
        const horarios = montarHorarios(clinica)
        const intervalo = clinica.intervaloAtendimento ?? 15
        const antecedencia = clinica.antecedenciaMinima || 'Sem restrição'

        let texto = `📅 AGENDA REAL (sincronizada)\n`
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
                    const fim = a.fim ? new Date(a.fim) : new Date('2099-12-31')
                    return now >= ini && now <= fim
                })

                if (emFerias) {
                    texto += `📅 Agenda de ${prof.nome}: ❌ DE FÉRIAS (não ofereça este profissional)\n\n`
                    continue
                }

                // Montar lista unificada de compromissos
                const compromissos = await getCompromissosUnificados(
                    clinicaId, prof.id, timeMin, timeMax, agendamentosInternos
                )

                // Horários individuais do profissional (se configurados)
                const horarioProf = montarHorariosProfissional(prof)

                texto += `📅 Agenda de ${prof.nome} (ID: ${prof.id}):\n`
                if (horarioProf) texto += `  Horários: ${horarioProf}\n`

                if (compromissos.length === 0) {
                    texto += `  Próximas 48h: NENHUM compromisso. Agenda livre!\n\n`
                } else {
                    for (const c of compromissos) {
                        texto += `  • ${formatDateBR(c.start, tz)}`
                        if (c.duracao) texto += ` (${c.duracao}min)`
                        texto += ` — ${c.titulo}\n`
                    }
                    texto += `\n`
                }
            }
        } else {
            // SINGLE: combinar fontes
            const compromissos = await getCompromissosSingle(
                clinicaId, timeMin, timeMax, agendamentosInternos
            )

            console.log(`[Calendar] 📅 ${compromissos.length} compromissos unificados nas próximas 48h`)

            if (compromissos.length === 0) {
                texto += `Próximas 48h: NENHUM compromisso. Agenda livre!\n`
            } else {
                texto += `Compromissos nas próximas 48h:\n`
                for (const c of compromissos) {
                    texto += `• ${formatDateBR(c.start, tz)}`
                    if (c.duracao) texto += ` (${c.duracao}min)`
                    texto += ` — ${c.titulo}\n`
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
// UNIFICAR COMPROMISSOS (Interno + Google)
// ============================================

interface CompromissoUnificado {
    start: Date
    duracao: number | null
    titulo: string
    googleEventId?: string
}

/**
 * Combina agendamentos internos + Google Calendar de um profissional,
 * desduplicando por googleEventId.
 */
async function getCompromissosUnificados(
    clinicaId: number,
    profissionalId: string,
    timeMin: string,
    timeMax: string,
    agendamentosInternos: any[]
): Promise<CompromissoUnificado[]> {
    const compromissos: CompromissoUnificado[] = []
    const googleEventIdsUsados = new Set<string>()

    // 1. Agendamentos internos deste profissional
    const internosDoProfissional = agendamentosInternos.filter(
        a => a.profissionalId === profissionalId
    )

    for (const ag of internosDoProfissional) {
        const startDate = new Date(`${ag.data.toISOString().split('T')[0]}T${ag.horario}:00`)
        compromissos.push({
            start: startDate,
            duracao: ag.duracao || null,
            titulo: `${ag.procedimento} — ${ag.nomePaciente}`,
            googleEventId: ag.googleEventId || undefined,
        })
        if (ag.googleEventId) googleEventIdsUsados.add(ag.googleEventId)
    }

    // 2. Eventos do Google Calendar (que não estão no interno)
    try {
        const eventosGoogle = await getCalendarEventsForProfissional(profissionalId, timeMin, timeMax)
        for (const ev of eventosGoogle) {
            if (ev.id && googleEventIdsUsados.has(ev.id)) continue // já contado

            const start = ev.start?.dateTime || ev.start?.date
            if (!start) continue

            const startDate = new Date(start)
            const end = ev.end?.dateTime || ev.end?.date
            const endDate = end ? new Date(end) : null
            const durMin = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : null

            compromissos.push({
                start: startDate,
                duracao: durMin,
                titulo: ev.summary || 'Compromisso',
                googleEventId: ev.id,
            })
        }
    } catch (err) {
        console.error(`[Calendar] Erro ao buscar Google Calendar do profissional ${profissionalId}:`, err)
    }

    // Ordenar por data
    compromissos.sort((a, b) => a.start.getTime() - b.start.getTime())
    return compromissos
}

/**
 * Para clínica single-prof: combina interno + Google Calendar desduplicado.
 */
async function getCompromissosSingle(
    clinicaId: number,
    timeMin: string,
    timeMax: string,
    agendamentosInternos: any[]
): Promise<CompromissoUnificado[]> {
    const compromissos: CompromissoUnificado[] = []
    const googleEventIdsUsados = new Set<string>()

    // 1. Agendamentos internos
    for (const ag of agendamentosInternos) {
        const startDate = new Date(`${ag.data.toISOString().split('T')[0]}T${ag.horario}:00`)
        compromissos.push({
            start: startDate,
            duracao: ag.duracao || null,
            titulo: `${ag.procedimento} — ${ag.nomePaciente}`,
            googleEventId: ag.googleEventId || undefined,
        })
        if (ag.googleEventId) googleEventIdsUsados.add(ag.googleEventId)
    }

    // 2. Google Calendar (desduplicado)
    try {
        const eventosGoogle = await getCalendarEvents(clinicaId, timeMin, timeMax)
        for (const ev of eventosGoogle) {
            if (ev.id && googleEventIdsUsados.has(ev.id)) continue

            const start = ev.start?.dateTime || ev.start?.date
            if (!start) continue

            const startDate = new Date(start)
            const end = ev.end?.dateTime || ev.end?.date
            const endDate = end ? new Date(end) : null
            const durMin = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) : null

            compromissos.push({
                start: startDate,
                duracao: durMin,
                titulo: ev.summary || 'Compromisso',
                googleEventId: ev.id,
            })
        }
    } catch (err) {
        console.error('[Calendar] Erro ao buscar Google Calendar:', err)
    }

    compromissos.sort((a, b) => a.start.getTime() - b.start.getTime())
    return compromissos
}

// ============================================
// PROCESSAR AGENDAMENTO PÓS-IA (DUAL-WRITE)
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
 * DUAL-WRITE: cria registro na tabela agendamentos_v2 E evento no Google Calendar.
 * Retorna a resposta limpa (sem marcadores).
 */
export async function processarAgendamentos(
    clinicaId: number,
    respostaIA: string,
    clinica: DadosClinica,
    nomeCliente: string,
    telefoneCliente?: string
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

        // Determinar profissionalId (se single-prof, pegar o primeiro ativo)
        let profissionalId = agendamento.profissionalId
        if (!profissionalId) {
            const primeiroProfissional = await prisma.profissional.findFirst({
                where: { clinicaId, ativo: true },
                orderBy: { ordem: 'asc' },
                select: { id: true },
            })
            profissionalId = primeiroProfissional?.id || null
        }

        if (!profissionalId) {
            console.error('[Calendar] ❌ Nenhum profissional encontrado para agendar')
            respostaLimpa = respostaLimpa.replace(match[0], '')
            continue
        }

        // Buscar contatoId pelo telefone
        let contatoId: number | null = null
        if (telefoneCliente) {
            const contato = await prisma.contato.findFirst({
                where: { clinicaId, telefone: telefoneCliente },
                select: { id: true },
            })
            contatoId = contato?.id || null
        }

        // Preparar datas (com timezone para evitar rollback UTC)
        const tzOffset = getTzOffset(tz)
        const startDateTime = `${agendamento.data}T${agendamento.hora}:00${tzOffset}`
        const endDate = new Date(`${agendamento.data}T${agendamento.hora}:00${tzOffset}`)
        endDate.setMinutes(endDate.getMinutes() + agendamento.duracao)
        const endHH = String(endDate.getHours()).padStart(2, '0')
        const endMM = String(endDate.getMinutes()).padStart(2, '0')
        const endDateTime = `${agendamento.data}T${endHH}:${endMM}:00${tzOffset}`

        try {
            // =========================================
            // PASSO 0: CANCELAR AGENDAMENTOS ANTERIORES (reagendamento)
            // =========================================
            // Se a cliente já tem agendamento futuro confirmado/pendente,
            // cancela automaticamente ao criar um novo (= reagendamento)
            if (telefoneCliente) {
                const agendamentosAnteriores = await prisma.agendamento.findMany({
                    where: {
                        clinicaId,
                        telefone: telefoneCliente,
                        status: { in: ['confirmado', 'pendente'] },
                        data: { gte: new Date() },
                    },
                    select: { id: true, googleEventId: true, horario: true, data: true, procedimento: true, profissionalId: true },
                })

                if (agendamentosAnteriores.length > 0) {
                    console.log(`[Calendar] 🔄 Reagendamento detectado: cancelando ${agendamentosAnteriores.length} agendamento(s) anterior(es)`)
                    
                    for (const ant of agendamentosAnteriores) {
                        // Cancelar no banco
                        await prisma.agendamento.update({
                            where: { id: ant.id },
                            data: { status: 'reagendado' },
                        })
                        console.log(`[Calendar] ❌ Agendamento #${ant.id} (${ant.procedimento} ${ant.horario}) → reagendado`)

                        // Cancelar no Google Calendar se existir
                        if (ant.googleEventId && ant.profissionalId) {
                            try {
                                const tokens = await getCalendarTokensForProfissional(ant.profissionalId)
                                if (tokens?.accessToken) {
                                    await fetch(`https://www.googleapis.com/calendar/v3/calendars/${tokens.calendarId || 'primary'}/events/${ant.googleEventId}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${tokens.accessToken}` },
                                    })
                                    console.log(`[Calendar] ❌ Google Calendar: evento ${ant.googleEventId} cancelado`)
                                }
                            } catch (gcErr) {
                                console.warn(`[Calendar] ⚠️ Falha ao cancelar evento Google: ${(gcErr as any).message}`)
                            }
                        }
                    }
                }
            }

            // =========================================
            // WRITE 1: Google Calendar
            // =========================================
            let googleEventId: string | null = null

            // Verificar toggle google_calendar
            const funcsCalendar = parseFuncionalidades(clinica.funcionalidades)
            if (funcsCalendar.google_calendar) {
                const evento = await createCalendarEventForProfissional(profissionalId, {
                    summary: `${agendamento.procedimento} — ${nomeCliente}`,
                    description: `Agendado pela IARA via WhatsApp.\nCliente: ${nomeCliente}\nTelefone: ${telefoneCliente || ''}\nProcedimento: ${agendamento.procedimento}\nDuração: ${agendamento.duracao}min`,
                    startDateTime,
                    endDateTime,
                    timeZone: tz,
                })

                if (evento) {
                    googleEventId = evento.id || null
                    console.log(`[Calendar] ✅ Google Calendar: evento criado (${googleEventId})`)
                } else {
                    console.warn(`[Calendar] ⚠️ Google Calendar: falha ao criar (sem token?). Continuando com agendamento interno.`)
                }
            } else {
                console.log(`[Calendar] 🔇 google_calendar=OFF — pulando Google Calendar, só agendamento interno`)
            }

            // =========================================
            // WRITE 2: Agendamento interno (tabela)
            // =========================================
            // Parsear data SEM UTC — usando componentes para evitar rollback de fuso
            const [year, month, day] = agendamento.data.split('-').map(Number)
            const dataLocal = new Date(year, month - 1, day) // Meia-noite local, não UTC

            const agendamentoInterno = await prisma.agendamento.create({
                data: {
                    clinicaId,
                    profissionalId,
                    nomePaciente: nomeCliente,
                    telefone: telefoneCliente || '',
                    procedimento: agendamento.procedimento,
                    data: dataLocal,
                    horario: agendamento.hora,
                    duracao: agendamento.duracao,
                    origem: 'whatsapp',
                    status: 'confirmado',
                    googleEventId,
                    contatoId,
                },
            })
            console.log(`[Calendar] ✅ Agendamento interno criado: ${agendamentoInterno.id}`)

            // =========================================
            // CRM: mover contato para 'agendada'
            // =========================================
            if (telefoneCliente) {
                try {
                    await prisma.contato.updateMany({
                        where: { clinicaId, telefone: telefoneCliente },
                        data: { etapa: 'agendada', updatedAt: new Date() },
                    })
                    console.log(`[Calendar] 📋 CRM: contato ${telefoneCliente} → agendada`)
                } catch (e) {
                    console.error('[Calendar] Erro ao mover contato no CRM:', e)
                }
            }

        } catch (err) {
            console.error('[Calendar] Erro ao processar agendamento:', err)
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

function montarHorariosProfissional(prof: ProfissionalAtivo): string | null {
    if (!prof.horarioSemana) return null
    const parts: string[] = [`Seg-Sex: ${prof.horarioSemana}`]
    if (prof.atendeSabado && prof.horarioSabado) parts.push(`Sáb: ${prof.horarioSabado}`)
    if (prof.atendeDomingo && prof.horarioDomingo) parts.push(`Dom: ${prof.horarioDomingo}`)
    return parts.join(' | ')
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

/**
 * Calcula o offset UTC de um timezone (ex: 'America/Sao_Paulo' → '-03:00').
 * Usado para construir datas ISO com timezone correto.
 */
function getTzOffset(tz: string): string {
    try {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
        })
        const parts = formatter.formatToParts(now)
        const tzPart = parts.find(p => p.type === 'timeZoneName')
        if (tzPart) {
            // Formato: "GMT-3" ou "GMT+5:30"
            const match = tzPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
            if (match) {
                const sign = match[1]
                const hours = match[2].padStart(2, '0')
                const minutes = match[3] || '00'
                return `${sign}${hours}:${minutes}`
            }
        }
    } catch {}
    // Fallback: São Paulo
    return '-03:00'
}
