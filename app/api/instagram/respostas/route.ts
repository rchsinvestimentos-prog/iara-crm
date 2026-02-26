import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/instagram/respostas — Listar respostas automáticas da clínica
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Verificar se plano >= 2
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true },
        })
        if (!clinica || clinica.plano < 2) {
            return NextResponse.json({
                error: 'Instagram disponível a partir do Plano Estrategista (2)',
                planoNecessario: 2,
                planoAtual: clinica?.plano || 1,
            }, { status: 403 })
        }

        // Buscar respostas do N8N (raw query pois a tabela não está no Prisma schema)
        const respostas = await prisma.$queryRawUnsafe(`
            SELECT id, tipo, gatilho, palavras_chave, respostas, acao_follow_up, dm_automatica, ativo, prioridade
            FROM respostas_automaticas_ig
            WHERE user_id = (SELECT id FROM users WHERE nome_clinica ILIKE $1 LIMIT 1)
            ORDER BY prioridade DESC, id DESC
        `, `%${clinicaId}%`) as unknown[]

        // Buscar config Instagram
        const config = await prisma.$queryRawUnsafe(`
            SELECT ig_username, ativo, responder_comentarios, responder_dms,
                   resposta_padrao_comentario, dm_padrao, horario_inicio, horario_fim
            FROM config_instagram
            WHERE user_id = (SELECT id FROM users WHERE nome_clinica ILIKE $1 LIMIT 1)
        `, `%${clinicaId}%`) as unknown[]

        return NextResponse.json({
            respostas: respostas || [],
            config: Array.isArray(config) && config.length > 0 ? config[0] : null,
            plano: clinica.plano,
        })
    } catch (err) {
        console.error('Erro em /api/instagram/respostas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/instagram/respostas — Criar/atualizar resposta automática
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { plano: true },
        })
        if (!clinica || clinica.plano < 2) {
            return NextResponse.json({ error: 'Plano 2+ necessário' }, { status: 403 })
        }

        const body = await request.json()
        const { tipo, gatilho, palavrasChave, respostas, acaoFollowUp, dmAutomatica } = body

        if (!respostas || !Array.isArray(respostas) || respostas.length === 0) {
            return NextResponse.json({ error: 'Precisa de pelo menos 1 resposta' }, { status: 400 })
        }

        // Inserir resposta automática
        await prisma.$executeRawUnsafe(`
            INSERT INTO respostas_automaticas_ig (user_id, tipo, gatilho, palavras_chave, respostas, acao_follow_up, dm_automatica)
            VALUES (
                (SELECT id FROM users WHERE nome_clinica ILIKE $1 LIMIT 1),
                $2, $3, $4::text[], $5::text[], $6, $7
            )
        `,
            `%${clinicaId}%`,
            tipo || 'comentario',
            gatilho || 'qualquer',
            `{${(palavrasChave || []).join(',')}}`,
            `{${respostas.map((r: string) => `"${r.replace(/"/g, '\\"')}"`).join(',')}}`,
            acaoFollowUp || 'enviar_dm',
            dmAutomatica || ''
        )

        return NextResponse.json({ ok: true, mensagem: 'Resposta automática salva!' })
    } catch (err) {
        console.error('Erro POST /api/instagram/respostas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE /api/instagram/respostas?id=123 — Remover resposta
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })

        await prisma.$executeRawUnsafe(`
            DELETE FROM respostas_automaticas_ig
            WHERE id = $1 AND user_id = (SELECT id FROM users WHERE nome_clinica ILIKE $2 LIMIT 1)
        `, parseInt(id), `%${clinicaId}%`)

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro DELETE /api/instagram/respostas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
