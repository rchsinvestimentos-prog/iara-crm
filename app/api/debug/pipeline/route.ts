// DEBUG ENDPOINT — Remove after fixing
// GET /api/debug/pipeline — Rastreia todo o pipeline passo a passo
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function GET() {
    const steps: any[] = []
    
    try {
        // STEP 1: Verificar variáveis de ambiente
        steps.push({
            step: '1_env_vars',
            EVOLUTION_API_URL: EVOLUTION_API_URL ? `${EVOLUTION_API_URL.substring(0, 30)}...` : 'NÃO DEFINIDA ❌',
            EVOLUTION_API_KEY: EVOLUTION_API_KEY ? `${EVOLUTION_API_KEY.substring(0, 8)}...` : 'NÃO DEFINIDA ❌',
            WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ? 'DEFINIDA' : 'NÃO DEFINIDA',
            DATABASE_URL: process.env.DATABASE_URL ? 'DEFINIDA' : 'NÃO DEFINIDA ❌',
        })

        // STEP 2: Buscar instâncias na tabela instancias_clinica
        const instancias = await prisma.$queryRaw`
            SELECT id, evolution_instance, canal, status_conexao, numero_whatsapp, user_id, ativo
            FROM instancias_clinica
            WHERE canal = 'whatsapp'
            ORDER BY created_at DESC
            LIMIT 5
        ` as any[]
        
        steps.push({
            step: '2_instancias_clinica',
            count: instancias.length,
            data: instancias,
        })

        // STEP 3: Buscar instância na tabela clinica (legado)
        const clinicas = await prisma.$queryRaw`
            SELECT id, nome_clinica, email, evolution_instance, status, 
                   creditos_disponiveis, horario_semana, atende_sabado, horario_sabado,
                   whatsapp_clinica, whatsapp_doutora, pausa_iara
            FROM users
            WHERE evolution_instance IS NOT NULL AND evolution_instance != ''
            LIMIT 5
        ` as any[]
        
        steps.push({
            step: '3_clinica_legado',
            count: clinicas.length,
            data: clinicas.map((c: any) => ({
                ...c,
                evolution_instance: c.evolution_instance,
                status: c.status,
                creditos: c.creditos_disponiveis,
                horario_semana: c.horario_semana,
                atende_sabado: c.atende_sabado,
                horario_sabado: c.horario_sabado,
            })),
        })

        // STEP 4: Simular findClinicaByInstance
        const instanceName = instancias[0]?.evolution_instance
        if (instanceName) {
            // Try legado
            const legadoResult = await prisma.clinica.findFirst({
                where: { evolutionInstance: instanceName },
                select: { id: true, nomeClinica: true, status: true, creditosDisponiveis: true, 
                          evolutionInstance: true, horarioSemana: true, atendeSabado: true }
            })
            
            steps.push({
                step: '4a_findClinica_legado',
                instanceName,
                found: !!legadoResult,
                data: legadoResult,
            })

            // Try instancias_clinica
            if (!legadoResult) {
                const fallbackRows = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT user_id FROM instancias_clinica WHERE evolution_instance = $1 AND ativo = true LIMIT 1`,
                    instanceName
                )
                steps.push({
                    step: '4b_findClinica_fallback',
                    instanceName,
                    found: fallbackRows.length > 0,
                    userId: fallbackRows[0]?.user_id,
                })
                
                if (fallbackRows.length > 0) {
                    const clinicaViaFallback = await prisma.clinica.findFirst({
                        where: { id: fallbackRows[0].user_id },
                        select: { id: true, nomeClinica: true, status: true, creditosDisponiveis: true,
                                  evolutionInstance: true, horarioSemana: true, atendeSabado: true,
                                  horarioSabado: true }
                    })
                    steps.push({
                        step: '4c_clinica_via_fallback',
                        found: !!clinicaViaFallback,
                        data: clinicaViaFallback,
                    })
                }
            }
        }

        // STEP 5: Verificar configuração do horário
        const allClinicas = await prisma.$queryRaw`
            SELECT id, nome_clinica, horario_semana, atende_sabado, horario_sabado,
                   atende_domingo, horario_domingo, configuracoes, status, creditos_disponiveis
            FROM users
            WHERE id = ${instancias[0]?.user_id || 0}
            LIMIT 1
        ` as any[]
        
        if (allClinicas.length > 0) {
            const c = allClinicas[0]
            const now = new Date()
            const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
            const hour = brTime.getHours() + (brTime.getMinutes() / 60)
            const dayOfWeek = brTime.getDay()
            const cfg = c.configuracoes || {}
            
            steps.push({
                step: '5_business_hours',
                currentTime_BR: brTime.toISOString(),
                currentHour: hour.toFixed(2),
                dayOfWeek: ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][dayOfWeek],
                dayNum: dayOfWeek,
                horarioSemana: c.horario_semana,
                atendeSabado: c.atende_sabado,
                horarioSabado: c.horario_sabado,
                atendeDomingo: c.atende_domingo,
                horarioDomingo: c.horario_domingo,
                atendimento_24h: cfg.atendimento_24h,
                pausa_iara: cfg.pausa_iara,
                clinicaStatus: c.status,
                creditosDisponiveis: c.creditos_disponiveis,
            })
        }

        // STEP 6: Verificar pausas ativas
        const pausas = await prisma.$queryRaw`
            SELECT telefone, tipo, expira_em
            FROM pausas_conversa
            WHERE user_id = ${instancias[0]?.user_id || 0}
            AND expira_em > NOW()
            LIMIT 10
        ` as any[]
        
        steps.push({
            step: '6_pausas_ativas',
            count: pausas.length,
            data: pausas,
        })

        // STEP 7: Verificar webhook na Evolution API
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY && instanceName) {
            try {
                const webhookRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${instanceName}`, {
                    headers: { 'apikey': EVOLUTION_API_KEY },
                    signal: AbortSignal.timeout(5000),
                })
                if (webhookRes.ok) {
                    const webhookData = await webhookRes.json()
                    steps.push({
                        step: '7_evolution_webhook_config',
                        status: 'OK',
                        data: webhookData,
                    })
                } else {
                    steps.push({
                        step: '7_evolution_webhook_config',
                        status: `ERRO ${webhookRes.status}`,
                        text: await webhookRes.text().catch(() => ''),
                    })
                }
            } catch (e: any) {
                steps.push({
                    step: '7_evolution_webhook_config',
                    status: 'FETCH_ERROR',
                    error: e.message,
                })
            }
        } else {
            steps.push({
                step: '7_evolution_webhook_config',
                status: 'SKIPPED — variáveis não definidas',
            })
        }

        // STEP 8: Verificar se tabela pausas_conversa existe
        try {
            await prisma.$queryRaw`SELECT 1 FROM pausas_conversa LIMIT 1`
            steps.push({ step: '8_table_pausas_conversa', exists: true })
        } catch (e: any) {
            steps.push({ step: '8_table_pausas_conversa', exists: false, error: e.message?.substring(0, 100) })
        }

        return NextResponse.json({ 
            timestamp: new Date().toISOString(),
            diagnostics: steps,
        }, { status: 200 })

    } catch (err: any) {
        return NextResponse.json({ 
            error: err.message,
            stack: err.stack?.substring(0, 500),
            partialSteps: steps, 
        }, { status: 500 })
    }
}
