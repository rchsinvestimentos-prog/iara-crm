import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ==========================================
// API de Diagnóstico — Suporte Técnico
// GET /api/admin/diagnostico?clinicaId=X
// POST /api/admin/diagnostico — roda testes
// ==========================================

// Mapa de erros conhecidos + soluções
const SOLUCOES: Record<string, { problema: string; solucao: string; fluxo: string }> = {
    'ECONNREFUSED': {
        problema: 'Conexão recusada com servidor externo',
        solucao: 'Verifique se a Evolution API / Twilio / ElevenLabs está online. Vá em Settings → Credentials e teste a conexão.',
        fluxo: 'F01 ou F09',
    },
    'INSUFFICIENT_CREDITS': {
        problema: 'Créditos da clínica zerados',
        solucao: 'Vá no banco → UPDATE users SET creditos = 100 WHERE id = X. Ou peça para a Dra renovar o plano.',
        fluxo: 'F03 (Catraca)',
    },
    'CLINICA_PAUSADA': {
        problema: 'IARA está pausada para esta clínica',
        solucao: 'A Dra pausou a IARA. Pode reativar pelo painel em Configurações ou pelo Menu Gerente (F13).',
        fluxo: 'F03 (Catraca)',
    },
    'CLINICA_INATIVA': {
        problema: 'Clínica com status inativo',
        solucao: 'Verifique pagamento. UPDATE users SET status = \'ativo\' WHERE id = X.',
        fluxo: 'F03 (Catraca)',
    },
    'TIMEOUT': {
        problema: 'IA demorou demais para responder',
        solucao: 'Claude/GPT pode estar com latência. O fallback GPT-4o-mini deveria ter ativado. Verifique o nó "Fallback GPT" no F06.',
        fluxo: 'F06 (Cérebro)',
    },
    'WHISPER_ERROR': {
        problema: 'Erro na transcrição de áudio',
        solucao: 'Verifique a chave da API Whisper/OpenAI. Vá em F05 → nó de transcrição → Credentials.',
        fluxo: 'F05 (Transcrição)',
    },
    'TTS_ERROR': {
        problema: 'Erro na geração de áudio (TTS)',
        solucao: 'Verifique a chave ElevenLabs ou se o voiceId da clínica é válido. F08 → nó TTS.',
        fluxo: 'F08 (Voz TTS)',
    },
    'CALENDAR_ERROR': {
        problema: 'Erro ao agendar no Google Calendar',
        solucao: 'Token do Google Calendar pode ter expirado. Reconecte em F11 → Credentials → Google Calendar.',
        fluxo: 'F11 (Agendamento)',
    },
    'EVOLUTION_ERROR': {
        problema: 'Erro ao enviar mensagem pelo WhatsApp',
        solucao: 'Evolution API pode estar fora. Verifique a instância do WhatsApp. Pode precisar reconectar o QR Code.',
        fluxo: 'F09 (Mensageiro)',
    },
    'NO_PROCEDURES': {
        problema: 'Clínica sem procedimentos cadastrados',
        solucao: 'A Dra precisa cadastrar procedimentos no painel → Configurações. Sem isso, IARA não sabe os preços.',
        fluxo: 'F06 (Cérebro)',
    },
}

// GET — Buscar dados de uma clínica + erros recentes
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const clinicaId = searchParams.get('clinicaId')

    if (!clinicaId) {
        // Lista todas as clínicas com status
        const clinicas = await prisma.$queryRawUnsafe(`
            SELECT id, nome_clinica, status, plano, creditos, idioma, 
                   canal_principal, created_at,
                   CASE WHEN creditos <= 20 THEN 'baixo' 
                        WHEN creditos <= 0 THEN 'zerado' 
                        ELSE 'ok' END as creditos_status
            FROM users 
            ORDER BY nome_clinica
        `) as any[]

        return NextResponse.json({ clinicas })
    }

    // Detalhes de uma clínica
    const clinica = await prisma.$queryRawUnsafe(`
        SELECT * FROM users WHERE id = $1
    `, parseInt(clinicaId)) as any[]

    // Últimas interações
    const ultimasMsgs = await prisma.$queryRawUnsafe(`
        SELECT telefone_cliente as telefone, role as tipo, content as mensagem, created_at 
        FROM historico_conversas 
        WHERE user_id = $1 
        ORDER BY created_at DESC LIMIT 20
    `, parseInt(clinicaId)) as any[]

    // Procedimentos
    const procedimentos = await prisma.$queryRawUnsafe(`
        SELECT nome, preco_normal as preco FROM procedimentos 
        WHERE user_id = $1
    `, parseInt(clinicaId)) as any[]

    // Diagnóstico automático
    const diagnostico: string[] = []
    const c = clinica[0]
    if (c) {
        if (c.status !== 'ativo') diagnostico.push('CLINICA_INATIVA')
        if (c.pausa_iara) diagnostico.push('CLINICA_PAUSADA')
        if ((c.creditos || 0) <= 0) diagnostico.push('INSUFFICIENT_CREDITS')
        if (procedimentos.length === 0) diagnostico.push('NO_PROCEDURES')
    }

    return NextResponse.json({
        clinica: c || null,
        ultimasMsgs,
        procedimentos,
        diagnostico: diagnostico.map(code => ({
            code,
            ...SOLUCOES[code],
        })),
        totalMsgs: ultimasMsgs.length,
    })
}

// POST — Rodar testes de conexão
export async function POST(request: NextRequest) {
    const { clinicaId, teste } = await request.json()

    const resultados: { nome: string; status: 'ok' | 'erro' | 'aviso'; detalhe: string; solucao?: string }[] = []

    // 1. Teste de banco
    try {
        const r = await prisma.$queryRawUnsafe('SELECT 1 as ok')
        resultados.push({ nome: '🐘 PostgreSQL', status: 'ok', detalhe: 'Conexão OK' })
    } catch (err: any) {
        resultados.push({
            nome: '🐘 PostgreSQL', status: 'erro', detalhe: err.message,
            solucao: 'Verifique DATABASE_URL no EasyPanel. Banco pode estar fora do ar.',
        })
    }

    // 2. Teste de clínica
    if (clinicaId) {
        try {
            const c = await prisma.$queryRawUnsafe(
                'SELECT id, nome_clinica, status, creditos, plano FROM users WHERE id = $1',
                parseInt(clinicaId)
            ) as any[]
            if (c.length === 0) {
                resultados.push({
                    nome: '🏥 Clínica', status: 'erro', detalhe: 'Clínica não encontrada no banco',
                    solucao: 'ID incorreto. Verifique na lista de clínicas.'
                })
            } else {
                const cli = c[0]
                if (cli.status !== 'ativo') {
                    resultados.push({
                        nome: '🏥 Clínica', status: 'erro', detalhe: `Status: ${cli.status}`,
                        solucao: SOLUCOES.CLINICA_INATIVA.solucao
                    })
                } else if (cli.creditos <= 0) {
                    resultados.push({
                        nome: '🏥 Clínica', status: 'erro', detalhe: `Créditos: ${cli.creditos}`,
                        solucao: SOLUCOES.INSUFFICIENT_CREDITS.solucao
                    })
                } else {
                    resultados.push({
                        nome: '🏥 Clínica', status: 'ok',
                        detalhe: `${cli.nome_clinica} | Plano ${cli.plano} | ${cli.creditos} créditos`
                    })
                }
            }
        } catch (err: any) {
            resultados.push({ nome: '🏥 Clínica', status: 'erro', detalhe: err.message })
        }
    }

    // 3. Teste Evolution API (WhatsApp)
    try {
        const evoUrl = process.env.EVOLUTION_API_URL
        const evoKey = process.env.EVOLUTION_API_KEY
        if (!evoUrl || !evoKey) {
            resultados.push({
                nome: '📱 WhatsApp (Evolution)', status: 'erro', detalhe: 'EVOLUTION_API_URL ou KEY não configurada',
                solucao: 'Adicione EVOLUTION_API_URL e EVOLUTION_API_KEY nas variáveis de ambiente.'
            })
        } else {
            const r = await fetch(`${evoUrl}/instance/fetchInstances`, {
                headers: { apikey: evoKey },
                signal: AbortSignal.timeout(5000),
            })
            if (r.ok) {
                const instances = await r.json()
                resultados.push({
                    nome: '📱 WhatsApp (Evolution)', status: 'ok',
                    detalhe: `${Array.isArray(instances) ? instances.length : '?'} instância(s) conectada(s)`
                })
            } else {
                resultados.push({
                    nome: '📱 WhatsApp (Evolution)', status: 'erro', detalhe: `HTTP ${r.status}`,
                    solucao: 'Evolution API retornou erro. Verifique se o container está rodando.'
                })
            }
        }
    } catch (err: any) {
        resultados.push({
            nome: '📱 WhatsApp (Evolution)', status: 'erro', detalhe: err.message,
            solucao: SOLUCOES.EVOLUTION_ERROR.solucao
        })
    }

    // 4. Teste Twilio (SMS)
    try {
        const sid = process.env.TWILIO_ACCOUNT_SID
        const token = process.env.TWILIO_AUTH_TOKEN
        if (!sid || !token) {
            resultados.push({
                nome: '📱 SMS (Twilio)', status: 'aviso', detalhe: 'Credenciais Twilio não configuradas',
                solucao: 'Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN para SMS nos EUA.'
            })
        } else {
            const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
                headers: { 'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
                signal: AbortSignal.timeout(5000),
            })
            if (r.ok) {
                const data = await r.json()
                resultados.push({
                    nome: '📱 SMS (Twilio)', status: 'ok',
                    detalhe: `Conta: ${data.friendly_name} | Status: ${data.status}`
                })
            } else {
                resultados.push({
                    nome: '📱 SMS (Twilio)', status: 'erro', detalhe: `HTTP ${r.status}`,
                    solucao: 'Credenciais Twilio inválidas. Verifique Account SID e Auth Token.'
                })
            }
        }
    } catch (err: any) {
        resultados.push({ nome: '📱 SMS (Twilio)', status: 'erro', detalhe: err.message })
    }

    // 5. Teste ElevenLabs (Voz)
    try {
        const key = process.env.ELEVENLABS_API_KEY
        if (!key) {
            resultados.push({
                nome: '🎤 Voz (ElevenLabs)', status: 'aviso', detalhe: 'ELEVENLABS_API_KEY não configurada',
                solucao: 'Configure para clínicas Plano 3+ que usam voz clonada.'
            })
        } else {
            const r = await fetch('https://api.elevenlabs.io/v1/user', {
                headers: { 'xi-api-key': key },
                signal: AbortSignal.timeout(5000),
            })
            if (r.ok) {
                const data = await r.json()
                resultados.push({
                    nome: '🎤 Voz (ElevenLabs)', status: 'ok',
                    detalhe: `Plano: ${data.subscription?.tier || '?'} | Characters restantes: ${data.subscription?.character_count || '?'}`
                })
            } else {
                resultados.push({
                    nome: '🎤 Voz (ElevenLabs)', status: 'erro', detalhe: `HTTP ${r.status}`,
                    solucao: SOLUCOES.TTS_ERROR.solucao
                })
            }
        }
    } catch (err: any) {
        resultados.push({ nome: '🎤 Voz (ElevenLabs)', status: 'erro', detalhe: err.message })
    }

    // 6. Teste HeyGen (Avatar)
    try {
        const key = process.env.HEYGEN_API_KEY
        if (!key) {
            resultados.push({
                nome: '🎬 Avatar (HeyGen)', status: 'aviso', detalhe: 'HEYGEN_API_KEY não configurada',
                solucao: 'Configure para clínicas Plano 4 que usam avatar.'
            })
        } else {
            resultados.push({ nome: '🎬 Avatar (HeyGen)', status: 'ok', detalhe: 'API Key configurada' })
        }
    } catch { }

    // Resumo
    const erros = resultados.filter(r => r.status === 'erro').length
    const avisos = resultados.filter(r => r.status === 'aviso').length
    const ok = resultados.filter(r => r.status === 'ok').length

    return NextResponse.json({
        resultados,
        resumo: { total: resultados.length, ok, erros, avisos },
        timestamp: new Date().toISOString(),
    })
}
