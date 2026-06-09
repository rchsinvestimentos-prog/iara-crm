import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const AnamneseSchema = z.object({
    id: z.string().optional(),
    titulo: z.string().min(1).max(100),
    perguntas: z.array(z.object({
        id: z.string(),
        tipo: z.enum(['texto', 'sim_nao', 'multipla_escolha', 'foto']),
        label: z.string().min(1),
        opcoes: z.array(z.string()).optional(),
        obrigatorio: z.boolean().optional().default(false),
    })),
    procedimentoIds: z.array(z.number()).optional().default([]),
    mensagemEnvio: z.string().max(5000).optional().nullable(),
    horasAntecedencia: z.number().int().min(1).max(720).optional().default(24),
    ativo: z.boolean().optional().default(true),
})

// GET /api/anamnese
// Retorna os modelos de anamnese e as fichas preenchidas da clínica
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)

        // Buscar modelos cadastrados
        const modelos = await prisma.modeloAnamnese.findMany({
            where: { clinicaId: cid },
            orderBy: { createdAt: 'desc' }
        })

        // Buscar fichas preenchidas enriquecidas com dados do contato
        const preenchidas = await prisma.fichaPreenchida.findMany({
            where: { clinicaId: cid },
            orderBy: { dataAssinatura: 'desc' }
        })

        // Buscar contatos associados para pegar nomes rápidos
        const contatoIds = preenchidas.map(f => f.contatoId).filter(Boolean) as number[]
        const contatos = await prisma.contato.findMany({
            where: { id: { in: contatoIds } },
            select: { id: true, nome: true, telefone: true }
        })
        const contatoMap = new Map(contatos.map(c => [c.id, c]))

        const fichasFormatadas = preenchidas.map(f => ({
            ...f,
            contato: contatoMap.get(f.contatoId) || { nome: 'Paciente', telefone: '' }
        }))

        return NextResponse.json({
            modelos,
            fichas: fichasFormatadas,
        })
    } catch (err) {
        console.error('[GET /api/anamnese] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao carregar anamneses' }, { status: 500 })
    }
}

// POST /api/anamnese
// Cria ou atualiza um modelo de anamnese
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        const body = await request.json()
        const validated = AnamneseSchema.parse(body)

        if (validated.id) {
            // Atualizar existente
            // Verificar ownership
            const existing = await prisma.modeloAnamnese.findFirst({
                where: { id: validated.id, clinicaId: cid }
            })
            if (!existing) {
                return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
            }

            const updated = await prisma.modeloAnamnese.update({
                where: { id: validated.id },
                data: {
                    titulo: validated.titulo,
                    perguntas: validated.perguntas as any,
                    procedimentoIds: validated.procedimentoIds as any,
                    mensagemEnvio: validated.mensagemEnvio,
                    horasAntecedencia: validated.horasAntecedencia,
                    ativo: validated.ativo,
                }
            })

            return NextResponse.json({ ok: true, modelo: updated })
        } else {
            // Criar novo
            const created = await prisma.modeloAnamnese.create({
                data: {
                    clinicaId: cid,
                    titulo: validated.titulo,
                    perguntas: validated.perguntas as any,
                    procedimentoIds: validated.procedimentoIds as any,
                    mensagemEnvio: validated.mensagemEnvio,
                    horasAntecedencia: validated.horasAntecedencia,
                    ativo: validated.ativo,
                }
            })

            return NextResponse.json({ ok: true, modelo: created })
        }
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: JSON.stringify(err.issues) }, { status: 400 })
        }
        console.error('[POST /api/anamnese] Erro:', err)
        return NextResponse.json({ error: 'Erro ao salvar modelo de anamnese', details: err.message || String(err) }, { status: 500 })
    }
}

// DELETE /api/anamnese
// Exclui um modelo de anamnese
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
        }

        // Verificar ownership
        const existing = await prisma.modeloAnamnese.findFirst({
            where: { id, clinicaId: cid }
        })
        if (!existing) {
            return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
        }

        await prisma.modeloAnamnese.delete({
            where: { id }
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[DELETE /api/anamnese] Erro:', err)
        return NextResponse.json({ error: 'Erro ao excluir modelo de anamnese' }, { status: 500 })
    }
}
