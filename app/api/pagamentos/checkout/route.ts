import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANOS, PACOTES, type PlanoKey, type PacoteKey } from '@/lib/planos'
import { garantirCliente, cobrancaPix } from '@/lib/pagamentos/asaas'
import { linkAssiny } from '@/lib/pagamentos/links'

/**
 * POST /api/pagamentos/checkout
 * Body: { tipo: 'plano'|'pacote', item: string, metodo: 'pix'|'cartao' }
 *
 * Devolve para onde mandar a clínica: o PIX gerado no Asaas ou o link do
 * Assiny. Não libera nada — quem libera é o webhook, quando o dinheiro
 * entra de verdade. Separar as duas coisas é o que impede alguém de ganhar
 * o plano só por abrir a tela de pagamento.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const email = (session?.user as { email?: string })?.email
        if (!email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findFirst({ where: { email } })
        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { tipo, item, metodo } = await request.json()

        if (tipo !== 'plano' && tipo !== 'pacote') {
            return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
        }

        const produto = tipo === 'plano' ? PLANOS[item as PlanoKey] : PACOTES[item as PacoteKey]
        if (!produto) return NextResponse.json({ error: 'produto não encontrado' }, { status: 400 })

        // Pacote já ativo não gera cobrança nova. A tela também esconde o
        // botão, mas só o servidor garante que ninguém paga duas vezes.
        if (tipo === 'pacote') {
            const cfg = (clinica.configuracoes as Record<string, unknown> | null) || {}
            if (cfg[(produto as typeof PACOTES.clonagem).chave]) {
                return NextResponse.json({ error: 'Este pacote já está ativo na sua conta.' }, { status: 409 })
            }
        }

        const precoCheio = tipo === 'plano'
            ? (produto as typeof PLANOS.premium).precos.brl
            : (produto as typeof PACOTES.clonagem).preco
        let valor: number = precoCheio
        const descricao = `IARA — ${produto.nome}`

        // ---------- CARTÃO: link do Assiny ----------
        if (metodo === 'cartao') {
            const url = linkAssiny(tipo, item)
            if (!url) {
                return NextResponse.json(
                    { error: 'Cartão ainda não disponível para este item' },
                    { status: 503 }
                )
            }
            // O e-mail vai como sugestão de preenchimento. Se o Assiny ignorar,
            // a clínica digita — e é pelo e-mail que o webhook identifica ela.
            const separador = url.includes('?') ? '&' : '?'
            return NextResponse.json({
                metodo: 'cartao',
                url: `${url}${separador}email=${encodeURIComponent(clinica.email || '')}`,
                valor,
                aviso: 'Use o mesmo e-mail da sua conta IARA para a liberação ser automática.',
            })
        }

        // ---------- PIX: cobrança no Asaas ----------
        if (metodo !== 'pix') {
            return NextResponse.json({ error: 'método inválido' }, { status: 400 })
        }

        // Desde 10/11/2026 o PIX é exceção: só para pagamento atrasado ou
        // negociado com o Rafael. Quem liga é o webhook (cartão falhou) ou o
        // admin. Ver lib/pagamentos/pendencia.ts.
        const cfgPix = (clinica.configuracoes as Record<string, unknown> | null) || {}
        if (cfgPix.pix_liberado !== true) {
            return NextResponse.json({ error: 'O pagamento é pelo cartão de crédito.' }, { status: 403 })
        }
        // Valor negociado vale só para o plano; o pacote é sempre preço cheio.
        const negociado = Number(cfgPix.pix_valor)
        if (tipo === 'plano' && Number.isFinite(negociado) && negociado > 0) valor = negociado

        const clienteId = await garantirCliente({
            nome: clinica.nomeClinica || clinica.nome || 'Clínica',
            email: clinica.email || email,
            cpfCnpj: (clinica as { cpfCnpj?: string }).cpfCnpj || null,
            telefone: clinica.telefone,
        })

        const referencia = { clinicaId: clinica.id, tipo, item } as const

        // Uma cobrança só. A mensalidade recorrente é a do cartão; o PIX cobre
        // o mês atrasado ou o acordo. (Antes o plano criava uma assinatura PIX
        // E uma cobrança avulsa — duas cobranças no primeiro mês.)
        const cob = await cobrancaPix({ clienteId, valor, descricao, referencia })
        return NextResponse.json({ metodo: 'pix', ...cob, valor })

    } catch (err: any) {
        console.error('[Checkout] ❌', err)
        return NextResponse.json({ error: err?.message || 'Erro ao gerar cobrança' }, { status: 500 })
    }
}
