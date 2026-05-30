// ============================================
// APPLE CALENDAR — CalDAV Integration via tsdav
// ============================================
// Permite que profissionais conectem o Apple Calendar (iCloud)
// como alternativa ao Google Calendar para sincronizar agendamentos.
//
// Requer que a profissional gere uma "Senha de App" em appleid.apple.com

import { createDAVClient, DAVCalendar, DAVObject } from 'tsdav'

const ICLOUD_CALDAV_URL = 'https://caldav.icloud.com'

// ============================================
// TYPES
// ============================================

export interface AppleCalendarCredentials {
    email: string
    appPassword: string
    calendarUrl?: string // URL do calendário específico (descoberto automaticamente)
}

export interface CalendarEventData {
    uid: string
    title: string
    description?: string
    location?: string
    startDate: string // YYYY-MM-DD
    startTime: string // HH:MM
    endTime: string   // HH:MM
    timezone: string
    organizer?: string
}

// ============================================
// CONECTAR — Validar credenciais + descobrir calendários
// ============================================

/**
 * Testa a conexão CalDAV com iCloud e retorna os calendários disponíveis.
 * Usado no fluxo de setup (quando a profissional conecta pela primeira vez).
 */
export async function connectAppleCalendar(
    email: string,
    appPassword: string
): Promise<{ success: boolean; calendars: { url: string; displayName: string }[]; error?: string }> {
    try {
        const client = await createDAVClient({
            serverUrl: ICLOUD_CALDAV_URL,
            credentials: {
                username: email,
                password: appPassword,
            },
            authMethod: 'Basic',
            defaultAccountType: 'caldav',
        })

        const calendars = await client.fetchCalendars()

        if (!calendars || calendars.length === 0) {
            return { success: false, calendars: [], error: 'Nenhum calendário encontrado nessa conta.' }
        }

        return {
            success: true,
            calendars: calendars.map(c => ({
                url: c.url,
                displayName: c.displayName || 'Calendário',
            })),
        }
    } catch (err: any) {
        console.error('[AppleCalendar] Erro ao conectar:', err?.message || err)

        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
            return {
                success: false,
                calendars: [],
                error: 'Credenciais inválidas. Verifique seu Apple ID e a Senha de App.',
            }
        }

        return {
            success: false,
            calendars: [],
            error: `Erro ao conectar: ${err?.message || 'Tente novamente.'}`,
        }
    }
}

// ============================================
// CRIAR EVENTO
// ============================================

/**
 * Cria um evento no Apple Calendar via CalDAV.
 * Retorna o UID do evento criado.
 */
export async function createAppleCalendarEvent(
    credentials: AppleCalendarCredentials,
    event: CalendarEventData
): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
        const client = await createDAVClient({
            serverUrl: ICLOUD_CALDAV_URL,
            credentials: {
                username: credentials.email,
                password: credentials.appPassword,
            },
            authMethod: 'Basic',
            defaultAccountType: 'caldav',
        })

        const calendars = await client.fetchCalendars()
        const calendar = credentials.calendarUrl
            ? calendars.find(c => c.url === credentials.calendarUrl) || calendars[0]
            : calendars[0]

        if (!calendar) {
            return { success: false, error: 'Nenhum calendário disponível.' }
        }

        // Construir ICS
        const icsData = buildICS(event)

        await client.createCalendarObject({
            calendar,
            filename: `${event.uid}.ics`,
            iCalString: icsData,
        })

        console.log(`[AppleCalendar] ✅ Evento criado: ${event.uid}`)
        return { success: true, eventId: event.uid }

    } catch (err: any) {
        console.error('[AppleCalendar] Erro ao criar evento:', err?.message || err)
        return { success: false, error: err?.message || 'Erro ao criar evento.' }
    }
}

// ============================================
// LER EVENTOS (para verificar disponibilidade)
// ============================================

/**
 * Busca eventos do Apple Calendar num intervalo de datas.
 * Usado para verificar disponibilidade.
 */
export async function getAppleCalendarEvents(
    credentials: AppleCalendarCredentials,
    startDate: Date,
    endDate: Date
): Promise<{ title: string; start: string; end: string }[]> {
    try {
        const client = await createDAVClient({
            serverUrl: ICLOUD_CALDAV_URL,
            credentials: {
                username: credentials.email,
                password: credentials.appPassword,
            },
            authMethod: 'Basic',
            defaultAccountType: 'caldav',
        })

        const calendars = await client.fetchCalendars()
        const calendar = credentials.calendarUrl
            ? calendars.find(c => c.url === credentials.calendarUrl) || calendars[0]
            : calendars[0]

        if (!calendar) return []

        const objects = await client.fetchCalendarObjects({
            calendar,
            timeRange: {
                start: formatDateUTC(startDate),
                end: formatDateUTC(endDate),
            },
        })

        // Parsear ICS para extrair eventos
        return objects
            .filter(obj => obj.data)
            .map(obj => parseICSEvent(obj.data!))
            .filter(Boolean) as { title: string; start: string; end: string }[]

    } catch (err: any) {
        console.error('[AppleCalendar] Erro ao buscar eventos:', err?.message || err)
        return []
    }
}

// ============================================
// DELETAR EVENTO
// ============================================

/**
 * Deleta um evento do Apple Calendar pelo UID.
 */
export async function deleteAppleCalendarEvent(
    credentials: AppleCalendarCredentials,
    eventUid: string
): Promise<boolean> {
    try {
        const client = await createDAVClient({
            serverUrl: ICLOUD_CALDAV_URL,
            credentials: {
                username: credentials.email,
                password: credentials.appPassword,
            },
            authMethod: 'Basic',
            defaultAccountType: 'caldav',
        })

        const calendars = await client.fetchCalendars()
        const calendar = credentials.calendarUrl
            ? calendars.find(c => c.url === credentials.calendarUrl) || calendars[0]
            : calendars[0]

        if (!calendar) return false

        // Buscar o objeto pelo UID
        const objects = await client.fetchCalendarObjects({ calendar })
        const target = objects.find(obj =>
            obj.data?.includes(`UID:${eventUid}`) || obj.url?.includes(eventUid)
        )

        if (!target) {
            console.log(`[AppleCalendar] Evento ${eventUid} não encontrado para deletar.`)
            return false
        }

        await client.deleteCalendarObject({
            calendarObject: target,
        })

        console.log(`[AppleCalendar] ✅ Evento deletado: ${eventUid}`)
        return true

    } catch (err: any) {
        console.error('[AppleCalendar] Erro ao deletar evento:', err?.message || err)
        return false
    }
}

// ============================================
// HELPERS
// ============================================

/**
 * Gera conteúdo ICS (RFC 5545) para um evento.
 */
function buildICS(event: CalendarEventData): string {
    const tz = event.timezone || 'America/Sao_Paulo'
    const [startH, startM] = event.startTime.split(':').map(Number)
    const [endH, endM] = event.endTime.split(':').map(Number)
    const [year, month, day] = event.startDate.split('-').map(Number)

    const pad = (n: number) => String(n).padStart(2, '0')
    const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`
    const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`

    const now = new Date()
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//IARA//Apple Calendar//PT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-TIMEZONE:${tz}`,
        'BEGIN:VEVENT',
        `UID:${event.uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${tz}:${dtStart}`,
        `DTEND;TZID=${tz}:${dtEnd}`,
        `SUMMARY:${escapeICS(event.title)}`,
        event.description ? `DESCRIPTION:${escapeICS(event.description)}` : '',
        event.location ? `LOCATION:${escapeICS(event.location)}` : '',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT2H',
        'ACTION:DISPLAY',
        `DESCRIPTION:Lembrete: ${escapeICS(event.title)} em 2 horas`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Lembrete: ${escapeICS(event.title)} em 30 minutos`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean)

    return lines.join('\r\n')
}

function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
}

function formatDateUTC(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T000000Z`
}

/**
 * Extrai título, início e fim de um bloco ICS.
 */
function parseICSEvent(icsData: string): { title: string; start: string; end: string } | null {
    try {
        const titleMatch = icsData.match(/SUMMARY:(.+?)(?:\r?\n)/s)
        const startMatch = icsData.match(/DTSTART[^:]*:(\d{8}T\d{6})/)
        const endMatch = icsData.match(/DTEND[^:]*:(\d{8}T\d{6})/)

        if (!titleMatch || !startMatch) return null

        return {
            title: titleMatch[1].trim(),
            start: startMatch[1],
            end: endMatch ? endMatch[1] : startMatch[1],
        }
    } catch {
        return null
    }
}
