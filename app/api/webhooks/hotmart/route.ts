import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashSenha } from '@/lib/auth'
import crypto from 'crypto'

// Mapeamento de produto Hotmart → Plano IARA
const HOTMART_PRODUTOS: Record<string, number> = {
    // Substitua pelos seus Product IDs reais da Hotmart
    'PROD_SECRETARIA': 1,
    'PROD_ESTRATEGISTA': 2,
    'PROD_DESIGNER': 3,
    'PROD_AUDIOVISUAL': 4,
}

const CREDITOS_POR_PLANO: Record<number, number> = {
    1: 500,
    2: 2000,
    3: 5000,
    4: 99999,
}

// Verificar assinatura HMAC do Hotmart
function verificarAssinaturaHotmart(body: string, signature: string): boolean {
    const secret = process.env.HOTMART_WEBHOOK_SECRET
    if (!secret) return false

    const expected = crypto
        .createHmac('sha1', secret)
        .update(body)
        .digest('hex')

    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
    )
}

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text()
        const signature = request.headers.get('x-hotmart-webhook-token') ?? ''

        // Verificar autenticidade (desabilitar em dev se necessário)
        if (process.env.NODE_ENV === 'production') {
            if (!verificarAssinaturaHotmart(rawBody, signature)) {
                console.error('⚠️ Hotmart: assinatura inválida')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        const payload = JSON.parse(rawBody)
        const event = payload?.event ?? payload?.data?.event

        console.log(`📦 Hotmart webhook: ${event}`)

        switch (event) {
            case 'PURCHASE_APPROVED':
            case 'PURCHASE_COMPLETE':
                await handleCompraAprovada(payload)
                break

            case 'PURCHASE_CANCELED':
            case 'PURCHASE_REFUNDED':
                await handleCompraCancelada(payload)
                break

            case 'SUBSCRIPTION_CANCELLATION':
                await handleAssinaturaCancelada(payload)
                break

            default:
                console.log(`ℹ️ Hotmart: evento não tratado — ${event}`)
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('❌ Hotmart webhook error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

async function handleCompraAprovada(payload: any) {
    const buyer = payload?.data?.buyer ?? payload?.buyer
    const product = payload?.data?.product ?? payload?.product
    const purchase = payload?.data?.purchase ?? payload?.purchase

    const email = buyer?.email
    const nome = buyer?.name
    const produtoId = product?.id ?? product?.ucode
    const orderId = purchase?.order_date ?? purchase?.transaction

    if (!email || !nome) {
        console.error('⚠️ Hotmart: email ou nome não encontrado no payload')
        return
    }

    // Detectar plano baseado no produto
    const plano = HOTMART_PRODUTOS[produtoId] ?? 1
    const creditos = CREDITOS_POR_PLANO[plano]

    // Verificar se clínica já existe
    const existente = await prisma.clinica.findUnique({ where: { email } })

    if (existente) {
        // Atualizar plano se já existe
        await prisma.clinica.update({
            where: { email },
            data: {
                plano,
                creditosTotal: creditos,
                creditosUsados: 0,
                hotmartOrderId: orderId,
                status: 'ativo',
            },
        })
        console.log(`✅ Hotmart: plano atualizado para ${email} → Plano ${plano}`)
        return
    }

    // Gerar senha temporária
    const senhaTmp = Math.random().toString(36).slice(-8)
    const senhaHash = await hashSenha(senhaTmp)

    // Criar nova clínica
    await prisma.clinica.create({
        data: {
            nome: nome,
            email: email,
            senha: senhaHash,
            plano,
            creditosTotal: creditos,
            creditosUsados: 0,
            hotmartOrderId: orderId,
            status: 'ativo',
            role: 'cliente',
            nomeIA: 'IARA',
        },
    })

    console.log(`✅ Hotmart: nova clínica criada — ${email} / Plano ${plano} / Senha tmp: ${senhaTmp}`)

    // TODO: enviar email de boas-vindas com senha temporária
    // await enviarEmailBoasVindas({ email, nome, senhaTmp })
}

async function handleCompraCancelada(payload: any) {
    const email = payload?.data?.buyer?.email ?? payload?.buyer?.email
    if (!email) return

    await prisma.clinica.updateMany({
        where: { email },
        data: { status: 'cancelado' },
    })

    console.log(`🚫 Hotmart: acesso cancelado para ${email}`)
}

async function handleAssinaturaCancelada(payload: any) {
    const email = payload?.data?.subscriber?.email ?? payload?.subscriber?.email
    if (!email) return

    await prisma.clinica.updateMany({
        where: { email },
        data: { status: 'cancelado' },
    })

    console.log(`🚫 Hotmart: assinatura cancelada para ${email}`)
}
