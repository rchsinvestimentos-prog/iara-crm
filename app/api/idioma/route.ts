import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/idioma
 * 
 * Altera o idioma da IARA para P2+.
 * Body: { idioma: 'pt-BR' | 'pt-PT' | 'en-US' | 'es' }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true },
        })

        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        // Multi-idioma só para P2+
        if ((clinica.nivel || 1) < 2) {
            return NextResponse.json({ error: 'Multi-idioma disponível a partir do Plano Estrategista' }, { status: 403 })
        }

        const { idioma } = await request.json()
        const idiomasValidos = ['pt-BR', 'pt-PT', 'en-US', 'es']

        if (!idiomasValidos.includes(idioma)) {
            return NextResponse.json({ error: 'Idioma inválido', validos: idiomasValidos }, { status: 400 })
        }

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: { idioma },
        })

        console.log(`[Idioma] ✅ Clínica ${clinicaId} mudou idioma para ${idioma}`)

        return NextResponse.json({ ok: true, idioma })
    } catch (err: any) {
        console.error('[Idioma] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
