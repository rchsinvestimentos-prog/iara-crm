// ============================================
// LINKS DE CHECKOUT DO ASSINY (cartão)
// ============================================
// O Assiny trabalha com link fixo por produto: um endereço para cada plano e
// cada pacote. Ficam em variáveis de ambiente porque são cadastrados no
// painel deles e mudam sem tocar no código.
//
// Item sem link cadastrado simplesmente não oferece cartão — a clínica vê só
// o PIX, em vez de clicar num botão que não leva a lugar nenhum.

export function linkAssiny(tipo: 'plano' | 'pacote', item: string): string | null {
    const chave = `ASSINY_LINK_${tipo.toUpperCase()}_${item.toUpperCase()}`
    const url = process.env[chave]
    if (!url || !/^https?:\/\//.test(url)) return null
    return url
}

/** Quais itens já têm link de cartão — usado pela tela para saber o que mostrar. */
export function itensComCartao(): string[] {
    return Object.keys(process.env)
        .filter(k => k.startsWith('ASSINY_LINK_') && /^https?:\/\//.test(process.env[k] || ''))
        .map(k => k.replace('ASSINY_LINK_', '').toLowerCase())
}
