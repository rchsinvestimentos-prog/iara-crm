// ============================================
// API: /api/calendario/ics
// ============================================
// Gera arquivo .ics (iCalendar) para um agendamento.
// Funciona com Apple Calendar, Google Calendar, Outlook, etc.
//
// GET /api/calendario/ics?id=<agendamento_id>
// Retorna: arquivo .ics para download/add ao calendário

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'ID do agendamento obrigatório' }, { status: 400 })
    }

    try {
        const agendamento = await prisma.agendamento.findUnique({
            where: { id },
            include: {
                clinica: {
                    select: {
                        nomeClinica: true,
                        endereco: true,
                        timezone: true,
                    },
                },
                profissional: {
                    select: {
                        nome: true,
                    },
                },
            },
        })

        if (!agendamento) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        const ics = generateICS(agendamento)

        return new NextResponse(ics, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="agendamento-${id.slice(0, 8)}.ics"`,
            },
        })
    } catch (err) {
        console.error('[ICS] Erro ao gerar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

/**
 * Gera conteúdo do arquivo .ics (iCalendar RFC 5545)
 */
function generateICS(agendamento: any): string {
    const tz = agendamento.clinica?.timezone || 'America/Sao_Paulo'
    const nomeClinica = agendamento.clinica?.nomeClinica || 'Clínica'
    const endereco = agendamento.clinica?.endereco || ''
    const profissional = agendamento.profissional?.nome || ''

    // Parsear data e hora
    const dataStr = agendamento.data instanceof Date
        ? agendamento.data.toISOString().split('T')[0]
        : String(agendamento.data).split('T')[0]

    const [year, month, day] = dataStr.split('-').map(Number)
    const [hora, minuto] = (agendamento.horario || '09:00').split(':').map(Number)

    // Formato iCalendar: YYYYMMDDTHHMMSS
    const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hora)}${pad(minuto)}00`

    // Calcular fim
    const duracao = agendamento.duracao || 30
    const endMinutes = hora * 60 + minuto + duracao
    const endHora = Math.floor(endMinutes / 60)
    const endMinuto = endMinutes % 60
    const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHora)}${pad(endMinuto)}00`

    // UID único
    const uid = `${agendamento.id}@iara.app`

    // Timestamp atual
    const now = new Date()
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

    // Descrição
    const descricao = [
        `Procedimento: ${agendamento.procedimento}`,
        profissional ? `Profissional: ${profissional}` : '',
        `Clínica: ${nomeClinica}`,
        agendamento.observacao ? `Obs: ${agendamento.observacao}` : '',
        '',
        'Agendado via IARA',
    ].filter(Boolean).join('\\n')

    // Montar .ics (RFC 5545)
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//IARA//Agendamento//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-TIMEZONE:${tz}`,
        'BEGIN:VTIMEZONE',
        `TZID:${tz}`,
        'END:VTIMEZONE',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${tz}:${dtStart}`,
        `DTEND;TZID=${tz}:${dtEnd}`,
        `SUMMARY:${escapeICS(agendamento.procedimento)} - ${escapeICS(nomeClinica)}`,
        `DESCRIPTION:${escapeICS(descricao)}`,
        endereco ? `LOCATION:${escapeICS(endereco)}` : '',
        `ORGANIZER;CN=${escapeICS(nomeClinica)}:MAILTO:noreply@iara.app`,
        'STATUS:CONFIRMED',
        `CATEGORIES:${escapeICS(nomeClinica)}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Lembrete: ${escapeICS(agendamento.procedimento)} em 2 horas`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Lembrete: ${escapeICS(agendamento.procedimento)} em 30 minutos`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean)

    return lines.join('\r\n')
}

function pad(n: number): string {
    return String(n).padStart(2, '0')
}

function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
}
