import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Desconectar (logout) a instância do WhatsApp
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true, evolutionInstance: true }
    })

    if (!clinica?.evolutionInstance) {
        return NextResponse.json({ error: 'Nenhuma instância encontrada' }, { status: 400 })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    const evoKey = process.env.EVOLUTION_API_KEY

    if (!evoUrl || !evoKey) {
        return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    try {
        // Logout da instância (desconecta o WhatsApp mas mantém a instância)
        const res = await fetch(`${evoUrl}/instance/logout/${clinica.evolutionInstance}`, {
            method: 'DELETE',
            headers: { 'apikey': evoKey },
        })

        const data = await res.json()
        console.log(`[WhatsApp] Logout instância ${clinica.evolutionInstance}:`, data)

        return NextResponse.json({ success: true, message: 'WhatsApp desconectado' })
    } catch (err: any) {
        console.error('[WhatsApp] Erro ao desconectar:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
