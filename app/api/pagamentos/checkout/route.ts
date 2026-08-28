import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANOS, PACOTES, type PlanoKey, type PacoteKey } from '@/lib/planos'
import { garantirCliente, cobrancaPix, assinaturaPix } from '@/lib/pagamentos/asaas'
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

        const valor = tipo === 'plano'
            ? (produto as typeof PLANOS.pro).precos.brl
            : (produto as typeof PACOTES.clonagem).preco
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

        const clienteId = await garantirCliente({
            nome: clinica.nomeClinica || clinica.nome || 'Clínica',
            email: clinica.email || email,
            cpfCnpj: (clinica as { cpfCnpj?: string }).cpfCnpj || null,
            telefone: clinica.telefone,
        })

        const referencia = { clinicaId: clinica.id, tipo, item } as const

        // Plano é mensalidade, pacote é cobrança avulsa que se repete todo mês
        // — os dois viram assinatura no Asaas, para a clínica não precisar
        // lembrar de pagar de novo.
        if (tipo === 'plano') {
            const ass = await assinaturaPix({ clienteId, valor, descricao, referencia })
            const primeira = await cobrancaPix({ clienteId, valor, descricao, referencia })
            return NextResponse.json({ metodo: 'pix', assinaturaId: ass.id, ...primeira, valor })
        }

        const cob = await cobrancaPix({ clienteId, valor, descricao, referencia })
        return NextResponse.json({ metodo: 'pix', ...cob, valor })

    } catch (err: any) {
        console.error('[Checkout] ❌', err)
        return NextResponse.json({ error: err?.message || 'Erro ao gerar cobrança' }, { status: 500 })
    }
}
