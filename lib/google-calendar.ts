// ============================================
// GOOGLE CALENDAR — Helper Functions
// ============================================
// Token refresh, event creation, availability check.

import { prisma } from '@/lib/prisma'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

interface CalendarTokens {
    accessToken: string
    refreshToken: string | null
    calendarId: string
}

/**
 * Busca tokens do Google Calendar de uma clínica e faz refresh se necessário.
 */
export async function getCalendarTokens(clinicaId: number): Promise<CalendarTokens | null> {
    const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: {
            googleCalendarToken: true,
            googleCalendarRefreshToken: true,
            googleCalendarId: true,
        },
    })

    if (!clinica?.googleCalendarToken) return null

    return {
        accessToken: clinica.googleCalendarToken,
        refreshToken: clinica.googleCalendarRefreshToken,
        calendarId: clinica.googleCalendarId || 'primary',
    }
}

/**
 * Tenta fazer refresh do access_token usando o refresh_token.
 */
export async function refreshCalendarToken(clinicaId: number, refreshToken: string): Promise<string | null> {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('[Google Calendar] Credenciais não configuradas para refresh')
        return null
    }

    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        })

        if (!res.ok) {
            console.error('[Google Calendar] Refresh falhou:', await res.text())
            return null
        }

        const data = await res.json()
        const newToken = data.access_token

        if (newToken) {
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { googleCalendarToken: newToken },
            })
            console.log(`[Google Calendar] Token atualizado para clínica ${clinicaId}`)
        }

        return newToken
    } catch (err) {
        console.error('[Google Calendar] Erro no refresh:', err)
        return null
    }
}

/**
 * Chama Google Calendar API com retry de refresh automático.
 */
export async function calendarFetch(
    clinicaId: number,
    endpoint: string,
    options: RequestInit = {}
): Promise<Response | null> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return null

    const headers = {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    }

    let res = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
        ...options,
        headers,
    })

    // Se 401, tentar refresh
    if (res.status === 401 && tokens.refreshToken) {
        const newToken = await refreshCalendarToken(clinicaId, tokens.refreshToken)
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`
            res = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
                ...options,
                headers,
            })
        }
    }

    return res
}

/**
 * Busca eventos do Google Calendar para um intervalo de tempo.
 */
export async function getCalendarEvents(
    clinicaId: number,
    timeMin: string,
    timeMax: string
): Promise<any[]> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return []

    const calendarId = encodeURIComponent(tokens.calendarId)
    const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
    })

    const res = await calendarFetch(
        clinicaId,
        `/calendars/${calendarId}/events?${params.toString()}`
    )

    if (!res || !res.ok) {
        console.error('[Google Calendar] Erro ao buscar eventos:', res?.status)
        return []
    }

    const data = await res.json()
    return data.items || []
}

/**
 * Cria um evento no Google Calendar.
 */
export async function createCalendarEvent(
    clinicaId: number,
    event: {
        summary: string
        description?: string
        startDateTime: string   // ISO 8601
        endDateTime: string     // ISO 8601
        timeZone?: string
    }
): Promise<any | null> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return null

    const calendarId = encodeURIComponent(tokens.calendarId)
    const tz = event.timeZone || 'America/Sao_Paulo'

    const res = await calendarFetch(
        clinicaId,
        `/calendars/${calendarId}/events`,
        {
            method: 'POST',
            body: JSON.stringify({
                summary: event.summary,
                description: event.description || '',
                start: { dateTime: event.startDateTime, timeZone: tz },
                end: { dateTime: event.endDateTime, timeZone: tz },
            }),
        }
    )

    if (!res || !res.ok) {
        console.error('[Google Calendar] Erro ao criar evento:', res?.status)
        return null
    }

    return await res.json()
}
