// ============================================
// PAGAMENTO PENDENTE — carência e PIX liberado
// ============================================
// Desde 10/11/2026 o cartão (Assiny) é o caminho normal. O PIX (Asaas) só
// aparece para a clínica em dois casos:
//   1. o cartão falhou ou a assinatura foi cancelada (atraso);
//   2. o Rafael liberou à mão no admin (negociação direta).
//
// Tudo fica em configuracoes da clínica:
//   pix_liberado              → a tela de planos mostra o PIX
//   pix_valor                 → valor negociado (opcional; sem ele, preço cheio)
//   pagamento_pendente_desde  → quando o cartão falhou (ISO)
//
// Durante a carência a IARA continua atendendo. Passou da carência sem
// pagamento, a catraca para de responder as pacientes.

export const CARENCIA_PAGAMENTO_DIAS = 7

export type Cfg = Record<string, unknown>

/** Dias desde que o pagamento ficou pendente; null se não está pendente. */
export function diasPendente(cfg: Cfg | null | undefined, agora = new Date()): number | null {
    const desde = cfg?.pagamento_pendente_desde
    if (typeof desde !== 'string') return null
    const t = Date.parse(desde)
    if (Number.isNaN(t)) {
        // Data estragada não pode virar "nunca bloqueia" calado.
        console.error(`[Pagamentos] pagamento_pendente_desde inválido: ${desde}`)
        return CARENCIA_PAGAMENTO_DIAS + 1
    }
    return Math.floor((agora.getTime() - t) / (24 * 3600 * 1000))
}

/** true quando a carência acabou e a IARA deve parar. */
export function carenciaVencida(cfg: Cfg | null | undefined, agora = new Date()): boolean {
    const d = diasPendente(cfg, agora)
    return d !== null && d >= CARENCIA_PAGAMENTO_DIAS
}

/** Configurações depois do pagamento em dia: tira pendência e PIX liberado. */
export function limparPendencia(cfg: Cfg): Cfg {
    const { pagamento_pendente_desde: _a, pix_liberado: _b, pix_valor: _c, ...resto } = cfg
    return resto
}
