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
    evolutionApikey: string | null

    // Horários
    horarioSemana: string | null
    horarioInicio: string | null
    horarioFim: string | null
    atendeSabado: boolean | null
    atendeDomingo: boolean | null

    // Personalização
    humor: string | null
    emojis: string | null
    tomAtendimento: string | null
    diferenciais: string | null
    funcionalidades: string | null
    feedbacks: string | null
    cuidadosPos: string | null
    politicaCancelamento: string | null
    mensagemBoasVindas: string | null
    fraseDespedida: string | null

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

/** Procedimento da clínica */
export interface Procedimento {
    id: string
    nome: string
    valor: number
    desconto: number
    parcelas: string | null
    duracao: string | null
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
