import { NextRequest, NextResponse } from 'next/server'
import { PLANOS, PACOTES, type PlanoKey, type PacoteKey } from '@/lib/planos'
import { garantirCliente, cobrancaPix, assinaturaPix } from '@/lib/pagamentos/asaas'
import { linkAssiny } from '@/lib/pagamentos/links'

/**
 * POST /api/pagamentos/checkout-publico
 * Body: { tipo, item, metodo, nome, email, cpfCnpj?, telefone? }
 *
 * Compra pela página de vendas, de quem ainda não é cliente. Não exige
 * login: a conta é criada pelo webhook quando o pagamento entra, com as
 * credenciais indo por e-mail.
 *
 * A cobrança sai com clinicaId 0 — "ainda não tem conta". O webhook resolve
 * o e-mail pelo cadastro do cliente no Asaas e cria a clínica.
 *
 * Aberta ao público de propósito, mas ela só CRIA cobrança. Não libera
 * acesso, não lê dado de ninguém e não devolve nada que já não seja público.
 * O pior que alguém mal-intencionado consegue é gerar cobranças no seu Asaas
 * que ninguém vai pagar.
 */

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(request: NextRequest) {
    try {
        const { tipo, item, metodo, nome, email, cpfCnpj, telefone } = await request.json()

        if (tipo !== 'plano' && tipo !== 'pacote') {
            return NextResponse.json({ error: 'Produto inválido' }, { status: 400 })
        }

        const produto = tipo === 'plano' ? PLANOS[item as PlanoKey] : PACOTES[item as PacoteKey]
        if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 400 })

        const valor = tipo === 'plano'
            ? (produto as typeof PLANOS.pro).precos.brl
            : (produto as typeof PACOTES.clonagem).preco
        const descricao = `IARA — ${produto.nome}`

        // ---------- CARTÃO: link do Assiny ----------
        if (metodo === 'cartao') {
            const url = linkAssiny(tipo, item)
            if (!url) {
                return NextResponse.json(
                    { error: 'Pagamento no cartão ainda não disponível para este item. Use o PIX.' },
                    { status: 503 }
                )
            }
            const separador = url.includes('?') ? '&' : '?'
            const comEmail = EMAIL_VALIDO.test(String(email || ''))
                ? `${url}${separador}email=${encodeURIComponent(email)}`
                : url
            return NextResponse.json({ metodo: 'cartao', url: comEmail, valor })
        }

        if (metodo !== 'pix') {
            return NextResponse.json({ error: 'Forma de pagamento inválida' }, { status: 400 })
        }

        // ---------- PIX: precisa saber quem é, para criar a conta depois ----------
        if (!EMAIL_VALIDO.test(String(email || ''))) {
            return NextResponse.json({ error: 'Informe um e-mail válido' }, { status: 400 })
        }
        if (!String(nome || '').trim()) {
            return NextResponse.json({ error: 'Informe seu nome' }, { status: 400 })
        }

        const clienteId = await garantirCliente({
            nome: String(nome).trim(),
            email: String(email).trim().toLowerCase(),
            cpfCnpj: cpfCnpj || null,
            telefone: telefone || null,
        })

        // clinicaId 0: a conta ainda não existe, o webhook cria quando pagar.
        const referencia = { clinicaId: 0, tipo, item } as const

        if (tipo === 'plano') {
            const ass = await assinaturaPix({ clienteId, valor, descricao, referencia })
            const primeira = await cobrancaPix({ clienteId, valor, descricao, referencia })
            return NextResponse.json({ metodo: 'pix', assinaturaId: ass.id, ...primeira, valor })
        }

        const cob = await cobrancaPix({ clienteId, valor, descricao, referencia })
        return NextResponse.json({ metodo: 'pix', ...cob, valor })

    } catch (err: any) {
        console.error('[Checkout público] ❌', err)
        return NextResponse.json({ error: 'Não consegui gerar a cobrança agora' }, { status: 500 })
    }
}
