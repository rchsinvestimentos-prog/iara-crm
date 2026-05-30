import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Desconectar e excluir instância do WhatsApp
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
        // 1. Logout primeiro (desconecta o WhatsApp)
        try {
            await fetch(`${evoUrl}/instance/logout/${clinica.evolutionInstance}`, {
                method: 'DELETE',
                headers: { 'apikey': evoKey },
            })
        } catch { }

        // 2. Deletar a instância na Evolution API
        const res = await fetch(`${evoUrl}/instance/delete/${clinica.evolutionInstance}`, {
            method: 'DELETE',
            headers: { 'apikey': evoKey },
        })

        const data = await res.json()
        console.log(`[WhatsApp] Instância deletada: ${clinica.evolutionInstance}`, data)

        // 3. Limpar referência no banco
        await prisma.clinica.update({
            where: { id: clinica.id },
            data: { evolutionInstance: null },
        })

        return NextResponse.json({ success: true, message: 'WhatsApp desconectado e instância removida' })
    } catch (err: any) {
        console.error('[WhatsApp] Erro ao desconectar:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
