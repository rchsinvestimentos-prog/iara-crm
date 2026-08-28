import { NextRequest, NextResponse } from 'next/server'
import { ativarCompra, suspenderCompra, registrarLog } from '@/lib/pagamentos/ativacao'
import { acharReferencia } from '@/lib/pagamentos/referencia'

/**
 * POST /api/pagamentos/webhook/assiny
 *
 * Aviso de pagamento do Assiny (usado para cartão de crédito).
 *
 * O Assiny não publica documentação de webhook, então esta rota foi escrita
 * para funcionar sem conhecer o formato exato:
 *
 *  - a referência da compra é procurada em QUALQUER campo do corpo, em vez
 *    de um caminho fixo como no Asaas;
 *  - o nome do evento é procurado nos campos que as plataformas costumam
 *    usar (event, status, type...), e a decisão sai por palavra-chave;
 *  - tudo que chega fica gravado em pagamentos_log, inclusive o que não foi
 *    entendido. É de lá que sai o formato real deles, no primeiro pagamento.
 *
 * Quando o formato estiver confirmado, isto vira uma leitura direta como a
 * do Asaas — o palpite por palavra-chave existe só para não segurar o
 * lançamento esperando documentação que não existe.
 */

const CAMPOS_EVENTO = ['event', 'evento', 'status', 'type', 'tipo', 'action', 'event_type', 'eventType']

function acharEvento(corpo: any): string {
    for (const campo of CAMPOS_EVENTO) {
        const v = corpo?.[campo] ?? corpo?.data?.[campo] ?? corpo?.payload?.[campo]
        if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
}

/** aprovado | estornado | outro — decidido por palavra-chave. */
function classificar(evento: string): 'aprovado' | 'estornado' | 'outro' {
    const e = evento.toLowerCase()
    if (/(refund|estorn|chargeback|cancel|reembols|recus|declin|expir|fail)/.test(e)) return 'estornado'
    if (/(approv|aprovad|paid|pago|complet|confirm|success|sucesso|authorized|autorizad)/.test(e)) return 'aprovado'
    return 'outro'
}

export async function POST(request: NextRequest) {
    // Um segredo no fim da URL (?token=) porque não se sabe qual cabeçalho o
    // Assiny manda. Sem ele, qualquer um libera plano de graça.
    const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-webhook-token') || ''
    const esperado = process.env.ASSINY_WEBHOOK_TOKEN || ''

    if (!esperado || token !== esperado) {
        console.warn('[Assiny] ⛔ webhook recusado: token ausente ou diferente')
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let corpo: any = null
    try {
        corpo = await request.json()
        const evento = acharEvento(corpo)
        const classe = classificar(evento)
        const ref = acharReferencia(corpo)

        console.log(`[Assiny] recebido evento="${evento}" classe=${classe} ref=${ref ? `${ref.clinicaId}/${ref.item}` : 'não achada'}`)

        if (!ref) {
            await registrarLog({
                provedor: 'assiny', evento, payload: corpo,
                resultado: 'sem referência iara: — verificar o corpo em pagamentos_log',
            })
            // 200 para o Assiny não reenviar em laço; o corpo ficou gravado
            // para ajustar o mapeamento.
            return NextResponse.json({ ok: true, ignorado: 'sem referência' })
        }

        if (classe === 'aprovado') {
            const r = await ativarCompra({
                clinicaId: ref.clinicaId, tipo: ref.tipo, item: ref.item, provedor: 'assiny',
            })
            await registrarLog({ provedor: 'assiny', evento, clinicaId: ref.clinicaId, payload: corpo, resultado: r.mensagem })
            return NextResponse.json(r)
        }

        if (classe === 'estornado') {
            const r = await suspenderCompra({ clinicaId: ref.clinicaId, tipo: ref.tipo, item: ref.item, motivo: evento || 'estorno' })
            await registrarLog({ provedor: 'assiny', evento, clinicaId: ref.clinicaId, payload: corpo, resultado: r.mensagem })
            return NextResponse.json(r)
        }

        await registrarLog({ provedor: 'assiny', evento, clinicaId: ref.clinicaId, payload: corpo, resultado: 'evento não classificado' })
        return NextResponse.json({ ok: true, ignorado: evento || 'sem nome de evento' })

    } catch (err: any) {
        console.error('[Assiny] ❌ erro no webhook:', err)
        await registrarLog({ provedor: 'assiny', payload: corpo, resultado: `erro: ${err?.message}`.slice(0, 190) })
        return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
    }
}
