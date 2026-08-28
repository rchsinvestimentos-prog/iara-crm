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
