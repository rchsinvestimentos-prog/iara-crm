import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const SwitchPlanSchema = z.object({
    nivel: z.number().int().min(1).max(4),
})

// POST /api/clinica/switch-plan-test
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        
        // Permitir apenas se a role for 'tester'
        const isTester = (session?.user as any)?.role === 'tester'
        if (!isTester) {
            return NextResponse.json({ error: 'Apenas usuários testadores podem alternar planos de teste.' }, { status: 403 })
        }

        const clinicaId = await getClinicaId(session)
        if (!clinicaId) {
            return NextResponse.json({ error: 'Clínica não autorizada' }, { status: 401 })
        }

        const body = await request.json()
        const validated = SwitchPlanSchema.parse(body)

        // Atualizar o plano no banco
        const updated = await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                nivel: validated.nivel,
                plano: validated.nivel === 1 ? 'Essencial' : validated.nivel === 2 ? 'Pro' : validated.nivel === 3 ? 'Premium' : 'VIP/Unlimited',
                updatedAt: new Date(),
            },
            select: {
                id: true,
                nomeClinica: true,
                email: true,
                nivel: true,
                plano: true,
            }
        })

        return NextResponse.json({ ok: true, clinica: updated })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/clinica/switch-plan-test] Erro:', err)
        return NextResponse.json({ error: 'Erro ao alternar plano' }, { status: 500 })
    }
}
