import { NextRequest, NextResponse } from 'next/server'
import { ativarCompra, suspenderCompra, registrarLog } from '@/lib/pagamentos/ativacao'
import { acharReferencia, acharEmail, acharNomesDeProduto, acharValor } from '@/lib/pagamentos/referencia'
import { identificarItem } from '@/lib/pagamentos/catalogo-externo'
import { acharOuCriarClinica } from '@/lib/pagamentos/conta'

/**
 * POST /api/pagamentos/webhook/assiny
 *
 * Aviso de pagamento do Assiny (cartão de crédito).
 *
 * Segue o modelo de checkout, igual ao da Hotmart: quem comprou é
 * identificado pelo E-MAIL, e se ainda não tiver conta na IARA, a conta é
 * criada na hora e as credenciais vão por e-mail. A compra costuma vir antes
 * da conta existir — é assim que se vende para quem ainda não é cliente.
 *
 * O Assiny não publica o formato do webhook, então nada é lido de um caminho
 * fixo: e-mail, produto e valor são procurados em qualquer campo do corpo.
 * Tudo que chega fica gravado em pagamentos_log, entendido ou não.
 */

const CAMPOS_EVENTO = ['event', 'evento', 'status', 'type', 'tipo', 'action', 'event_type', 'eventType']

function acharEvento(corpo: any): string {
    for (const campo of CAMPOS_EVENTO) {
        const v = corpo?.[campo] ?? corpo?.data?.[campo] ?? corpo?.payload?.[campo]
        if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
}

function classificar(evento: string): 'aprovado' | 'estornado' | 'outro' {
    const e = evento.toLowerCase()
    if (/(refund|estorn|chargeback|cancel|reembols|recus|declin|expir|fail|fraud)/.test(e)) return 'estornado'
    if (/(approv|aprovad|paid|pago|complet|confirm|success|sucesso|authorized|autorizad)/.test(e)) return 'aprovado'
    return 'outro'
}

export async function POST(request: NextRequest) {
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

        // O que foi comprado: primeiro a referência explícita, se um dia o
        // Assiny passar a mandar campo livre; senão, nome do produto e valor.
        const ref = acharReferencia(corpo)
        const textos = acharNomesDeProduto(corpo)
        const valor = acharValor(corpo)
        const item = ref
            ? { tipo: ref.tipo, item: ref.item }
            : identificarItem(textos, valor)

        const email = acharEmail(corpo)

        console.log(`[Assiny] evento="${evento}" classe=${classe} email=${email || '?'} item=${item ? `${item.tipo}/${item.item}` : '?'} valor=${valor ?? '?'}`)

        if (classe === 'outro') {
            await registrarLog({ provedor: 'assiny', evento, payload: corpo, resultado: 'evento não classificado' })
            return NextResponse.json({ ok: true, ignorado: evento || 'sem nome de evento' })
        }

        if (!item) {
            await registrarLog({
                provedor: 'assiny', evento, payload: corpo,
                resultado: `produto não reconhecido (textos: ${textos.slice(0, 3).join(' | ').slice(0, 90)})`,
            })
            return NextResponse.json({ ok: true, ignorado: 'produto não reconhecido' })
        }

        // Estorno em compra sem conta conhecida não tem o que fazer.
        if (!email) {
            await registrarLog({ provedor: 'assiny', evento, payload: corpo, resultado: 'sem e-mail no corpo — liberar manualmente' })
            return NextResponse.json({ ok: true, ignorado: 'sem e-mail' })
        }

        if (classe === 'estornado') {
            const { prisma } = await import('@/lib/prisma')
            const clinica = await prisma.clinica.findFirst({ where: { email }, select: { id: true } })
            if (!clinica) {
                await registrarLog({ provedor: 'assiny', evento, payload: corpo, resultado: `estorno de e-mail sem conta: ${email}` })
                return NextResponse.json({ ok: true, ignorado: 'conta não encontrada' })
            }
            const r = await suspenderCompra({ clinicaId: clinica.id, tipo: item.tipo, item: item.item, motivo: evento || 'estorno' })
            await registrarLog({ provedor: 'assiny', evento, clinicaId: clinica.id, payload: corpo, resultado: r.mensagem })
            return NextResponse.json(r)
        }

        // Aprovado: acha a conta ou cria uma, e libera.
        const conta = await acharOuCriarClinica({
            email,
            nome: textos.find(t => /^[A-Za-zÀ-ÿ' ]{4,60}$/.test(t)),
            planoInicial: item.tipo === 'plano' ? (item.item as any) : 'essencial',
        })

        const r = await ativarCompra({
            clinicaId: conta.clinicaId, tipo: item.tipo, item: item.item,
            provedor: 'assiny', valor: valor ?? undefined,
        })

        await registrarLog({
            provedor: 'assiny', evento, clinicaId: conta.clinicaId, payload: corpo,
            resultado: `${r.mensagem}${conta.criada ? ' (conta criada)' : ''}`,
        })
        return NextResponse.json({ ...r, contaCriada: conta.criada })

    } catch (err: any) {
        console.error('[Assiny] ❌ erro no webhook:', err)
        await registrarLog({ provedor: 'assiny', payload: corpo, resultado: `erro: ${err?.message}`.slice(0, 190) })
        return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 })
    }
}
