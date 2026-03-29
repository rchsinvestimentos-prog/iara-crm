// ============================================
// SETUP DB v2 — Recriar tabela agendamentos_v2 com schema correto
// ============================================
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: string[] = []

    // 1. DROP e recriar agendamentos_v2 com schema CORRETO do Prisma
    try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS agendamentos_v2 CASCADE`)
        results.push('✅ Tabela antiga agendamentos_v2 removida')
    } catch (e: any) {
        results.push(`⚠️ Drop: ${e.message}`)
    }

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE agendamentos_v2 (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                clinica_id INT NOT NULL,
                profissional_id TEXT NOT NULL,
                nome_paciente VARCHAR(200) NOT NULL,
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
        results.push('✅ agendamentos_v2 criada com schema correto')
    } catch (e: any) {
        results.push(`❌ agendamentos_v2: ${e.message}`)
    }

    // 2. Indexes
    try {
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_clinica ON agendamentos_v2(clinica_id)`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_prof ON agendamentos_v2(profissional_id)`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_data ON agendamentos_v2(data)`)
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_agendamentos_v2_status ON agendamentos_v2(status)`)
        results.push('✅ Indexes criados')
    } catch (e: any) {
        results.push(`❌ Indexes: ${e.message}`)
    }

    // 3. Verificar outras tabelas necessárias
    const tablesCheck = [
        'webhook_debug_log',
        'status_conversa',
        'historico_conversa',
        'contatos_clinica',
        'procedimentos',
        'profissionais',
        'instancias_clinica',
        'respostas_automaticas',
        'feedbacks_dra',
        'cache_respostas',
    ]

    for (const table of tablesCheck) {
        try {
            const result = await prisma.$queryRawUnsafe<any[]>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                ) as exists
            `, table)
            const exists = result[0]?.exists
            results.push(`${exists ? '✅' : '❌ FALTANDO'} ${table}`)
        } catch (e: any) {
            results.push(`⚠️ ${table}: ${e.message}`)
        }
    }

    return NextResponse.json({ results })
}
