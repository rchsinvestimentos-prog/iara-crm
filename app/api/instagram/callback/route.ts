// ============================================
// Instagram OAuth: Callback
// ============================================
// Facebook redireciona pra cá com o code.
// Trocamos por token longo, buscamos a conta IG, e salvamos.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const META_APP_ID = process.env.META_APP_ID || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    const baseUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'

    // Se a cliente cancelou
    if (error) {
        return NextResponse.redirect(`${baseUrl}/instagram?error=cancelled`)
    }

    if (!code || !state) {
        return NextResponse.redirect(`${baseUrl}/instagram?error=missing_params`)
    }

    let clinicaId: number
    try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
        clinicaId = decoded.clinicaId
    } catch {
        return NextResponse.redirect(`${baseUrl}/instagram?error=invalid_state`)
    }

    try {
        const redirectUri = `${baseUrl}/api/instagram/callback`

        // ============================================
        // 1. Trocar code → short-lived token
        // ============================================
        const tokenRes = await fetch(
            `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
        )
        const tokenData = await tokenRes.json()

        if (!tokenData.access_token) {
            console.error('[IG Callback] Token error:', tokenData)
            return NextResponse.redirect(`${baseUrl}/instagram?error=token_failed`)
        }

        // ============================================
        // 2. Trocar short-lived → long-lived token (60 dias)
        // ============================================
        const longRes = await fetch(
            `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
        )
        const longData = await longRes.json()
        const longToken = longData.access_token || tokenData.access_token
        const expiresIn = longData.expires_in || 5183944 // ~60 dias

        // ============================================
        // 3. Buscar Pages do usuário
        // ============================================
        const pagesRes = await fetch(
            `https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}`
        )
        const pagesData = await pagesRes.json()
        const pages = pagesData.data || []

        if (pages.length === 0) {
            return NextResponse.redirect(`${baseUrl}/instagram?error=no_pages`)
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
                `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || longToken}`
            )
            const igData = await igRes.json()

            if (igData.instagram_business_account?.id) {
                igAccountId = igData.instagram_business_account.id
                selectedPage = page

                // Buscar username do IG
                const usernameRes = await fetch(
                    `https://graph.facebook.com/v22.0/${igAccountId}?fields=username&access_token=${page.access_token || longToken}`
                )
                const usernameData = await usernameRes.json()
                igUsername = usernameData.username || ''
                break
            }
        }

        if (!igAccountId) {
            return NextResponse.redirect(`${baseUrl}/instagram?error=no_ig_account`)
        }

        // Usar o Page Access Token (mais estável que o user token)
        const pageToken = selectedPage.access_token || longToken

        // ============================================
        // 5. Salvar no banco
        // ============================================
        const expiresAt = new Date(Date.now() + expiresIn * 1000)

        await prisma.$executeRawUnsafe(`
            INSERT INTO config_instagram (user_id, ig_account_id, ig_username, page_id, meta_access_token, meta_token_expires, ativo)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT (user_id) DO UPDATE SET
                ig_account_id = $2,
                ig_username = $3,
                page_id = $4,
                meta_access_token = $5,
                meta_token_expires = $6,
                ativo = true,
                updated_at = NOW()
        `, clinicaId, igAccountId, igUsername, selectedPage.id, pageToken, expiresAt)

        // ============================================
        // 6. Subscribir webhook pra essa page
        // ============================================
        try {
            await fetch(
                `https://graph.facebook.com/v22.0/${selectedPage.id}/subscribed_apps`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subscribed_fields: ['messages', 'messaging_postbacks', 'feed'],
                        access_token: pageToken,
                    }),
                }
            )
            console.log(`[IG Callback] ✅ Webhook subscribed for page ${selectedPage.id}`)
        } catch (err) {
            console.error('[IG Callback] Erro subscribing webhook:', err)
        }

        console.log(`[IG Callback] ✅ Conectado: @${igUsername} (${igAccountId}) → clínica ${clinicaId}`)

        return NextResponse.redirect(`${baseUrl}/instagram?connected=true&username=${igUsername}`)

    } catch (err: any) {
        console.error('[IG Callback] Erro:', err)
        return NextResponse.redirect(`${baseUrl}/instagram?error=server_error`)
    }
}
