// ============================================
// REFERÊNCIA — o que a compra representa
// ============================================
// Os provedores devolvem no webhook um campo livre que a gente mandou na
// criação da cobrança. É por ele que se descobre QUEM comprou O QUÊ, sem
// depender de casar valor ou e-mail — que erram quando duas clínicas pagam
// o mesmo preço no mesmo minuto.
//
// Formato: iara:<clinicaId>:<plano|pacote>:<item>
//   iara:7:pacote:voz_realista
//   iara:12:plano:premium

export type Referencia = { clinicaId: number; tipo: 'plano' | 'pacote'; item: string }

export function montarReferencia(r: Referencia): string {
    return `iara:${r.clinicaId}:${r.tipo}:${r.item}`
}

export function lerReferencia(texto: unknown): Referencia | null {
    if (typeof texto !== 'string') return null
    const m = texto.trim().match(/^iara:(\d+):(plano|pacote):([a-z_]+)$/i)
    if (!m) return null
    return { clinicaId: parseInt(m[1], 10), tipo: m[2].toLowerCase() as 'plano' | 'pacote', item: m[3].toLowerCase() }
}

/**
 * Procura a referência em qualquer lugar do corpo do webhook.
 *
 * O Asaas devolve em payment.externalReference. O Assiny não tem formato
 * público, então aqui a busca é ampla: varre o objeto inteiro atrás de
 * qualquer texto no formato acima. Assim a integração funciona seja qual
 * for o nome do campo que eles usarem para o dado livre.
 */
export function acharReferencia(obj: unknown, profundidade = 0): Referencia | null {
    if (profundidade > 6 || obj === null || obj === undefined) return null

    if (typeof obj === 'string') return lerReferencia(obj)

    if (Array.isArray(obj)) {
        for (const item of obj) {
            const r = acharReferencia(item, profundidade + 1)
            if (r) return r
        }
        return null
    }

    if (typeof obj === 'object') {
        for (const valor of Object.values(obj as Record<string, unknown>)) {
            const r = acharReferencia(valor, profundidade + 1)
            if (r) return r
        }
    }

    return null
}


// ============================================
// LEITURA DE WEBHOOK DE CHECKOUT
// ============================================
// Assiny não publica o formato. Em vez de adivinhar nomes de campo, estas
// funções varrem o corpo inteiro atrás do que interessa: o e-mail de quem
// comprou e o nome do produto. Funciona com qualquer estrutura, e é o mesmo
// princípio de acharReferencia acima.

/** Primeiro e-mail encontrado em qualquer profundidade do objeto. */
export function acharEmail(obj: unknown, profundidade = 0): string | null {
    if (profundidade > 6 || obj == null) return null

    if (typeof obj === 'string') {
        const m = obj.match(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/)
        return m ? obj.trim().toLowerCase() : null
    }
    if (Array.isArray(obj)) {
        for (const i of obj) { const r = acharEmail(i, profundidade + 1); if (r) return r }
        return null
    }
    if (typeof obj === 'object') {
        // Campos com "mail" no nome vêm primeiro: num corpo com e-mail do
        // comprador e do vendedor, o do comprador costuma estar num campo
        // explicitamente chamado email.
        const entradas = Object.entries(obj as Record<string, unknown>)
        const prioritarias = entradas.filter(([k]) => /mail/i.test(k))
        for (const [, v] of [...prioritarias, ...entradas]) {
            const r = acharEmail(v, profundidade + 1)
            if (r) return r
        }
    }
    return null
}

/** Textos que possam ser o nome do produto comprado. */
export function acharNomesDeProduto(obj: unknown, profundidade = 0): string[] {
    if (profundidade > 6 || obj == null) return []
    if (Array.isArray(obj)) return obj.flatMap(i => acharNomesDeProduto(i, profundidade + 1))
    if (typeof obj !== 'object') return []

    const achados: string[] = []
    for (const [chave, valor] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof valor === 'string' && /(product|produto|plan|plano|item|offer|oferta|name|nome|title|titulo|description)/i.test(chave)) {
            if (valor.trim()) achados.push(valor.trim())
        } else if (typeof valor === 'object') {
            achados.push(...acharNomesDeProduto(valor, profundidade + 1))
        }
    }
    return achados
}

/** Primeiro valor numérico que pareça um preço. */
export function acharValor(obj: unknown, profundidade = 0): number | null {
    if (profundidade > 6 || obj == null) return null
    if (Array.isArray(obj)) {
        for (const i of obj) { const r = acharValor(i, profundidade + 1); if (r) return r }
        return null
    }
    if (typeof obj !== 'object') return null

    for (const [chave, valor] of Object.entries(obj as Record<string, unknown>)) {
        if (/(value|valor|amount|price|preco|total)/i.test(chave)) {
            const n = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'))
            if (Number.isFinite(n) && n > 0) return n
        }
    }
    for (const valor of Object.values(obj as Record<string, unknown>)) {
        const r = acharValor(valor, profundidade + 1)
        if (r) return r
    }
    return null
}
