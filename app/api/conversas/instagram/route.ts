import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Helper: buscar username do Instagram via Meta API ──
async function fetchIGUsername(senderId: string, accessToken: string): Promise<string | null> {
    try {
        const r = await fetch(`https://graph.facebook.com/v22.0/${senderId}?fields=name,username&access_token=${accessToken}`)
        if (!r.ok) return null
        const d = await r.json()
        if (d.username) return `@${d.username}`
        if (d.name) return d.name
        return null
    } catch {
        return null
    }
}

// ── Helper: buscar token de acesso da config Instagram da clínica ──
async function getIGAccessToken(clinicaId: number): Promise<string | null> {
    try {
        const configs = await prisma.$queryRawUnsafe<any[]>(
            'SELECT meta_access_token, page_id FROM config_instagram WHERE user_id = $1 AND ativo = true LIMIT 1', clinicaId
        )
        if (!configs.length) return null
        const config = configs[0]
        // Tentar obter Page Token (mais permissivo)
        try {
            const ptRes = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}?fields=access_token&access_token=${config.meta_access_token}`)
            if (ptRes.ok) {
                const ptData = await ptRes.json()
                if (ptData.access_token) return ptData.access_token
            }
        } catch { /* fallback */ }
        return config.meta_access_token || null
    } catch {
        return null
    }
}

// GET /api/conversas/instagram?sender=ID  → histórico
// GET /api/conversas/instagram            → lista de threads
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const sender = searchParams.get('sender')

        if (sender) {
            // Histórico de uma conversa específica
            const msgs = await prisma.$queryRawUnsafe<any[]>(`
                SELECT id, ig_sender_id, tipo, direcao, conteudo, created_at
                FROM mensagens_instagram
                WHERE user_id = $1 AND ig_sender_id = $2
                ORDER BY created_at ASC
                LIMIT 200
            `, clinicaId, sender)

            return NextResponse.json({
                sender,
                mensagens: msgs.map((m: any) => ({
                    id: Number(m.id),
                    role: m.direcao === 'saida' ? 'assistant' : 'user',
                    content: m.conteudo || '',
                    tipo: m.tipo,
                    data: m.created_at,
                }))
            })
        }

        // Lista de threads agrupadas por sender
        const threads = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                ig_sender_id,
                MAX(ig_sender_name) as ig_sender_name,
                MAX(created_at) as ultima_data,
                (SELECT conteudo FROM mensagens_instagram m2 
                 WHERE m2.user_id = $1 AND m2.ig_sender_id = mi.ig_sender_id 
                 ORDER BY m2.created_at DESC LIMIT 1) as ultima_mensagem,
                COUNT(*)::bigint as total_mensagens,
                (SELECT COUNT(*)::bigint FROM mensagens_instagram m3
                 WHERE m3.user_id = $1 AND m3.ig_sender_id = mi.ig_sender_id AND m3.direcao = 'entrada') as msgs_entrada
            FROM mensagens_instagram mi
            WHERE user_id = $1
            GROUP BY ig_sender_id
            ORDER BY MAX(created_at) DESC
            LIMIT 100
        `, clinicaId)

        // ── Backfill: buscar nomes que estão faltando ──
        const semNome = threads.filter((t: any) => !t.ig_sender_name)
        if (semNome.length > 0) {
            const token = await getIGAccessToken(clinicaId)

            await Promise.allSettled(
                semNome.map(async (t: any) => {
                    let nome: string | null = null

                    // Tentativa 1: Meta API (se tiver token)
                    if (token) {
                        nome = await fetchIGUsername(t.ig_sender_id, token)
                    }

                    // Tentativa 2: Extrair nome do greeting da IARA ("Oi Tatiane! 😊")
                    if (!nome) {
                        try {
                            const primeiraResposta = await prisma.$queryRawUnsafe<any[]>(
                                `SELECT conteudo FROM mensagens_instagram 
                                 WHERE user_id = $1 AND ig_sender_id = $2 AND direcao = 'saida'
                                 ORDER BY created_at ASC LIMIT 1`,
                                clinicaId, t.ig_sender_id
                            )
                            if (primeiraResposta.length > 0) {
                                const texto = primeiraResposta[0].conteudo || ''
                                // Padrões comuns: "Oi Nome!", "Olá Nome!", "Oi Nome,", "Oi, Nome!"
                                const match = texto.match(/^(?:Oi[i!,]?\s+|Ol[áa][!,]?\s+|Hey\s+|Oi,?\s*)([A-ZÀ-Ú][a-zà-ú]+)/i)
                                if (match && match[1]) {
                                    nome = match[1]
                                }
                            }
                        } catch { /* silenciar */ }
                    }

                    // Tentativa 3: Pegar da primeira mensagem do usuário (se mencionar nome)
                    if (!nome) {
                        try {
                            const primeiraMsg = await prisma.$queryRawUnsafe<any[]>(
                                `SELECT conteudo FROM mensagens_instagram 
                                 WHERE user_id = $1 AND ig_sender_id = $2 AND direcao = 'entrada'
                                 ORDER BY created_at ASC LIMIT 1`,
                                clinicaId, t.ig_sender_id
                            )
                            if (primeiraMsg.length > 0) {
                                const texto = primeiraMsg[0].conteudo || ''
                                // Se a primeira msg for curta (nome ou oi), pode ser o nome
                                const matchNome = texto.match(/^(?:meu nome [ée]\s+|me chamo\s+|sou (?:a |o )?)?([A-ZÀ-Ú][a-zà-ú]+)(?:\s|$|,|!)/i)
                                if (matchNome && matchNome[1] && matchNome[1].length > 2 && !['Oi', 'Olá', 'Ola', 'Bom', 'Boa', 'Quero', 'Quanto', 'Qual', 'Gostaria', 'Preciso'].includes(matchNome[1])) {
                                    nome = matchNome[1]
                                }
                            }
                        } catch { /* silenciar */ }
                    }

                    if (nome) {
                        t.ig_sender_name = nome
                        // Atualizar no banco pra não precisar buscar de novo
                        await prisma.$executeRawUnsafe(
                            `UPDATE mensagens_instagram SET ig_sender_name = $1 WHERE user_id = $2 AND ig_sender_id = $3 AND ig_sender_name IS NULL`,
                            nome, clinicaId, t.ig_sender_id
                        ).catch(() => {})
                    }
                })
            )
        }

        return NextResponse.json({
            threads: threads.map((t: any) => ({
                senderId: t.ig_sender_id,
                nome: t.ig_sender_name || `ID ${t.ig_sender_id.slice(-6)}`,
                ultimaMensagem: (t.ultima_mensagem || '').replace('[FALHA_ENVIO] ', ''),
                ultimaData: t.ultima_data,
                totalMensagens: Number(t.total_mensagens),
                falhaEnvio: (t.ultima_mensagem || '').includes('[FALHA_ENVIO]'),
            }))
        })
    } catch (err) {
        console.error('[IG Conversas]', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/conversas/instagram — Envia mensagem manual (quando tiver Advanced Access)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { senderId, texto } = await request.json()
        if (!senderId || !texto) return NextResponse.json({ error: 'senderId e texto obrigatórios' }, { status: 400 })

        // Buscar config
        const configs = await prisma.$queryRawUnsafe<any[]>(
            'SELECT * FROM config_instagram WHERE user_id = $1 AND ativo = true LIMIT 1', clinicaId
        )
        if (!configs.length) return NextResponse.json({ error: 'Instagram não conectado' }, { status: 400 })
        const config = configs[0]

        // Obter Page Token
        const ptRes = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}?fields=access_token&access_token=${config.meta_access_token}`)
        const ptData = await ptRes.json()
        const pageToken = ptData.access_token || config.meta_access_token

        // Enviar via Graph API
        const sendRes = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: texto },
                messaging_type: 'RESPONSE',
                access_token: pageToken,
            }),
        })
        const sendData = await sendRes.json()

        if (!sendRes.ok) {
            return NextResponse.json({ error: sendData.error?.message || 'Erro ao enviar' }, { status: 400 })
        }

        // Salvar no banco
        await prisma.$executeRawUnsafe(
            `INSERT INTO mensagens_instagram (user_id, ig_sender_id, tipo, direcao, conteudo) VALUES ($1, $2, 'dm', 'saida', $3)`,
            clinicaId, senderId, texto
        )

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
