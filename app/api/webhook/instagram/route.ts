// ============================================
// WEBHOOK: Instagram (Meta Graph API)
// ============================================
// Recebe DMs e comentários do Instagram via Meta webhook.
// Processa com IA e responde.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'iara_instagram_2026'
const META_APP_SECRET = process.env.META_APP_SECRET || ''
const BELIVV_IG_WEBHOOK = process.env.BELIVV_IG_WEBHOOK_URL || ''

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

    console.log('[IG Webhook] ❌ Verificação falhou')
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// ============================================
// POST — Receber eventos (DMs + Comentários)
// ============================================
// Flag para criar tabelas apenas uma vez
let tablesEnsured = false

async function ensureTables() {
    if (tablesEnsured) return
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS mensagens_instagram (
                id SERIAL PRIMARY KEY,
                user_id INT,
                ig_sender_id VARCHAR(100),
                ig_sender_name VARCHAR(200),
                tipo VARCHAR(20) DEFAULT 'dm',
                direcao VARCHAR(10) DEFAULT 'entrada',
                conteudo TEXT,
                comment_id VARCHAR(100),
                media_id VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `)
        // Adicionar coluna caso tabela já exista sem ela
        await prisma.$executeRawUnsafe(`
            ALTER TABLE mensagens_instagram ADD COLUMN IF NOT EXISTS ig_sender_name VARCHAR(200)
        `)
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS respostas_automaticas_ig (
                id SERIAL PRIMARY KEY,
                user_id INT,
                tipo VARCHAR(30) DEFAULT 'comentario',
                gatilho VARCHAR(30) DEFAULT 'qualquer',
                palavras_chave JSONB DEFAULT '[]',
                respostas JSONB DEFAULT '[]',
                acao_follow_up VARCHAR(30),
                dm_automatica TEXT,
                prioridade INT DEFAULT 0,
                ativo BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `)
        tablesEnsured = true
        console.log('[IG Webhook] ✅ Tabelas garantidas')
    } catch (e: any) {
        console.log('[IG Webhook] ⚠️ Tabelas setup:', e.message)
    }
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()

        // === PROXY: repassar pro Be Livv (fire-and-forget) ===
        if (BELIVV_IG_WEBHOOK) {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            const sig = request.headers.get('x-hub-signature-256')
            if (sig) headers['x-hub-signature-256'] = sig
            fetch(BELIVV_IG_WEBHOOK, { method: 'POST', headers, body: rawBody })
                .catch(err => console.error('[IG Proxy] Erro repassando pro Be Livv:', err.message))
        }

        // Verificar assinatura (warn-only mode para não bloquear)
        if (META_APP_SECRET) {
            const signature = request.headers.get('x-hub-signature-256')
            if (signature) {
                const expected = 'sha256=' + crypto.createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex')
                if (signature !== expected) {
                    console.warn('[IG Webhook] ⚠️ Assinatura inválida (processando mesmo assim)')
                }
            }
        }

        const body = JSON.parse(rawBody)
        console.log('[IG Webhook] 📩 Evento recebido:', JSON.stringify(body).slice(0, 800))

        // Garantir tabelas existem
        await ensureTables()

        processInstagramEvent(body).catch(err =>
            console.error('[IG Webhook] ❌ Erro processando:', err)
        )

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('[IG Webhook] ❌ Erro geral:', err)
        return NextResponse.json({ received: true })
    }
}

// ============================================
// PROCESSAR EVENTO
// ============================================
async function processInstagramEvent(body: any) {
    if (body.object !== 'instagram') return

    for (const entry of body.entry || []) {
        const igAccountId = entry.id

        const configs = await prisma.$queryRawUnsafe<any[]>(
            'SELECT * FROM config_instagram WHERE ig_account_id = $1 AND ativo = true',
            igAccountId
        )

        if (configs.length === 0) {
            console.log(`[IG] Sem config para account ${igAccountId}`)
            continue
        }

        const config = configs[0]
        const accessToken = config.meta_access_token || ''

        // DMs (entry.messaging)
        if (entry.messaging) {
            for (const msg of entry.messaging) {
                if (msg.message && !msg.message.is_echo) {
                    await handleDM(config, msg, accessToken)
                }
            }
        }

        // Changes (comentários + DMs via changes)
        if (entry.changes) {
            for (const change of entry.changes) {
                if (change.field === 'messages') {
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
// DM
// ============================================
async function fetchIGSenderName(senderId: string, pageToken: string): Promise<string | null> {
    try {
        const r = await fetch(`https://graph.facebook.com/v22.0/${senderId}?fields=name,username&access_token=${pageToken}`)
        if (!r.ok) return null
        const d = await r.json()
        if (d.username) return `@${d.username}`
        if (d.name) return d.name
        return null
    } catch {
        return null
    }
}

async function handleDM(config: any, msg: any, accessToken: string) {
    const senderId = msg.sender?.id
    const text = msg.message?.text || ''
    if (!senderId || !text) return

    console.log(`[IG DM] De ${senderId}: "${text.slice(0, 100)}"`)

    // Tentar buscar nome do remetente na Meta API
    let senderName: string | null = null
    try {
        // Buscar page token para fazer a chamada
        const ptRes = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}?fields=access_token&access_token=${accessToken}`)
        if (ptRes.ok) {
            const ptData = await ptRes.json()
            const pageToken = ptData.access_token || accessToken
            senderName = await fetchIGSenderName(senderId, pageToken)
        }
    } catch { /* silenciar */ }

    await prisma.$executeRawUnsafe(
        `INSERT INTO mensagens_instagram (user_id, ig_sender_id, ig_sender_name, tipo, direcao, conteudo) VALUES ($1, $2, $3, 'dm', 'entrada', $4)`,
        config.user_id, senderId, senderName, text
    )

    let resposta = ''
    try {
        const users = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM users WHERE id = $1', config.user_id)
        if (users.length === 0) return
        const clinica = users[0]

        const hist = await prisma.$queryRawUnsafe<any[]>(
            `SELECT conteudo, direcao FROM mensagens_instagram WHERE user_id = $1 AND ig_sender_id = $2 ORDER BY created_at DESC LIMIT 10`,
            config.user_id, senderId
        )

        const historico = hist.reverse().map((m: any) =>
            m.direcao === 'entrada' ? `Cliente: ${m.conteudo}` : `IARA: ${m.conteudo}`
        ).join('\n')

        resposta = await gerarRespostaIA(clinica, text, historico)
    } catch (err) {
        console.error('[IG DM] Erro IA:', err)
        resposta = config.dm_padrao || 'Oii! Já vou te atender 💜'
    }

    if (!resposta) return

    let sent = false

    // Obter o Page Token real (o token salvo é User token, precisa do Page token)
    let pageToken = accessToken
    if (config.page_id) {
        try {
            const ptRes = await fetch(
                `https://graph.facebook.com/v22.0/${config.page_id}?fields=access_token&access_token=${accessToken}`
            )
            if (ptRes.ok) {
                const ptData = await ptRes.json()
                if (ptData.access_token) {
                    pageToken = ptData.access_token
                    console.log(`[IG DM] ✅ Page token obtido (${pageToken.slice(0,15)}...)`)
                }
            } else {
                console.error(`[IG DM] ⚠️ Não conseguiu Page token, usando User token`)
            }
        } catch (e: any) {
            console.error(`[IG DM] ⚠️ Erro buscando Page token:`, e.message)
        }
    }

    // Enviar via Page ID (endpoint correto para Instagram DM via Page token)
    try {
        console.log(`[IG DM] Enviando via page_id ${config.page_id}/messages com Page token...`)
        const res = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: resposta },
                messaging_type: 'RESPONSE',
                access_token: pageToken,
            }),
        })
        const resText = await res.text()
        if (res.ok) {
            console.log(`[IG DM] ✅ Enviado via page_id para ${senderId}`)
            sent = true
        } else {
            console.error(`[IG DM] ❌ page_id falhou (${res.status}):`, resText)
        }
    } catch (err: any) {
        console.error('[IG DM] Erro page_id:', err.message)
    }

    // Fallback: tentar com ig_account_id
    if (!sent) {
        try {
            console.log(`[IG DM] Fallback via ig_account_id ${config.ig_account_id}/messages...`)
            const res = await fetch(`https://graph.facebook.com/v22.0/${config.ig_account_id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: resposta },
                    messaging_type: 'RESPONSE',
                    access_token: pageToken,
                }),
            })
            const resText = await res.text()
            if (res.ok) {
                console.log(`[IG DM] ✅ Enviado via ig_account_id para ${senderId}`)
                sent = true
            } else {
                console.error(`[IG DM] ❌ ig_account_id falhou (${res.status}):`, resText)
            }
        } catch (err: any) {
            console.error('[IG DM] Erro ig_account_id:', err.message)
        }
    }

    // Salvar a resposta (com flag de envio)
    await prisma.$executeRawUnsafe(
        `INSERT INTO mensagens_instagram (user_id, ig_sender_id, tipo, direcao, conteudo) VALUES ($1, $2, 'dm', 'saida', $3)`,
        config.user_id, senderId, sent ? resposta : `[FALHA_ENVIO] ${resposta}`
    )
    
    if (!sent) {
        console.error(`[IG DM] ⚠️ TODAS tentativas de envio falharam para ${senderId}`)
    }
}

// ============================================
// COMENTÁRIO
// ============================================
async function handleComment(config: any, value: any, accessToken: string) {
    const commentId = value?.id
    const text = value?.text || ''
    const senderId = value?.from?.id
    const mediaId = value?.media?.id
    if (!commentId || !text) return

    console.log(`[IG Comment] "${text.slice(0, 80)}"`)

    await prisma.$executeRawUnsafe(
        `INSERT INTO mensagens_instagram (user_id, ig_sender_id, tipo, direcao, conteudo, comment_id, media_id) VALUES ($1, $2, 'comentario', 'entrada', $3, $4, $5)`,
        config.user_id, senderId || '', text, commentId, mediaId || ''
    )

    const regras = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM respostas_automaticas_ig WHERE user_id = $1 AND ativo = true AND tipo = 'comentario' ORDER BY prioridade DESC`,
        config.user_id
    )

    let respostaComentario = ''
    let dmTexto = ''

    for (const regra of regras) {
        if (regra.gatilho === 'qualquer') {
            const respostas = regra.respostas || []
            respostaComentario = respostas[Math.floor(Math.random() * respostas.length)] || ''
            if (regra.acao_follow_up === 'enviar_dm') dmTexto = regra.dm_automatica
            break
        }

        if (regra.gatilho === 'palavra_chave') {
            const palavras = (regra.palavras_chave || []).map((p: string) => p.toLowerCase())
            const match = palavras.some((p: string) => text.toLowerCase().includes(p))
            if (match) {
                const respostas = regra.respostas || []
                respostaComentario = respostas[Math.floor(Math.random() * respostas.length)] || ''
                if (regra.acao_follow_up === 'enviar_dm') dmTexto = regra.dm_automatica
                break
            }
        }
    }

    if (respostaComentario) {
        try {
            await fetch(`https://graph.facebook.com/v22.0/${commentId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: respostaComentario, access_token: accessToken }),
            })
        } catch (err) { console.error('[IG Comment] Erro:', err) }
    }

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
        } catch (err) { console.error('[IG DM auto] Erro:', err) }
    }
}

// ============================================
// IA
// ============================================
async function gerarRespostaIA(clinica: any, mensagem: string, historico: string): Promise<string> {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

    const nome = clinica.nome_assistente || 'Iara'
    const dra = clinica.nome || 'a Doutora'
    const clin = clinica.nome_clinica || 'a clínica'

    const sys = `Você é ${nome}, secretária virtual de ${dra} na ${clin}.
Respondendo no Instagram DM. Regras:
- Fale natural, coloquial, brasileira
- Emoji 1-2 por msg
- Simpática, objetiva
- NUNCA diga que é IA
- Se perguntarem: "${nome}, da equipe da ${dra} 😊"
- Msgs curtas (1-3 frases)
- Objetivo: agendar ou tirar dúvidas
${historico ? `\nHistórico:\n${historico}` : ''}`

    if (ANTHROPIC_API_KEY) {
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 200, system: sys, messages: [{ role: 'user', content: mensagem }] }),
            })
            if (res.ok) { const d = await res.json(); return d.content?.[0]?.text || '' }
        } catch { }
    }

    if (OPENAI_API_KEY) {
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 200, messages: [{ role: 'system', content: sys }, { role: 'user', content: mensagem }] }),
            })
            if (res.ok) { const d = await res.json(); return d.choices?.[0]?.message?.content || '' }
        } catch { }
    }

    return ''
}
