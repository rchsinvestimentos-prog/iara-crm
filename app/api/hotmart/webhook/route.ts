import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarEmailBoasVindas } from '@/lib/email'
import bcrypt from 'bcryptjs'

// Token de segurança da Hotmart — validar que o request é legítimo
const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || ''

// Mapeamento de produto Hotmart → plano IARA (4 planos)
// Os nomes devem bater com os produtos/planos configurados na Hotmart
const PLANOS_HOTMART: Record<string, { nivel: number; plano: string; creditos: number; whatsapps: number }> = {
    'secretaria': { nivel: 1, plano: 'secretaria', creditos: 1000, whatsapps: 1 },
    'estrategista': { nivel: 2, plano: 'estrategista', creditos: 5000, whatsapps: 1 },
    'designer': { nivel: 3, plano: 'designer', creditos: 5000, whatsapps: 2 },
    'audiovisual': { nivel: 4, plano: 'audiovisual', creditos: 10000, whatsapps: 3 },
    // Aliases antigos (pra não quebrar quem já comprou)
    'essencial': { nivel: 1, plano: 'secretaria', creditos: 1000, whatsapps: 1 },
    'premium': { nivel: 2, plano: 'estrategista', creditos: 5000, whatsapps: 1 },
    'master': { nivel: 3, plano: 'designer', creditos: 5000, whatsapps: 2 },
    'black': { nivel: 4, plano: 'audiovisual', creditos: 10000, whatsapps: 3 },
}

function gerarSenhaTemporaria(): string {
    // Gera senha forte: 3 letras + 2 MAIÚSCULAS + 4 números + 1 especial
    const lower = 'abcdefghijkmnpqrstuvwxyz'
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const nums = '23456789'
    const special = '!@#&'
    let senha = ''
    for (let i = 0; i < 3; i++) senha += lower[Math.floor(Math.random() * lower.length)]
    for (let i = 0; i < 2; i++) senha += upper[Math.floor(Math.random() * upper.length)]
    for (let i = 0; i < 4; i++) senha += nums[Math.floor(Math.random() * nums.length)]
    senha += special[Math.floor(Math.random() * special.length)]
    return senha
}

// Detectar qual plano a partir do nome do produto Hotmart
function detectarPlano(planName: string) {
    const name = (planName || '').toLowerCase().trim()

    // Tentar match direto primeiro
    if (PLANOS_HOTMART[name]) return PLANOS_HOTMART[name]

    // Match parcial (pra pegar "IARA Audiovisual", "Plano Designer", etc.)
    if (name.includes('audiovisual') || name.includes('black')) return PLANOS_HOTMART['audiovisual']
    if (name.includes('designer') || name.includes('master')) return PLANOS_HOTMART['designer']
    if (name.includes('estrategista') || name.includes('premium') || name.includes('pro')) return PLANOS_HOTMART['estrategista']

    // Default: Secretária (P1)
    return PLANOS_HOTMART['secretaria']
}

// POST /api/hotmart/webhook — recebe eventos da Hotmart
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validar hottok — SEMPRE (segurança)
        const hottok = request.headers.get('X-HOTMART-HOTTOK') || body?.hottok
        if (!HOTMART_HOTTOK) {
            console.error('[Hotmart Webhook] ❌ HOTMART_HOTTOK não configurado no env!')
            return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
        }
        if (hottok !== HOTMART_HOTTOK) {
            console.warn('[Hotmart Webhook] ❌ Hottok inválido')
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
            const planoConfig = detectarPlano(planName)

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
                    maxInstanciasWhatsapp: planoConfig.whatsapps,
                    maxInstanciasInstagram: planoConfig.nivel >= 2 ? 1 : 0,
                },
            })

            console.log(`[Hotmart Webhook] ✅ Conta criada: ${buyer.email} (ID: ${novaClinica.id}, Plano: ${planoConfig.plano})`)

            // Enviar email de boas-vindas com credenciais
            enviarEmailBoasVindas({
                email: buyer.email,
                nome: nomeCompleto,
                senha: senhaTemporaria,
                plano: planoConfig.plano,
            }).catch(err => console.error('[Hotmart Webhook] Erro email:', err))

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

        // ============ TROCA DE PLANO ============
        if (evento === 'SWITCH_PLAN') {
            const buyer = body?.data?.buyer
            const subscription = body?.data?.subscription
            const product = body?.data?.product

            if (buyer?.email) {
                const planName = subscription?.plan?.name?.toLowerCase() || product?.name?.toLowerCase() || ''
                const planoConfig = detectarPlano(planName)

                await prisma.clinica.updateMany({
                    where: { email: buyer.email },
                    data: {
                        nivel: planoConfig.nivel,
                        plano: planoConfig.plano,
                        creditosMensais: planoConfig.creditos,
                        creditosDisponiveis: planoConfig.creditos,
                        maxInstanciasWhatsapp: planoConfig.whatsapps,
                        maxInstanciasInstagram: planoConfig.nivel >= 2 ? 1 : 0,
                    },
                })
                console.log(`[Hotmart Webhook] 🔄 Plano trocado: ${buyer.email} → ${planoConfig.plano}`)
            }
            return NextResponse.json({ ok: true, action: 'plan_switched' })
        }

        // ============ ASSINATURA REATIVADA ============
        if (evento === 'SUBSCRIPTION_REACTIVATION') {
            const buyer = body?.data?.buyer
            if (buyer?.email) {
                await prisma.clinica.updateMany({
                    where: { email: buyer.email },
                    data: { status: 'ativo' },
                })
                console.log(`[Hotmart Webhook] ♻️ Assinatura reativada: ${buyer.email}`)
            }
            return NextResponse.json({ ok: true, action: 'reactivated' })
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
