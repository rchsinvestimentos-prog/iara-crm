import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { email: session.user.email },
            select: { id: true, nomeDoutora: true, tratamentoDoutora: true, whatsappClinica: true, whatsappDoutora: true }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id FROM profissionais WHERE clinica_id = $1 AND is_dono = true LIMIT 1`,
            clinica.id
        )

        const nome = clinica.nomeDoutora || 'Dona da Clínica'
        const tratamento = clinica.tratamentoDoutora || 'Dra.'
        const whatsapp = clinica.whatsappDoutora || clinica.whatsappClinica || null

        if (existing.length > 0) {
            const ownerId = existing[0].id
            await prisma.$executeRawUnsafe(
                `UPDATE profissionais SET nome = $2, tratamento = $3, whatsapp = $4 WHERE id = $1`,
                ownerId,
                nome,
                tratamento,
                whatsapp
            )
            return NextResponse.json({ ok: true, id: ownerId, status: 'updated' })
        } else {
            const result = await prisma.$queryRawUnsafe<any[]>(
                `INSERT INTO profissionais (
                    id, clinica_id, nome, tratamento, whatsapp,
                    is_dono, ativo, ordem, created_at,
                    cursos, redes_sociais_prof, ausencias
                ) VALUES (
                    gen_random_uuid()::text, $1, $2, $3, $4,
                    true, true, 0, NOW(),
                    '[]'::jsonb, '{}'::jsonb, '[]'::jsonb
                ) RETURNING id`,
                clinica.id,
                nome,
                tratamento,
                whatsapp
            )
            const newId = result[0]?.id
            return NextResponse.json({ ok: true, id: newId, status: 'created' }, { status: 201 })
        }
    } catch (error: any) {
        console.error('POST /api/clinica/profissionais/sync-titular error:', error)
        return NextResponse.json({ error: error.message || 'Erro interno', code: error.code }, { status: 500 })
    }
}
