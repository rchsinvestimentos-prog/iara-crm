// ============================================
// AGENT — Memória da Dra
// ============================================
// Gerencia o histórico de conversas estratégicas
// entre a Dra e a IARA. Memória permanente.
//
// Tabela: conversa_dra

import { prisma } from '@/lib/prisma'
import { ensureAgentTables } from './setup-tables'

export interface DraMessage {
    id: string
    role: 'dra' | 'iara'
    content: string
    canal: 'whatsapp' | 'painel'
    metadata: Record<string, any>
    createdAt: Date
}

/**
 * Salvar mensagem na conversa Dra ↔ IARA.
 */
export async function saveDraMessage(
    clinicaId: number,
    role: 'dra' | 'iara',
    content: string,
    canal: 'whatsapp' | 'painel' = 'painel',
    metadata: Record<string, any> = {}
): Promise<void> {
    try {
        await prisma.$executeRaw`
            INSERT INTO conversa_dra (clinica_id, role, content, canal, metadata, created_at)
            VALUES (${clinicaId}, ${role}, ${content}, ${canal}, ${JSON.stringify(metadata)}::jsonb, NOW())
        `
    } catch (firstErr: any) {
        const msg = (firstErr?.message || '').toLowerCase()
        if (msg.includes('does not exist') || msg.includes('relation')) {
            console.warn('[DraMemory] Tabela conversa_dra não existe — criando...')
            await ensureAgentTables()
            await prisma.$executeRaw`
                INSERT INTO conversa_dra (clinica_id, role, content, canal, metadata, created_at)
                VALUES (${clinicaId}, ${role}, ${content}, ${canal}, ${JSON.stringify(metadata)}::jsonb, NOW())
            `
            console.log('[DraMemory] ✅ Tabela criada e mensagem salva.')
        } else {
            console.error('[DraMemory] Erro ao salvar:', firstErr)
        }
    }
}

/**
 * Buscar histórico de conversas Dra ↔ IARA.
 * Retorna as últimas N mensagens (mais recentes primeiro).
 */
export async function getDraHistory(
    clinicaId: number,
    limit: number = 50
): Promise<DraMessage[]> {
    try {
        const result = await prisma.$queryRaw<{
            id: string
            role: string
            content: string
            canal: string
            metadata: any
            created_at: Date
        }[]>`
            SELECT id, role, content, canal, metadata, created_at
            FROM conversa_dra
            WHERE clinica_id = ${clinicaId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `
        return (result || []).map(r => ({
            id: r.id,
            role: r.role as 'dra' | 'iara',
            content: r.content,
            canal: r.canal as 'whatsapp' | 'painel',
            metadata: r.metadata || {},
            createdAt: r.created_at,
        }))
    } catch {
        return []
    }
}

/**
 * Buscar histórico formatado para o prompt do Agent.
 * Retorna em ordem cronológica (mais antigo primeiro).
 */
export async function getDraHistoryForPrompt(
    clinicaId: number,
    limit: number = 30
): Promise<{ role: string; content: string }[]> {
    const history = await getDraHistory(clinicaId, limit)
    // Inverter para ordem cronológica
    return history.reverse().map(m => ({
        role: m.role === 'dra' ? 'user' : 'assistant',
        content: m.content,
    }))
}

/**
 * Buscar resumo de decisões passadas.
 * Filtra mensagens que contêm decisões ou ações executadas (metadata).
 */
export async function getDraDecisions(
    clinicaId: number,
    limit: number = 20
): Promise<DraMessage[]> {
    try {
        const result = await prisma.$queryRaw<{
            id: string
            role: string
            content: string
            canal: string
            metadata: any
            created_at: Date
        }[]>`
            SELECT id, role, content, canal, metadata, created_at
            FROM conversa_dra
            WHERE clinica_id = ${clinicaId}
              AND metadata != '{}'::jsonb
              AND metadata IS NOT NULL
            ORDER BY created_at DESC
            LIMIT ${limit}
        `
        return (result || []).map(r => ({
            id: r.id,
            role: r.role as 'dra' | 'iara',
            content: r.content,
            canal: r.canal as 'whatsapp' | 'painel',
            metadata: r.metadata || {},
            createdAt: r.created_at,
        }))
    } catch {
        return []
    }
}

/**
 * Contar total de mensagens da Dra com a IARA.
 */
export async function getDraMessageCount(clinicaId: number): Promise<number> {
    try {
        const result = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) as count FROM conversa_dra WHERE clinica_id = ${clinicaId}
        `
        return Number(result[0]?.count || 0)
    } catch {
        return 0
    }
}
