import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Limites por plano
function getMaxProfissionais(plano: string | null | undefined, nivel: number): number {
    const p = plano?.toLowerCase() || ''
    if (p.includes('4') || nivel >= 4) return 11 // dona + 10
    if (p.includes('3') || nivel >= 3) return 6  // dona + 5
    if (p.includes('2') || nivel >= 2) return 4  // dona + 3
    return 1 // plano 1: só a dona
}

// GET: Listar profissionais da clínica
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { email: session.user.email },
            select: { id: true, plano: true, nivel: true }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Usar SQL raw para evitar problema Prisma Client
        const profissionais = await prisma.$queryRawUnsafe<any[]>(`
            SELECT p.*, 
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'id', proc.id,
                        'nome', proc.nome,
                        'valor', proc.preco_normal,
                        'desconto', proc.preco_minimo,
                        'parcelas', proc.parcelamento_padrao,
                        'duracao', proc.duracao_minutos,
                        'descricao', proc.descricao,
                        'posProcedimento', proc.pos_procedimento
                    )) FROM procedimentos proc WHERE proc.profissional_id = p.id AND proc.ativo = true),
                    '[]'::json
                ) as procedimentos
            FROM profissionais p 
            WHERE p.clinica_id = $1 
            ORDER BY p.is_dono DESC, p.ordem ASC, p.created_at ASC
        `, clinica.id)

        const max = getMaxProfissionais(clinica.plano, clinica.nivel)

        // Mapear nomes de colunas snake_case para camelCase
        const mapped = profissionais.map((p: any) => ({
            id: p.id,
            clinicaId: p.clinica_id,
            nome: p.nome,
            tratamento: p.tratamento,
            bio: p.bio,
            especialidade: p.especialidade,
            diferenciais: p.diferenciais,
            whatsapp: p.whatsapp,
            cursos: p.cursos,
            redesSociais: p.redes_sociais_prof,
            horarioSemana: p.horario_semana,
            almocoSemana: p.almoco_semana,
            atendeSabado: p.atende_sabado,
            horarioSabado: p.horario_sabado,
            atendeDomingo: p.atende_domingo,
            horarioDomingo: p.horario_domingo,
            intervaloAtendimento: p.intervalo_atendimento,
            ausencias: p.ausencias,
            linkAgendamento: p.link_agendamento,
            fotoUrl: p.foto_url,
            chavePix: p.chave_pix,
            linkPagamento: p.link_pagamento,
            isDono: p.is_dono,
            ativo: p.ativo,
            ordem: p.ordem,
            createdAt: p.created_at,
            // Google Calendar status
            googleCalendarToken: p.google_calendar_token || null,
            googleCalendarId: p.google_calendar_id || null,
            procedimentos: (p.procedimentos || []).map((proc: any) => ({
                ...proc,
                valor: Number(proc.valor) || 0,
                desconto: Number(proc.desconto) || 0,
            })),
        }))

        return NextResponse.json({
            profissionais: mapped,
            total: mapped.length,
            max,
            plano: clinica.plano,
            nivel: clinica.nivel,
        })
    } catch (error: any) {
        console.error('GET /api/clinica/profissionais error:', error)
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
}

// POST: Criar profissional
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { email: session.user.email },
            select: { id: true, plano: true, nivel: true, nomeDoutora: true, nome: true, diferenciais: true }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const max = getMaxProfissionais(clinica.plano, clinica.nivel)

        // Usar SQL raw para count em caso de problema com Prisma Client
        let count = 0
        try {
            count = await prisma.profissional.count({ where: { clinicaId: clinica.id } })
        } catch (countErr: any) {
            // Fallback: usar SQL raw
            console.error('Prisma count falhou, tentando SQL raw:', countErr.message)
            const rawCount = await prisma.$queryRawUnsafe<any[]>(
                `SELECT COUNT(*)::int as total FROM profissionais WHERE clinica_id = $1`, clinica.id
            )
            count = rawCount[0]?.total || 0
        }

        if (count >= max) {
            return NextResponse.json({
                error: `Limite de ${max} profissional(is) atingido. Faça upgrade do plano para adicionar mais.`
            }, { status: 403 })
        }

        const body = await req.json()

        // Usar SQL raw para criar, evitando problema Prisma Client desatualizado
        const result = await prisma.$queryRawUnsafe<any[]>(`
            INSERT INTO profissionais (
                id, clinica_id, nome, tratamento, bio, especialidade, diferenciais,
                whatsapp, cursos, redes_sociais_prof, horario_semana, almoco_semana,
                atende_sabado, horario_sabado, atende_domingo, horario_domingo,
                intervalo_atendimento, ausencias, link_agendamento, foto_url,
                chave_pix, link_pagamento, is_dono, ativo, ordem, created_at
            ) VALUES (
                gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
                $7, $8::jsonb, $9::jsonb, $10, $11,
                $12, $13, $14, $15,
                $16, '[]'::jsonb, $17, $18,
                $19, $20, $21, true, $22, NOW()
            ) RETURNING *
        `,
            clinica.id,
            body.nome || 'Sem nome',
            body.tratamento || null,
            body.bio || null,
            body.especialidade || null,
            body.diferenciais || null,
            body.whatsapp || null,
            JSON.stringify(body.cursos || []),
            JSON.stringify(body.redesSociais || {}),
            body.horarioSemana || null,
            body.almocoSemana || null,
            body.atendeSabado ?? false,
            body.horarioSabado || null,
            body.atendeDomingo ?? false,
            body.horarioDomingo || null,
            body.intervaloAtendimento ?? null,
            body.linkAgendamento || null,
            body.fotoUrl || null,
            body.chavePix || null,
            body.linkPagamento || null,
            body.isDono || false,
            body.ordem ?? count,
        )

        return NextResponse.json(result[0] || { ok: true }, { status: 201 })
    } catch (error: any) {
        console.error('POST /api/clinica/profissionais error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno', code: error.code }, { status: 500 })
    }
}

// PUT: Atualizar profissional
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { email: session.user.email },
            select: { id: true }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const body = await req.json()
        if (!body.id) {
            return NextResponse.json({ error: 'ID do profissional é obrigatório' }, { status: 400 })
        }

        // Verificar que pertence à clínica via SQL raw
        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, is_dono FROM profissionais WHERE id = $1 AND clinica_id = $2 LIMIT 1`,
            body.id, clinica.id
        )

        if (!existing.length) {
            return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
        }

        // Update via SQL raw
        await prisma.$executeRawUnsafe(`
            UPDATE profissionais SET
                nome = COALESCE($2, nome),
                tratamento = $3,
                bio = $4,
                especialidade = $5,
                diferenciais = $6,
                whatsapp = $7,
                cursos = COALESCE($8::jsonb, cursos),
                redes_sociais_prof = COALESCE($9::jsonb, redes_sociais_prof),
                horario_semana = $10,
                almoco_semana = $11,
                atende_sabado = COALESCE($12, atende_sabado),
                horario_sabado = $13,
                atende_domingo = COALESCE($14, atende_domingo),
                horario_domingo = $15,
                intervalo_atendimento = $16,
                link_agendamento = $17,
                foto_url = $18,
                chave_pix = $19,
                link_pagamento = $20,
                ausencias = COALESCE($21::jsonb, ausencias)
            WHERE id = $1
        `,
            body.id,
            body.nome || null,
            body.tratamento ?? null,
            body.bio ?? null,
            body.especialidade ?? null,
            body.diferenciais ?? null,
            body.whatsapp ?? null,
            body.cursos ? JSON.stringify(body.cursos) : null,
            body.redesSociais ? JSON.stringify(body.redesSociais) : null,
            body.horarioSemana ?? null,
            body.almocoSemana ?? null,
            body.atendeSabado ?? null,
            body.horarioSabado ?? null,
            body.atendeDomingo ?? null,
            body.horarioDomingo ?? null,
            body.intervaloAtendimento ?? null,
            body.linkAgendamento || null,
            body.fotoUrl ?? null,
            body.chavePix ?? null,
            body.linkPagamento ?? null,
            body.ausencias ? JSON.stringify(body.ausencias) : null,
        )

        return NextResponse.json({ ok: true, id: body.id })
    } catch (error: any) {
        console.error('PUT /api/clinica/profissionais error:', error)
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
}

// DELETE: Remover profissional (não permite remover a dona)
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { email: session.user.email },
            select: { id: true }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const url = new URL(req.url)
        const id = url.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, is_dono FROM profissionais WHERE id = $1 AND clinica_id = $2 LIMIT 1`,
            id, clinica.id
        )

        if (!rows.length) {
            return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
        }

        if (rows[0].is_dono) {
            return NextResponse.json({ error: 'Não é possível remover a dona da clínica' }, { status: 403 })
        }

        // Desvincular procedimentos
        await prisma.$executeRawUnsafe(
            `UPDATE procedimentos SET profissional_id = NULL WHERE profissional_id = $1`, id
        )

        await prisma.$executeRawUnsafe(
            `DELETE FROM profissionais WHERE id = $1`, id
        )

        return NextResponse.json({ ok: true })
    } catch (error: any) {
        console.error('DELETE /api/clinica/profissionais error:', error)
        return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }
}
