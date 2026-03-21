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

        const combos = await prisma.$queryRawUnsafe<any[]>(`
            SELECT c.id, c.nome, c.descricao, c."valorOriginal" as valor_original,
                   c."valorCombo" as valor_combo, c.ativo
            FROM combos c
            WHERE c.profissional_id = $1 AND c.ativo = true
            ORDER BY c."createdAt" DESC
        `, profId)

        // Fetch procedimentos for each combo
        for (const combo of combos) {
            const procs = await prisma.$queryRawUnsafe<any[]>(`
                SELECT p.nome FROM combo_procedimentos cp
                JOIN procedimentos p ON p.id::text = cp."procedimentoId"
                WHERE cp."comboId" = $1
            `, combo.id)
            combo.procedimentos = procs.map((p: any) => p.nome)
        }

        return NextResponse.json(combos)
    } catch (err: any) {
        console.error('[Prof/combos] GET:', err)
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
        const { nome, descricao, valorOriginal, valorCombo, procedimentoIds } = body
        if (!nome?.trim()) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            INSERT INTO combos ("clinicaId", profissional_id, nome, descricao, "valorOriginal", "valorCombo", ativo, "createdAt")
            VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
            RETURNING id
        `,
            String(clinicaId), profId, nome.trim(),
            descricao || null,
            Number(valorOriginal) || 0,
            Number(valorCombo) || 0
        )

        const comboId = rows[0].id

        // Link procedures
        if (Array.isArray(procedimentoIds)) {
            for (const procId of procedimentoIds) {
                await prisma.$executeRawUnsafe(`
                    INSERT INTO combo_procedimentos ("comboId", "procedimentoId")
                    VALUES ($1, $2) ON CONFLICT DO NOTHING
                `, comboId, String(procId))
            }
        }

        return NextResponse.json({ id: comboId })
    } catch (err: any) {
        console.error('[Prof/combos] POST:', err)
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
        const { id, nome, descricao, valorOriginal, valorCombo, procedimentoIds } = body
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM combos WHERE id = $1 AND profissional_id = $2`, id, profId
        )
        if (!existing[0]) return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 })

        await prisma.$executeRawUnsafe(`
            UPDATE combos SET nome = $1, descricao = $2, "valorOriginal" = $3, "valorCombo" = $4
            WHERE id = $5 AND profissional_id = $6
        `, nome?.trim() || '', descricao || null, Number(valorOriginal) || 0, Number(valorCombo) || 0, id, profId)

        // Relink procedures
        await prisma.$executeRawUnsafe(`DELETE FROM combo_procedimentos WHERE "comboId" = $1`, id)
        if (Array.isArray(procedimentoIds)) {
            for (const procId of procedimentoIds) {
                await prisma.$executeRawUnsafe(`
                    INSERT INTO combo_procedimentos ("comboId", "procedimentoId")
                    VALUES ($1, $2) ON CONFLICT DO NOTHING
                `, id, String(procId))
            }
        }

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/combos] PUT:', err)
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

        await prisma.$executeRawUnsafe(`UPDATE combos SET ativo = false WHERE id = $1 AND profissional_id = $2`, id, profId)
        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Prof/combos] DELETE:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
