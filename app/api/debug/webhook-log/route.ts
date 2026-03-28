// DEBUG: Log de webhooks recebidos
// Salva no banco TUDO que chega pra descobrir se a Evolution está entregando
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // Criar tabela se não existe
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS webhook_debug_log (
                id SERIAL PRIMARY KEY,
                payload TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)

        // Buscar últimos 20 logs
        const logs = await prisma.$queryRaw`
            SELECT id, 
                   LEFT(payload, 500) as payload_preview, 
                   created_at
            FROM webhook_debug_log
            ORDER BY id DESC
            LIMIT 20
        ` as any[]

        // Contar total
        const countResult = await prisma.$queryRaw`
            SELECT COUNT(*)::int as total FROM webhook_debug_log
        ` as any[]

        const total = countResult[0]?.total || 0

        // Serialize BigInt
        const safeLogs = logs.map((l: any) => ({
            id: Number(l.id),
            payload_preview: l.payload_preview,
            created_at: l.created_at?.toISOString?.() || String(l.created_at),
        }))

        return NextResponse.json({
            total,
            logs: safeLogs,
            message: safeLogs.length === 0 
                ? '⚠️ NENHUM webhook recebido desde a ativação do log. Possível problema na Evolution.'
                : `✅ ${safeLogs.length} webhooks recentes encontrados`
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
