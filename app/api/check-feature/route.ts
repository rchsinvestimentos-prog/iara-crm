import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkFeature, incrementFeature } from '@/lib/feature-limits'

// POST /api/check-feature — Verificar e/ou incrementar uso de feature
// body: { feature: string, increment?: boolean }
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true },
        })
        const nivel = clinica?.nivel ?? 1

        const { feature, increment } = await request.json()
        if (!feature) return NextResponse.json({ error: 'Feature obrigatória' }, { status: 400 })

        const check = await checkFeature(clinicaId, nivel, feature)

        // Se pediu para incrementar E está permitido
        if (increment && check.permitido) {
            const novoUso = await incrementFeature(clinicaId, feature)
            const novoRestante = check.ilimitado ? -1 : Math.max(0, check.limite - novoUso)
            return NextResponse.json({
                ...check,
                usado: novoUso,
                restante: novoRestante,
                permitido: check.ilimitado || novoUso <= check.limite,
            })
        }

        return NextResponse.json(check)
    } catch (err) {
        console.error('Erro POST /api/check-feature:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
