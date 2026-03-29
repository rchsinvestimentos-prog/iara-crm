import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ConversaRow {
    telefone: string
    nome: string
    ultima_mensagem: string
    ultima_data: string
    total_mensagens: bigint
    origem: string
}

interface MensagemRow {
    id: number
    role: string
    content: string
    push_name: string | null
    origem: string | null
    created_at: string
}

// Garantir que a tabela existe antes de consultar
async function ensureHistoricoTable() {
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS historico_conversas (
                id SERIAL PRIMARY KEY,
                user_id INT,
                telefone_cliente VARCHAR(50),
                role VARCHAR(20),
                content TEXT,
                push_name VARCHAR(200),
                origem VARCHAR(30) DEFAULT 'whatsapp',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `)
    } catch { /* silenciar se já existir */ }
}

// GET /api/conversas — Lista todas as conversas agrupadas por telefone
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Garantir tabela existe (não quebra se já existir)
        await ensureHistoricoTable()

        const { searchParams } = new URL(request.url)
        const telefone = searchParams.get('telefone')

        // Se veio um telefone, retorna o histórico completo dessa conversa
        if (telefone) {
            const mensagens = await prisma.$queryRaw<MensagemRow[]>`
                SELECT 
                    id,
                    role,
                    COALESCE(content, '') as content,
                    push_name,
                    origem,
                    created_at
                FROM historico_conversas
                WHERE user_id = ${clinicaId}
                  AND telefone_cliente = ${telefone}
                ORDER BY created_at ASC
                LIMIT 200
            `

            return NextResponse.json({
                telefone,
                mensagens: mensagens.map((m: MensagemRow) => ({
                    id: Number(m.id),
                    role: m.role,
                    content: m.content,
                    pushName: m.push_name,
                    origem: m.origem,
                    data: m.created_at,
                })),
            })
        }

        // Senão, retorna a lista de conversas (agrupadas por telefone)
        const conversas = await prisma.$queryRaw<ConversaRow[]>`
            SELECT 
                hc.telefone_cliente as telefone,
                COALESCE(MAX(hc.push_name), hc.telefone_cliente) as nome,
                (SELECT content FROM historico_conversas h2 
                 WHERE h2.user_id = ${clinicaId} 
                   AND h2.telefone_cliente = hc.telefone_cliente 
                 ORDER BY h2.created_at DESC LIMIT 1) as ultima_mensagem,
                MAX(hc.created_at) as ultima_data,
                COUNT(*)::bigint as total_mensagens,
                COALESCE(MAX(hc.origem), 'whatsapp') as origem
            FROM historico_conversas hc
            WHERE hc.user_id = ${clinicaId}
            GROUP BY hc.telefone_cliente
            ORDER BY MAX(hc.created_at) DESC
            LIMIT 100
        `

        return NextResponse.json({
            conversas: conversas.map((c: ConversaRow) => ({
                telefone: c.telefone,
                nome: c.nome || c.telefone,
                ultimaMensagem: c.ultima_mensagem || '',
                ultimaData: c.ultima_data,
                totalMensagens: Number(c.total_mensagens),
                origem: c.origem || 'whatsapp',
            })),
        })
    } catch (err: any) {
        const msg = err?.message || String(err)
        console.error('Erro em /api/conversas:', msg)
        // Retornar o erro real para facilitar o diagnóstico
        return NextResponse.json({ error: 'Erro interno', detalhe: msg }, { status: 500 })
    }
}
