// As chaves de `configuracoes` que liberam recurso pago ou desligam o robô (10/11/2026). Só o pagamento, o admin e a
// Maison mudam. Toda rota em que a PRÓPRIA clínica grava configuracoes passa o corpo por `manterProtegidas`: para
// essas chaves vale sempre o que já está no banco.
//   · pacote_voz_realista, pacote_clonagem — os upgrades de voz (lib/planos.ts → PACOTES; lib/engine/audio.ts lê);
//   · somente_painel — o plano Básico da Maison, sem robô (lib/sso-maison.ts; lib/engine/catraca.ts lê);
//   · pix_liberado, pix_valor — o PIX por exceção e o preço dele (app/api/pagamentos/checkout lê);
//   · pagamento_pendente_desde — a carência de 7 dias da cobrança (lib/pagamentos/pendencia.ts lê);
//   · saldoIndicacao, saques — o saldo das indicações e os saques (app/api/indicacoes calcula o saldo daqui).
// As rotas do servidor que gravam essas chaves (pagamento, cobrança, saque) não passam por aqui.
export const CHAVES_PROTEGIDAS = [
    'pacote_voz_realista', 'pacote_clonagem', 'somente_painel',
    'pix_liberado', 'pix_valor', 'pagamento_pendente_desde', 'saldoIndicacao', 'saques',
] as const

/** O JSON novo de configuracoes com as chaves protegidas iguais às do banco (ausentes no banco = ausentes). */
export function manterProtegidas(novo: Record<string, unknown>, doBanco: unknown): Record<string, unknown> {
    const antes = (doBanco && typeof doBanco === 'object' && !Array.isArray(doBanco) ? doBanco : {}) as Record<string, unknown>
    const saida = { ...novo }
    for (const chave of CHAVES_PROTEGIDAS) {
        if (chave in antes) saida[chave] = antes[chave]
        else delete saida[chave]
    }
    return saida
}
