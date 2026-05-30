import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schemas — types match actual DB columns
const CreateProcSchema = z.object({
    nome: z.string().min(1).max(100),
    valor: z.number().min(0).max(999999),
    desconto: z.number().min(0).max(999999).optional().default(0),
    parcelas: z.number().int().min(0).max(999).optional().nullable(),
    duracao: z.number().int().min(0).max(1440).optional().default(0),
    descricao: z.string().max(5000).optional().nullable(),
    posProcedimento: z.string().max(5000).optional().nullable(),
    profissionalId: z.string().optional().nullable(),
    profissionalIds: z.array(z.string()).optional().default([]),
})

const UpdateProcSchema = CreateProcSchema.extend({
    id: z.number().int(),
})

// GET /api/procedimentos
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        
        // Buscar procedimentos com nomes dos profissionais
        const procedimentos = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                p.id, p.nome, p.preco_normal as "valor", p.preco_minimo as "desconto",
                p.parcelamento_padrao as "parcelas", p.duracao_minutos as "duracao",
                p.descricao, p.pos_procedimento as "posProcedimento",
                p.profissional_id as "profissionalId",
                COALESCE(p.profissional_ids, '[]'::jsonb) as "profissionalIds",
                p.created_at as "createdAt"
            FROM procedimentos p
            WHERE p.user_id = $1 AND p.ativo = true
            ORDER BY p.created_at DESC
        `, cid)

        // Buscar todos os profissionais da clínica para mapear nomes
        const profissionais = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, nome, tratamento FROM profissionais WHERE clinica_id = $1 AND ativo = true ORDER BY ordem ASC`,
            cid
        )
        const profMap = new Map(profissionais.map((pr: any) => [pr.id, pr]))

        // Enriquecer procedimentos com nomes dos profissionais
        const result = procedimentos.map((p: any) => {
            const ids: string[] = Array.isArray(p.profissionalIds) ? p.profissionalIds : []
            const profissionaisInfo = ids
                .map((id: string) => profMap.get(id))
                .filter(Boolean)
                .map((pr: any) => ({ id: pr.id, nome: pr.nome, tratamento: pr.tratamento }))

            return {
                ...p,
                valor: Number(p.valor),
                desconto: Number(p.desconto),
                profissionalIds: ids,
                profissionaisInfo,
            }
        })

        return NextResponse.json(result)
    } catch (err) {
        console.error('[GET /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/procedimentos
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = CreateProcSchema.parse(body)

        const result = await prisma.$queryRawUnsafe<any[]>(`
            INSERT INTO procedimentos (
                user_id, nome, preco_normal, preco_minimo, parcelamento_padrao, 
                duracao_minutos, descricao, pos_procedimento, 
                profissional_id, profissional_ids,
                ativo, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, true, NOW())
            RETURNING id, nome, preco_normal as "valor", preco_minimo as "desconto", 
                parcelamento_padrao as "parcelas", duracao_minutos as "duracao", 
                descricao, pos_procedimento as "posProcedimento", 
                profissional_id as "profissionalId",
                profissional_ids as "profissionalIds"
        `,
            Number(clinicaId),
            validated.nome,
            validated.valor,
            validated.desconto ?? 0,
            validated.parcelas ?? null,
            validated.duracao ?? 0,
            validated.descricao ?? null,
            validated.posProcedimento ?? null,
            validated.profissionalId ?? null,
            JSON.stringify(validated.profissionalIds || []),
        )

        return NextResponse.json({
            ...result[0],
            valor: Number(result[0].valor),
            desconto: Number(result[0].desconto),
        })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao criar', details: String(err) }, { status: 500 })
    }
}

// PUT /api/procedimentos
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = UpdateProcSchema.parse(body)

        // Verificar que o procedimento pertence à clínica
        const existing = await prisma.procedimento.findFirst({
            where: { id: validated.id, clinicaId: Number(clinicaId) },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
        }

        // Update com SQL raw para suportar profissional_ids
        await prisma.$executeRawUnsafe(`
            UPDATE procedimentos SET
                nome = $2,
                preco_normal = $3,
                preco_minimo = $4,
                parcelamento_padrao = $5,
                duracao_minutos = $6,
                descricao = $7,
                pos_procedimento = $8,
                profissional_id = $9,
                profissional_ids = $10::jsonb
            WHERE id = $1
        `,
            validated.id,
            validated.nome,
            validated.valor,
            validated.desconto ?? 0,
            validated.parcelas ?? null,
            validated.duracao ?? 0,
            validated.descricao ?? null,
            validated.posProcedimento ?? null,
            validated.profissionalId ?? null,
            JSON.stringify(validated.profissionalIds || []),
        )

        return NextResponse.json({ ok: true, id: validated.id })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[PUT /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao atualizar', details: String(err) }, { status: 500 })
    }
}

// DELETE /api/procedimentos
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const idStr = searchParams.get('id')
        if (!idStr) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const id = Number(idStr)
        if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

        // Verificar ownership antes de deletar
        const existing = await prisma.procedimento.findFirst({
            where: { id, clinicaId: Number(clinicaId) },
        })

        if (!existing) {
            return NextResponse.json({ error: 'Procedimento não encontrado' }, { status: 404 })
        }

        await prisma.procedimento.update({
            where: { id },
            data: { ativo: false },
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[DELETE /api/procedimentos] Erro:', err)
        return NextResponse.json({ error: 'Erro ao deletar', details: String(err) }, { status: 500 })
    }
}
