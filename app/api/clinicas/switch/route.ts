import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// POST /api/clinicas/switch — alterna clínica ativa via cookie
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const userId = Number(session.user.id)
        const { clinicaId } = await request.json()

        if (!clinicaId) return NextResponse.json({ error: 'clinicaId obrigatório' }, { status: 400 })

        // Verificar se a clínica pertence ao usuário (é a principal ou filha)
        const clinica = await prisma.clinica.findFirst({
            where: {
                id: Number(clinicaId),
                OR: [
                    { id: userId },        // é a principal
                    { parentId: userId },   // é filha
                ],
            },
        })

        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        // Setar cookie com a clínica ativa
        const cookieStore = await cookies()
        cookieStore.set('activeClinicaId', String(clinica.id), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 dias
            path: '/',
        })

        return NextResponse.json({ ok: true, clinicaId: clinica.id, nome: clinica.nomeClinica })
    } catch (err) {
        console.error('[POST /api/clinicas/switch] Erro:', err)
        return NextResponse.json({ error: 'Erro ao trocar clínica' }, { status: 500 })
    }
}
