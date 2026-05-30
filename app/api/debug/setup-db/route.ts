// ============================================
// SETUP DB v3 — Criar TODAS as tabelas que o pipeline precisa
// ============================================
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: string[] = []

    // Helper
    const exec = async (label: string, sql: string) => {
        try {
            await prisma.$executeRawUnsafe(sql)
            results.push(`✅ ${label}`)
        } catch (e: any) {
            results.push(`❌ ${label}: ${e.message.slice(0, 100)}`)
        }
    }

    // === TABELAS QUE O PIPELINE USA ===

    await exec('historico_conversas', `
        CREATE TABLE IF NOT EXISTS historico_conversas (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            telefone_cliente VARCHAR(30) NOT NULL,
            role VARCHAR(20) NOT NULL,
            content TEXT,
            push_name VARCHAR(200),
            origem VARCHAR(20) DEFAULT 'whatsapp',
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)
    await exec('idx_historico', `CREATE INDEX IF NOT EXISTS idx_hist_conv_user_tel ON historico_conversas(user_id, telefone_cliente)`)

    await exec('feedback_iara', `
        CREATE TABLE IF NOT EXISTS feedback_iara (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            regra TEXT NOT NULL,
            origem VARCHAR(20) DEFAULT 'whatsapp',
            ativo BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)

    await exec('memoria_clientes', `
        CREATE TABLE IF NOT EXISTS memoria_clientes (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            telefone VARCHAR(30) NOT NULL,
            chave VARCHAR(100) NOT NULL,
            valor TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, telefone, chave)
        )
    `)

    await exec('fila_recontato', `
        CREATE TABLE IF NOT EXISTS fila_recontato (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            telefone VARCHAR(30) NOT NULL,
            instancia VARCHAR(200),
            mensagem TEXT,
            agendar_para TIMESTAMP NOT NULL,
            enviado BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)

    await exec('logs', `
        CREATE TABLE IF NOT EXISTS logs (
            id SERIAL PRIMARY KEY,
            user_id INT,
            tipo VARCHAR(50),
            mensagem TEXT,
            dados JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)

    await exec('status_conversa (check)', `
        CREATE TABLE IF NOT EXISTS status_conversa (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            telefone_cliente VARCHAR(30) NOT NULL,
            pausa_ate TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)

    await exec('cache_respostas (check)', `
        CREATE TABLE IF NOT EXISTS cache_respostas (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            pergunta_hash VARCHAR(64) NOT NULL,
            pergunta TEXT,
            resposta TEXT NOT NULL,
            modelo VARCHAR(50),
            hits INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    `)

    await exec('webhook_debug_log (check)', `
        CREATE TABLE IF NOT EXISTS webhook_debug_log (
            id SERIAL PRIMARY KEY,
            payload TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `)

    // === VERIFICAÇÃO FINAL ===
    const tablesNeeded = [
        'users', 'instancias_clinica', 'procedimentos', 'profissionais',
        'agendamentos_v2', 'historico_conversas', 'status_conversa',
        'cache_respostas', 'feedback_iara', 'memoria_clientes',
        'fila_recontato', 'logs', 'webhook_debug_log'
    ]

    results.push('', '=== VERIFICAÇÃO FINAL ===')
    for (const table of tablesNeeded) {
        try {
            const r = await prisma.$queryRawUnsafe<any[]>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                ) as exists
            `, table)
            results.push(`${r[0]?.exists ? '✅' : '❌ FALTANDO'} ${table}`)
        } catch (e: any) {
            results.push(`⚠️ ${table}: ${e.message.slice(0, 60)}`)
        }
    }

    return NextResponse.json({ results })
}
