import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// GET /api/clinicas — lista todas as clínicas do usuário (principal + filhas)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const userId = Number(session.user.id)

        const clinicas = await prisma.clinica.findMany({
            where: {
                OR: [
                    { id: userId },
                    { parentId: userId },
                ],
            },
            select: {
                id: true,
                nomeClinica: true,
                nome: true,
                endereco: true,
                nivel: true,
                whatsappClinica: true,
            },
            orderBy: { id: 'asc' },
        })

        return NextResponse.json(clinicas)
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

const CreateClinicaSchema = z.object({
    nomeClinica: z.string().min(1).max(200),
    endereco: z.string().max(500).optional(),
    whatsappClinica: z.string().max(20).optional(),
})

// POST /api/clinicas — cria nova clínica filha
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const userId = Number(session.user.id)

        // Buscar dados do parent pra herdar plano, email, senha
        const parent = await prisma.clinica.findUnique({ where: { id: userId } })
        if (!parent) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

        // Verificar limite de clínicas
        const filhas = await prisma.clinica.count({ where: { parentId: userId } })
        const maxClinicas = (parent.maxInstanciasWhatsapp || 1) - 1 // -1 porque a principal já conta
        if (filhas >= Math.max(maxClinicas, 0)) {
            return NextResponse.json({ error: 'Limite de clínicas atingido. Faça upgrade para adicionar mais.' }, { status: 403 })
        }

        const body = await request.json()
        const validated = CreateClinicaSchema.parse(body)

        // Criar clínica filha herdando dados do parent
        const novaClinica = await prisma.clinica.create({
            data: {
                nome: validated.nomeClinica,
                nomeClinica: validated.nomeClinica,
                email: `${parent.email}+${filhas + 2}`, // email único derivado
                senha: parent.senha, // mesma senha
                role: 'cliente',
                parentId: userId,
                nivel: parent.nivel,
                plano: parent.plano,
                nomeAssistente: parent.nomeAssistente || 'IARA',
                endereco: validated.endereco || null,
                whatsappClinica: validated.whatsappClinica || null,
                creditosMensais: parent.creditosMensais,
                creditosDisponiveis: parent.creditosDisponiveis,
            },
            select: {
                id: true,
                nomeClinica: true,
                endereco: true,
            },
        })

        return NextResponse.json(novaClinica)
    } catch (err) {
        if (err instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        console.error('[POST /api/clinicas] Erro:', err)
        return NextResponse.json({ error: 'Erro ao criar clínica' }, { status: 500 })
    }
}
