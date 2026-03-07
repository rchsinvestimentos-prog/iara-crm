import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/google-calendar/callback
 * 
 * Callback do OAuth2 do Google Calendar.
 * Recebe o code, troca por tokens, salva no banco e redireciona pro painel.
 */
export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Se o usuário cancelou
    if (error) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${baseUrl}/dashboard?calendar_error=cancelled`)
    }

    if (!code || !stateParam) {
        return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }

    // Decodificar state
    let clinicaId: number
    try {
        const parsed = JSON.parse(Buffer.from(stateParam, 'base64').toString())
        clinicaId = parsed.clinicaId
    } catch {
        return NextResponse.json({ error: 'State inválido' }, { status: 400 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'Credenciais Google não configuradas no servidor' }, { status: 500 })
    }

    try {
        // Trocar code por access_token + refresh_token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        })

        if (!tokenRes.ok) {
            const errData = await tokenRes.text()
            console.error('[Google Calendar] Erro ao trocar code:', errData)
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            return NextResponse.redirect(`${baseUrl}/dashboard?calendar_error=token_exchange_failed`)
        }

        const tokens = await tokenRes.json()
        const { access_token, refresh_token, expires_in } = tokens

        if (!access_token) {
            console.error('[Google Calendar] Tokens incompletos:', tokens)
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
            return NextResponse.redirect(`${baseUrl}/dashboard?calendar_error=no_access_token`)
        }

        // Buscar lista de calendários para pegar o primary
        let calendarId = 'primary'
        try {
            const calRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                headers: { 'Authorization': `Bearer ${access_token}` },
            })
            if (calRes.ok) {
                const calData = await calRes.json()
                const primaryCal = calData.items?.find((c: any) => c.primary === true)
                if (primaryCal) {
                    calendarId = primaryCal.id
                }
            }
        } catch (e) {
            console.error('[Google Calendar] Erro ao listar calendários:', e)
        }

        // Salvar tokens no banco
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                googleCalendarToken: access_token,
                googleCalendarRefreshToken: refresh_token || undefined,
                googleCalendarId: calendarId,
            },
        })

        console.log(`[Google Calendar] ✅ Conectado para clínica ${clinicaId} — Calendar: ${calendarId}`)

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${baseUrl}/dashboard?calendar_connected=true`)

    } catch (err) {
        console.error('[Google Calendar] Erro geral no callback:', err)
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        return NextResponse.redirect(`${baseUrl}/dashboard?calendar_error=internal`)
    }
}
