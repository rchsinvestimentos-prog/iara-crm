// ============================================
// PLANOS IARA v2 — 3 Níveis (Foco: Agendamento)
// ============================================
// P1 Start:   R$197 / $47 / €47   — 600 conversas
// P2 Master:  R$297 / $67 / €67   — 1.200 conversas
// P3 Black:   R$497 / $99 / €99   — 2.500 conversas
//
// As CHAVES internas continuam essencial/pro/premium: já existem clínicas
// com esses valores gravados, e renomear rebaixaria quem tem 'premium'
// (R$497) para o que passaria a se chamar Premium (R$197). Só o nome de
// exibição mudou. Por isso 'Premium' foi descartado como nome comercial.
//
// Os créditos batem com os tetos de lib/feature-limits.ts: uma conversa tem
// cerca de 6 mensagens, e o teto lá é contado em mensagens.
//
// Limites de features: lib/feature-limits.ts
//
// PARA MUDAR ALGO: Edite aqui e tudo atualiza automaticamente
// (sidebar, página de planos, webhook Hotmart, catraca, etc.)

export const PLANOS = {
    essencial: {
        nivel: 1,
        nome: 'Start',
        hotmart: 'Secretaria',
        creditos: 3600,
        conversas: 600,
        whatsapps: 1,
        instagrams: 0,
        idiomas: ['pt-BR'],
        vozClonada: false,
        equipe: false,
        multiClinica: false,
        precos: { brl: 197, usd: 47, eur: 47 },
        precosAnuais: { brl: 157, usd: 37, eur: 37 },
    },
    pro: {
        nivel: 2,
        nome: 'Master',
        hotmart: 'Estrategista',
        creditos: 7200,
        conversas: 1200,
        whatsapps: 1,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: false,
        equipe: false,
        multiClinica: false,
        precos: { brl: 297, usd: 67, eur: 67 },
        precosAnuais: { brl: 237, usd: 54, eur: 54 },
    },
    premium: {
        nivel: 3,
        nome: 'Black',
        hotmart: 'Designer',
        creditos: 15000,
        conversas: 2500,
        whatsapps: 2,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: true,
        equipe: true,
        multiClinica: true,
        precos: { brl: 497, usd: 99, eur: 99 },
        precosAnuais: { brl: 397, usd: 79, eur: 79 },
    },
} as const

// ============================================
// PACOTES ADICIONAIS
// ============================================
// Vendidos soltos, somados a qualquer plano. Não dependem do nível: quem
// está no Essencial pode comprar clonagem de voz.
//
// A chave grava em configuracoes da clínica (pacote_voz_realista,
// pacote_clonagem), que é o que lib/engine/audio.ts consulta.

export const PACOTES = {
    voz_realista: {
        nome: 'Voz Realista',
        chave: 'pacote_voz_realista',
        preco: 97,
        cota: { audiosRealistas: 150 },
        resumo: 'Vozes do catálogo da ElevenLabs, indistinguíveis de gente falando.',
        beneficios: [
            '12 vozes brasileiras ultra realistas',
            '150 áudios por mês na voz premium',
            'Depois da cota, volta para a voz padrão sem parar',
        ],
    },
    clonagem: {
        nome: 'Clonagem de Voz',
        chave: 'pacote_clonagem',
        preco: 147,
        cota: {},
        resumo: 'A IARA atende com a voz da própria profissional.',
        beneficios: [
            'A sua voz atendendo por você',
            'Regravação sempre que quiser',
            'Inclui as vozes realistas do catálogo',
        ],
    },
} as const

export type PacoteKey = keyof typeof PACOTES

export type PlanoKey = keyof typeof PLANOS
export type PlanoInfo = typeof PLANOS[PlanoKey]

export const MAX_NIVEL = 3

// ============================================
// RECURSOS DESLIGADOS
// ============================================
// Estes recursos exigiam um "Plano 4" que nunca existiu (MAX_NIVEL = 3),
// entao ficavam travados para 100% dos clientes, inclusive os Premium.
// Ficam escondidos ate haver uma decisao de plano. Para religar: true.
export const AVATAR_VIDEO_HABILITADO = false

// O Instagram depende de aprovação da Meta para as permissões de mensagem,
// que ainda não saiu. Enquanto isso o card aparece como "Em breve" em vez de
// oferecer uma conexão que falha na hora de autorizar. Para religar: true.
export const INSTAGRAM_HABILITADO = false
export const CAMPANHAS_HABILITADAS = false

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
    // Nomes comerciais atuais
    start: 'essencial',
    master: 'pro',        // ERA 'premium': Master vale R$297, não R$497.
    black: 'premium',
    // P4 antigo → mapeia pro P3 (maior plano disponível)
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


/**
 * Nome comercial do plano a partir do nível.
 *
 * Existe para os nomes ficarem num lugar só: estavam repetidos em oito
 * arquivos, e a troca de Essencial/Pro/Premium para Start/Master/Black
 * deixaria metade deles mostrando o nome antigo.
 */
export function nomeDoNivel(nivel: number | null | undefined): string {
    const n = Math.min(Math.max(Number(nivel) || 1, 1), MAX_NIVEL)
    const chave = (Object.keys(PLANOS) as PlanoKey[]).find(k => PLANOS[k].nivel === n)
    return chave ? PLANOS[chave].nome : PLANOS.essencial.nome
}
