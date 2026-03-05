import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Token de segurança da Hotmart — validar que o request é legítimo
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || ''

// Mapeamento de produto Hotmart → plano IARA
// Ajuste os IDs dos produtos conforme seus produtos na Hotmart
const PLANOS_HOTMART: Record<string, { nivel: number; plano: string; creditos: number }> = {
    // Produto "IARA Essencial" na Hotmart
    'essencial': { nivel: 1, plano: 'essencial', creditos: 1000 },
    // Produto "IARA Premium" na Hotmart
    'premium': { nivel: 2, plano: 'premium', creditos: 5000 },
}

function gerarSenhaTemporaria(): string {
    // Gera senha legível: 3 letras + 4 números
    const letras = 'abcdefghijkmnpqrstuvwxyz'
    const nums = '23456789'
    let senha = ''
    for (let i = 0; i < 3; i++) senha += letras[Math.floor(Math.random() * letras.length)]
    for (let i = 0; i < 4; i++) senha += nums[Math.floor(Math.random() * nums.length)]
    return senha
}

// POST /api/hotmart/webhook — recebe eventos da Hotmart
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validar hottok
        const hottok = request.headers.get('X-HOTMART-HOTTOK') || body?.hottok
        if (HOTMART_HOTTOK && hottok !== HOTMART_HOTTOK) {
            console.warn('[Hotmart Webhook] Hottok inválido')
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }

        const evento = body?.event
        console.log(`[Hotmart Webhook] Evento: ${evento}`)

        // ============ COMPRA APROVADA ============
        if (evento === 'PURCHASE_APPROVED') {
            const buyer = body?.data?.buyer
            const product = body?.data?.product
            const subscription = body?.data?.subscription
            const purchase = body?.data?.purchase

            if (!buyer?.email) {
                console.error('[Hotmart Webhook] Email do comprador não encontrado')
                return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 })
            }

            // Determinar plano pelo nome do produto ou plan ID
            const planName = subscription?.plan?.name?.toLowerCase() || product?.name?.toLowerCase() || ''
            let planoConfig = PLANOS_HOTMART['essencial'] // default
            if (planName.includes('premium') || planName.includes('pro')) {
                planoConfig = PLANOS_HOTMART['premium']
            }

            // Verificar se já existe conta com esse email
            const existente = await prisma.clinica.findUnique({
                where: { email: buyer.email },
            })

            if (existente) {
                // Atualizar plano se já existe
                await prisma.clinica.update({
                    where: { email: buyer.email },
                    data: {
                        nivel: planoConfig.nivel,
                        plano: planoConfig.plano,
                        status: 'ativo',
                        creditosMensais: planoConfig.creditos,
                        creditosDisponiveis: planoConfig.creditos,
                    },
                })
                console.log(`[Hotmart Webhook] Plano atualizado: ${buyer.email} → ${planoConfig.plano}`)
                return NextResponse.json({ ok: true, action: 'updated' })
            }

            // Criar nova conta
            const senhaTemporaria = gerarSenhaTemporaria()
            const senhaHash = await bcrypt.hash(senhaTemporaria, 12)

            const nomeCompleto = [buyer.name, buyer.last_name].filter(Boolean).join(' ')
            const telefone = buyer.phone_checkout_local_code
                ? `${buyer.phone_checkout_local_code}${buyer.phone_checkout_number}`
                : buyer.phone_checkout_number || ''

            const novaClinica = await prisma.clinica.create({
                data: {
                    nome: nomeCompleto,
                    nomeClinica: nomeCompleto, // cliente muda depois no painel
                    email: buyer.email,
                    senha: senhaHash,
                    telefone: telefone,
                    role: 'cliente',
                    nivel: planoConfig.nivel,
                    plano: planoConfig.plano,
                    status: 'ativo',
                    nomeAssistente: 'IARA',
                    creditosMensais: planoConfig.creditos,
                    creditosDisponiveis: planoConfig.creditos,
                },
            })

            console.log(`[Hotmart Webhook] ✅ Conta criada: ${buyer.email} (ID: ${novaClinica.id}, Plano: ${planoConfig.plano})`)
            console.log(`[Hotmart Webhook] 🔑 Senha temporária: ${senhaTemporaria}`)

            // TODO: Enviar email/WhatsApp com credenciais
            // Por enquanto loga a senha pra você ver no console do servidor
            // Futuramente: enviar via Evolution API WhatsApp ou email SMTP

            return NextResponse.json({
                ok: true,
                action: 'created',
                clinicaId: novaClinica.id,
                // NÃO retornar senha na response por segurança
            })
        }

        // ============ COMPRA CANCELADA / REEMBOLSO ============
        if (evento === 'PURCHASE_CANCELED' || evento === 'PURCHASE_REFUNDED' || evento === 'PURCHASE_CHARGEBACK') {
            const buyer = body?.data?.buyer
            if (buyer?.email) {
                await prisma.clinica.updateMany({
                    where: { email: buyer.email },
                    data: { status: 'inativo' },
                })
                console.log(`[Hotmart Webhook] ❌ Conta desativada: ${buyer.email} (${evento})`)
            }
            return NextResponse.json({ ok: true, action: 'deactivated' })
        }

        // ============ ASSINATURA CANCELADA ============
        if (evento === 'SUBSCRIPTION_CANCELLATION') {
            const buyer = body?.data?.buyer
            if (buyer?.email) {
                await prisma.clinica.updateMany({
                    where: { email: buyer.email },
                    data: { status: 'cancelado' },
                })
                console.log(`[Hotmart Webhook] 🚫 Assinatura cancelada: ${buyer.email}`)
            }
            return NextResponse.json({ ok: true, action: 'subscription_cancelled' })
        }

        // Evento não tratado
        console.log(`[Hotmart Webhook] Evento ignorado: ${evento}`)
        return NextResponse.json({ ok: true, action: 'ignored' })

    } catch (err) {
        console.error('[Hotmart Webhook] Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/hotmart/webhook — health check (Hotmart pode testar)
export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'iara-hotmart-webhook' })
}
