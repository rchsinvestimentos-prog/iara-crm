// ============================================
// LOGGER — Log Central
// ============================================
// Registro de tudo que acontece na IARA.
// Era o F17 (Logger Central) no n8n.

import { prisma } from '@/lib/prisma'

type LogLevel = 'info' | 'warn' | 'error'

/**
 * Salvar log no banco (tabela logs).
 * Se a tabela não existe, printa no console e segue a vida.
 */
export async function logEvent(
    clinicaId: number,
    tipo: string,
    dados: Record<string, any>,
    level: LogLevel = 'info'
): Promise<void> {
    // Sempre printa no console
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📝'
    console.log(`[IARA] ${emoji} [${tipo}] clinica=${clinicaId}`, JSON.stringify(dados).slice(0, 200))

    // Tenta salvar no banco
    try {
        await prisma.$executeRaw`
      INSERT INTO logs (user_id, tipo, dados, level, created_at)
      VALUES (${clinicaId}, ${tipo}, ${JSON.stringify(dados)}::jsonb, ${level}, NOW())
    `
    } catch {
        // Tabela pode não existir — ok, o console.log já registrou
    }
}

/**
 * Log de erro com stack trace.
 */
export async function logError(
    clinicaId: number,
    tipo: string,
    error: unknown
): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error))
    await logEvent(clinicaId, tipo, {
        message: err.message,
        stack: err.stack?.slice(0, 500),
    }, 'error')
}
