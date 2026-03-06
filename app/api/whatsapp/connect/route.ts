import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Criar instância (se necessário) + gerar QR Code
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true, evolutionInstance: true, nomeClinica: true, nome: true, email: true, telefone: true }
    })

    if (!clinica) {
        return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    const evoKey = process.env.EVOLUTION_API_KEY

    if (!evoUrl || !evoKey) {
        return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    let instanceName = clinica.evolutionInstance

    // Se não tem instância, criar uma
    if (!instanceName) {
        // Nome padronizado: IARA_ID_email (fácil de filtrar na Evolution)
        const emailBase = (clinica.email || 'sem_email').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
        instanceName = `IARA_${String(clinica.id).slice(0, 8)}_${emailBase}`

        try {
            const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || 'https://iara-system-n8n.00qtt3.easypanel.host/webhook/iara/receptor-central'

            const createRes = await fetch(`${evoUrl}/instance/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': evoKey,
                },
                body: JSON.stringify({
                    instanceName,
                    integration: 'WHATSAPP-BAILEYS',
                    qrcode: true,
                    webhook: {
                        url: webhookUrl,
                        byEvents: false,
                        base64: true,
                        events: [
                            'MESSAGES_UPSERT',
                            'MESSAGES_UPDATE',
                            'CONNECTION_UPDATE',
                            'QRCODE_UPDATED',
                        ],
                    },
                }),
            })

            const createData = await createRes.json()
            console.log(`[WhatsApp] Instância criada: ${instanceName}`, createData)

            // Salvar nome da instância na clínica
            await prisma.clinica.update({
                where: { id: clinica.id },
                data: { evolutionInstance: instanceName },
            })

            // Configurar webhook via endpoint separado (garantia)
            try {
                await fetch(`${evoUrl}/webhook/set/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': evoKey },
                    body: JSON.stringify({
                        webhook: {
                            enabled: true,
                            url: webhookUrl,
                            byEvents: false,
                            base64: true,
                            events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
                        },
                    }),
                })
                console.log(`[WhatsApp] Webhook configurado: ${webhookUrl}`)
            } catch (webhookErr) {
                console.warn('[WhatsApp] Erro ao configurar webhook separado:', webhookErr)
            }

            // Se o QR veio na criação, retorna direto
            if (createData?.qrcode?.base64) {
                return NextResponse.json({
                    instanceName,
                    qrcode: createData.qrcode.base64,
                    status: 'qr_ready',
                })
            }
        } catch (err: any) {
            console.error('[WhatsApp] Erro ao criar instância:', err)
            return NextResponse.json({ error: `Erro ao criar instância: ${err.message}` }, { status: 500 })
        }
    }

    // Instância já existe, pegar QR Code + código de pareamento
    try {
        const qrRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
            method: 'GET',
            headers: { 'apikey': evoKey },
        })

        const qrData = await qrRes.json()

        // Tentar pegar código de pareamento (para mobile)
        let pairingCode = null
        if (clinica.telefone) {
            try {
                const tel = clinica.telefone.replace(/\D/g, '')
                const phone = tel.startsWith('55') ? tel : `55${tel}`
                const pairRes = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
                    method: 'GET',
                    headers: { 'apikey': evoKey, 'Content-Type': 'application/json' },
                })
                const pairData = await pairRes.json()
                pairingCode = pairData?.pairingCode || pairData?.code || null
            } catch { }
        }

        if (qrData?.base64) {
            return NextResponse.json({
                instanceName,
                qrcode: qrData.base64,
                pairingCode: qrData?.pairingCode || pairingCode,
                status: 'qr_ready',
            })
        }

        // Pode já estar conectado
        return NextResponse.json({
            instanceName,
            qrcode: null,
            pairingCode,
            status: qrData?.state || 'unknown',
            data: qrData,
        })
    } catch (err: any) {
        console.error('[WhatsApp] Erro ao buscar QR:', err)
        return NextResponse.json({ error: `Erro ao buscar QR: ${err.message}` }, { status: 500 })
    }
}

// GET: Verificar status da conexão
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const clinica = await prisma.clinica.findFirst({
        where: { email: session.user.email },
        select: { id: true, evolutionInstance: true }
    })

    if (!clinica?.evolutionInstance) {
        return NextResponse.json({ status: 'sem_instancia', connected: false })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    const evoKey = process.env.EVOLUTION_API_KEY

    if (!evoUrl || !evoKey) {
        return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 })
    }

    try {
        const res = await fetch(`${evoUrl}/instance/connectionState/${clinica.evolutionInstance}`, {
            headers: { 'apikey': evoKey },
        })

        const data = await res.json()
        const connected = data?.instance?.state === 'open' || data?.state === 'open'

        return NextResponse.json({
            status: data?.instance?.state || data?.state || 'unknown',
            connected,
            instanceName: clinica.evolutionInstance,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message, connected: false }, { status: 500 })
    }
}
