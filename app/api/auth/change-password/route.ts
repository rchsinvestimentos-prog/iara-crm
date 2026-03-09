import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId, hashSenha } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/auth/change-password
 * Altera a senha da clínica logada.
 * Body: { novaSenha: string }
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { novaSenha } = await request.json()

        if (!novaSenha || novaSenha.length < 6) {
            return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
        }

        const senhaHash = await hashSenha(novaSenha)

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: { senha: senhaHash },
        })

        console.log(`[Auth] ✅ Senha alterada para clínica ${clinicaId}`)

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Auth] ❌ Erro ao alterar senha:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
