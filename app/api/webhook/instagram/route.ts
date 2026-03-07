// ============================================
// WEBHOOK: Instagram (Meta Graph API)
// ============================================
// Recebe DMs e comentários do Instagram via Meta webhook.
// Processa com IA (mesma pipeline do WhatsApp) e responde.
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import crypto from 'crypto'

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'iara_instagram_2026'
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '' // Fallback global

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// ============================================
// GET — Handshake de verificação da Meta
// ============================================
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
        console.log('[IG Webhook] ✅ Verificação OK')
        return new NextResponse(challenge, { status: 200 })
    }

    console.log('[IG Webhook] ❌ Verificação falhou — token:', token)
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// ============================================
// POST — Receber eventos (DMs + Comentários)
// ============================================
export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()

        // Verificar assinatura (segurança)
        if (META_APP_SECRET) {
            const signature = request.headers.get('x-hub-signature-256')
            if (signature) {
                const expected = 'sha256=' + crypto.createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex')
                if (signature !== expected) {
                    console.error('[IG Webhook] ❌ Assinatura inválida')
                    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
                }
            }
        }

        const body = JSON.parse(rawBody)
        console.log('[IG Webhook] Evento recebido:', JSON.stringify(body).slice(0, 500))

        // Meta exige resposta 200 imediata
        // Processar em background
        processInstagramEvent(body).catch(err =>
            console.error('[IG Webhook] Erro processando:', err)
        )

        return NextResponse.json({ received: true })

    } catch (err) {
        console.error('[IG Webhook] Erro:', err)
        return NextResponse.json({ received: true }) // Sempre 200 pra Meta
    }
}

// ============================================
// PROCESSAR EVENTO
// ============================================
async function processInstagramEvent(body: any) {
    if (body.object !== 'instagram') return

    for (const entry of body.entry || []) {
        const igAccountId = entry.id

        // Buscar clínica pelo IG account ID
        const configResult = await pool.query(
            'SELECT * FROM config_instagram WHERE ig_account_id = $1 AND ativo = true',
            [igAccountId]
        )

        if (configResult.rows.length === 0) {
            console.log(`[IG] Nenhuma config encontrada para account ${igAccountId}`)
            continue
        }

        const config = configResult.rows[0]
        const accessToken = config.meta_access_token || META_ACCESS_TOKEN

        // ──────────────────────────────
        // ROTA 1: DMs (entry.messaging)
        // ──────────────────────────────
        if (entry.messaging) {
            for (const msg of entry.messaging) {
                if (msg.message && !msg.message.is_echo) {
                    await handleDM(config, msg, accessToken)
                }
            }
        }

        // ──────────────────────────────
        // ROTA 2: Changes (comentários + DMs via changes)
        // ──────────────────────────────
        if (entry.changes) {
            for (const change of entry.changes) {
                if (change.field === 'messages') {
                    // DM via changes path
                    const value = change.value
                    if (value?.message && value?.sender?.id) {
                        await handleDM(config, {
                            sender: { id: value.sender.id },
                            message: { text: value.message.text || '', mid: value.message.mid },
                        }, accessToken)
                    }
                }

                if (change.field === 'comments') {
                    await handleComment(config, change.value, accessToken)
                }
            }
        }
    }
}

// ============================================
// PROCESSAR DM
// ============================================
async function handleDM(config: any, msg: any, accessToken: string) {
    const senderId = msg.sender?.id
    const text = msg.message?.text || ''
    const messageId = msg.message?.mid

    if (!senderId || !text) return

    console.log(`[IG DM] De ${senderId}: "${text.slice(0, 100)}"`)

    // Salvar mensagem recebida
    await pool.query(`
        INSERT INTO mensagens_instagram (user_id, ig_sender_id, tipo, direcao, conteudo)
        VALUES ($1, $2, 'dm', 'entrada', $3)
    `, [config.user_id, senderId, text])

    // Gerar resposta com IA (importar pipeline)
    let resposta = ''
    try {
        // Buscar contexto da clínica
        const clinicaResult = await pool.query(
            'SELECT * FROM users WHERE id = $1', [config.user_id]
        )
        if (clinicaResult.rows.length === 0) return
        const clinica = clinicaResult.rows[0]

        // Buscar histórico recente dessa conversa
        const histResult = await pool.query(`
            SELECT conteudo, direcao FROM mensagens_instagram
            WHERE user_id = $1 AND ig_sender_id = $2
            ORDER BY created_at DESC LIMIT 10
        `, [config.user_id, senderId])

        const historico = histResult.rows.reverse().map((m: any) =>
            m.direcao === 'entrada' ? `Cliente: ${m.conteudo}` : `IARA: ${m.conteudo}`
        ).join('\n')

        // Chamar IA
        resposta = await gerarRespostaIA(clinica, text, historico)
    } catch (err) {
        console.error('[IG DM] Erro gerando resposta IA:', err)
        resposta = config.dm_padrao || 'Oii! Já vou te atender 💜'
    }

    if (!resposta) return

    // Enviar resposta via Meta API
    try {
        const res = await fetch(
            `https://graph.facebook.com/v22.0/${config.ig_account_id}/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: resposta },
                    messaging_type: 'RESPONSE',
                    access_token: accessToken,
                }),
            }
        )

        if (!res.ok) {
            const err = await res.text()
            console.error('[IG DM] Erro enviando resposta:', err)
        } else {
            console.log(`[IG DM] ✅ Respondido para ${senderId}`)
        }
    } catch (err) {
        console.error('[IG DM] Erro fetch:', err)
    }

    // Salvar resposta enviada
    await pool.query(`
        INSERT INTO mensagens_instagram (user_id, ig_sender_id, tipo, direcao, conteudo)
        VALUES ($1, $2, 'dm', 'saida', $3)
    `, [config.user_id, senderId, resposta])

    // Atualizar como respondido
    await pool.query(`
        UPDATE mensagens_instagram SET respondido = true, resposta_ia = $1
        WHERE user_id = $2 AND ig_sender_id = $3 AND direcao = 'entrada'
        AND id = (SELECT id FROM mensagens_instagram WHERE user_id = $2 AND ig_sender_id = $3 AND direcao = 'entrada' ORDER BY created_at DESC LIMIT 1)
    `, [resposta, config.user_id, senderId])
}

// ============================================
// PROCESSAR COMENTÁRIO
// ============================================
async function handleComment(config: any, value: any, accessToken: string) {
    const commentId = value?.id
    const text = value?.text || ''
    const senderId = value?.from?.id
    const mediaId = value?.media?.id

    if (!commentId || !text) return

    console.log(`[IG Comment] "${text.slice(0, 80)}" no post ${mediaId}`)

    // Salvar comentário
    await pool.query(`
        INSERT INTO mensagens_instagram (user_id, ig_sender_id, tipo, direcao, conteudo, comment_id, media_id)
        VALUES ($1, $2, 'comentario', 'entrada', $3, $4, $5)
    `, [config.user_id, senderId || '', text, commentId, mediaId || ''])

    // Buscar respostas automáticas configuradas
    const regras = await pool.query(`
        SELECT * FROM respostas_automaticas_ig
        WHERE user_id = $1 AND ativo = true AND tipo = 'comentario'
        ORDER BY prioridade DESC
    `, [config.user_id])

    let respostaComentario = ''
    let dmTexto = ''

    for (const regra of regras.rows) {
        if (regra.gatilho === 'qualquer') {
            // Match qualquer comentário
            const respostas = regra.respostas || []
            respostaComentario = respostas[Math.floor(Math.random() * respostas.length)] || ''
            if (regra.acao_follow_up === 'enviar_dm') dmTexto = regra.dm_automatica
            break
        }

        if (regra.gatilho === 'palavra_chave') {
            const palavras = (regra.palavras_chave || []).map((p: string) => p.toLowerCase())
            const textoLower = text.toLowerCase()
            const match = palavras.some((p: string) => textoLower.includes(p))
            if (match) {
                const respostas = regra.respostas || []
                respostaComentario = respostas[Math.floor(Math.random() * respostas.length)] || ''
                if (regra.acao_follow_up === 'enviar_dm') dmTexto = regra.dm_automatica
                break
            }
        }
    }

    // Responder comentário publicamente
    if (respostaComentario) {
        try {
            await fetch(`https://graph.facebook.com/v22.0/${commentId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: respostaComentario,
                    access_token: accessToken,
                }),
            })
            console.log(`[IG Comment] ✅ Respondido: "${respostaComentario.slice(0, 50)}"`)
        } catch (err) {
            console.error('[IG Comment] Erro respondendo:', err)
        }
    }

    // Enviar DM automática
    if (dmTexto && senderId) {
        try {
            await fetch(`https://graph.facebook.com/v22.0/${config.ig_account_id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: dmTexto },
                    messaging_type: 'RESPONSE',
                    access_token: accessToken,
                }),
            })
            console.log(`[IG DM auto] ✅ DM enviada para ${senderId}`)
        } catch (err) {
            console.error('[IG DM auto] Erro:', err)
        }
    }
}

// ============================================
// IA — Gerar resposta (Claude/OpenAI)
// ============================================
async function gerarRespostaIA(clinica: any, mensagem: string, historico: string): Promise<string> {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

    const nomeAssistente = clinica.nome_assistente || 'Iara'
    const nomeDra = clinica.nome || 'a Doutora'
    const nomeClinica = clinica.nome_clinica || 'a clínica'

    const systemPrompt = `Você é ${nomeAssistente}, secretária virtual de ${nomeDra} na ${nomeClinica}.
Você está respondendo no Instagram DM (Direct).

REGRAS:
- Fale de forma super natural, coloquial, brasileira
- Use emoji com moderação (1-2 por msg)
- Seja simpática, acolhedora e objetivo/a
- Se perguntarem preço, passe o catálogo ou peça pra chamar no WhatsApp
- NUNCA diga que é IA/robô/bot
- Se perguntarem quem é: "${nomeAssistente}, da equipe da ${nomeDra} 😊"
- Mensagens curtas (1-3 frases max)
- Objetivo: agendar consulta ou tirar dúvidas

${historico ? `\nHistórico recente:\n${historico}` : ''}
`

    // Tentar Claude primeiro
    if (ANTHROPIC_API_KEY) {
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 200,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: mensagem }],
                }),
            })

            if (res.ok) {
                const data = await res.json()
                return data.content?.[0]?.text || ''
            }
        } catch (err) {
            console.error('[IG IA] Claude falhou:', err)
        }
    }

    // Fallback OpenAI
    if (OPENAI_API_KEY) {
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 200,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: mensagem },
                    ],
                }),
            })

            if (res.ok) {
                const data = await res.json()
                return data.choices?.[0]?.message?.content || ''
            }
        } catch (err) {
            console.error('[IG IA] OpenAI falhou:', err)
        }
    }

    return ''
}
