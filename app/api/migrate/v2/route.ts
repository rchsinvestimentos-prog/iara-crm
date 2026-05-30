import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/migrate/v2 — Aplica as migrações da IARA v2
// EXECUTAR APENAS UMA VEZ
export async function POST() {
    const results: string[] = []

    try {
        // 1. Adicionar estilo_atendimento na tabela users (clinicas)
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS estilo_atendimento VARCHAR(20) DEFAULT 'direta'
            `)
            results.push('✅ estilo_atendimento adicionado na tabela users')
        } catch (e: any) {
            results.push(`⚠️ estilo_atendimento: ${e.message}`)
        }

        // 2. Adicionar valor_min e valor_max na tabela procedimentos
        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE procedimentos 
                ADD COLUMN IF NOT EXISTS valor_min DECIMAL,
                ADD COLUMN IF NOT EXISTS valor_max DECIMAL
            `)
            results.push('✅ valor_min e valor_max adicionados na tabela procedimentos')
        } catch (e: any) {
            results.push(`⚠️ valor_min/valor_max: ${e.message}`)
        }

        // 3. Verificar tabela promocoes (já deve existir)
        try {
            const check = await prisma.$queryRawUnsafe<any[]>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'promocoes'
                ) as exists
            `)
            if (check[0]?.exists) {
                results.push('✅ tabela promocoes já existe')
            } else {
                // Criar se não existir
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS promocoes (
                        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                        clinica_id TEXT NOT NULL,
                        profissional_id TEXT,
                        nome TEXT NOT NULL,
                        descricao TEXT,
                        instrucao_iara TEXT,
                        tipo_desconto VARCHAR(20) DEFAULT 'percentual',
                        valor_desconto FLOAT DEFAULT 0,
                        data_inicio DATE NOT NULL,
                        data_fim DATE NOT NULL,
                        ativo BOOLEAN DEFAULT true,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                `)
                await prisma.$executeRawUnsafe(`
                    CREATE INDEX IF NOT EXISTS idx_promocoes_clinica ON promocoes(clinica_id)
                `)
                await prisma.$executeRawUnsafe(`
                    CREATE INDEX IF NOT EXISTS idx_promocoes_datas ON promocoes(data_inicio, data_fim)
                `)
                results.push('✅ tabela promocoes criada')
            }
        } catch (e: any) {
            results.push(`⚠️ promocoes: ${e.message}`)
        }

        // 4. Verificar tabela promocao_procedimentos
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS promocao_procedimentos (
                    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    promocao_id TEXT NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE,
                    procedimento_id TEXT NOT NULL,
                    preco_promocional DECIMAL,
                    UNIQUE(promocao_id, procedimento_id)
                )
            `)
            results.push('✅ tabela promocao_procedimentos OK')
        } catch (e: any) {
            results.push(`⚠️ promocao_procedimentos: ${e.message}`)
        }

        // 5. Verificar tabela combos
        try {
            const check = await prisma.$queryRawUnsafe<any[]>(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'combos'
                ) as exists
            `)
            results.push(check[0]?.exists ? '✅ tabela combos já existe' : '⚠️ combos não existe (será criada no setup)')
        } catch (e: any) {
            results.push(`⚠️ combos check: ${e.message}`)
        }

        // 6. Garantir que todas as clínicas tenham estilo padrão
        try {
            const updated = await prisma.$executeRawUnsafe(`
                UPDATE users 
                SET estilo_atendimento = 'direta' 
                WHERE estilo_atendimento IS NULL
            `)
            results.push(`✅ ${updated} clínicas atualizadas com estilo padrão 'direta'`)
        } catch (e: any) {
            results.push(`⚠️ update estilo: ${e.message}`)
        }

        return NextResponse.json({
            ok: true,
            message: 'Migração IARA v2 concluída',
            results,
        })
    } catch (error: any) {
        return NextResponse.json({
            ok: false,
            error: error.message,
            results,
        }, { status: 500 })
    }
}
