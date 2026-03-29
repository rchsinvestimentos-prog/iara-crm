// Debug Instagram — verificar configuração e logs
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: any = {}

    // 1. Verificar tabela config_instagram
    try {
        const configs = await prisma.$queryRawUnsafe<any[]>(`
            SELECT id, user_id, ig_account_id, ig_username, page_id, 
                   LEFT(meta_access_token, 20) as token_prefix,
                   LENGTH(meta_access_token) as token_length,
                   meta_token_expires, ativo, created_at, updated_at
            FROM config_instagram
            ORDER BY id
        `)
        results.config_instagram = configs
    } catch (e: any) {
        results.config_instagram_error = e.message.slice(0, 200)
    }

    // 2. Verificar instancias_clinica Instagram
    try {
        const instancias = await prisma.$queryRawUnsafe<any[]>(`
            SELECT id, user_id, canal, nome_instancia, status_conexao
            FROM instancias_clinica
            WHERE canal = 'instagram'
            ORDER BY id
        `)
        results.instancias_ig = instancias
    } catch (e: any) {
        results.instancias_ig_error = e.message.slice(0, 200)
    }

    // 3. Mensagens recentes do Instagram
    try {
        const msgs = await prisma.$queryRawUnsafe<any[]>(`
            SELECT id, user_id, ig_sender_id, tipo, direcao, LEFT(conteudo, 100) as conteudo, created_at 
            FROM mensagens_instagram 
            ORDER BY created_at DESC LIMIT 10
        `)
        results.mensagens_recentes = msgs
    } catch (e: any) {
        results.mensagens_error = e.message.slice(0, 200)
    }

    // 4. Testar se o webhook tá recebendo (últimos logs)
    try {
        const logs = await prisma.$queryRawUnsafe<any[]>(`
            SELECT id, LEFT(payload, 300) as payload, created_at 
            FROM webhook_debug_log 
            WHERE payload LIKE '%instagram%' OR payload LIKE '%IG%'
            ORDER BY created_at DESC LIMIT 5
        `)
        results.webhook_ig_logs = logs
    } catch (e: any) {
        results.webhook_logs_error = e.message.slice(0, 200)
    }

    // 5. Verificar ENV vars
    results.env_check = {
        META_APP_ID: process.env.META_APP_ID ? `✅ (${process.env.META_APP_ID})` : '❌ MISSING',
        META_APP_SECRET: process.env.META_APP_SECRET ? `✅ (${process.env.META_APP_SECRET?.slice(0,8)}...)` : '❌ MISSING',
        META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN || '❌ MISSING (using default)',
        BELIVV_IG_WEBHOOK_URL: process.env.BELIVV_IG_WEBHOOK_URL || '❌ MISSING',
    }

    return NextResponse.json(results, { 
        headers: { 'Content-Type': 'application/json' }
    })
}
