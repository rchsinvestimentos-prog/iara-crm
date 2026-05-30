// Teste temporário de envio de mensagem IG
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: any = {}

    try {
        const configs = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM config_instagram WHERE ativo = true LIMIT 1')
        if (configs.length === 0) return NextResponse.json({ error: 'Sem config' })
        
        const config = configs[0]
        const token = config.meta_access_token
        const igAccountId = config.ig_account_id
        const pageId = config.page_id
        
        results.token_length = token?.length || 0
        results.token_preview = token ? `${token.slice(0,15)}...${token.slice(-10)}` : 'VAZIO'
        results.ig_account_id = igAccountId
        results.page_id = pageId

        // 1. Debug token info
        try {
            const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`)
            const debugData = await debugRes.json()
            results.token_debug = debugData
        } catch (e: any) {
            results.token_debug_error = e.message
        }

        // 2. Test graph.instagram.com/me
        try {
            const meRes = await fetch(`https://graph.instagram.com/v22.0/me?fields=id,username&access_token=${token}`)
            const meData = await meRes.json()
            results.ig_me = meData
        } catch (e: any) {
            results.ig_me_error = e.message
        }

        // 3. Test graph.facebook.com/{ig_account_id}
        try {
            const fbRes = await fetch(`https://graph.facebook.com/v22.0/${igAccountId}?fields=id,username&access_token=${token}`)
            const fbData = await fbRes.json()
            results.fb_ig_account = fbData
        } catch (e: any) {
            results.fb_ig_account_error = e.message
        }

        // 4. Test permissions
        try {
            const permRes = await fetch(`https://graph.facebook.com/v22.0/me/permissions?access_token=${token}`)
            const permData = await permRes.json()
            results.permissions = permData
        } catch (e: any) {
            results.permissions_error = e.message
        }

        // 5. Check page access
        try {
            const pageRes = await fetch(`https://graph.facebook.com/v22.0/${pageId}?fields=id,name,access_token&access_token=${token}`)
            const pageData = await pageRes.json()
            results.page_info = pageData
        } catch (e: any) {
            results.page_info_error = e.message
        }

    } catch (e: any) {
        results.error = e.message
    }

    return NextResponse.json(results)
}
