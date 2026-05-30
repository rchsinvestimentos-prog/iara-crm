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
        console.log(`[IG Callback] 🔄 Iniciando para clínica ${clinicaId}`)
        const tokenRes = await fetch(
            `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`
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
            `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
        )
        const longData = await longRes.json()
        const longToken = longData.access_token || tokenData.access_token
        const expiresIn = longData.expires_in || 5183944 // ~60 dias
        console.log(`[IG Callback] ✅ Got long-lived token, expires in ${expiresIn}s`)

        // ============================================
        // 3. Buscar Pages do usuário
        // ============================================
        const pagesRes = await fetch(
            `https://graph.facebook.com/v22.0/me/accounts?access_token=${longToken}&limit=100`
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
                `https://graph.facebook.com/v22.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || longToken}`
            )
            const igData = await igRes.json()

            console.log(`[IG Callback] 🔍 Page "${page.name}" (${page.id}) → IG: ${igData.instagram_business_account?.id || 'none'}`)

            if (igData.instagram_business_account?.id) {
                igAccountId = igData.instagram_business_account.id
                selectedPage = page

                // Buscar username do IG
                const usernameRes = await fetch(
                    `https://graph.facebook.com/v22.0/${igAccountId}?fields=username&access_token=${page.access_token || longToken}`
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
            console.log(`[IG Callback] ✅ config_instagram table + columns ensured`)
        } catch (e: any) {
            console.log(`[IG Callback] ⚠️ Table setup note:`, e.message)
        }

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

        console.log(`[IG Callback] 🎉 Conectado: @${igUsername} (${igAccountId}) → clínica ${clinicaId}`)

        return NextResponse.redirect(`${baseUrl}/instancias?ig_connected=true&ig_username=${igUsername}`)

    } catch (err: any) {
        console.error('[IG Callback] ❌ Erro:', err.message || err)
        return NextResponse.redirect(`${baseUrl}/instancias?ig_error=server_error&detail=${encodeURIComponent(err.message || 'unknown')}`)
    }
}
