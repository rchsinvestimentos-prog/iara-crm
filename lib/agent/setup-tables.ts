// ============================================
// AGENT — Setup de Tabelas
// ============================================
// Cria as tabelas do Agent Dra se não existirem.
// Mesmo padrão do memory.ts — CREATE TABLE IF NOT EXISTS.

import { prisma } from '@/lib/prisma'

export async function ensureAgentTables(): Promise<void> {
    try {
        // 1. Memória de conversa Dra ↔ IARA
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS conversa_dra (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                clinica_id INTEGER NOT NULL REFERENCES users(id),
                role VARCHAR(20) NOT NULL,
                content TEXT NOT NULL,
                canal VARCHAR(20) DEFAULT 'painel',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `)
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_conversa_dra_clinica
            ON conversa_dra(clinica_id, created_at DESC)
        `)

        // 2. Configuração de automações por clínica
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS automacao_config (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                clinica_id INTEGER NOT NULL REFERENCES users(id),
                tipo VARCHAR(50) NOT NULL,
                ativo BOOLEAN DEFAULT true,
                nivel_autonomia VARCHAR(20) DEFAULT 'inteligente',
                config JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(clinica_id, tipo)
            )
        `)

        // 3. Log de execuções de automações
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS automacao_log (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                clinica_id INTEGER NOT NULL REFERENCES users(id),
                contato_id INTEGER,
                tipo VARCHAR(50) NOT NULL,
                acao TEXT NOT NULL,
                resultado VARCHAR(20) DEFAULT 'sucesso',
                detalhes JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `)
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_automacao_log_clinica
            ON automacao_log(clinica_id, created_at DESC)
        `)

        console.log('[Agent] ✅ Tabelas do Agent criadas/verificadas')
    } catch (err) {
        console.error('[Agent] ❌ Erro ao criar tabelas:', err)
    }
}
