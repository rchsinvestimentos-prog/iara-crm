// ============================================
// SETUP DB — Criar tabelas faltantes
// ============================================
// GET /api/debug/setup-db — Cria tabelas que faltam no banco
// TEMPORÁRIO — remover após rodar

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: string[] = []

    // 1. agendamentos_v2
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS agendamentos_v2 (
                id SERIAL PRIMARY KEY,
                clinica_id INT NOT NULL REFERENCES users(id),
                profissional_id INT NOT NULL,
                nome_cliente VARCHAR(255) NOT NULL,
                telefone VARCHAR(30) NOT NULL,
                contato_id INT,
                procedimento VARCHAR(255) NOT NULL,
                data TIMESTAMP NOT NULL,
                horario VARCHAR(10) NOT NULL,
                duracao INT DEFAULT 30,
                valor DECIMAL,
                status VARCHAR(20) DEFAULT 'pendente',
                observacao TEXT,
                origem VARCHAR(20) DEFAULT 'painel',
                google_event_id VARCHAR(200),
                pix_pago BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `)
        results.push('✅ agendamentos_v2 criada/existente')
    } catch (e: any) {
        results.push(`❌ agendamentos_v2: ${e.message}`)
    }

    // 2. webhook_debug_log
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS webhook_debug_log (
                id SERIAL PRIMARY KEY,
                payload TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)
        results.push('✅ webhook_debug_log criada/existente')
    } catch (e: any) {
        results.push(`❌ webhook_debug_log: ${e.message}`)
    }

    // 3. pausa_conversa (se usada)
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS pausa_conversa (
                id SERIAL PRIMARY KEY,
                user_id INT,
                telefone VARCHAR(30),
                expira_em TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `)
        results.push('✅ pausa_conversa criada/existente')
    } catch (e: any) {
        results.push(`❌ pausa_conversa: ${e.message}`)
    }

    // 4. Indexes para agendamentos_v2
    try {
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_clinica ON agendamentos_v2(clinica_id)`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_prof ON agendamentos_v2(profissional_id)`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_data ON agendamentos_v2(data)`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_status ON agendamentos_v2(status)`)
        results.push('✅ Indexes criados')
    } catch (e: any) {
        results.push(`❌ Indexes: ${e.message}`)
    }

    return NextResponse.json({ results })
}
