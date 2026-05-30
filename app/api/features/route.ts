import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/features — Load feature toggles
 * POST /api/features — Save feature toggles
 *
 * Features are stored in clinica.configuracoes.features[]
 * Each feature: { id, habilitado, config }
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })

        const config = (clinica?.configuracoes as any) || {}
        return NextResponse.json({ features: config.features || [] })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const features = body.features || []

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })

        const config = (clinica?.configuracoes as any) || {}

        // Merge features into configuracoes + sync top-level fields for backward compat
        const featureMap: Record<string, any> = {}
        features.forEach((f: any) => { featureMap[f.id] = f })

        // Sync blacklist
        if (featureMap.blacklist) {
            config.blacklist = (featureMap.blacklist.config?.numeros || '').split('\n').map((n: string) => n.trim().replace(/\D/g, '')).filter(Boolean)
        }

        // Sync horario
        if (featureMap.horario_atendimento) {
            config.horarioInicio = featureMap.horario_atendimento.config?.horarioInicio || '08:00'
            config.horarioFim = featureMap.horario_atendimento.config?.horarioFim || '20:00'
            config.diasAtendimento = featureMap.horario_atendimento.config?.diasAtendimento || [1, 2, 3, 4, 5]
            config.mensagemForaHorario = featureMap.horario_atendimento.config?.mensagemForaHorario || null
        }

        // Sync aniversario
        if (featureMap.aniversario) {
            config.mensagemAniversario = featureMap.aniversario.config?.mensagemAniversario || null
        }

        // Sync templates
        if (featureMap.templates_whatsapp) {
            config.templatesMensagem = (featureMap.templates_whatsapp.config?.templates || []).filter((t: string) => t.trim())
        }

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: { configuracoes: { ...config, features } },
        })

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
