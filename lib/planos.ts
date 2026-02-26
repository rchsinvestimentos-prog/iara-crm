// Mapeamento central de planos IARA
// Hotmart: Essencial, Premium, Master, Black
// Painel: Secretária, Estrategista, Designer, Audiovisual

export const PLANOS = {
    essencial: { nivel: 1, nome: 'Secretária', hotmart: 'Essencial', whatsapps: 1, instagrams: 0 },
    premium: { nivel: 2, nome: 'Estrategista', hotmart: 'Premium', whatsapps: 1, instagrams: 1 },
    master: { nivel: 3, nome: 'Designer', hotmart: 'Master', whatsapps: 2, instagrams: 1 },
    black: { nivel: 4, nome: 'Audiovisual', hotmart: 'Black', whatsapps: 3, instagrams: 1 },
} as const

// Aliases (para compatibilidade)
export const PLAN_ALIASES: Record<string, keyof typeof PLANOS> = {
    starter: 'essencial',
    essencial: 'essencial',
    premium: 'premium',
    master: 'master',
    black: 'black',
    // Nomes do painel também funcionam
    secretaria: 'essencial',
    estrategista: 'premium',
    designer: 'master',
    audiovisual: 'black',
}

// Converter texto do banco → nível numérico
export function planoToNivel(plano: string | number | null): number {
    if (typeof plano === 'number') return Math.min(4, Math.max(1, plano))
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
