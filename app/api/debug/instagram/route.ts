// Debug Instagram — verificar configuração
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// BigInt JSON fix
function safeJson(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (_, v) => typeof v === 'bigint' ? Number(v) : v))
}

export async function GET() {
    const results: any = {}

    try {
        const configs = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM config_instagram LIMIT 5`)
        results.config_instagram = safeJson(configs).map((c: any) => ({
            ...c,
            meta_access_token: c.meta_access_token ? c.meta_access_token.slice(0, 20) + '...' : null
        }))
    } catch (e: any) {
        results.config_instagram_error = e.message.slice(0, 300)
    }

    try {
        const inst = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM instancias_clinica WHERE canal = 'instagram' LIMIT 5`)
        results.instancias_ig = safeJson(inst)
    } catch (e: any) {
        results.instancias_ig_error = e.message.slice(0, 200)
    }

    try {
        const msgs = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM mensagens_instagram ORDER BY created_at DESC LIMIT 5`)
        results.mensagens = safeJson(msgs)
    } catch (e: any) {
        results.mensagens_error = e.message.slice(0, 200)
    }

    results.env = {
        META_APP_ID: process.env.META_APP_ID ? '✅' : '❌',
        META_APP_SECRET: process.env.META_APP_SECRET ? '✅' : '❌',
        META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN || 'default: iara_instagram_2026',
        BELIVV_IG_WEBHOOK_URL: process.env.BELIVV_IG_WEBHOOK_URL ? '✅' : '❌',
    }

    return NextResponse.json(results)
}
