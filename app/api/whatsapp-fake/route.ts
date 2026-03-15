// ============================================
// WHATSAPP FAKE — Simulador de Pipeline Completo
// ============================================
// Testa o pipeline REAL da IARA sem precisar de Evolution API.
// O sender.ts normalmente envia pro WhatsApp — aqui, interceptamos
// a resposta e devolvemos pro frontend em vez de enviar.
//
// COMO FUNCIONA:
// 1. Frontend envia mensagem (texto ou áudio base64)
// 2. A gente monta um MensagemRecebida fake
// 3. Chama processMessage() com um "fake_instance" especial
// 4. O pipeline processa TUDO: catraca, pausa, IA, TTS, cache
// 5. Em vez de enviar pelo Evolution, capturamos a resposta
// 6. Retornamos { texto, audioBase64, logs } pro frontend

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/engine/ai-engine'
import { transcribeAudio, determineOutputType, generateTTS } from '@/lib/engine/audio'
import { checkAccess } from '@/lib/engine/catraca'

// Telefone fake para não conflitar com clientes reais
const FAKE_TELEFONE = '5511999999999'
const FAKE_PUSH_NAME = 'Tester 🧪'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Sessão inválida — faça login novamente' }, { status: 401 })
        }

        // ================================================
        // 0. RESOLVER CLÍNICA — suporta admin e cliente
        // ================================================
        const isAdminUser = (session.user as any).userType === 'admin'
        let clinicaId: number | null = null

        if (isAdminUser) {
            // Admin não tem clinicaId próprio — busca 1ª clínica ativa
            const primeira = await prisma.clinica.findFirst({
                where: { status: 'ativo' },
                orderBy: { id: 'asc' },
                select: { id: true },
            })
            clinicaId = primeira?.id ?? null
        } else {
            clinicaId = await getClinicaId(session)
        }

        if (!clinicaId || isNaN(clinicaId)) {
            return NextResponse.json({
                error: 'Nenhuma clínica encontrada. Configure sua clínica antes de usar o simulador.',
            }, { status: 401 })
        }

        const body = await request.json()
        const {
            mensagem,
            audioBase64,
            imageBase64,
            imageMimeType,
            tipoMensagem = 'text',
            historico = [],
            modoVoz = false,
            simularIsFromMe = false,
            overrideNivel,
            overrideVoz,
        } = body

        const logs: string[] = []
        const log = (msg: string) => {
            console.log(`[WA-Fake] ${msg}`)
            logs.push(msg)
        }

        if (isAdminUser) log(`👑 Admin mode — testando clínica ID ${clinicaId}`)

        // ================================================
        // 1. BUSCAR CLÍNICA
        // ================================================
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        if (!clinica) {
            return NextResponse.json({ error: `Clínica ID ${clinicaId} não encontrada` }, { status: 404 })
        }

        const cfg = (clinica.configuracoes as any) || {}
        const nivel = overrideNivel ? Number(overrideNivel) : (clinica.nivel || 1)
        log(`✅ Clínica: ${clinica.nomeClinica} (P${nivel}${overrideNivel ? ' [OVERRIDE]' : ''})`)
        if (overrideVoz) log(`🎤 Voz override: ${overrideVoz}`)

        // ================================================
        // 2. CATRACA — verificar acesso
        // ================================================
        // Verifica se a clínica está ativa e tem créditos
        // (usa a instância fake — vai falhar pois não existe, override manual)
        const creditosDisponiveis = clinica.creditosDisponiveis ?? 0

        if (clinica.status !== 'ativo') {
            return NextResponse.json({
                error: 'Clínica inativa',
                logs,
                blocked: true,
                motivo: 'clinica_inativa'
            })
        }

        if (creditosDisponiveis <= 0) {
            return NextResponse.json({
                erro: 'Sem créditos disponíveis',
                logs,
                blocked: true,
                motivo: 'sem_creditos'
            })
        }

        // ================================================
        // 3. VERIFICAR PAUSA
        // ================================================
        if (!simularIsFromMe && cfg.pausa_iara === true) {
            log('⏸️ IARA está em pausa manual — simulando silêncio')
            return NextResponse.json({
                resposta: null,
                silencio: true,
                motivo: 'pausado_manual',
                logs,
            })
        }

        // Status de conversa (pausa automática após doutora responder)
        let statusConversa: any = null
        try {
            const rows = await prisma.$queryRaw<any[]>`
                SELECT * FROM status_conversa
                WHERE clinica_id = ${clinicaId}
                AND telefone = ${FAKE_TELEFONE}
                AND expira_em > NOW()
                ORDER BY criado_em DESC
                LIMIT 1
            `
            statusConversa = rows[0] || null
        } catch { /* tabela pode não existir */ }

        if (!simularIsFromMe && statusConversa?.tipo === 'pausado') {
            log(`⏸️ Pausa ativa: tipo=${statusConversa.tipo}, expira=${statusConversa.expira_em}`)
            return NextResponse.json({
                resposta: null,
                silencio: true,
                motivo: 'pausa_doutora',
                expira: statusConversa.expira_em,
                logs,
            })
        }

        // Se a msg é "da doutora" → cria pausa 10min
        if (simularIsFromMe) {
            log('👩‍⚕️ Simulando resposta da Doutora → criando pausa 10min')
            try {
                await prisma.$executeRaw`
                    INSERT INTO status_conversa (clinica_id, telefone, tipo, expira_em, criado_em)
                    VALUES (${clinicaId}, ${FAKE_TELEFONE}, 'pausado', NOW() + INTERVAL '10 minutes', NOW())
                    ON CONFLICT (clinica_id, telefone)
                    DO UPDATE SET tipo='pausado', expira_em=NOW() + INTERVAL '10 minutes'
                `
            } catch { /* tabela pode não existir */ }

            return NextResponse.json({
                resposta: null,
                silencio: true,
                motivo: 'doutora_respondeu',
                logs,
                pausaCriada: true,
            })
        }

        // ================================================
        // 4A. TRANSCRIÇÃO DE ÁUDIO (se enviou voz)
        // ================================================
        let textoFinal = mensagem || ''
        let clienteEnviouAudio = false
        let clienteEnviouImagem = false

        if (tipoMensagem === 'audio' && audioBase64) {
            log('🎤 Transcrevendo áudio com Whisper...')
            clienteEnviouAudio = true
            const transcrito = await transcribeAudio(audioBase64)
            if (transcrito) {
                textoFinal = transcrito
                log(`✅ Transcrito: "${transcrito.slice(0, 60)}..."`)
            } else {
                log('❌ Transcrição falhou — usando texto vazio')
                textoFinal = '[áudio não transcrito]'
            }
        }

        // ================================================
        // 4B. IMAGEM — prepara para envio via Vision
        // ================================================
        if (tipoMensagem === 'image' && imageBase64) {
            clienteEnviouImagem = true
            // Detectar mime type real a partir dos primeiros bytes do base64
            const header = imageBase64.slice(0, 12)
            let mimeDetectado: string = imageMimeType || 'image/jpeg'
            if (imageBase64.startsWith('/9j/') || header.startsWith('/9j/')) mimeDetectado = 'image/jpeg'
            else if (imageBase64.startsWith('iVBOR') || header.startsWith('iVBOR')) mimeDetectado = 'image/png'
            else if (imageBase64.startsWith('UklGR') || header.startsWith('UklGR')) mimeDetectado = 'image/webp'
            log(`📷 Imagem recebida (${mimeDetectado}, ${(imageBase64.length * 0.75 / 1024).toFixed(0)}KB)`)
            // Caption da imagem (se houver)
            textoFinal = mensagem || '[cliente enviou uma foto]'
        }

        if (!textoFinal.trim() && !clienteEnviouImagem) {
            return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
        }

        // ================================================
        // 5. VERIFICAR CACHE DE RESPOSTA (6h TTL)
        // Imagens são únicas — pular cache
        // ================================================
        let respostaIA = ''
        const cacheKey = textoFinal.toLowerCase().trim().slice(0, 200)

        if (!clienteEnviouImagem && cacheKey.length > 15) {
            try {
                const cached = await prisma.$queryRaw<{ resposta: string }[]>`
                    SELECT resposta FROM cache_respostas
                    WHERE clinica_id = ${clinicaId}
                    AND chave = ${cacheKey}
                    AND criado_em > NOW() - INTERVAL '6 hours'
                    LIMIT 1
                `
                if (cached.length > 0) {
                    respostaIA = cached[0].resposta
                    log(`✅ Cache HIT! (economizou crédito de IA)`)
                }
            } catch { /* cache_respostas pode não existir */ }
        }

        // ================================================
        // 6. BUSCAR CONTEXTO + CHAMAR IA
        // ================================================
        if (!respostaIA) {
            // Buscar procedimentos
            let procedimentos: any[] = []
            try {
                procedimentos = await prisma.procedimento.findMany({
                    where: { clinicaId: String(clinicaId) },
                    take: 20,
                })
            } catch { }

            // Buscar feedbacks da Dra
            let feedbacks: string[] = []
            try {
                const feedbackRows = await prisma.$queryRaw<{ feedback: string }[]>`
                    SELECT feedback FROM feedback_iara
                    WHERE clinica_id = ${clinicaId}
                    ORDER BY criado_em DESC
                    LIMIT 10
                `
                feedbacks = feedbackRows.map(f => f.feedback)
            } catch { }

            // Buscar memória da cliente fake
            let memoria: string | null = null
            try {
                const memRows = await prisma.$queryRaw<{ resumo: string }[]>`
                    SELECT resumo FROM memoria_cliente
                    WHERE clinica_id = ${clinicaId}
                    AND telefone = ${FAKE_TELEFONE}
                    LIMIT 1
                `
                memoria = memRows[0]?.resumo || null
            } catch { }

            log(`📝 Montando system prompt (${procedimentos.length} procedimentos, ${feedbacks.length} feedbacks)`)

            // Montar system prompt IDÊNTICO ao pipeline real
            const systemPrompt = buildSystemPrompt({
                clinica: clinica as any,
                mensagem: textoFinal,
                pushName: FAKE_PUSH_NAME,
                tipoEntrada: clienteEnviouAudio ? 'audio' : 'text',
                procedimentos,
                feedbacks,
                memoria,
                agendaContext: null,
                historico: historico.slice(-10).map((h: any) => ({
                    role: h.role,
                    content: h.content,
                })),
            })

            // Chamar IA (Claude → fallback GPT)
            const anthropicKey = process.env.ANTHROPIC_API_KEY
            const openaiKey = process.env.OPENAI_API_KEY

            if (anthropicKey) {
                log(clienteEnviouImagem ? `👁️ Chamando Claude Vision...` : `🤖 Chamando Claude Sonnet...`)
                try {
                    // Montar a mensagem do usuário (texto puro ou multimodal com imagem)
                    let userMessageContent: any
                    if (clienteEnviouImagem && imageBase64) {
                        // Detectar mime type real
                        let mimeDetectado: string = imageMimeType || 'image/jpeg'
                        if (imageBase64.startsWith('/9j/')) mimeDetectado = 'image/jpeg'
                        else if (imageBase64.startsWith('iVBOR')) mimeDetectado = 'image/png'
                        else if (imageBase64.startsWith('UklGR')) mimeDetectado = 'image/webp'

                        userMessageContent = [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: mimeDetectado,
                                    data: imageBase64,
                                },
                            },
                            {
                                type: 'text',
                                text: textoFinal || 'O que você vê nessa imagem? Como posso te ajudar?',
                            },
                        ]
                        log(`👁️ Payload Vision montado (${mimeDetectado})`)
                    } else {
                        userMessageContent = textoFinal
                    }
                    const res = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': anthropicKey,
                            'anthropic-version': '2023-06-01',
                        },
                        body: JSON.stringify({
                            model: 'claude-sonnet-4-20250514',
                            max_tokens: 600,
                            system: systemPrompt,
                            messages: [
                                ...historico.slice(-6).map((h: any) => ({
                                    role: h.role === 'user' ? 'user' : 'assistant',
                                    content: h.content,
                                })),
                                { role: 'user', content: userMessageContent },
                            ],
                        }),
                    })

                    if (res.ok) {
                        const data = await res.json()
                        respostaIA = data.content?.[0]?.text || 'Sem resposta'
                        log(`✅ Claude respondeu (${respostaIA.length} chars)`)
                    } else {
                        const err = await res.text()
                        log(`⚠️ Claude erro ${res.status} — fallback GPT`)
                        throw new Error(err)
                    }
                } catch {
                    // Fallback GPT-4o (tem vision também)
                    if (openaiKey) {
                        let gptUserContent: any = textoFinal

                        // Montar mensagem com visão para o GPT-4o
                        if (clienteEnviouImagem && imageBase64) {
                            let mimeDetectado = imageMimeType || 'image/jpeg'
                            if (imageBase64.startsWith('/9j/')) mimeDetectado = 'image/jpeg'
                            else if (imageBase64.startsWith('iVBOR')) mimeDetectado = 'image/png'
                            gptUserContent = [
                                { type: 'text', text: textoFinal || 'O que você vê nessa imagem?' },
                                { type: 'image_url', image_url: { url: `data:${mimeDetectado};base64,${imageBase64}` } },
                            ]
                            log(`👁️ Fallback GPT-4o Vision`)
                        }

                        const res = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openaiKey}`,
                            },
                            body: JSON.stringify({
                                model: clienteEnviouImagem ? 'gpt-4o' : 'gpt-4o-mini',
                                max_tokens: 600,
                                messages: [
                                    { role: 'system', content: systemPrompt },
                                    ...historico.slice(-6).map((h: any) => ({
                                        role: h.role,
                                        content: h.content,
                                    })),
                                    { role: 'user', content: gptUserContent },
                                ],
                            }),
                        })
                        if (res.ok) {
                            const data = await res.json()
                            respostaIA = data.choices?.[0]?.message?.content || 'Sem resposta'
                            log(`✅ GPT-4o respondeu (fallback)`)
                        }
                    }
                }
            } else if (openaiKey) {
                log(clienteEnviouImagem ? `👁️ Chamando GPT-4o Vision...` : `🤖 Chamando GPT-4o-mini...`)
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`,
                    },
                    body: JSON.stringify({
                        model: clienteEnviouImagem ? 'gpt-4o' : 'gpt-4o-mini',
                        max_tokens: 600,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...historico.slice(-6).map((h: any) => ({
                                role: h.role,
                                content: h.content,
                            })),
                            {
                                role: 'user',
                                content: clienteEnviouImagem && imageBase64
                                    ? [
                                        { type: 'text', text: textoFinal || 'O que você vê nessa imagem?' },
                                        { type: 'image_url', image_url: { url: `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}` } },
                                      ]
                                    : textoFinal,
                            },
                        ],
                    }),
                })
                if (res.ok) {
                    const data = await res.json()
                    respostaIA = data.choices?.[0]?.message?.content || 'Sem resposta'
                    log(`✅ GPT respondeu`)
                }
            }

            if (!respostaIA) {
                return NextResponse.json({ error: 'IA não retornou resposta. Verificar API keys.' }, { status: 500 })
            }

            // Salvar no cache (só texto, não imagens)
            if (!clienteEnviouImagem && cacheKey.length > 15 && respostaIA) {
                try {
                    await prisma.$executeRaw`
                        INSERT INTO cache_respostas (clinica_id, chave, resposta, criado_em)
                        VALUES (${clinicaId}, ${cacheKey}, ${respostaIA}, NOW())
                        ON CONFLICT (clinica_id, chave) DO UPDATE SET resposta = ${respostaIA}, criado_em = NOW()
                    `
                } catch { /* cache opcional */ }
            }
        }

        // ================================================
        // 7. TTS — gerar áudio se modo voz ativo
        // ================================================
        let audioResposta: string | null = null

        if (modoVoz || clienteEnviouAudio) {
            log(`🎙️ Gerando TTS (modo voz ativo)...`)
            // Aplicar overrides de plano/voz para testes
            const clinicaOverride = { ...clinica, nivel: nivel } as any
            if (overrideVoz) {
                clinicaOverride.configuracoes = { ...cfg, tipo_voz_ativa: overrideVoz }
            }
            const configSaida = determineOutputType(clinicaOverride, true)

            if (configSaida.tipoSaida === 'audio') {
                audioResposta = await generateTTS(respostaIA, configSaida)
                if (audioResposta) {
                    log(`✅ TTS gerado (${configSaida.provedorVoz}, voz: ${configSaida.voiceId})`)
                } else {
                    log(`⚠️ TTS falhou — retornando só texto`)
                }
            }
        }

        // ================================================
        // 8. DESCONTAR CRÉDITO
        // ================================================
        try {
            await prisma.$executeRaw`
                UPDATE users
                SET creditos_disponiveis = GREATEST(0, COALESCE(creditos_disponiveis, 0) - 1),
                    total_atendimentos = COALESCE(total_atendimentos, 0) + 1
                WHERE id = ${clinicaId}
            `
            log(`💳 Crédito descontado (restam: ${creditosDisponiveis - 1})`)
        } catch { }

        // ================================================
        // 9. SALVAR HISTÓRICO NO BANCO (opcional — fake)
        // ================================================
        try {
            await prisma.$executeRaw`
                INSERT INTO historico_conversa (clinica_id, telefone, role, mensagem, criado_em)
                VALUES
                    (${clinicaId}, ${FAKE_TELEFONE}, 'user', ${textoFinal}, NOW()),
                    (${clinicaId}, ${FAKE_TELEFONE}, 'assistant', ${respostaIA}, NOW())
            `
        } catch { /* histórico opcional */ }

        return NextResponse.json({
            resposta: respostaIA,
            textoTranscrito: clienteEnviouAudio ? textoFinal : null,
            audioBase64: audioResposta,
            creditosRestantes: Math.max(0, creditosDisponiveis - 1),
            logs,
            plano: nivel,
            iaUsada: clienteEnviouImagem
                ? (process.env.ANTHROPIC_API_KEY ? 'claude-vision' : 'gpt-4o-vision')
                : (process.env.ANTHROPIC_API_KEY ? 'claude-sonnet' : 'gpt-4o-mini'),
        })

    } catch (err: any) {
        console.error('[WA-Fake] ❌ Erro:', err)
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
    }
}

// Limpar pausa do fake (para testar o retorno)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        await prisma.$executeRaw`
            DELETE FROM status_conversa
            WHERE clinica_id = ${clinicaId}
            AND telefone = ${FAKE_TELEFONE}
        `

        return NextResponse.json({ ok: true, msg: 'Pausa removida — IARA retomou' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
