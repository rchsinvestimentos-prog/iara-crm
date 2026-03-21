// ============================================
// PLANOS IARA — 4 Níveis
// ============================================
// P1 Secretária:    R$97  / $27 / €27   — 1000 créditos
// P2 Estrategista:  R$197 / $47 / €47   — 3000 créditos
// P3 Designer:      R$297 / $67 / €67   — 5000 créditos
// P4 Audiovisual:   R$497 / $97 / €97   — 10000 créditos
//
// Limites de features: lib/feature-limits.ts
// Features P1 = generoso, features P2+ = degustação (3-5)
//
// PARA MUDAR ALGO: Edite aqui e tudo atualiza automaticamente
// (sidebar, página de planos, webhook Hotmart, catraca, etc.)

export const PLANOS = {
    secretaria: {
        nivel: 1,
        nome: 'Secretária',
        hotmart: 'Secretaria',
        creditos: 1000,
        whatsapps: 1,
        instagrams: 0,
        idiomas: ['pt-BR'],
        vozClonada: false,
        crmMini: true,
        avatarVideo: false,
        appClinica: false,
        precos: { brl: 97, usd: 27, eur: 27 },
        precosAnuais: { brl: 77, usd: 22, eur: 22 },   // ~20% off
    },
    estrategista: {
        nivel: 2,
        nome: 'Estrategista',
        hotmart: 'Estrategista',
        creditos: 3000,
        whatsapps: 1,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: false,
        crmMini: true,
        avatarVideo: false,
        appClinica: true,
        precos: { brl: 197, usd: 47, eur: 47 },
        precosAnuais: { brl: 157, usd: 37, eur: 37 },   // ~20% off
    },
    designer: {
        nivel: 3,
        nome: 'Designer',
        hotmart: 'Designer',
        creditos: 5000,
        whatsapps: 2,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: true,
        crmMini: true,
        avatarVideo: false,
        appClinica: true,
        precos: { brl: 297, usd: 67, eur: 67 },
        precosAnuais: { brl: 237, usd: 54, eur: 54 },   // ~20% off
    },
    audiovisual: {
        nivel: 4,
        nome: 'Audiovisual',
        hotmart: 'Audiovisual',
        creditos: 10000,
        whatsapps: 3,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: true,
        crmMini: true,
        avatarVideo: true,
        appClinica: true,
        precos: { brl: 497, usd: 97, eur: 97 },
        precosAnuais: { brl: 397, usd: 77, eur: 77 },   // ~20% off
    },
} as const

export type PlanoKey = keyof typeof PLANOS
export type PlanoInfo = typeof PLANOS[PlanoKey]

export const MAX_NIVEL = 4

// Aliases (para compatibilidade com nomes antigos)
export const PLAN_ALIASES: Record<string, PlanoKey> = {
    // Nomes novos
    secretaria: 'secretaria',
    estrategista: 'estrategista',
    designer: 'designer',
    audiovisual: 'audiovisual',
    // Nomes antigos → mapeiam pros novos
    essencial: 'secretaria',
    starter: 'secretaria',
    premium: 'estrategista',
    master: 'designer',
    black: 'audiovisual',
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
    const entries = Object.values(PLANOS)
    return entries.find(p => p.nivel === nivel) || entries[0]
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
    features.push('Follow-up automático')
    features.push('Voz IA (OpenAI TTS)')
    features.push('Promoções e combos')
    features.push('CRM (Kanban + Contatos)')
    features.push(`${nivelToPlano(nivel).creditos.toLocaleString()} créditos/mês`)

    // P2+
    if (nivel >= 2) {
        features.push('Instagram DM IA')
        features.push('App da Clínica (PWA)')
        features.push('4 idiomas (PT-BR, PT-PT, EN, ES)')
        features.push('Fotos IA (Astria)')
        features.push('Gerador de posts')
        features.push('Calendário de conteúdo')
        features.push('Raio-X Instagram')
    }

    // P3+
    if (nivel >= 3) {
        features.push('Voz Clonada (ElevenLabs)')
        features.push('Lead Scoring')
        features.push('Multi-clínica')
        features.push(`${nivelToPlano(nivel).whatsapps} WhatsApps`)
    }

    // P4
    if (nivel >= 4) {
        features.push('Avatar Vídeo IA (10min/mês)')
        features.push('White-label')
        features.push('API access')
        features.push(`${nivelToPlano(nivel).whatsapps} WhatsApps`)
    }

    return features
}
