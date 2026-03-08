import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCofrePadrao } from '@/lib/engine/cofre'

/**
 * GET /api/cofre — Retorna o cofre atual da clínica (padrão + overrides)
 * POST /api/cofre — Salva overrides do cofre no campo configuracoes.cofre_iara
 */

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true, nivel: true, idioma: true },
        })

        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const idioma = ((clinica.nivel || 1) >= 2 ? (clinica as any).idioma : 'pt-BR') || 'pt-BR'
        const cofrePadrao = getCofrePadrao(idioma)
        const overrides = (clinica.configuracoes as any)?.cofre_iara || {}

        return NextResponse.json({
            padrao: cofrePadrao,
            overrides,
            merged: { ...cofrePadrao, ...overrides },
        })
    } catch (err: any) {
        console.error('[Cofre] GET erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { leisImutaveis, arsenalObjecoes, roteiroVendas } = body

        // Buscar configurações atuais
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })

        const configAtual = (clinica?.configuracoes as any) || {}

        // Merge com overrides do cofre
        const cofreOverrides: any = {}
        if (leisImutaveis !== undefined) cofreOverrides.leisImutaveis = leisImutaveis
        if (arsenalObjecoes !== undefined) cofreOverrides.arsenalObjecoes = arsenalObjecoes
        if (roteiroVendas !== undefined) cofreOverrides.roteiroVendas = roteiroVendas

        const novasConfigs = {
            ...configAtual,
            cofre_iara: {
                ...(configAtual.cofre_iara || {}),
                ...cofreOverrides,
            },
        }

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: { configuracoes: novasConfigs },
        })

        console.log(`[Cofre] ✅ Clínica ${clinicaId} atualizou cofre:`, Object.keys(cofreOverrides))

        return NextResponse.json({ ok: true, saved: Object.keys(cofreOverrides) })
    } catch (err: any) {
        console.error('[Cofre] POST erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
