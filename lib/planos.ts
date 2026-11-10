// ============================================
// PLANO ÚNICO DA IARA — desde 10/11/2026
// ============================================
// R$497/mês com tudo liberado. Start (R$197) e Master (R$297) deixaram de
// existir: não havia nenhuma clínica pagante neles.
//
// A chave interna continua 'premium' e o nível continua 3 porque é o que já
// está gravado no banco e nos links de pagamento. Qualquer nome antigo que
// chegar (start, master, essencial, pro...) vira este plano — nunca um
// plano menor, que não existe mais.
//
// Limites de uso: lib/feature-limits.ts
//
// PARA MUDAR O NOME OU O PREÇO: edite aqui e tudo atualiza
// (tela de planos, checkout, webhooks, admin).

export const PLANOS = {
    premium: {
        nivel: 3,
        nome: 'IARA',
        hotmart: 'IARA',
        creditos: 15000,
        conversas: 2500,
        whatsapps: 2,
        instagrams: 1,
        idiomas: ['pt-BR', 'pt-PT', 'en-US', 'es'],
        vozClonada: false,   // clonagem é pacote à parte (PACOTES.clonagem)
        equipe: true,
        multiClinica: true,
        precos: { brl: 497, usd: 99, eur: 99 },
        precosAnuais: { brl: 397, usd: 79, eur: 79 },
    },
} as const

/** O único plano à venda. Use isto em vez de escolher por nível. */
export const PLANO_UNICO = PLANOS.premium
export const PLANO_UNICO_CHAVE = 'premium' as const

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

// Nomes antigos do banco, da Hotmart e da Assiny. Todos apontam para o plano
// único: o que importa é a clínica nunca cair num plano que não existe.
export const PLAN_ALIASES: Record<string, PlanoKey> = {
    essencial: 'premium', pro: 'premium', premium: 'premium',
    secretaria: 'premium', starter: 'premium', estrategista: 'premium', designer: 'premium',
    start: 'premium', master: 'premium', black: 'premium', audiovisual: 'premium', iara: 'premium',
}

// Texto ou número do banco → nível. Com um plano só, é sempre o nível dele.
export function planoToNivel(_plano: string | number | null): number {
    return PLANO_UNICO.nivel
}

// Nível → dados do plano. Sempre o plano único.
export function nivelToPlano(_nivel: number): PlanoInfo {
    return PLANO_UNICO
}

// Texto do banco → dados do plano
export function getPlanoInfo(_plano: string | number | null): PlanoInfo {
    return PLANO_UNICO
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

// Lista do que o plano tem (página de planos e sidebar)
export function getFeaturesPorNivel(_nivel?: number): string[] {
    return [
        'WhatsApp IA (atendimento + agendamento)',
        'Agendamento automático',
        'Follow-ups inteligentes',
        'Promoções e combos',
        'CRM (Kanban + Contatos)',
        'Análise inteligente de mídias',
        'Estilo de atendimento (Direta/Consultiva)',
        `${PLANO_UNICO.creditos.toLocaleString()} créditos/mês`,
        INSTAGRAM_HABILITADO ? 'Instagram DM IA' : 'Instagram DM IA (em breve)',
        '4 idiomas (PT-BR, PT-PT, EN, ES)',
        'Equipe / Multi-profissional',
        'Multi-clínica',
        `${PLANO_UNICO.whatsapps} WhatsApps`,
    ]
}


/**
 * Nome comercial do plano a partir do nível.
 *
 * Existe para os nomes ficarem num lugar só: estavam repetidos em oito
 * arquivos, e a troca de Essencial/Pro/Premium para Start/Master/Black
 * deixaria metade deles mostrando o nome antigo.
 */
export function nomeDoNivel(_nivel?: number | null): string {
    return PLANO_UNICO.nome
}
