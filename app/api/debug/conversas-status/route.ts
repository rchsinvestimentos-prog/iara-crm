// DEBUG: Diagnóstico completo das conversas
// Verifica se a tabela existe, se há registros, e testa o saveToHistory
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: Record<string, any> = {}

    // 1. Verificar se a tabela historico_conversas existe
    try {
        const count = await prisma.$queryRaw`
            SELECT COUNT(*)::int as total FROM historico_conversas
        ` as any[]
        results.tabela_existe = true
        results.total_registros = count[0]?.total || 0
    } catch (e: any) {
        results.tabela_existe = false
        results.tabela_erro = e.message?.slice(0, 200)
    }

    // 2. Se a tabela existe, pegar os 5 mais recentes
    if (results.tabela_existe) {
        try {
            const recentes = await prisma.$queryRaw`
                SELECT id, user_id, telefone_cliente, role, LEFT(content, 80) as content_preview, origem, created_at
                FROM historico_conversas
                ORDER BY id DESC
                LIMIT 5
            ` as any[]
            results.registros_recentes = recentes.map((r: any) => ({
                ...r,
                id: Number(r.id),
            }))
        } catch (e: any) {
            results.registros_recentes_erro = e.message
        }
    }

    // 3. Verificar instâncias ativas + clinicaId associado
    try {
        const instancias = await prisma.$queryRaw`
            SELECT ic.evolution_instance, ic.user_id, ic.ativo, ic.status_conexao,
                   u.nome_clinica, u.status, u.creditos_disponiveis
            FROM instancias_clinica ic
            LEFT JOIN users u ON u.id = ic.user_id
            WHERE ic.ativo = true
            ORDER BY ic.user_id ASC
            LIMIT 10
        ` as any[]
        results.instancias_ativas = instancias
    } catch (e: any) {
        results.instancias_erro = e.message?.slice(0, 200)
    }

    // 4. Verificar webhook_debug_log (últimos 5 eventos do pipeline)
    try {
        const logs = await prisma.$queryRaw`
            SELECT id, LEFT(payload, 300) as payload_preview, created_at
            FROM webhook_debug_log
            ORDER BY id DESC
            LIMIT 10
        ` as any[]
        results.pipeline_logs = logs.map((l: any) => ({
            id: Number(l.id),
            payload_preview: l.payload_preview,
            created_at: l.created_at?.toISOString?.() || String(l.created_at),
        }))
    } catch (e: any) {
        results.pipeline_logs = `⚠️ Tabela webhook_debug_log não existe: ${e.message?.slice(0, 100)}`
    }

    // 5. Criar tabela se não existir (bootstrap)
    if (!results.tabela_existe) {
        try {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS historico_conversas (
                    id SERIAL PRIMARY KEY,
                    user_id INT,
                    telefone_cliente VARCHAR(50),
                    role VARCHAR(20),
                    content TEXT,
                    push_name VARCHAR(200),
                    origem VARCHAR(30) DEFAULT 'whatsapp',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            `)
            await prisma.$executeRawUnsafe(`
                CREATE INDEX IF NOT EXISTS idx_historico_user_tel
                ON historico_conversas (user_id, telefone_cliente, created_at DESC)
            `)
            results.tabela_criada = true
        } catch (e: any) {
            results.tabela_criada = false
            results.criar_tabela_erro = e.message?.slice(0, 200)
        }
    }

    // 6. Testar INSERT na tabela (se existir)
    try {
        await prisma.$executeRaw`
            INSERT INTO historico_conversas (user_id, telefone_cliente, role, content, push_name, origem, created_at)
            VALUES (0, 'debug_test', 'system', 'Teste de diagnóstico - pode deletar', 'DEBUG', 'debug', NOW())
        `
        // Deletar o registro de teste
        await prisma.$executeRaw`
            DELETE FROM historico_conversas WHERE telefone_cliente = 'debug_test' AND user_id = 0
        `
        results.insert_test = '✅ INSERT funcionando corretamente'
    } catch (e: any) {
        results.insert_test = `❌ Falha no INSERT: ${e.message?.slice(0, 200)}`
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        diagnostico: results,
        resumo: results.tabela_existe
            ? (results.total_registros === 0
                ? '⚠️ Tabela existe mas está VAZIA — as mensagens não estão sendo salvas no pipeline'
                : `✅ Tabela OK com ${results.total_registros} registros`)
            : '❌ Tabela historico_conversas NÃO EXISTE — foi criada agora, tente novamente',
    })
}
