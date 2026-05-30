// ============================================
// DEBUG PIPELINE — Diagnóstico completo
// ============================================
// GET /api/debug/pipeline — Mostra estado de todas as clínicas
// TEMPORÁRIO — remover após estabilizar

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // 1. Buscar todas as clínicas
        const clinicas = await prisma.$queryRaw`
            SELECT id, nome_clinica, status, creditos_disponiveis, 
                   evolution_instance, whatsapp_doutora, idioma,
                   configuracoes::text as config_raw,
                   horario_semana, horario_sabado, horario_domingo,
                   atende_sabado, atende_domingo
            FROM users 
            WHERE evolution_instance IS NOT NULL AND evolution_instance != ''
            ORDER BY id
        ` as any[]

        // 2. Verificar instâncias
        const instancias = await prisma.$queryRaw`
            SELECT id, user_id, canal, evolution_instance, status_conexao, ativo
            FROM instancias_clinica
            WHERE ativo = true
            ORDER BY id
        ` as any[]

        // 3. Pausas ativas
        let pausas: any[] = []
        try {
            pausas = await prisma.$queryRaw`
                SELECT * FROM pausa_conversa 
                WHERE expira_em > NOW()
                ORDER BY expira_em DESC
                LIMIT 20
            ` as any[]
        } catch { /* tabela pode não existir */ }

        // 4. Últimos logs de webhook
        let webhookLogs: any[] = []
        try {
            webhookLogs = await prisma.$queryRaw`
                SELECT id, payload, created_at 
                FROM webhook_debug_log 
                ORDER BY id DESC 
                LIMIT 20
            ` as any[]
        } catch { /* tabela pode não existir */ }

        // 5. Horário atual e timezone
        const now = new Date()
        const brTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
        const dayOfWeek = brTime.getDay() // 0=dom, 6=sab

        return NextResponse.json({
            timestamp: now.toISOString(),
            brasiliaTime: brTime.toISOString(),
            dayOfWeek,
            dayName: ['dom','seg','ter','qua','qui','sex','sab'][dayOfWeek],
            clinicas: clinicas.map(c => ({
                id: c.id,
                nome: c.nome_clinica,
                status: c.status,
                creditos: c.creditos_disponiveis,
                evolution_instance: c.evolution_instance,
                whatsapp_doutora: c.whatsapp_doutora,
                horario_semana: c.horario_semana || 'não configurado',
                horario_sabado: c.horario_sabado || null,
                horario_domingo: c.horario_domingo || null,
                atende_sabado: c.atende_sabado,
                atende_domingo: c.atende_domingo,
                config_pausa_iara: (() => {
                    try { return JSON.parse(c.config_raw || '{}').pausa_iara } catch { return null }
                })(),
            })),
            instancias,
            pausas_ativas: pausas.length,
            pausas: pausas.map(p => ({
                ...p,
                id: typeof p.id === 'bigint' ? Number(p.id) : p.id,
            })),
            webhook_logs_recentes: webhookLogs.length,
            webhook_logs: webhookLogs.map(l => ({
                id: typeof l.id === 'bigint' ? Number(l.id) : l.id,
                payload: l.payload,
                created_at: l.created_at,
            })),
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message, stack: err.stack?.slice(0, 500) }, { status: 500 })
    }
}
