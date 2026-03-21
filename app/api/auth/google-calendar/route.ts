import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'

/**
 * GET /api/auth/google-calendar
 * 
 * Inicia o fluxo OAuth2 do Google Calendar.
 * Redireciona o usuário para a tela de consentimento do Google.
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`

    if (!clientId) {
        return NextResponse.json({
            error: 'GOOGLE_CLIENT_ID não configurado no servidor. Peça ao administrador para configurar as credenciais do Google Cloud.'
        }, { status: 500 })
    }

    // Scopes necessários para ler e criar eventos no Google Calendar
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ].join(' ')

    // State contém clinicaId e opcionalmente profissionalId
    const profissionalId = new URL(req.url).searchParams.get('profissionalId') || undefined
    const state = Buffer.from(JSON.stringify({ clinicaId, profissionalId })).toString('base64')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl.toString())
}
