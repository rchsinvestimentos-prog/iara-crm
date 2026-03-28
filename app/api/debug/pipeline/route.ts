// DEBUG ENDPOINT v2 — Corrigido
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function GET() {
    const steps: any[] = []
    
    try {
        // STEP 1: Env vars
        steps.push({
            step: '1_env_vars',
            EVOLUTION_API_URL: EVOLUTION_API_URL ? `${EVOLUTION_API_URL.substring(0, 40)}...` : '❌ NÃO DEFINIDA',
            EVOLUTION_API_KEY: EVOLUTION_API_KEY ? `${EVOLUTION_API_KEY.substring(0, 8)}...` : '❌ NÃO DEFINIDA',
            WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ? 'DEFINIDA' : 'não definida (ok)',
        })

        // STEP 2: Instâncias ativas
        const instancias = await prisma.$queryRaw`
            SELECT id, evolution_instance, canal, status_conexao, numero_whatsapp, user_id, ativo
            FROM instancias_clinica WHERE canal = 'whatsapp' ORDER BY created_at DESC LIMIT 5
        ` as any[]
        steps.push({ step: '2_instancias', count: instancias.length, data: instancias })

        // STEP 3: Tabela clinica/users — evolution_instance
        const clinicas = await prisma.$queryRaw`
            SELECT id, nome_clinica, evolution_instance, status, creditos_disponiveis,
                   horario_semana, atende_sabado, horario_sabado, atende_domingo, horario_domingo,
                   configuracoes
            FROM users WHERE id = ${instancias[0]?.user_id || 0} LIMIT 1
        ` as any[]
        
        if (clinicas.length > 0) {
            const c = clinicas[0]
            const cfg = c.configuracoes || {}
            steps.push({
                step: '3_clinica',
                id: c.id,
                nome: c.nome_clinica,
                evolution_instance: c.evolution_instance || '❌ VAZIO — pipeline não encontra clínica!',
                status: c.status,
                creditos: c.creditos_disponiveis,
                horario_semana: c.horario_semana,
                atende_sabado: c.atende_sabado,
                horario_sabado: c.horario_sabado,
                atende_domingo: c.atende_domingo,
                horario_domingo: c.horario_domingo,
                atendimento_24h: cfg.atendimento_24h || false,
                pausa_iara: cfg.pausa_iara || false,
            })
        } else {
            steps.push({ step: '3_clinica', error: '❌ Clínica não encontrada para user_id=' + (instancias[0]?.user_id || 0) })
        }

        // STEP 4: Simular findClinicaByInstance com a instância ativa
        const instanceName = instancias[0]?.evolution_instance
        if (instanceName) {
            const legado = await prisma.clinica.findFirst({
                where: { evolutionInstance: instanceName },
                select: { id: true, nomeClinica: true, status: true, creditosDisponiveis: true }
            })
            
            if (legado) {
                steps.push({ step: '4_lookup', method: '✅ LEGADO (direto)', found: true, clinicaId: legado.id })
            } else {
                const fallback = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT user_id FROM instancias_clinica WHERE evolution_instance = $1 AND ativo = true LIMIT 1`,
                    instanceName
                )
                if (fallback.length > 0) {
                    steps.push({ step: '4_lookup', method: '⚠️ FALLBACK (instancias_clinica)', found: true, userId: fallback[0].user_id })
                } else {
                    steps.push({ step: '4_lookup', method: '❌ NÃO ENCONTRADO EM NENHUMA TABELA', found: false })
                }
            }
        }

        // STEP 5: Horário atual vs configuração
        const now = new Date()
        const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
        const hour = brTime.getHours() + (brTime.getMinutes() / 60)
        const dayOfWeek = brTime.getDay()
        const dayName = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][dayOfWeek]
        
        let aberto = '???'
        if (clinicas.length > 0) {
            const c = clinicas[0]
            const cfg = c.configuracoes || {}
            if (cfg.atendimento_24h) {
                aberto = '✅ 24h'
            } else if (dayOfWeek === 6) { // Sábado
                if (!c.atende_sabado) aberto = '❌ Sáb desabilitado'
                else {
                    const h = c.horario_sabado || c.horario_semana || '08:00 às 18:00'
                    aberto = `Sáb: ${h} — hora atual: ${hour.toFixed(1)}`
                }
            } else if (dayOfWeek === 0) { // Domingo
                if (!c.atende_domingo) aberto = '❌ Dom desabilitado'
                else {
                    const h = c.horario_domingo || c.horario_semana || '08:00 às 18:00'
                    aberto = `Dom: ${h} — hora atual: ${hour.toFixed(1)}`
                }
            } else {
                const h = c.horario_semana || '08:00 às 18:00'
                aberto = `Semana: ${h} — hora atual: ${hour.toFixed(1)}`
            }
        }
        steps.push({ step: '5_horario', dia: dayName, hora: hour.toFixed(2), resultado: aberto })

        // STEP 6: Pausas ativas
        try {
            const pausas = await prisma.$queryRaw`
                SELECT telefone, tipo, expira_em FROM pausas_conversa
                WHERE user_id = ${instancias[0]?.user_id || 0} AND expira_em > NOW() LIMIT 10
            ` as any[]
            steps.push({ step: '6_pausas', count: pausas.length, data: pausas })
        } catch (e: any) {
            steps.push({ step: '6_pausas', error: 'tabela pode não existir: ' + e.message?.substring(0, 80) })
        }

        // STEP 7: 🔑 Webhook na Evolution API
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY && instanceName) {
            try {
                const webhookRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceName}`, {
                    headers: { 'apikey': EVOLUTION_API_KEY },
                    signal: AbortSignal.timeout(5000),
                })
                const webhookData = webhookRes.ok ? await webhookRes.json() : await webhookRes.text()
                steps.push({ step: '7_webhook_evolution', status: webhookRes.status, data: webhookData })
            } catch (e: any) {
                steps.push({ step: '7_webhook_evolution', error: e.message })
            }

            // STEP 7b: Connection state
            try {
                const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
                    headers: { 'apikey': EVOLUTION_API_KEY },
                    signal: AbortSignal.timeout(5000),
                })
                const stateData = stateRes.ok ? await stateRes.json() : await stateRes.text()
                steps.push({ step: '7b_connection_state', status: stateRes.status, data: stateData })
            } catch (e: any) {
                steps.push({ step: '7b_connection_state', error: e.message })
            }
        }

        // STEP 8: Forçar configuração do webhook se não está configurado
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY && instanceName) {
            try {
                const setRes = await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
                    body: JSON.stringify({
                        webhook: {
                            enabled: true,
                            url: 'https://app.iara.click/api/webhook/evolution',
                            byEvents: false,
                            base64: true,
                            events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
                        },
                    }),
                    signal: AbortSignal.timeout(5000),
                })
                const setData = setRes.ok ? await setRes.json() : await setRes.text()
                steps.push({ step: '8_force_webhook_set', status: setRes.status, data: setData })
            } catch (e: any) {
                steps.push({ step: '8_force_webhook_set', error: e.message })
            }
        }

        // STEP 9: Sincronizar evolution_instance na tabela clinica se vazio
        if (instanceName && instancias[0]?.user_id) {
            try {
                const result = await prisma.$executeRaw`
                    UPDATE users SET evolution_instance = ${instanceName}
                    WHERE id = ${instancias[0].user_id} AND (evolution_instance IS NULL OR evolution_instance = '')
                `
                steps.push({ step: '9_sync_legado', rowsAffected: result, instanceName })
            } catch (e: any) {
                steps.push({ step: '9_sync_legado', error: e.message?.substring(0, 100) })
            }
        }

        return NextResponse.json({ timestamp: new Date().toISOString(), diagnostics: steps })
    } catch (err: any) {
        return NextResponse.json({ error: err.message, partialSteps: steps }, { status: 500 })
    }
}
