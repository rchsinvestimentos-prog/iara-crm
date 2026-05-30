import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/contatos/tags
 * Retorna todas as tags únicas usadas pela clínica (para sugestões no TagInput)
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Buscar todos os arrays de tags e "aplainar"
        const contatos = await prisma.contato.findMany({
            where: { clinicaId, tags: { isEmpty: false } },
            select: { tags: true },
        })

        const todasTags = new Set<string>()
        for (const c of contatos) {
            for (const tag of c.tags) {
                if (tag.trim()) todasTags.add(tag.trim().toLowerCase())
            }
        }

        // Ordenar alfabeticamente
        const tags = Array.from(todasTags).sort()

        return NextResponse.json({ tags })
    } catch (err) {
        console.error('Erro GET /api/contatos/tags:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
