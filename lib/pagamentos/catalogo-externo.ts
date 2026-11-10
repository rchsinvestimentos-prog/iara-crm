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
// Desde 10/11/2026 o valor não decide mais nada: ver identificarItem.

import { PLANO_UNICO_CHAVE } from '@/lib/planos'

export type ItemComprado = { tipo: 'plano' | 'pacote'; item: string }

const POR_PALAVRA: { padrao: RegExp; alvo: ItemComprado }[] = [
    // Pacotes primeiro: "voz realista" contém "realista", e um plano jamais
    // se chamaria assim. Testar plano antes casaria errado.
    // Sempre com "voz" junto: "Maquiagem Realista" não pode virar pacote de voz.
    { padrao: /clonagem de voz|clonar (a )?(minha )?voz|minha voz|voz pr[oó]pria/i, alvo: { tipo: 'pacote', item: 'clonagem' } },
    { padrao: /voz realista|voz premium|premium voice/i, alvo: { tipo: 'pacote', item: 'voz_realista' } },
    // Plano único desde 10/11/2026. Só casa com produto que tem "IARA" no
    // nome: a mesma conta Hotmart/Assiny vende cursos e mentorias, e palavras
    // como "master", "pro" ou "completo" liberariam a IARA para quem comprou
    // outra coisa.
    { padrao: /\biara\b/i, alvo: { tipo: 'plano', item: PLANO_UNICO_CHAVE } },
]

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
    // Regra por fora, textos por dentro: se QUALQUER texto fala em voz, é o
    // pacote — mesmo que outro texto do aviso tenha "IARA" e venha antes.
    for (const { padrao, alvo } of POR_PALAVRA) {
        if (textos.some(t => padrao.test(t))) return alvo
    }

    // Sem casar pelo nome, não libera nada — nem pelo preço. Outro produto
    // de R$97 ou R$497 na mesma conta liberaria a IARA de graça. Fica no
    // pagamentos_log como "produto não reconhecido" para liberar à mão.
    void valor

    return null
}
