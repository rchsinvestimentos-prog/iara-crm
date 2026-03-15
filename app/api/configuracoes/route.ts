import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/configuracoes
 * Retorna o campo configuracoes da clínica autenticada.
 * O front usa isso para carregar aniversarioConfig, features, etc.
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { configuracoes: true },
    })

    const config = (clinica?.configuracoes as any) || {}
    return NextResponse.json(config)
}

/**
 * PATCH /api/configuracoes
 * Faz merge parcial no campo configuracoes da clínica.
 * Body: { aniversarioConfig: {...}, outraCampo: ... }
 */
export async function PATCH(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()

    const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { configuracoes: true },
    })
    const configAtual = (clinica?.configuracoes as any) || {}

    // Merge raso — cada chave do body sobreescreve a chave correspondente
    const novasConfigs = { ...configAtual, ...body }

    await prisma.clinica.update({
        where: { id: clinicaId },
        data: { configuracoes: novasConfigs },
    })

    return NextResponse.json({ ok: true })
}
