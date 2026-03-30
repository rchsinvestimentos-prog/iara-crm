// ============================================
// MEMÓRIA — Lembranças da Cliente
// ============================================
// Guarda o que sabemos sobre cada cliente: procedimentos feitos,
// resumo geral, preferências. Usado pra personalizar as conversas.
//
// TABELA: memoria_clientes (user_id + telefone_cliente)

import { prisma } from '@/lib/prisma'
import type { MemoriaCliente } from './types'

/**
 * Buscar memória de uma cliente específica.
 */
export async function getClientMemory(
    clinicaId: number,
    telefone: string
): Promise<MemoriaCliente | null> {
    try {
        const result = await prisma.$queryRaw<{
            resumo_geral: string | null
            procedimentos_realizados: string[] | null
            tags: string[] | null
        }[]>`
      SELECT resumo_geral, procedimentos_realizados, tags
      FROM memoria_clientes
      WHERE user_id = ${clinicaId}
        AND telefone_cliente = ${telefone}
      LIMIT 1
    `

        if (!result || result.length === 0) return null

        const mem = result[0]
        return {
            resumoGeral: mem.resumo_geral,
            procedimentosRealizados: mem.procedimentos_realizados || [],
            tags: mem.tags || [],
        }
    } catch (err) {
        // Tabela pode não existir ainda — não é erro grave
        console.log('[Memory] Tabela memoria_clientes não encontrada ou erro:', (err as any).message?.slice(0, 80))
        return null
    }
}

/**
 * Buscar feedbacks ativos da Dra (tabela feedback_iara).
 * Esses feedbacks são instruções que a Dra manda pelo WhatsApp
 * e que a IARA precisa seguir.
 */
export async function getDraFeedbacks(
    clinicaId: number
): Promise<{ regra: string }[]> {
    try {
        const result = await prisma.$queryRaw<{ regra: string }[]>`
      SELECT regra
      FROM feedback_iara
      WHERE user_id = ${clinicaId}
        AND ativo = true
      ORDER BY id DESC
      LIMIT 20
    `
        return result || []
    } catch {
        return []
    }
}

/**
 * Buscar histórico de conversa com a cliente.
 * Retorna as últimas N mensagens (mais recentes primeiro).
 */
export async function getConversationHistory(
    clinicaId: number,
    telefone: string,
    limit: number = 30
): Promise<{ role: string; content: string }[]> {
    try {
        const result = await prisma.$queryRaw<{
            role: string
            content: string
        }[]>`
      SELECT role, content
      FROM historico_conversas
      WHERE user_id = ${clinicaId}
        AND telefone_cliente = ${telefone}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
        return result || []
    } catch {
        return []
    }
}

/**
 * Garante que a tabela historico_conversas existe.
 * Chamada antes de qualquer INSERT para evitar falhas silenciosas.
 */
async function ensureHistoricoTable(): Promise<void> {
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
}

/**
 * Salvar mensagem no histórico de conversas.
 * Auto-cria a tabela se não existir (evita falhas silenciosas no pipeline).
 */
export async function saveToHistory(
    clinicaId: number,
    telefone: string,
    role: 'user' | 'assistant',
    content: string,
    pushName?: string
): Promise<void> {
    try {
        await prisma.$executeRaw`
      INSERT INTO historico_conversas (user_id, telefone_cliente, role, content, push_name, origem, created_at)
      VALUES (${clinicaId}, ${telefone}, ${role}, ${content}, ${pushName || null}, ${role === 'user' ? 'cliente' : 'ia'}, NOW())
    `
    } catch (firstErr: any) {
        // Se falhou, tenta criar a tabela e tentar novamente
        const msg = (firstErr?.message || '').toLowerCase()
        if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('undefined table')) {
            console.warn('[Memory] Tabela historico_conversas não existe — criando agora...')
            try {
                await ensureHistoricoTable()
                // Retry após criar a tabela
                await prisma.$executeRaw`
                    INSERT INTO historico_conversas (user_id, telefone_cliente, role, content, push_name, origem, created_at)
                    VALUES (${clinicaId}, ${telefone}, ${role}, ${content}, ${pushName || null}, ${role === 'user' ? 'cliente' : 'ia'}, NOW())
                `
                console.log('[Memory] ✅ Tabela criada e mensagem salva com sucesso.')
            } catch (retryErr) {
                console.error('[Memory] ❌ Falha ao criar tabela ou re-inserir:', retryErr)
            }
        } else {
            console.error('[Memory] Erro ao salvar no histórico:', firstErr)
        }
    }
}

/**
 * Salvar feedback da Dra.
 * Quando a Dra manda "fb: nunca diga X" ou "feedback: sempre faça Y"
 */
export async function saveDraFeedback(
    clinicaId: number,
    regra: string
): Promise<void> {
    try {
        await prisma.$executeRaw`
      INSERT INTO feedback_iara (user_id, regra, origem, ativo, created_at)
      VALUES (${clinicaId}, ${regra}, 'whatsapp_doutora', true, NOW())
    `
        console.log(`[Memory] ✅ Feedback salvo: "${regra.slice(0, 60)}..."`)
    } catch (err) {
        console.error('[Memory] Erro ao salvar feedback:', err)
    }
}

/**
 * Detectar se a mensagem é um feedback da Dra.
 * 
 * PADRÕES:
 * - "fb: nunca diga isso"
 * - "feedback: sempre responda assim"
 * - "aprenda: quando a cliente perguntar X, diga Y"
 * - Palavras-chave: feedback, aprenda, anote, corrija, sempre, nunca
 */
export function detectFeedback(
    mensagem: string,
    telefoneRemetente: string,
    whatsappDoutora: string
): { isFeedback: boolean; regra: string } {
    const telLimpo = telefoneRemetente.replace(/\D/g, '')
    const draLimpo = (whatsappDoutora || '').replace(/\D/g, '')

    // Precisa ser da doutora
    if (!telLimpo || !draLimpo || telLimpo !== draLimpo) {
        return { isFeedback: false, regra: '' }
    }

    const msg = (mensagem || '').trim()

    // Padrão explícito: "fb:" ou "feedback:"
    const isFeedback = /^(fb:|feedback:)|\b(feedback|aprenda|anote|corrija|sempre|nunca|nao|não)\b/i.test(msg)
    const regra = msg.replace(/^(fb:|feedback:)\s*/i, '').trim()

    return {
        isFeedback: isFeedback && regra.length > 2,
        regra,
    }
}
