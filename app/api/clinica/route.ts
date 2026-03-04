import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notificarMudancaConfig } from '@/lib/notificacao'
import { z } from 'zod'

// Validation schema
const UpdateClinicaSchema = z.object({
    nomeClinica: z.string().min(1).max(100).optional(),
    nomeAssistente: z.string().min(1).max(50).optional(),
    whatsappClinica: z.string().max(20).optional().nullable(),
    whatsappDoutora: z.string().max(20).optional().nullable(),
    tomAtendimento: z.string().max(100).optional().nullable(),
    endereco: z.string().max(500).optional().nullable(),
    diferenciais: z.string().max(2000).optional().nullable(),
    horarioInicio: z.string().max(10).optional().nullable(),
    horarioFim: z.string().max(10).optional().nullable(),
    diasFuncionamento: z.string().max(100).optional().nullable(),
})

// GET /api/clinica
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { senha, ...safe } = clinica
        return NextResponse.json(safe)
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PUT /api/clinica
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = UpdateClinicaSchema.parse(body)

        // Buscar dados atuais para comparar depois
        const dadosAntigos = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        const updated = await prisma.clinica.update({
            where: { id: clinicaId },
            data: validated,
        })

        // Enviar notificação de confirmação por WhatsApp (async, não bloqueia)
        if (dadosAntigos) {
            notificarMudancaConfig(
                clinicaId,
                dadosAntigos as unknown as Record<string, unknown>,
                validated as unknown as Record<string, unknown>
            ).catch(err => console.error('[Notificação] Erro async:', err))
        }

        const { senha, ...safe } = updated
        return NextResponse.json(safe)
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
    }
}
