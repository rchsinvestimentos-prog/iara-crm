// ============================================
// PLANOS IARA v2 — 3 Níveis (Foco: Agendamento)
// ============================================
// P1 Essencial:  R$97  / $27 / €27   — 1000 créditos
// P2 Pro:        R$197 / $47 / €47   — 3000 créditos
// P3 Premium:    R$297 / $67 / €67   — 5000 créditos
//
// Limites de features: lib/feature-limits.ts
//
// PARA MUDAR ALGO: Edite aqui e tudo atualiza automaticamente
// (sidebar, página de planos, webhook Hotmart, catraca, etc.)

export const PLANOS = {
    essencial: {
        nivel: 1,
        nome: 'Essencial',
        hotmart: 'Secretaria',
        creditos: 1000,
        whatsapps: 1,
        instagrams: 0,
        idiomas: ['pt-BR'],
        vozClonada: false,
        equipe: false,
        multiClinica: false,
        precos: { brl: 97, usd: 27, eur: 27 },
        precosAnuais: { brl: 77, usd: 22, eur: 22 },
    },
    pro: {
        nivel: 2,
        nome: 'Pro',
        hotmart: 'Estrategista',
        creditos: 3000,
        whatsapps: 1,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: false,
        equipe: false,
        multiClinica: false,
        precos: { brl: 197, usd: 47, eur: 47 },
        precosAnuais: { brl: 157, usd: 37, eur: 37 },
    },
    premium: {
        nivel: 3,
        nome: 'Premium',
        hotmart: 'Designer',
        creditos: 5000,
        whatsapps: 2,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: true,
        equipe: true,
        multiClinica: true,
        precos: { brl: 297, usd: 67, eur: 67 },
        precosAnuais: { brl: 237, usd: 54, eur: 54 },
    },
} as const

export type PlanoKey = keyof typeof PLANOS
export type PlanoInfo = typeof PLANOS[PlanoKey]

export const MAX_NIVEL = 3

// Aliases (compatibilidade com nomes antigos do banco/Hotmart)
export const PLAN_ALIASES: Record<string, PlanoKey> = {
    // Nomes atuais
    essencial: 'essencial',
    pro: 'pro',
    premium: 'premium',
    // Nomes antigos → mapeiam pros novos
    secretaria: 'essencial',
    starter: 'essencial',
    estrategista: 'pro',
    designer: 'premium',
    // P4 antigo → mapeia pro P3 (maior plano disponível)
    audiovisual: 'premium',
    black: 'premium',
    master: 'premium',
}

// Converter texto do banco → nível numérico
export function planoToNivel(plano: string | number | null): number {
    if (typeof plano === 'number') return Math.min(MAX_NIVEL, Math.max(1, plano))
    if (!plano) return 1
    const key = PLAN_ALIASES[plano.toLowerCase()]
    return key ? PLANOS[key].nivel : 1
}

// Converter nível numérico → dados do plano
export function nivelToPlano(nivel: number): PlanoInfo {
    // Clamp pro max disponível
    const n = Math.min(MAX_NIVEL, Math.max(1, nivel))
    const entries = Object.values(PLANOS)
    return entries.find(p => p.nivel === n) || entries[0]
}

// Converter texto do banco → dados do plano
export function getPlanoInfo(plano: string | number | null): PlanoInfo {
    return nivelToPlano(planoToNivel(plano))
}

// Verificar se um feature está disponível no nível
export function temFeature(nivel: number, feature: keyof PlanoInfo): boolean {
    const plano = nivelToPlano(nivel)
    return Boolean(plano[feature])
}

// Preço da instância extra = metade do valor do plano
export function precoInstanciaExtra(nivel: number): { usd: number; eur: number; brl: number } {
    const plano = nivelToPlano(nivel)
    return {
        brl: Math.round(plano.precos.brl / 2 * 100) / 100,
        usd: Math.round(plano.precos.usd / 2 * 100) / 100,
        eur: Math.round(plano.precos.eur / 2 * 100) / 100,
    }
}

// Lista de features por nível (usado na página de planos e sidebar)
export function getFeaturesPorNivel(nivel: number): string[] {
    const features: string[] = []

    // P1 — Todos os planos
    features.push('WhatsApp IA (atendimento + agendamento)')
    features.push('Agendamento automático')
    features.push('Follow-ups inteligentes')
    features.push('Promoções e combos')
    features.push('CRM (Kanban + Contatos)')
    features.push('Análise inteligente de mídias')
    features.push('Estilo de atendimento (Direta/Consultiva)')
    features.push(`${nivelToPlano(nivel).creditos.toLocaleString()} créditos/mês`)

    // P2+
    if (nivel >= 2) {
        features.push('Instagram DM IA')
        features.push('4 idiomas (PT-BR, PT-PT, EN, ES)')
    }

    // P3+
    if (nivel >= 3) {
        features.push('Equipe / Multi-profissional')
        features.push('Voz Clonada (ElevenLabs)')
        features.push('Multi-clínica')
        features.push(`${nivelToPlano(nivel).whatsapps} WhatsApps`)
    }

    return features
}
