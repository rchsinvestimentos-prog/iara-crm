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

        console.log(`[WhatsApp] Requesting pairing code for ${phoneFormatted} on instance ${clinica.evolutionInstance}`)

        // Tentativa 1: POST /instance/connect com number no body (Evolution v2)
        try {
            const res1 = await fetch(`${evoUrl}/instance/connect/${clinica.evolutionInstance}`, {
                method: 'POST',
                headers: {
                    'apikey': evoKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ number: phoneFormatted }),
            })
            const data1 = await res1.json()
            console.log('[WhatsApp] Pairing v2 POST response:', JSON.stringify(data1).slice(0, 300))

            const code1 = data1?.pairingCode || data1?.code || data1?.paring
            if (code1 && typeof code1 === 'string' && code1.length <= 12) {
                return NextResponse.json({ pairingCode: code1 })
            }
        } catch (err) {
            console.log('[WhatsApp] Pairing v2 POST failed:', err)
        }

        // Tentativa 2: GET /instance/connect com ?number= (algumas versões)
        try {
            const res2 = await fetch(`${evoUrl}/instance/connect/${clinica.evolutionInstance}?number=${phoneFormatted}`, {
                method: 'GET',
                headers: { 'apikey': evoKey },
            })
            const data2 = await res2.json()
            console.log('[WhatsApp] Pairing GET response:', JSON.stringify(data2).slice(0, 300))

            const code2 = data2?.pairingCode || data2?.code || data2?.paring
            if (code2 && typeof code2 === 'string' && code2.length <= 12) {
                return NextResponse.json({ pairingCode: code2 })
            }
        } catch (err) {
            console.log('[WhatsApp] Pairing GET failed:', err)
        }

        // Tentativa 3: PUT (outra variação da Evolution API)
        try {
            const res3 = await fetch(`${evoUrl}/instance/connect/${clinica.evolutionInstance}`, {
                method: 'PUT',
                headers: {
                    'apikey': evoKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ number: phoneFormatted }),
            })
            const data3 = await res3.json()
            console.log('[WhatsApp] Pairing PUT response:', JSON.stringify(data3).slice(0, 300))

            const code3 = data3?.pairingCode || data3?.code || data3?.paring
            if (code3 && typeof code3 === 'string' && code3.length <= 12) {
                return NextResponse.json({ pairingCode: code3 })
            }
        } catch (err) {
            console.log('[WhatsApp] Pairing PUT failed:', err)
        }

        return NextResponse.json({
            error: 'Código de pareamento não suportado nesta versão da Evolution API. Use o QR Code.',
        }, { status: 400 })

    } catch (err: any) {
        console.error('[WhatsApp] Erro pairing code:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
