import { Prisma } from '@prisma/client'
import { manterProtegidas } from '@/lib/chaves-protegidas'
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

    const body = await request.json().catch(() => null)

    const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: { configuracoes: true },
    })
    const configAtual = (clinica?.configuracoes as any) || {}

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'corpo inválido' }, { status: 400 })
    }
    // Merge raso — cada chave do body sobreescreve a chave correspondente, MENOS as protegidas (pacotes pagos e o
    // "só o painel"): para essas vale o banco (lib/chaves-protegidas.ts). Antes a clínica ligava a voz clonada por aqui.
    const novasConfigs = manterProtegidas({ ...configAtual, ...body }, configAtual)
    const recusadas = Object.keys(body).filter((k) => !(k in novasConfigs) || novasConfigs[k] !== (body as Record<string, unknown>)[k])
    if (recusadas.length) console.warn('[api/configuracoes] PATCH manteve do banco as chaves protegidas', clinicaId, recusadas.join(','))

    await prisma.clinica.update({
        where: { id: clinicaId },
        data: { configuracoes: novasConfigs as Prisma.InputJsonValue },
    })

    return NextResponse.json({ ok: true })
}
