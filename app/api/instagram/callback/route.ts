// ============================================
// Instagram OAuth: Callback
// ============================================
// Facebook redireciona pra cá com o code.
// Trocamos por token longo, buscamos a conta IG, e salvamos.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions, getClinicaId } from '@/lib/auth'
import { META_APP_ID, META_GRAPH_URL, lerState } from '@/lib/meta'

const META_APP_SECRET = process.env.META_APP_SECRET || ''

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const baseUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'

    // Se a cliente cancelou (a tela /instagram não existe: o retorno é na tela WhatsApp/Conexões)
    if (error) {
        return NextResponse.redirect(`${baseUrl}/instancias?ig_error=cancelled`)
    }

    if (!code || !state) {
        return NextResponse.redirect(`${baseUrl}/instancias?ig_error=missing_params`)
    }

    // O state precisa ter saído de /api/instagram/auth (assinado) E ser da
    // clínica que está logada neste navegador. Antes era só o número da
    // clínica em base64: dava para mandar a uma doutora um link com o número
    // de outra clínica, e o Instagram dela ficava conectado na conta alheia.
    const dadosState = lerState(state)
    if (!dadosState) {
        console.warn('[IG Callback] ❌ state inválido ou vencido')
        return NextResponse.redirect(`${baseUrl}/instancias?ig_error=invalid_state`)
    }
    const clinicaLogada = await getClinicaId(await getServerSession(authOptions))
    if (!clinicaLogada || Number(clinicaLogada) !== dadosState.clinicaId) {
        console.warn(`[IG Callback] ❌ state da clínica ${dadosState.clinicaId}, mas quem está logada é ${clinicaLogada ?? 'ninguém'}`)
        return NextResponse.redirect(`${baseUrl}/instancias?ig_error=invalid_state`)
    }
    const clinicaId = dadosState.clinicaId

    try {
        const redirectUri = `${baseUrl}/api/instagram/callback`

        // ============================================
        // 1. Trocar code → short-lived token
        // ============================================
        console.log(`[IG Callback] 🔄 Iniciando para clínica ${clinicaId}`)
        const tokenRes = await fetch(
            `${META_GRAPH_URL}/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
        )
        const tokenData = await tokenRes.json()

        if (!tokenData.access_token) {
            console.error('[IG Callback] ❌ Token error:', JSON.stringify(tokenData))
            return NextResponse.redirect(`${baseUrl}/instancias?ig_error=token_failed&detail=${encodeURIComponent(tokenData.error?.message || 'unknown')}`)
        }
        console.log(`[IG Callback] ✅ Got short-lived token`)

        // ============================================
        // 2. Trocar short-lived → long-lived token (60 dias)
        // ============================================
        const longRes = await fetch(
            `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
        )
        const longData = await longRes.json()
        const longToken = longData.access_token || tokenData.access_token
        const expiresIn = longData.expires_in || 5183944 // ~60 dias
        console.log(`[IG Callback] ✅ Got long-lived token, expires in ${expiresIn}s`)

        // Id do usuário do Facebook neste app: é o que a Meta manda quando ele
        // remove o app ou pede para apagar os dados (/api/webhook/meta/...).
        let metaUserId: string | null = null
        try {
            const meRes = await fetch(`${META_GRAPH_URL}/me?fields=id&access_token=${longToken}`)
            const me = await meRes.json()
            metaUserId = me?.id ? String(me.id) : null
            if (!metaUserId) console.warn('[IG Callback] ⚠️ Não veio o id do usuário do Facebook:', JSON.stringify(me?.error || me).slice(0, 200))
        } catch (e) {
            console.warn('[IG Callback] ⚠️ Falha ao buscar o id do usuário do Facebook:', e)
        }

        // ============================================
        // 3. Buscar Pages do usuário
        // ============================================
        const pagesRes = await fetch(
            `${META_GRAPH_URL}/me/accounts?access_token=${longToken}&limit=100`
        )
        const pagesData = await pagesRes.json()
        const pages = pagesData.data || []

        console.log(`[IG Callback] 📄 Found ${pages.length} pages: ${pages.map((p: any) => p.name).join(', ')}`)

        if (pages.length === 0) {
            return NextResponse.redirect(`${baseUrl}/instancias?ig_error=no_pages`)
        }

        // Pegar a primeira page (ou a que tiver IG vinculado)
        let selectedPage = pages[0]
        let igAccountId = ''
        let igUsername = ''

        // ============================================
        // 4. Buscar conta IG Business vinculada à Page
        // ============================================
        for (const page of pages) {
            const igRes = await fetch(
                `${META_GRAPH_URL}/${page.id}?fields=instagram_business_account&access_token=${page.access_token || longToken}`
            )
            const igData = await igRes.json()

            console.log(`[IG Callback] 🔍 Page "${page.name}" (${page.id}) → IG: ${igData.instagram_business_account?.id || 'none'}`)

            if (igData.instagram_business_account?.id) {
                igAccountId = igData.instagram_business_account.id
                selectedPage = page

                // Buscar username do IG
                const usernameRes = await fetch(
                    `${META_GRAPH_URL}/${igAccountId}?fields=username&access_token=${page.access_token || longToken}`
                )
                const usernameData = await usernameRes.json()
                igUsername = usernameData.username || ''
                console.log(`[IG Callback] ✅ Found IG: @${igUsername} (${igAccountId}) on page "${page.name}"`)
                break
            }
        }

        if (!igAccountId) {
            console.error(`[IG Callback] ❌ No IG Business account found on any of ${pages.length} pages`)
            return NextResponse.redirect(`${baseUrl}/instancias?ig_error=no_ig_account&pages=${pages.length}`)
        }

        // Usar o Page Access Token (mais estável que o user token)
        const pageToken = selectedPage.access_token || longToken

        // ============================================
        // 5. Criar tabela config_instagram se não existir + salvar
        // ============================================
        const expiresAt = new Date(Date.now() + expiresIn * 1000)

        try {
            // Garantir que a tabela existe com todas as colunas necessárias
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS config_instagram (
                    id SERIAL PRIMARY KEY,
                    user_id INT NOT NULL UNIQUE
                )
            `)
            // Adicionar colunas que podem estar faltando
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS ig_account_id VARCHAR(100)`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS ig_username VARCHAR(100)`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS page_id VARCHAR(100)`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS meta_access_token TEXT`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS meta_token_expires TIMESTAMPTZ`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`)
            await prisma.$executeRawUnsafe(`ALTER TABLE config_instagram ADD COLUMN IF NOT EXISTS meta_user_id VARCHAR(100)`)
            console.log(`[IG Callback] ✅ config_instagram table + columns ensured`)
        } catch (e: any) {
            console.log(`[IG Callback] ⚠️ Table setup note:`, e.message)
        }

        await prisma.$executeRawUnsafe(`
            INSERT INTO config_instagram (user_id, ig_account_id, ig_username, page_id, meta_access_token, meta_token_expires, meta_user_id, ativo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true)
            ON CONFLICT (user_id) DO UPDATE SET
                ig_account_id = $2,
                ig_username = $3,
                page_id = $4,
                meta_access_token = $5,
                meta_token_expires = $6,
                meta_user_id = $7,
                ativo = true,
                updated_at = NOW()
        `, clinicaId, igAccountId, igUsername, selectedPage.id, pageToken, expiresAt, metaUserId)

        console.log(`[IG Callback] ✅ Saved to config_instagram for clínica ${clinicaId}`)

        // ============================================
        // 6. Atualizar instancias_clinica (usa colunas existentes)
        // ============================================
        try {
            await prisma.$executeRawUnsafe(`
                UPDATE instancias_clinica SET 
                    status_conexao = 'conectado',
                    nome_instancia = $1
                WHERE user_id = $2 AND canal = 'instagram'
            `, igUsername ? `@${igUsername}` : 'Instagram', clinicaId)
            console.log(`[IG Callback] ✅ Updated instancias_clinica`)
        } catch (e) {
            console.log(`[IG Callback] ⚠️ instancias_clinica update skipped:`, e)
        }

        // ============================================
        // 7. Subscribir webhook pra essa page
        // ============================================
        // Sem esta inscrição as DMs não chegam: a conexão parecia pronta e a
        // IARA nunca respondia. Falhou → a clínica fica sabendo na tela.
        let webhookOk = false
        let webhookErro = ''
        try {
            const subRes = await fetch(
                `${META_GRAPH_URL}/${selectedPage.id}/subscribed_apps`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscribed_fields: ['messages', 'messaging_postbacks', 'feed'],
                        access_token: pageToken,
                    }),
                }
            )
            const subData = await subRes.json().catch(() => ({}))
            webhookOk = subRes.ok && subData?.success === true
            if (!webhookOk) webhookErro = subData?.error?.message || `HTTP ${subRes.status}`
        } catch (err: any) {
            webhookErro = err?.message || String(err)
        }
        if (!webhookOk) {
            console.error(`[IG Callback] ❌ Não consegui inscrever a página ${selectedPage.id} nos webhooks: ${webhookErro}`)
            // Sem a inscrição nenhuma DM chega: a conexão não pode ficar como ativa
            try {
                await prisma.$executeRawUnsafe(`UPDATE config_instagram SET ativo = false, updated_at = NOW() WHERE user_id = $1`, clinicaId)
                await prisma.$executeRawUnsafe(`UPDATE instancias_clinica SET status_conexao = 'desconectado' WHERE user_id = $1 AND canal = 'instagram'`, clinicaId)
            } catch (e) {
                console.error('[IG Callback] ❌ Também não consegui marcar a conexão como inativa:', e)
            }
            return NextResponse.redirect(`${baseUrl}/instancias?ig_error=webhook_failed&detail=${encodeURIComponent(webhookErro)}`)
        }
        console.log(`[IG Callback] ✅ Webhook subscribed for page ${selectedPage.id}`)

        console.log(`[IG Callback] 🎉 Conectado: @${igUsername} (${igAccountId}) → clínica ${clinicaId}`)

        return NextResponse.redirect(`${baseUrl}/instancias?ig_connected=true&ig_username=${encodeURIComponent(igUsername)}`)

    } catch (err: any) {
        console.error('[IG Callback] ❌ Erro:', err.message || err)
        // Erro interno (banco, rede) fica no log; a tela mostra só a mensagem genérica
        return NextResponse.redirect(`${baseUrl}/instancias?ig_error=server_error`)
    }
}
