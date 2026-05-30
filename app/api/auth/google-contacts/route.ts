import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'

/**
 * GET /api/auth/google-contacts
 * 
 * Inicia o fluxo OAuth2 para importar contatos do Google.
 * Redireciona para a tela de consentimento.
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_CONTACTS_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google-contacts/callback`

    if (!clientId) {
        return NextResponse.json({
            error: 'GOOGLE_CLIENT_ID não configurado. Peça ao administrador para configurar as credenciais do Google Cloud.'
        }, { status: 500 })
    }

    // Scope para leitura de contatos (People API)
    const scopes = [
        'https://www.googleapis.com/auth/contacts.readonly',
    ].join(' ')

    const state = Buffer.from(JSON.stringify({ clinicaId })).toString('base64')

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
