// ============================================
// CATÁLOGO EXTERNO — traduz o produto do checkout
// ============================================
// O Assiny manda o nome do produto que a pessoa comprou ("Iara - Assistente
// Executiva"). Aqui esse nome vira um item do catálogo da IARA.
//
// A tradução é por palavra-chave, e não por nome exato, porque o nome do
// produto muda no painel do Assiny sem ninguém avisar o desenvolvedor — e
// um nome que deixou de casar significa cliente pagando e não recebendo.
//
// O valor entra como desempate: se o nome não disser nada, o preço diz.

import { PLANOS, PACOTES } from '@/lib/planos'

export type ItemComprado = { tipo: 'plano' | 'pacote'; item: string }

const POR_PALAVRA: { padrao: RegExp; alvo: ItemComprado }[] = [
    // Pacotes primeiro: "voz realista" contém "realista", e um plano jamais
    // se chamaria assim. Testar plano antes casaria errado.
    { padrao: /clonagem|clonar|minha voz|voz propria|voz própria/i, alvo: { tipo: 'pacote', item: 'clonagem' } },
    { padrao: /voz realista|realista|premium voice|voz premium/i, alvo: { tipo: 'pacote', item: 'voz_realista' } },
    { padrao: /premium|completo/i, alvo: { tipo: 'plano', item: 'premium' } },
    { padrao: /\bpro\b|profissional|estrategista/i, alvo: { tipo: 'plano', item: 'pro' } },
    { padrao: /essencial|b[áa]sico|secret[áa]ria|assistente executiva|starter/i, alvo: { tipo: 'plano', item: 'essencial' } },
]

/** Preço exato → item. Último recurso, quando o nome não diz nada. */
const POR_VALOR: Record<number, ItemComprado> = {
    [PLANOS.essencial.precos.brl]: { tipo: 'plano', item: 'essencial' },
    [PLANOS.pro.precos.brl]: { tipo: 'plano', item: 'pro' },
    [PLANOS.premium.precos.brl]: { tipo: 'plano', item: 'premium' },
    [PACOTES.voz_realista.preco]: { tipo: 'pacote', item: 'voz_realista' },
    [PACOTES.clonagem.preco]: { tipo: 'pacote', item: 'clonagem' },
}

/**
 * Descobre o que foi comprado a partir dos textos e do valor do webhook.
 *
 * Devolve null quando não dá para ter certeza — melhor avisar que ficou uma
 * compra sem dono do que liberar o plano errado para quem pagou.
 */
export function identificarItem(
    textos: string[],
    valor?: number | null
): ItemComprado | null {
    for (const texto of textos) {
        for (const { padrao, alvo } of POR_PALAVRA) {
            if (padrao.test(texto)) return alvo
        }
    }

    if (valor != null) {
        const exato = POR_VALOR[Math.round(valor)]
        if (exato) return exato
    }

    return null
}
