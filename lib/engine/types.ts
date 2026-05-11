// ============================================
// IARA Engine — Tipos
// ============================================
// Todos os tipos usados pelo motor de IA.
// Se quiser mudar algo, começa aqui.

/** Mensagem recebida do WhatsApp/Instagram (via Evolution API) */
export interface MensagemRecebida {
    /** Telefone de quem mandou (formato: 5511999999999) */
    telefone: string
    /** Nome que aparece no WhatsApp do remetente */
    pushName?: string
    /** Texto da mensagem (ou transcrição se áudio) */
    mensagem: string
    /** Tipo: text, audio, image, video, document */
    tipoMensagem: 'text' | 'audio' | 'image' | 'video' | 'document'
    /** Nome da instância na Evolution API */
    instancia: string
    /** Se veio áudio, o base64 do arquivo */
    audioBase64?: string
    /** Original webhook payload from Evolution API */
    rawMessage?: any
    /** ID único do request (pra rastreio) */
    requestId: string
    /** Canal de origem */
    canal: 'whatsapp' | 'instagram'
    /** Timestamp de quando chegou */
    timestamp: number
    /** Se a mensagem é da dona da clínica (fromMe) */
    isFromMe?: boolean
}

/** Dados da clínica (vem do banco - tabela users) */
export interface DadosClinica {
    id: number
    nome: string | null
    nomeClinica: string | null
    email: string | null
    nivel: number
    plano: string | null
    status: string | null

    // Créditos
    creditosMensais: number | null
    creditosDisponiveis: number | null

    // Assistente
    nomeAssistente: string | null

    // WhatsApp / Evolution
    evolutionInstance: string | null
    whatsappClinica: string | null
    whatsappDoutora: string | null
    nomeDoutora: string | null
    tratamentoDoutora: string | null
    evolutionApikey: string | null

    // Horários
    horarioSemana: string | null
    horarioInicio: string | null
    horarioFim: string | null
    atendeSabado: boolean | null
    horarioSabado: string | null
    almocoSemana: string | null
    almocoSabado: string | null
    atendeDomingo: boolean | null
    horarioDomingo: string | null
    almocoDomingo: string | null
    atendeFeriado: boolean | null
    horarioFeriado: string | null
    almocoFeriado: string | null
    intervaloAtendimento: number | null
    antecedenciaMinima: string | null
    endereco: string | null

    // Personalização
    humor: string | null
    emojis: string | null
    tomAtendimento: string | null
    diferenciais: string | null
    daCursos: boolean | null
    calendarProvider: string | null
    appleCalendarEmail: string | null
    appleCalendarPassword: string | null
    appleCalendarUrl: string | null
    funcionalidades: string | null
    feedbacks: string | null
    cuidadosPos: string | null
    politicaCancelamento: string | null
    mensagemBoasVindas: string | null
    fraseDespedida: string | null
    sempreLigada: boolean | null

    // Internacionalização
    idioma: string | null
    pais: string | null
    moeda: string | null
    timezone: string | null

    // Mídia
    vozClonada: string | null

    // JSON configs
    configuracoes: Record<string, any> | null
    integracoes: Record<string, any> | null

    // Estilo de atendimento v2
    estiloAtendimento: 'direta' | 'consultiva' | null

    // WhatsApp número
    whatsappNumero: string | null

    // Descontos
    aceitaDescontos: boolean | null
    descontoMaximo: number | null

    // Formas de pagamento
    formasPagamento: Record<string, any> | null
}

/** O Cofre da IARA — personalidade e regras */
export interface CofreIARA {
    leisImutaveis: string
    conhecimentoEspecialista: string
    arsenalDeObjecoes: string
    roteiroVendas: string
}

/** Profissional ativo da clínica (multi-profissional) */
export interface ProfissionalAtivo {
    id: string
    nome: string
    bio: string | null
    especialidade: string | null
    whatsapp: string | null
    isDono: boolean
    procedimentos: Procedimento[]
    // Horários (parseados, com fallback para clínica)
    horarioSemana: string | null
    horarioSabado: string | null
    atendeSabado: boolean | null
    horarioDomingo: string | null
    atendeDomingo: boolean | null
    intervaloAtendimento: number | null
    ausencias: { inicio: string; fim: string; motivo?: string }[]
    // Google Calendar por profissional
    googleCalendarToken: string | null
    googleCalendarRefreshToken: string | null
    googleCalendarId: string | null
    googleTokenExpires: Date | null
}

/** Procedimento da clínica */
export interface Procedimento {
    id: string
    nome: string
    valor: number
    desconto: number
    parcelas: string | null
    duracao: string | null
    descricao: string | null
    valorMin: number | null
    valorMax: number | null
    profissionalId?: string | null
}

/** Feedback da Dra */
export interface FeedbackDra {
    regra: string
}

/** Memória da cliente */
export interface MemoriaCliente {
    resumoGeral: string | null
    procedimentosRealizados: string[]
    tags: string[]
}

/** Resultado do check da Catraca */
export interface ResultadoCatraca {
    permitido: boolean
    motivo?: 'inativo' | 'sem_creditos' | 'pausado' | 'fora_horario' | 'clinica_nao_encontrada'
    mensagemBloqueio?: string
    clinica?: DadosClinica
    isDoutora?: boolean
}

/** Resultado da chamada de IA */
export interface RespostaIA {
    texto: string
    modelo: string
    tokens?: number
    fallback: boolean
}

/** Tipo de saída (texto ou áudio) */
export interface ConfigSaida {
    tipoSaida: 'text' | 'audio'
    provedorVoz: 'openai_tts' | 'elevenlabs' | null
    voiceId: string | null
}

/** Log de evento */
export interface LogEvento {
    clinicaId: number
    tipo: 'mensagem_recebida' | 'mensagem_enviada' | 'erro' | 'feedback' | 'credito'
    dados: Record<string, any>
}

// ============================================
// FUNCIONALIDADES — Toggles do painel
// ============================================

/** Mapa de todas as funcionalidades que a Dra pode ligar/desligar */
export interface Funcionalidades {
    responder_texto: boolean
    responder_audio: boolean
    transcrever_audio: boolean
    vendas_7_passos: boolean
    dar_desconto: boolean
    google_calendar: boolean
    lembrete_24h: boolean
    lembrete_2h: boolean
    followup_abandono: boolean
    horario_ponto: boolean
    enviar_endereco: boolean
    parcelamento: boolean
    encaminhar_foto: boolean
}

const FUNCIONALIDADES_DEFAULT: Funcionalidades = {
    responder_texto: true,
    responder_audio: true,
    transcrever_audio: true,
    vendas_7_passos: true,
    dar_desconto: true,
    google_calendar: true,
    lembrete_24h: true,
    lembrete_2h: true,
    followup_abandono: true,
    horario_ponto: false,
    enviar_endereco: true,
    parcelamento: true,
    encaminhar_foto: true,
}

/**
 * Parseia o campo `funcionalidades` (string JSON) em um objeto tipado.
 * Se falhar ou estiver vazio, retorna os defaults (tudo ativo).
 */
export function parseFuncionalidades(raw: string | null | undefined): Funcionalidades {
    if (!raw) return { ...FUNCIONALIDADES_DEFAULT }
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        return {
            ...FUNCIONALIDADES_DEFAULT,
            ...parsed,
        }
    } catch {
        return { ...FUNCIONALIDADES_DEFAULT }
    }
}
