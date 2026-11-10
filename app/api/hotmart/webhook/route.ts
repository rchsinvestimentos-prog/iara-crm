import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/engine/sender'
import { ativarCompra, suspenderCompra, registrarLog } from '@/lib/pagamentos/ativacao'
import { identificarItem } from '@/lib/pagamentos/catalogo-externo'
import { acharOuCriarClinica } from '@/lib/pagamentos/conta'
import { CARENCIA_PAGAMENTO_DIAS } from '@/lib/pagamentos/pendencia'

/**
 * POST /api/hotmart/webhook
 *
 * Desde 10/11/2026 a Hotmart vende só o plano, e só pelos AFILIADOS (a
 * clínica que entra pelo painel paga na Assiny). A comissão é toda da
 * Hotmart; aqui só liberamos ou suspendemos o acesso.
 *
 * Usa o mesmo caminho da Assiny e do Asaas (lib/pagamentos/ativacao.ts).
 * Antes este arquivo tinha a própria tabela de planos, que ficou velha: um
 * produto de nome desconhecido virava o plano mais barato, e o cancelamento
 * de qualquer produto desligava a IARA inteira.
 */

const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || ''

// Dinheiro voltou: a IARA para na hora.
const ESTORNO = new Set(['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_PROTEST'])
// Cartão não passou, boleto venceu ou assinatura cancelada: carência + PIX.
const ATRASO = new Set(['PURCHASE_CANCELED', 'PURCHASE_DELAYED', 'PURCHASE_EXPIRED', 'SUBSCRIPTION_CANCELLATION'])
const APROVADO = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'])

function instanciaDoSistema(): string {
    return process.env.HOTMART_SYSTEM_INSTANCE || process.env.EVOLUTION_SYSTEM_INSTANCE || ''
}

/** Aviso por WhatsApp para a doutora. Falha aqui nunca derruba o webhook. */
async function avisar(clinicaId: number, mensagem: (primeiroNome: string) => string, telefoneReserva?: string) {
    try {
        const instancia = instanciaDoSistema()
        if (!instancia) return
        const c = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { telefone: true, whatsappDoutora: true, nome: true },
        })
        const telefone = c?.whatsappDoutora || c?.telefone || telefoneReserva
        if (!telefone) return
        await sendText({ instancia, telefone }, mensagem(c?.nome?.split(' ')[0] || 'Doutora'))
    } catch (err) {
        console.error('[Hotmart] Erro ao avisar por WhatsApp:', err)
    }
}

export async function POST(request: NextRequest) {
    let body: any = null
    try {
        body = await request.json()

        const hottok = request.headers.get('X-HOTMART-HOTTOK') || body?.hottok
        if (!HOTMART_HOTTOK) {
            console.error('[Hotmart] ❌ HOTMART_HOTTOK não configurado no env!')
            return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })
        }
        if (hottok !== HOTMART_HOTTOK) {
            console.warn('[Hotmart] ❌ Hottok inválido')
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
        }

        const evento: string = body?.event || ''
        const dados = body?.data || {}
        const buyer = dados.buyer || {}
        const email = String(buyer.email || dados.subscriber?.email || '').trim().toLowerCase()
        const textos = [dados.subscription?.plan?.name, dados.product?.name].filter(Boolean) as string[]
        const valor = Number(dados.purchase?.price?.value) || null
        const idExterno = dados.purchase?.transaction || dados.subscription?.subscriber?.code || undefined
        const item = identificarItem(textos, valor)

        console.log(`[Hotmart] evento=${evento} email=${email || '?'} item=${item ? `${item.tipo}/${item.item}` : '?'} textos=${textos.join(' | ')}`)

        const ignorar = async (motivo: string) => {
            await registrarLog({ provedor: 'hotmart', evento, idExterno, payload: body, resultado: motivo })
            return NextResponse.json({ ok: true, ignorado: motivo })
        }

        if (!APROVADO.has(evento) && !ESTORNO.has(evento) && !ATRASO.has(evento)) {
            // SWITCH_PLAN não existe mais (plano único); REACTIVATION é seguida
            // de PURCHASE_APPROVED, que é quem libera de fato.
            return ignorar(`evento sem ação: ${evento || 'vazio'}`)
        }
        if (!email) return ignorar('sem e-mail do comprador — liberar manualmente')
        if (!item) return ignorar(`produto não reconhecido (${textos.join(' | ').slice(0, 90)})`)

        // ---------- ESTORNO / ATRASO ----------
        if (ESTORNO.has(evento) || ATRASO.has(evento)) {
            const clinica = await prisma.clinica.findFirst({ where: { email }, select: { id: true } })
            if (!clinica) return ignorar(`${evento} de e-mail sem conta: ${email}`)

            const gravidade = ESTORNO.has(evento) ? 'estorno' : 'atraso'
            const r = await suspenderCompra({ clinicaId: clinica.id, tipo: item.tipo, item: item.item, motivo: evento, gravidade })
            await registrarLog({ provedor: 'hotmart', evento, idExterno, clinicaId: clinica.id, payload: body, resultado: r.mensagem })

            if (item.tipo === 'plano') {
                await avisar(clinica.id, nome => gravidade === 'estorno'
                    ? `Olá, ${nome}! Sua compra da *IARA* foi reembolsada ou contestada, e a assistente foi desligada. Se foi um engano, fale com a gente para reativar. 💜`
                    : `Olá, ${nome}! O pagamento da sua assinatura da *IARA* não foi concluído. Ela continua atendendo por mais ${CARENCIA_PAGAMENTO_DIAS} dias — regularize em https://app.iara.click/plano para não interromper. 💜`)
            }
            return NextResponse.json(r)
        }

        // ---------- APROVADO ----------
        const nomeCompleto = [buyer.name, buyer.last_name].filter(Boolean).join(' ')
        const telefone = buyer.phone_checkout_local_code
            ? `${buyer.phone_checkout_local_code}${buyer.phone_checkout_number || ''}`
            : buyer.phone_checkout_number || ''

        const conta = await acharOuCriarClinica({
            email,
            nome: nomeCompleto || undefined,
            telefone: telefone || undefined,
            comPlano: item.tipo === 'plano',
        })

        const r = await ativarCompra({
            clinicaId: conta.clinicaId, tipo: item.tipo, item: item.item,
            provedor: 'hotmart', idExterno, valor: valor ?? undefined,
        })
        await registrarLog({
            provedor: 'hotmart', evento, idExterno, clinicaId: conta.clinicaId, payload: body,
            resultado: `${r.mensagem}${conta.criada ? ' (conta criada)' : ''}`,
        })

        if (r.ok && conta.criada && conta.senhaTemporaria) {
            const senha = conta.senhaTemporaria
            await avisar(conta.clinicaId, nome => `Olá, *${nome}*! Seja muito bem-vinda à *IARA*! 💜🎉\n\n🔑 *Seus dados de acesso:*\n🔗 *Painel:* https://app.iara.click\n📧 *E-mail:* ${email}\n🔑 *Senha:* ${senha}\n\n*Próximos passos:*\n1️⃣ Acesse o painel e aceite os termos\n2️⃣ Configure sua clínica em "Configurações"\n3️⃣ Conecte seu WhatsApp em "Instâncias"\n\nQualquer dúvida, fale conosco por aqui! 🚀`, telefone)
        } else if (r.ok && item.tipo === 'plano') {
            await avisar(conta.clinicaId, nome => `Olá, *${nome}*! Seu pagamento da *IARA* foi confirmado. 💜 Sua assistente está ativa e pronta para atender!`)
        }

        return NextResponse.json({ ...r, contaCriada: conta.criada })

    } catch (err: any) {
        console.error('[Hotmart] ❌ Erro:', err)
        await registrarLog({ provedor: 'hotmart', payload: body, resultado: `erro: ${err?.message}`.slice(0, 190) })
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/hotmart/webhook — health check (Hotmart pode testar)
export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'iara-hotmart-webhook' })
}
