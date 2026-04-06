// Script de migração IARA v2
// Executa: npx tsx scripts/migrate-v2.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Iniciando migração IARA v2...\n')

    // 1. estilo_atendimento
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS estilo_atendimento VARCHAR(20) DEFAULT 'direta'
        `)
        console.log('✅ estilo_atendimento adicionado')
    } catch (e: any) {
        console.log(`⚠️  estilo_atendimento: ${e.message}`)
    }

    // 2. valor_min / valor_max nos procedimentos
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE procedimentos 
            ADD COLUMN IF NOT EXISTS valor_min DECIMAL,
            ADD COLUMN IF NOT EXISTS valor_max DECIMAL
        `)
        console.log('✅ valor_min e valor_max adicionados nos procedimentos')
    } catch (e: any) {
        console.log(`⚠️  valor_min/max: ${e.message}`)
    }

    // 3. Garantir estilo padrão em clínicas existentes
    try {
        const result = await prisma.$executeRawUnsafe(`
            UPDATE users 
            SET estilo_atendimento = 'direta' 
            WHERE estilo_atendimento IS NULL
        `)
        console.log(`✅ ${result} clínicas atualizadas com estilo 'direta'`)
    } catch (e: any) {
        console.log(`⚠️  update estilo: ${e.message}`)
    }

    // 4. Verificar tabelas de promoções
    try {
        const check = await prisma.$queryRawUnsafe<any[]>(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('promocoes', 'promocao_procedimentos', 'combos', 'combo_procedimentos')
            ORDER BY table_name
        `)
        const existing = check.map((r: any) => r.table_name)
        console.log(`✅ Tabelas existentes: ${existing.join(', ') || 'nenhuma'}`)

        if (!existing.includes('promocoes')) {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE promocoes (
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
            await prisma.$executeRawUnsafe(`CREATE INDEX idx_promocoes_clinica ON promocoes(clinica_id)`)
            await prisma.$executeRawUnsafe(`CREATE INDEX idx_promocoes_datas ON promocoes(data_inicio, data_fim)`)
            console.log('✅ Tabela promocoes criada')
        }

        if (!existing.includes('promocao_procedimentos')) {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE promocao_procedimentos (
                    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
                    promocao_id TEXT NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE,
                    procedimento_id TEXT NOT NULL,
                    preco_promocional DECIMAL,
                    UNIQUE(promocao_id, procedimento_id)
                )
            `)
            console.log('✅ Tabela promocao_procedimentos criada')
        }
    } catch (e: any) {
        console.log(`⚠️  tabelas promoção: ${e.message}`)
    }

    console.log('\n✨ Migração IARA v2 concluída!')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
