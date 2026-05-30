import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const WEBHOOK_URL = 'https://app.iara.click/api/webhook/evolution'

// Helper: buscar QR Code de uma instância existente
async function fetchQR(evoUrl: string, evoKey: string, instanceName: string) {
    const res = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': evoKey },
    })
    const data = await res.json()
    return data?.base64 || data?.qrcode?.base64 || null
}

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

    const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || WEBHOOK_URL
    let instanceName = clinica.evolutionInstance

    // Se não tem instância no banco, criar uma nova
    if (!instanceName) {
        const emailBase = (clinica.email || 'sem_email').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
        instanceName = `IARA_${String(clinica.id).slice(0, 8)}_${emailBase}`

        console.log(`[WhatsApp] Criando instância: ${instanceName}`)

        // Tentar deletar caso exista resquício na Evolution
        try {
            await fetch(`${evoUrl}/instance/logout/${instanceName}`, {
                method: 'DELETE', headers: { 'apikey': evoKey },
            })
        } catch { }
        try {
            await fetch(`${evoUrl}/instance/delete/${instanceName}`, {
                method: 'DELETE', headers: { 'apikey': evoKey },
            })
        } catch { }

        // Esperar limpeza
        await new Promise(r => setTimeout(r, 1000))

        // Criar instância nova
        try {
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
                        events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
                    },
                }),
            })

            const createData = await createRes.json()
            console.log(`[WhatsApp] Resposta criação:`, JSON.stringify(createData).slice(0, 500))

            // Salvar instância no banco
            await prisma.clinica.update({
                where: { id: clinica.id },
                data: { evolutionInstance: instanceName },
            })

            // Configurar webhook por endpoint separado (garantia)
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
            } catch { }

            // Tentar extrair QR da resposta de criação
            const qr = createData?.qrcode?.base64 || createData?.base64
            if (qr) {
                return NextResponse.json({ instanceName, qrcode: qr, status: 'qr_ready' })
            }
        } catch (err: any) {
            console.error('[WhatsApp] Erro ao criar instância:', err)
            return NextResponse.json({ error: `Erro ao criar: ${err.message}` }, { status: 500 })
        }

        // QR não veio na criação, esperar e buscar
        await new Promise(r => setTimeout(r, 2000))
        try {
            const qr = await fetchQR(evoUrl, evoKey, instanceName)
            if (qr) {
                return NextResponse.json({ instanceName, qrcode: qr, status: 'qr_ready' })
            }
        } catch { }

        // Segunda tentativa após mais 2s
        await new Promise(r => setTimeout(r, 2000))
        try {
            const qr = await fetchQR(evoUrl, evoKey, instanceName)
            if (qr) {
                return NextResponse.json({ instanceName, qrcode: qr, status: 'qr_ready' })
            }
        } catch { }

        return NextResponse.json({
            instanceName,
            qrcode: null,
            status: 'created_no_qr',
            error: 'Instância criada mas QR não gerado. Clique em QR Code novamente.',
        })
    }

    // Instância já existe no banco — buscar QR Code
    try {
        const qr = await fetchQR(evoUrl, evoKey, instanceName)

        if (qr) {
            return NextResponse.json({ instanceName, qrcode: qr, status: 'qr_ready' })
        }

        // Checar se a instância realmente existe e tá conectada
        try {
            const stateRes = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
                headers: { 'apikey': evoKey },
            })
            const stateData = await stateRes.json()
            const state = stateData?.instance?.state || stateData?.state
            const connected = state === 'open'

            if (connected) {
                return NextResponse.json({
                    instanceName, qrcode: null, status: 'open', connected: true,
                })
            }

            // Se o estado é 'close' (desconectado mas instância existe), tenta connect de novo
            if (state === 'close') {
                await new Promise(r => setTimeout(r, 1000))
                const retryQR = await fetchQR(evoUrl, evoKey, instanceName)
                if (retryQR) {
                    return NextResponse.json({ instanceName, qrcode: retryQR, status: 'qr_ready' })
                }
            }
        } catch { }

        // Instância não existe mais na Evolution ou não retorna QR
        // Limpar do banco e forçar criação na próxima tentativa
        console.log(`[WhatsApp] Instância ${instanceName} não funciona. Limpando banco pra recriar.`)
        await prisma.clinica.update({
            where: { id: clinica.id },
            data: { evolutionInstance: null },
        })

        return NextResponse.json({
            instanceName: null,
            qrcode: null,
            status: 'instance_removed',
            error: 'Instância foi removida. Clique em QR Code novamente para criar uma nova.',
        })
    } catch (err: any) {
        console.error('[WhatsApp] Erro ao buscar QR:', err)
        // Limpar instância inválida
        await prisma.clinica.update({
            where: { id: clinica.id },
            data: { evolutionInstance: null },
        })
        return NextResponse.json({ error: 'Instância inválida removida. Clique em QR Code novamente.' }, { status: 500 })
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
