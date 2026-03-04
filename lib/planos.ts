// Mapeamento central de planos IARA
// Plano 1: Essencial (Secretária) — $47/€47/R$197
// Plano 2: Premium (Completo)     — $87/€87/R$397

export const PLANOS = {
    essencial: { nivel: 1, nome: 'Essencial', hotmart: 'Essencial', whatsapps: 1, instagrams: 0, idiomas: ['pt-BR'], vozClonada: false },
    premium: { nivel: 2, nome: 'Premium', hotmart: 'Premium', whatsapps: 1, instagrams: 1, idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'], vozClonada: true },
    // Futuros planos (desativados)
    // master: { nivel: 3, nome: 'Master', hotmart: 'Master', whatsapps: 2, instagrams: 1, idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'], vozClonada: true },
    // black:  { nivel: 4, nome: 'Black',  hotmart: 'Black',  whatsapps: 3, instagrams: 1, idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'], vozClonada: true },
} as const

export const MAX_NIVEL = 2

// Aliases (para compatibilidade)
export const PLAN_ALIASES: Record<string, keyof typeof PLANOS> = {
    starter: 'essencial',
    essencial: 'essencial',
    premium: 'premium',
    // Aliases antigos → mapeiam pro premium
    master: 'premium',
    black: 'premium',
    // Nomes do painel
    secretaria: 'essencial',
    estrategista: 'premium',
    designer: 'premium',
    audiovisual: 'premium',
}

// Converter texto do banco → nível numérico
export function planoToNivel(plano: string | number | null): number {
    if (typeof plano === 'number') return Math.min(MAX_NIVEL, Math.max(1, plano))
    if (!plano) return 1
    const key = PLAN_ALIASES[plano.toLowerCase()]
    return key ? PLANOS[key].nivel : 1
}

// Converter nível numérico → dados do plano
export function nivelToPlano(nivel: number) {
    const entries = Object.values(PLANOS)
    return entries.find(p => p.nivel === nivel) || entries[0]
}

// Converter texto do banco → dados do plano
export function getPlanoInfo(plano: string | number | null) {
    return nivelToPlano(planoToNivel(plano))
}

// Preço da instância extra = metade do valor do plano
export function precoInstanciaExtra(nivel: number): { usd: number; eur: number; brl: number } {
    if (nivel >= 2) return { usd: 43.50, eur: 43.50, brl: 198.50 }
    return { usd: 23.50, eur: 23.50, brl: 98.50 }
}
