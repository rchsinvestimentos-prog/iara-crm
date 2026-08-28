// ============================================
// ASAAS — cobranças PIX
// ============================================
// Só o necessário para vender: garantir o cadastro do cliente e gerar a
// cobrança. Saque, transferência e nota fiscal ficam de fora de propósito —
// a chave nem tem permissão para isso.

import { montarReferencia, type Referencia } from './referencia'

const BASE = process.env.ASAAS_AMBIENTE === 'producao'
    ? 'https://api.asaas.com/v3'
    : 'https://api-sandbox.asaas.com/v3'

function chave(): string {
    const k = process.env.ASAAS_API_KEY || ''
    if (!k) throw new Error('ASAAS_API_KEY não configurada')
    return k
}

async function chamar(caminho: string, opcoes: RequestInit = {}): Promise<any> {
    const res = await fetch(`${BASE}${caminho}`, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            access_token: chave(),
            ...(opcoes.headers || {}),
        },
        signal: AbortSignal.timeout(25000),
    })
    const corpo = await res.json().catch(() => ({}))
    if (!res.ok) {
        const detalhe = corpo?.errors?.[0]?.description || JSON.stringify(corpo).slice(0, 200)
        throw new Error(`Asaas ${res.status}: ${detalhe}`)
    }
    return corpo
}

/**
 * Acha ou cria o cliente no Asaas.
 *
 * A busca é por CPF/CNPJ quando existe, senão por e-mail. Criar duas vezes o
 * mesmo cliente polui o financeiro e faz a clínica aparecer duplicada nos
 * relatórios do Asaas.
 */
export async function garantirCliente(dados: {
    nome: string
    email: string
    cpfCnpj?: string | null
    telefone?: string | null
}): Promise<string> {
    const filtro = dados.cpfCnpj
        ? `cpfCnpj=${encodeURIComponent(dados.cpfCnpj.replace(/\D/g, ''))}`
        : `email=${encodeURIComponent(dados.email)}`

    const busca = await chamar(`/customers?${filtro}&limit=1`)
    if (busca?.data?.length > 0) return busca.data[0].id

    const criado = await chamar('/customers', {
        method: 'POST',
        body: JSON.stringify({
            name: dados.nome,
            email: dados.email,
            cpfCnpj: dados.cpfCnpj?.replace(/\D/g, '') || undefined,
            mobilePhone: dados.telefone?.replace(/\D/g, '') || undefined,
        }),
    })
    return criado.id
}

/**
 * Cria uma cobrança PIX avulsa (um pacote, por exemplo).
 *
 * A referência vai em externalReference: é por ela que o webhook descobre
 * quem comprou o quê, sem depender de casar valor ou e-mail.
 */
export async function cobrancaPix(dados: {
    clienteId: string
    valor: number
    descricao: string
    referencia: Referencia
    vencimentoEmDias?: number
}): Promise<{ id: string; url: string; qrCode?: string; copiaECola?: string }> {
    const venc = new Date(Date.now() + (dados.vencimentoEmDias ?? 3) * 24 * 3600 * 1000)

    const cobranca = await chamar('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer: dados.clienteId,
            billingType: 'PIX',
            value: dados.valor,
            dueDate: venc.toISOString().slice(0, 10),
            description: dados.descricao,
            externalReference: montarReferencia(dados.referencia),
        }),
    })

    // O QR só existe depois que a cobrança foi criada; a falha aqui não pode
    // derrubar a venda, porque o link de pagamento já serve.
    let qr: any = null
    try {
        qr = await chamar(`/payments/${cobranca.id}/pixQrCode`)
    } catch (err) {
        console.warn('[Asaas] QR não veio agora:', (err as Error).message)
    }

    return {
        id: cobranca.id,
        url: cobranca.invoiceUrl,
        qrCode: qr?.encodedImage,
        copiaECola: qr?.payload,
    }
}

/** Assinatura mensal recorrente por PIX. */
export async function assinaturaPix(dados: {
    clienteId: string
    valor: number
    descricao: string
    referencia: Referencia
}): Promise<{ id: string; url?: string }> {
    const proxima = new Date(Date.now() + 24 * 3600 * 1000)
    const assinatura = await chamar('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
            customer: dados.clienteId,
            billingType: 'PIX',
            value: dados.valor,
            nextDueDate: proxima.toISOString().slice(0, 10),
            cycle: 'MONTHLY',
            description: dados.descricao,
            externalReference: montarReferencia(dados.referencia),
        }),
    })
    return { id: assinatura.id }
}

/**
 * Dados do cliente no Asaas.
 *
 * Usado quando a compra veio da página de vendas: a cobrança não tem
 * clínica associada ainda, e é pelo e-mail cadastrado aqui que a conta é
 * criada quando o pagamento entra.
 */
export async function buscarCliente(clienteId: string): Promise<{ email: string; nome: string; telefone?: string } | null> {
    try {
        const c = await chamar(`/customers/${clienteId}`)
        if (!c?.email) return null
        return { email: c.email, nome: c.name || '', telefone: c.mobilePhone || c.phone || undefined }
    } catch (err) {
        console.error('[Asaas] Não consegui buscar o cliente:', (err as Error).message)
        return null
    }
}
