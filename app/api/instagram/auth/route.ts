// ============================================
// Instagram OAuth: Iniciar login
// ============================================
// Redireciona a cliente pro Facebook OAuth.
// Ela autoriza e volta pro /api/instagram/callback.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { META_APP_ID, META_GRAPH_VERSION, assinarState, metaConfigurada } from '@/lib/meta'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        if (!metaConfigurada()) {
            console.error('[IG Auth] META_APP_ID/META_APP_SECRET não configurados')
            return NextResponse.json({ error: 'Conexão com o Instagram indisponível no momento' }, { status: 503 })
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'
        const redirectUri = `${baseUrl}/api/instagram/callback`

        // Permissões, cada uma com o seu uso (é o que a revisão da Meta confere):
        // - instagram_basic: nome de usuário da conta conectada
        // - instagram_manage_messages: ler e responder as DMs
        // - instagram_manage_comments: responder comentários
        // - pages_show_list + business_management: achar a página ligada ao
        //   Instagram, inclusive quando ela está num portfólio empresarial
        //   (sem business_management a lista vinha vazia nesse caso)
        // - pages_read_engagement: token da página para mandar as respostas
        // - pages_manage_metadata: inscrever a página nos webhooks
        const scopes = [
            'instagram_basic',
            'instagram_manage_messages',
            'instagram_manage_comments',
            'pages_show_list',
            'business_management',
            'pages_read_engagement',
            'pages_manage_metadata',
        ].join(',')

        // state assinado: o callback só aceita o que saiu daqui, para esta clínica
        const state = assinarState({ clinicaId: Number(clinicaId) })

        const authUrl = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code&state=${encodeURIComponent(state)}`

        return NextResponse.json({ authUrl })
    } catch (err: any) {
        console.error('[IG Auth] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
