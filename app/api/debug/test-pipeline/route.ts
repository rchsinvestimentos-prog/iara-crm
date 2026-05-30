// TEST ENDPOINT — Simula uma mensagem e retorna EXATAMENTE o que o pipeline faz
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as catraca from '@/lib/engine/catraca'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function GET(request: NextRequest) {
    const results: any[] = []
    
    try {
        // Pegar a instância ativa
        const instancias = await prisma.$queryRaw`
            SELECT evolution_instance, user_id FROM instancias_clinica 
            WHERE canal = 'whatsapp' AND ativo = true AND user_id = 9 LIMIT 1
        ` as any[]
        
        const instanceName = instancias[0]?.evolution_instance || ''
        results.push({ step: '1', instanceName })
        
        // STEP 2: Simular catraca.checkAccess
        const acesso = await catraca.checkAccess(instanceName, '5541999999999')
        results.push({ 
            step: '2_catraca', 
            permitido: acesso.permitido,
            motivo: acesso.motivo,
            clinicaFound: !!acesso.clinica,
            clinicaId: acesso.clinica?.id,
            clinicaNome: acesso.clinica?.nomeClinica,
            clinicaStatus: acesso.clinica?.status,
            creditos: acesso.clinica?.creditosDisponiveis,
            isDoutora: acesso.isDoutora,
        })
        
        if (!acesso.permitido) {
            results.push({ step: '3_BLOQUEADO', motivo: acesso.motivo, msg: acesso.mensagemBloqueio })
            return NextResponse.json({ results })
        }
        
        // STEP 3: Simular verificação de horário
        const clinica = acesso.clinica!
        const tz = (clinica as any).timezone || 'America/Sao_Paulo'
        const agora = new Date(new Date().toLocaleString("en-US", { timeZone: tz }))
        const horaAtual = agora.getHours() + (agora.getMinutes() / 60)
        const diaSemana = agora.getDay()
        
        const cfg = (clinica.configuracoes as any) || {}
        let horarioTexto = clinica.horarioSemana || '08:00 às 18:00'
        let statusHorario = 'ok'
        
        if (cfg.atendimento_24h === true) {
            statusHorario = '24h - sempre aberto'
        } else if (diaSemana === 6) {
            if (!clinica.atendeSabado) {
                statusHorario = '❌ Sábado desabilitado'
            } else {
                horarioTexto = (clinica as any).horarioSabado || horarioTexto
            }
        } else if (diaSemana === 0) {
            if (!clinica.atendeDomingo) {
                statusHorario = '❌ Domingo desabilitado' 
            } else {
                horarioTexto = (clinica as any).horarioDomingo || horarioTexto
            }
        }
        
        // Parse horário
        const match = horarioTexto.match(/(\d{1,2}):(\d{2})\s*(?:às|as|a|-|–)\s*(\d{1,2}):(\d{2})/i)
        let inicio = 8, fim = 18
        if (match) {
            inicio = parseInt(match[1]) + parseInt(match[2]) / 60
            fim = parseInt(match[3]) + parseInt(match[4]) / 60
        }
        
        const dentroDoHorario = horaAtual >= inicio && horaAtual < fim
        
        results.push({
            step: '3_horario',
            timezone: tz,
            horaAtual: horaAtual.toFixed(2),
            diaSemana: ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][diaSemana],
            horarioTexto,
            inicio,
            fim,
            dentroDoHorario,
            statusHorario,
        })

        // STEP 4: Testar envio de mensagem via Evolution
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            // Testar se o Evolution API funciona  
            try {
                const testRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
                    headers: { 'apikey': EVOLUTION_API_KEY },
                    signal: AbortSignal.timeout(5000),
                })
                const testData = testRes.ok ? await testRes.json() : null
                results.push({
                    step: '4_evolution_ok',
                    status: testRes.status,
                    state: testData?.instance?.state || testData?.state,
                })
            } catch (e: any) {
                results.push({ step: '4_evolution_FAIL', error: e.message })
            }
        }

        // STEP 5: Verificar se a mensagem anterior (17:51) gerou pausa
        // (o "Oi" de 17:51 recebeu resposta "fechado" — isso pode ter criado uma pausa)
        try {
            const pausas = await prisma.$queryRaw`
                SELECT telefone_cliente, pausa_ate, motivo FROM status_conversa
                WHERE user_id = 9 ORDER BY updated_at DESC LIMIT 5
            ` as any[]
            results.push({ step: '5_pausas', data: pausas })
        } catch (e: any) {
            results.push({ step: '5_pausas', error: 'tabela não existe: ' + e.message?.substring(0, 60) })
        }

        // STEP 6: Verificar cache (anti-duplicação)
        try {
            const cache = await prisma.$queryRaw`
                SELECT chave, resposta, created_at FROM cache_respostas
                WHERE user_id = 9 ORDER BY created_at DESC LIMIT 3
            ` as any[]
            results.push({ step: '6_cache', data: cache })
        } catch (e: any) {
            results.push({ step: '6_cache', error: e.message?.substring(0, 60) })
        }
        
        // STEP 7: Verificar se existem tabelas essenciais
        const tables = ['historico_conversas', 'status_conversa', 'fila_recontato', 'cache_respostas', 'memoria_clientes', 'feedback_iara']
        for (const table of tables) {
            try {
                await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`)
                results.push({ step: `7_table_${table}`, exists: true })
            } catch {
                results.push({ step: `7_table_${table}`, exists: false })
            }
        }

        return NextResponse.json({ timestamp: new Date().toISOString(), results })
    } catch (err: any) {
        return NextResponse.json({ error: err.message, stack: err.stack?.substring(0, 300), partialResults: results }, { status: 500 })
    }
}
