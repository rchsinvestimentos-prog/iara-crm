// ============================================
// Instagram OAuth: Iniciar login
// ============================================
// Redireciona a cliente pro Facebook OAuth.
// Ela autoriza e volta pro /api/instagram/callback.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'

const META_APP_ID = process.env.META_APP_ID || ''

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'
        const redirectUri = `${baseUrl}/api/instagram/callback`

        // Permissões necessárias
        const scopes = [
            'instagram_basic',
            'instagram_manage_messages',
            'instagram_manage_comments',
            'pages_manage_metadata',
            'pages_show_list',
            'pages_read_engagement',
        ].join(',')

        // State = clinicaId (pra saber quem autorizou no callback)
        const state = Buffer.from(JSON.stringify({ clinicaId })).toString('base64')

        const authUrl = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${state}`

        return NextResponse.json({ authUrl })
    } catch (err: any) {
        console.error('[IG Auth] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
