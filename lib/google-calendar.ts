// ============================================
// GOOGLE CALENDAR — Helper Functions
// ============================================
// Token refresh, event creation, availability check.
// Suporta tokens POR PROFISSIONAL (com fallback para clínica).

import { prisma } from '@/lib/prisma'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

interface CalendarTokens {
    accessToken: string
    refreshToken: string | null
    calendarId: string
    source: 'profissional' | 'clinica'
    sourceId: string | number  // profissionalId ou clinicaId
}

export interface CalendarEvent {
    summary: string
    description?: string
    startDateTime: string   // ISO 8601
    endDateTime: string     // ISO 8601
    timeZone?: string
}

// ============================================
// BUSCAR TOKENS
// ============================================

/**
 * Busca tokens do Google Calendar de uma clínica.
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
        source: 'clinica',
        sourceId: clinicaId,
    }
}

/**
 * Busca tokens do profissional. Se não tem, faz fallback para a clínica.
 */
export async function getCalendarTokensForProfissional(
    profissionalId: string
): Promise<CalendarTokens | null> {
    const prof = await prisma.profissional.findUnique({
        where: { id: profissionalId },
        select: {
            clinicaId: true,
            googleCalendarToken: true,
            googleCalendarRefreshToken: true,
            googleCalendarId: true,
        },
    })

    if (!prof) return null

    // Se profissional tem tokens próprios, usar
    if (prof.googleCalendarToken) {
        return {
            accessToken: prof.googleCalendarToken,
            refreshToken: prof.googleCalendarRefreshToken,
            calendarId: prof.googleCalendarId || 'primary',
            source: 'profissional',
            sourceId: profissionalId,
        }
    }

    // Fallback: usar tokens da clínica
    return getCalendarTokens(prof.clinicaId)
}

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * Refresh token e salva (clinica OU profissional).
 */
async function refreshToken(tokens: CalendarTokens): Promise<string | null> {
    if (!tokens.refreshToken || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null

    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: tokens.refreshToken,
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
            if (tokens.source === 'profissional') {
                await prisma.profissional.update({
                    where: { id: tokens.sourceId as string },
                    data: { googleCalendarToken: newToken },
                })
            } else {
                await prisma.clinica.update({
                    where: { id: tokens.sourceId as number },
                    data: { googleCalendarToken: newToken },
                })
            }
            console.log(`[Google Calendar] Token atualizado (${tokens.source} ${tokens.sourceId})`)
        }

        return newToken
    } catch (err) {
        console.error('[Google Calendar] Erro no refresh:', err)
        return null
    }
}

// Legacy export mantido para compatibilidade
export async function refreshCalendarToken(clinicaId: number, refreshTokenStr: string): Promise<string | null> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return null
    return refreshToken(tokens)
}

// ============================================
// FETCH GENÉRICO COM AUTO-REFRESH
// ============================================

/**
 * Chama Google Calendar API com tokens fornecidos e retry de refresh automático.
 */
async function gcalFetch(
    tokens: CalendarTokens,
    endpoint: string,
    options: RequestInit = {}
): Promise<Response | null> {
    const headers: Record<string, string> = {
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
        const newAccessToken = await refreshToken(tokens)
        if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`
            res = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
                ...options,
                headers,
            })
        }
    }

    return res
}

/**
 * Chama Google Calendar API usando tokens da clínica (legacy/compatibilidade).
 */
export async function calendarFetch(
    clinicaId: number,
    endpoint: string,
    options: RequestInit = {}
): Promise<Response | null> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return null
    return gcalFetch(tokens, endpoint, options)
}

// ============================================
// BUSCAR EVENTOS
// ============================================

/**
 * Busca eventos do Google Calendar da clínica.
 */
export async function getCalendarEvents(
    clinicaId: number,
    timeMin: string,
    timeMax: string
): Promise<any[]> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return []
    return getEventsWithTokens(tokens, timeMin, timeMax)
}

/**
 * Busca eventos do Google Calendar do profissional (ou fallback clínica).
 */
export async function getCalendarEventsForProfissional(
    profissionalId: string,
    timeMin: string,
    timeMax: string
): Promise<any[]> {
    const tokens = await getCalendarTokensForProfissional(profissionalId)
    if (!tokens) return []
    return getEventsWithTokens(tokens, timeMin, timeMax)
}

async function getEventsWithTokens(tokens: CalendarTokens, timeMin: string, timeMax: string): Promise<any[]> {
    const calendarId = encodeURIComponent(tokens.calendarId)
    const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
    })

    const res = await gcalFetch(tokens, `/calendars/${calendarId}/events?${params.toString()}`)

    if (!res || !res.ok) {
        console.error('[Google Calendar] Erro ao buscar eventos:', res?.status)
        return []
    }

    const data = await res.json()
    return data.items || []
}

// ============================================
// CRIAR EVENTO
// ============================================

/**
 * Cria evento no Google Calendar da clínica.
 */
export async function createCalendarEvent(
    clinicaId: number,
    event: CalendarEvent
): Promise<any | null> {
    const tokens = await getCalendarTokens(clinicaId)
    if (!tokens) return null
    return createEventWithTokens(tokens, event)
}

/**
 * Cria evento no Google Calendar do profissional (ou fallback clínica).
 */
export async function createCalendarEventForProfissional(
    profissionalId: string,
    event: CalendarEvent
): Promise<any | null> {
    const tokens = await getCalendarTokensForProfissional(profissionalId)
    if (!tokens) return null
    return createEventWithTokens(tokens, event)
}

async function createEventWithTokens(tokens: CalendarTokens, event: CalendarEvent): Promise<any | null> {
    const calendarId = encodeURIComponent(tokens.calendarId)
    const tz = event.timeZone || 'America/Sao_Paulo'

    const res = await gcalFetch(
        tokens,
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

// ============================================
// ATUALIZAR EVENTO
// ============================================

/**
 * Atualiza evento no Google Calendar do profissional (ou fallback clínica).
 */
export async function updateCalendarEventForProfissional(
    profissionalId: string,
    googleEventId: string,
    event: Partial<CalendarEvent>
): Promise<any | null> {
    const tokens = await getCalendarTokensForProfissional(profissionalId)
    if (!tokens) return null

    const calendarId = encodeURIComponent(tokens.calendarId)
    const tz = event.timeZone || 'America/Sao_Paulo'

    const body: Record<string, any> = {}
    if (event.summary) body.summary = event.summary
    if (event.description !== undefined) body.description = event.description
    if (event.startDateTime) body.start = { dateTime: event.startDateTime, timeZone: tz }
    if (event.endDateTime) body.end = { dateTime: event.endDateTime, timeZone: tz }

    const res = await gcalFetch(
        tokens,
        `/calendars/${calendarId}/events/${encodeURIComponent(googleEventId)}`,
        { method: 'PATCH', body: JSON.stringify(body) }
    )

    if (!res || !res.ok) {
        console.error('[Google Calendar] Erro ao atualizar evento:', res?.status)
        return null
    }

    return await res.json()
}

// ============================================
// DELETAR EVENTO
// ============================================

/**
 * Deleta evento do Google Calendar do profissional (ou fallback clínica).
 */
export async function deleteCalendarEventForProfissional(
    profissionalId: string,
    googleEventId: string
): Promise<boolean> {
    const tokens = await getCalendarTokensForProfissional(profissionalId)
    if (!tokens) return false

    const calendarId = encodeURIComponent(tokens.calendarId)

    const res = await gcalFetch(
        tokens,
        `/calendars/${calendarId}/events/${encodeURIComponent(googleEventId)}`,
        { method: 'DELETE' }
    )

    if (!res || (res.status !== 204 && res.status !== 200)) {
        console.error('[Google Calendar] Erro ao deletar evento:', res?.status)
        return false
    }

    return true
}
