import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isProfissional, getProfissionalId, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const promos = await prisma.$queryRawUnsafe<any[]>(`
            SELECT p.id, p.nome, p.descricao, p."tipoDesconto" as tipo_desconto,
                   p."valorDesconto" as valor_desconto,
                   p."dataInicio" as data_inicio, p."dataFim" as data_fim, p.ativo
            FROM promocoes p
            WHERE p.profissional_id = $1 AND p.ativo = true
            ORDER BY p."createdAt" DESC
        `, profId)

        // Fetch linked procedures
        for (const promo of promos) {
            const procs = await prisma.$queryRawUnsafe<any[]>(`
                SELECT pr.nome FROM promocao_procedimentos pp
                JOIN procedimentos pr ON pr.id::text = pp."procedimentoId"
                WHERE pp."promocaoId" = $1
            `, promo.id)
            promo.procedimentos = procs.map((p: any) => p.nome)
        }

        return NextResponse.json(promos)
    } catch (err: any) {
        console.error('[Prof/promocoes] GET:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        const profId = getProfissionalId(session)
        const clinicaId = await getClinicaId(session)
        if (!profId || !clinicaId) return NextResponse.json({ error: 'IDs não encontrados' }, { status: 404 })

        const body = await request.json()
        const { nome, descricao, tipoDesconto, valorDesconto, dataInicio, dataFim, procedimentoIds } = body
        if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        if (!dataInicio || !dataFim) return NextResponse.json({ error: 'Datas são obrigatórias' }, { status: 400 })

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            INSERT INTO promocoes
                ("clinicaId", profissional_id, nome, descricao, "tipoDesconto", "valorDesconto", "dataInicio", "dataFim", ativo, "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
            RETURNING id
        `,
            String(clinicaId), profId, nome.trim(),
            descricao || null,
            tipoDesconto || 'percentual',
            Number(valorDesconto) || 0,
            new Date(dataInicio), new Date(dataFim)
        )

        const promoId = rows[0].id

        if (Array.isArray(procedimentoIds)) {
            for (const procId of procedimentoIds) {
                await prisma.$executeRawUnsafe(`
                    INSERT INTO promocao_procedimentos ("promocaoId", "procedimentoId")
                    VALUES ($1, $2) ON CONFLICT DO NOTHING
                `, promoId, String(procId))
            }
        }

        return NextResponse.json({ id: promoId })
    } catch (err: any) {
        console.error('[Prof/promocoes] POST:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const body = await request.json()
        const { id, nome, descricao, tipoDesconto, valorDesconto, dataInicio, dataFim, procedimentoIds } = body
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM promocoes WHERE id = $1 AND profissional_id = $2`, id, profId
        )
        if (!existing[0]) return NextResponse.json({ error: 'Promoção não encontrada' }, { status: 404 })

        await prisma.$executeRawUnsafe(`
            UPDATE promocoes SET
                nome = $1, descricao = $2, "tipoDesconto" = $3, "valorDesconto" = $4,
                "dataInicio" = $5, "dataFim" = $6
            WHERE id = $7 AND profissional_id = $8
        `,
            nome?.trim() || '', descricao || null,
            tipoDesconto || 'percentual', Number(valorDesconto) || 0,
            new Date(dataInicio), new Date(dataFim), id, profId
        )

        await prisma.$executeRawUnsafe(`DELETE FROM promocao_procedimentos WHERE "promocaoId" = $1`, id)
        if (Array.isArray(procedimentoIds)) {
            for (const procId of procedimentoIds) {
                await prisma.$executeRawUnsafe(`
                    INSERT INTO promocao_procedimentos ("promocaoId", "procedimentoId")
                    VALUES ($1, $2) ON CONFLICT DO NOTHING
                `, id, String(procId))
            }
        }

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/promocoes] PUT:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'ID não encontrado' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        await prisma.$executeRawUnsafe(`UPDATE promocoes SET ativo = false WHERE id = $1 AND profissional_id = $2`, id, profId)
        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/promocoes] DELETE:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
