import { NextRequest, NextResponse } from 'next/server'
import { ativarCompra, suspenderCompra, registrarLog } from '@/lib/pagamentos/ativacao'
import { acharReferencia } from '@/lib/pagamentos/referencia'

/**
 * POST /api/pagamentos/webhook/asaas
 *
 * Aviso de pagamento do Asaas (usado para PIX).
 *
 * A autenticação é o token que se cadastra junto da URL no painel do Asaas;
 * ele volta no cabeçalho asaas-access-token. Sem ASAAS_WEBHOOK_TOKEN no
 * ambiente a rota recusa tudo — melhor ficar mudo do que aceitar de qualquer
 * um, já que aceitar libera plano de graça.
 */

const LIBERA = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])
const SUSPENDE = new Set([
    'PAYMENT_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_RECEIVED_IN_CASH_UNDONE',
    'PAYMENT_DELETED',
])

export async function POST(request: NextRequest) {
    const esperado = process.env.ASAAS_WEBHOOK_TOKEN || ''
    const recebido = request.headers.get('asaas-access-token') || ''

    if (!esperado || recebido !== esperado) {
        console.warn('[Asaas] ⛔ webhook recusado: token ausente ou diferente')
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let corpo: any = null
    try {
        corpo = await request.json()
        const evento: string = corpo?.event || ''
        const pagamento = corpo?.payment || {}
        const ref = acharReferencia(corpo)

        if (!ref) {
            await registrarLog({
                provedor: 'asaas', evento, idExterno: pagamento?.id, payload: corpo,
                resultado: 'sem referência iara: no externalReference',
            })
            // 200 de propósito: o Asaas reenvia enquanto não recebe 200, e
            // reenviar não vai fazer a referência aparecer.
            return NextResponse.json({ ok: true, ignorado: 'sem referência' })
        }

        if (LIBERA.has(evento)) {
            const r = await ativarCompra({
                clinicaId: ref.clinicaId, tipo: ref.tipo, item: ref.item,
                provedor: 'asaas', idExterno: pagamento?.id,
                valor: Number(pagamento?.value) || undefined,
                proximaCobranca: pagamento?.dueDate ? new Date(pagamento.dueDate) : null,
            })
            await registrarLog({ provedor: 'asaas', evento, idExterno: pagamento?.id, clinicaId: ref.clinicaId, payload: corpo, resultado: r.mensagem })
            return NextResponse.json(r)
        }

        if (SUSPENDE.has(evento)) {
            const r = await suspenderCompra({ clinicaId: ref.clinicaId, tipo: ref.tipo, item: ref.item, motivo: evento })
            await registrarLog({ provedor: 'asaas', evento, idExterno: pagamento?.id, clinicaId: ref.clinicaId, payload: corpo, resultado: r.mensagem })
            return NextResponse.json(r)
        }

        // Os outros ~20 eventos são informativos (boleto visualizado, cobrança
        // criada). Ficam registrados, sem mexer no acesso da clínica.
        await registrarLog({ provedor: 'asaas', evento, idExterno: pagamento?.id, clinicaId: ref.clinicaId, payload: corpo, resultado: 'evento informativo' })
        return NextResponse.json({ ok: true, ignorado: evento })

    } catch (err: any) {
        console.error('[Asaas] ❌ erro no webhook:', err)
        await registrarLog({ provedor: 'asaas', payload: corpo, resultado: `erro: ${err?.message}`.slice(0, 190) })
        return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
    }
}
