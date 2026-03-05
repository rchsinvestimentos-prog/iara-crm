import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Gerar código de pareamento (pairing code) via Evolution API
export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { phone } = await req.json()

    if (!phone) {
        return NextResponse.json({ error: 'Número de telefone é obrigatório' }, { status: 400 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true, evolutionInstance: true }
    })

    if (!clinica?.evolutionInstance) {
        return NextResponse.json({ error: 'Instância não encontrada. Gere o QR Code primeiro.' }, { status: 400 })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    const evoKey = process.env.EVOLUTION_API_KEY

    if (!evoUrl || !evoKey) {
        return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    try {
        // Formatar número: só dígitos, com código do país
        const phoneClean = phone.replace(/\D/g, '')
        const phoneFormatted = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`

        const res = await fetch(`${evoUrl}/instance/connect/${clinica.evolutionInstance}`, {
            method: 'GET',
            headers: {
                'apikey': evoKey,
                'Content-Type': 'application/json',
            },
        })

        const data = await res.json()
        console.log('[WhatsApp] Pairing code response:', JSON.stringify(data).slice(0, 200))

        // O pairingCode pode vir em diferentes campos dependendo da versão
        const code = data?.pairingCode || data?.code || null

        if (code && code.length <= 12) {
            return NextResponse.json({ pairingCode: code })
        }

        // Se não conseguiu o pairing code, tentar endpoint alternativo
        try {
            const res2 = await fetch(`${evoUrl}/instance/connect/${clinica.evolutionInstance}?number=${phoneFormatted}`, {
                method: 'GET',
                headers: { 'apikey': evoKey },
            })
            const data2 = await res2.json()
            console.log('[WhatsApp] Pairing code alt response:', JSON.stringify(data2).slice(0, 200))

            const code2 = data2?.pairingCode || data2?.code || null
            if (code2 && code2.length <= 12) {
                return NextResponse.json({ pairingCode: code2 })
            }
        } catch { }

        return NextResponse.json({
            error: 'Código de pareamento não disponível. Use o QR Code.',
            debug: typeof data === 'object' ? Object.keys(data) : 'unknown'
        }, { status: 400 })

    } catch (err: any) {
        console.error('[WhatsApp] Erro pairing code:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
