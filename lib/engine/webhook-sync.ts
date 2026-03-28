// ============================================
// WEBHOOK SYNC — Garantia de webhook ativo
// ============================================
// Função centralizada que verifica e corrige o webhook
// de uma instância na Evolution API.
//
// USADA POR: Guardian, QR connect, Status check, CONNECTION_UPDATE
//
// REGRA DE OURO: Se a instância está conectada na Evolution,
// o webhook TEM que estar ativo. Sem exceção.

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const WEBHOOK_URL = process.env.EVOLUTION_WEBHOOK_URL || 'https://app.iara.click/api/webhook/evolution'

export interface WebhookSyncResult {
    instanceName: string
    connectionState: 'open' | 'close' | 'connecting' | 'unknown'
    webhookWasCorrect: boolean
    webhookFixed: boolean
    error?: string
    details?: string
}

/**
 * Verifica e garante que o webhook de uma instância está ativo e correto.
 * Se algo estiver errado, corrige automaticamente.
 * 
 * @returns resultado com o que foi verificado e corrigido
 */
export async function ensureWebhook(instanceName: string): Promise<WebhookSyncResult> {
    const result: WebhookSyncResult = {
        instanceName,
        connectionState: 'unknown',
        webhookWasCorrect: false,
        webhookFixed: false,
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        result.error = 'EVOLUTION_API não configurada'
        return result
    }

    // 1. Verificar estado da conexão
    try {
        const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY },
            signal: AbortSignal.timeout(8000),
        })

        if (stateRes.ok) {
            const stateData = await stateRes.json()
            result.connectionState = stateData?.instance?.state || stateData?.state || 'close'
        } else {
            result.connectionState = 'unknown'
            result.error = `connectionState retornou ${stateRes.status}`
            return result
        }
    } catch (e: any) {
        result.error = `Erro ao verificar conexão: ${e.message}`
        return result
    }

    // 2. Verificar webhook atual
    try {
        const whRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY },
            signal: AbortSignal.timeout(8000),
        })

        if (whRes.ok) {
            const whData = await whRes.json()

            const isEnabled = whData.enabled === true
            const hasCorrectUrl = whData.url === WEBHOOK_URL
            const hasMessagesUpsert = Array.isArray(whData.events) && whData.events.includes('MESSAGES_UPSERT')

            if (isEnabled && hasCorrectUrl && hasMessagesUpsert) {
                result.webhookWasCorrect = true
                result.details = 'Webhook OK — nenhuma correção necessária'
                return result
            }

            // Webhook está errado — precisa corrigir
            result.details = [
                !isEnabled ? 'enabled=false' : null,
                !hasCorrectUrl ? `url=${whData.url}` : null,
                !hasMessagesUpsert ? `events=${JSON.stringify(whData.events)}` : null,
            ].filter(Boolean).join(', ')
        }
        // Se 404, webhook não existe — vamos criar
    } catch {
        // Webhook find falhou — vamos tentar setar mesmo assim
    }

    // 3. Corrigir webhook
    try {
        const setRes = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
                webhook: {
                    enabled: true,
                    url: WEBHOOK_URL,
                    webhookByEvents: false,
                    webhookBase64: true,
                    events: [
                        'MESSAGES_UPSERT',
                        'MESSAGES_UPDATE',
                        'CONNECTION_UPDATE',
                    ],
                },
            }),
            signal: AbortSignal.timeout(8000),
        })

        if (setRes.ok) {
            const setData = await setRes.json()
            result.webhookFixed = true
            result.details = `CORRIGIDO → enabled=${setData.enabled}, events=${JSON.stringify(setData.events)}`
            console.log(`[WebhookSync] ✅ Webhook corrigido para ${instanceName}`)
        } else {
            const errText = await setRes.text().catch(() => '')
            result.error = `webhook/set retornou ${setRes.status}: ${errText}`
        }
    } catch (e: any) {
        result.error = `Erro ao configurar webhook: ${e.message}`
    }

    return result
}

/**
 * Verifica e corrige webhooks de TODAS as instâncias ativas.
 * Usado pelo Guardian cron.
 */
export async function ensureAllWebhooks(): Promise<{
    timestamp: string
    totalChecked: number
    totalFixed: number
    totalErrors: number
    results: WebhookSyncResult[]
}> {
    // Importar prisma dinâmicamente para evitar circular dependency
    const { prisma } = await import('@/lib/prisma')

    // Buscar TODAS instâncias ativas de TODOS os clientes
    const instancias = await prisma.$queryRaw`
        SELECT DISTINCT ic.evolution_instance, ic.user_id, ic.canal, ic.status_conexao,
               u.nome_clinica
        FROM instancias_clinica ic
        JOIN users u ON u.id = ic.user_id
        WHERE ic.ativo = true AND ic.canal = 'whatsapp' AND ic.evolution_instance IS NOT NULL
    ` as any[]

    // Também buscar instâncias legadas (da tabela users diretamente)
    const legados = await prisma.$queryRaw`
        SELECT id as user_id, evolution_instance, nome_clinica
        FROM users
        WHERE evolution_instance IS NOT NULL AND evolution_instance != '' AND status = 'ativo'
    ` as any[]

    // Unificar, removendo duplicatas
    const allInstances = new Map<string, any>()
    for (const inst of instancias) {
        allInstances.set(inst.evolution_instance, inst)
    }
    for (const leg of legados) {
        if (!allInstances.has(leg.evolution_instance)) {
            allInstances.set(leg.evolution_instance, { ...leg, canal: 'whatsapp', _legado: true })
        }
    }

    const results: WebhookSyncResult[] = []

    for (const [instanceName] of allInstances) {
        const syncResult = await ensureWebhook(instanceName)
        results.push(syncResult)

        // Sincronizar status no banco se necessário
        const inst = allInstances.get(instanceName)
        if (inst && !inst._legado) {
            const newStatus = syncResult.connectionState === 'open' ? 'conectado' : 'desconectado'
            try {
                await prisma.$executeRaw`
                    UPDATE instancias_clinica
                    SET status_conexao = ${newStatus}
                    WHERE evolution_instance = ${instanceName}
                `
            } catch { /* silenciar */ }
        }

        // Delay entre instâncias para não sobrecarregar a Evolution
        await new Promise(r => setTimeout(r, 200))
    }

    return {
        timestamp: new Date().toISOString(),
        totalChecked: results.length,
        totalFixed: results.filter(r => r.webhookFixed).length,
        totalErrors: results.filter(r => r.error).length,
        results,
    }
}
