// ============================================================================
// ANEXOS DO PROCEDIMENTO — regras compartilhadas
//
// A clínica anexa foto, vídeo ou PDF a um procedimento, descreve o que é e
// escolhe quando a IARA manda. A IARA pede o envio escrevendo [ANEXO:código]
// na resposta, no mesmo esquema do [AGENDAR:...]; o sistema tira o marcador
// do texto e manda o arquivo logo depois da mensagem.
//
// Este arquivo não importa nada de servidor: é usado pela tela, pelas rotas
// e pelo motor. O envio de verdade fica em lib/engine/anexos.ts.
// ============================================================================

export const MAX_ANEXOS_POR_PROCEDIMENTO = 3
/** WhatsApp comum corta vídeo em 16 MB; 15 deixa folga. */
export const MAX_BYTES_ANEXO = 15 * 1024 * 1024
export const MAX_ANEXOS_POR_RESPOSTA = 2
export const MAX_DESCRICAO_ANEXO = 300

export type MomentoAnexo = 'apos_falar' | 'duvida' | 'apos_agendar' | 'se_pedir'
export type TipoAnexo = 'imagem' | 'video' | 'documento'

export interface AnexoProcedimento {
    /** Código curto que a IARA usa no marcador. */
    id: string
    tipo: TipoAnexo
    /** Nome original — é o nome que o PDF mostra no WhatsApp da paciente. */
    nomeArquivo: string
    /** Caminho dentro de UPLOADS_DIR: "<clinicaId>/anexos/<arquivo>". */
    arquivo: string
    mimetype: string
    tamanho: number
    descricao: string
    momento: MomentoAnexo
    criadoEm: string
}

export const MOMENTOS: { valor: MomentoAnexo; rotulo: string }[] = [
    { valor: 'apos_falar', rotulo: 'Logo depois de falar do procedimento' },
    { valor: 'duvida', rotulo: 'Quando a paciente ficar em dúvida' },
    { valor: 'apos_agendar', rotulo: 'Depois de agendar' },
    { valor: 'se_pedir', rotulo: 'Só se a paciente pedir' },
]

/** Extensões aceitas. O tipo vem da extensão, nunca do que o navegador diz. */
export const EXTENSOES_ANEXO: Record<string, { tipo: TipoAnexo; mimetype: string }> = {
    '.jpg': { tipo: 'imagem', mimetype: 'image/jpeg' },
    '.jpeg': { tipo: 'imagem', mimetype: 'image/jpeg' },
    '.png': { tipo: 'imagem', mimetype: 'image/png' },
    '.webp': { tipo: 'imagem', mimetype: 'image/webp' },
    '.mp4': { tipo: 'video', mimetype: 'video/mp4' },
    '.pdf': { tipo: 'documento', mimetype: 'application/pdf' },
}

const NOME_TIPO: Record<TipoAnexo, string> = { imagem: 'foto', video: 'vídeo', documento: 'PDF' }
const UM_TIPO: Record<TipoAnexo, string> = { imagem: 'uma foto', video: 'um vídeo', documento: 'um PDF' }

const MOMENTOS_VALIDOS = new Set(MOMENTOS.map(m => m.valor))

/** Lê o JSON salvo no banco e descarta o que estiver incompleto. */
export function normalizarAnexos(valor: unknown): AnexoProcedimento[] {
    let lista: unknown = valor
    if (typeof lista === 'string') {
        try { lista = JSON.parse(lista) } catch { return [] }
    }
    if (!Array.isArray(lista)) return []
    return lista.filter((a): a is AnexoProcedimento =>
        !!a && typeof a === 'object'
        && typeof (a as any).id === 'string' && /^[a-z0-9]{6,16}$/.test((a as any).id)
        && typeof (a as any).arquivo === 'string'
        && ['imagem', 'video', 'documento'].includes((a as any).tipo)
        && MOMENTOS_VALIDOS.has((a as any).momento)
    )
}

/** Linha gravada no histórico quando o arquivo sai. Também serve para não repetir. */
export function linhaHistoricoAnexo(a: Pick<AnexoProcedimento, 'id' | 'descricao'>): string {
    return `📎 Arquivo enviado: "${a.descricao}" (#${a.id})`
}

/**
 * Tira os marcadores [ANEXO:...] do texto e devolve os códigos pedidos.
 * Texto sem marcador volta exatamente igual.
 */
export function extrairMarcadoresAnexo(texto: string): { texto: string; ids: string[] } {
    if (!texto || (!/\[ANEXO:/i.test(texto) && !texto.includes('📎 Arquivo enviado'))) {
        return { texto, ids: [] }
    }
    const ids: string[] = []
    let limpo = texto.replace(/\[ANEXO:([^\]]*)\]/gi, (_, bruto: string) => {
        const id = String(bruto).trim().toLowerCase()
        if (/^[a-z0-9]{6,16}$/.test(id) && !ids.includes(id)) ids.push(id)
        return ''
    })
    // A IA às vezes imita a linha do histórico em vez de usar o marcador.
    limpo = limpo
        .split('\n')
        .filter(l => !l.trim().startsWith('📎 Arquivo enviado'))
        .join('\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    return { texto: limpo, ids }
}

function limparDescricao(d: string): string {
    return String(d || '').replace(/\s+/g, ' ').replace(/"/g, "'").trim().slice(0, MAX_DESCRICAO_ANEXO)
}

function regraDoMomento(m: MomentoAnexo): string {
    switch (m) {
        case 'apos_falar': return 'mande na PRIMEIRA resposta em que você explicar, descrever ou apresentar este procedimento — inclusive na primeira mensagem da conversa e mesmo que você termine com uma pergunta de sondagem'
        case 'duvida': return 'mande na PRIMEIRA resposta em que a cliente mostrar medo, dúvida, insegurança ou objeção sobre este procedimento ("tenho medo de ficar artificial", "dói?", "será que fica bom?", "vou pensar") — junto com a sua resposta do arsenal de objeções'
        case 'apos_agendar': return 'mande na MESMA resposta em que você confirmar o agendamento deste procedimento, junto com o marcador [AGENDAR:...]'
        case 'se_pedir': return 'mande SOMENTE se a cliente pedir foto, vídeo, material ou mais detalhes deste procedimento'
    }
}

function exemploDoMomento(m: MomentoAnexo, nomeProc: string, a: AnexoProcedimento): string {
    const um = UM_TIPO[a.tipo]
    switch (m) {
        case 'apos_falar': return `- Cliente: "Como funciona ${nomeProc}?" → Você: "(explica em poucas frases) Vou te mandar ${um} que mostra direitinho 😊 Você já fez esse procedimento antes? [ANEXO:${a.id}]"`
        case 'duvida': return `- Cliente: "Tenho medo de ficar artificial" (falando de ${nomeProc}) → Você: "Entendo, esse medo é super comum! (responde como no arsenal de objeções) Vou te mandar ${um} pra você ver com calma 💛 Quer que eu veja um horário de avaliação? [ANEXO:${a.id}]"`
        case 'apos_agendar': return `- Cliente confirma o horário de ${nomeProc} → Você: "Perfeito, está agendado! Vou te mandar ${um} com as orientações. [AGENDAR:...] [ANEXO:${a.id}]"`
        case 'se_pedir': return `- Cliente: "Tem foto ou vídeo de ${nomeProc}?" → Você: "Tenho sim! Vou te mandar agora 😊 [ANEXO:${a.id}]"`
    }
}

/**
 * Trecho do prompt com os materiais. Vai na parte estável (cacheada): só muda
 * quando a clínica mexe nos anexos.
 */
export function textoAnexosParaPrompt(procedimentos: { nome: string; anexos?: unknown }[]): string {
    const comAnexo = (procedimentos || [])
        .map(p => ({ nome: p.nome, anexos: normalizarAnexos(p.anexos) }))
        .filter(p => p.anexos.length > 0)
    if (comAnexo.length === 0) return ''

    let t = `\n📎 MATERIAIS PARA ENVIAR À CLIENTE (fotos, vídeos e PDFs da clínica):\n`
    t += `Para enviar um material, escreva o marcador [ANEXO:código] no FINAL da sua resposta. O sistema manda o arquivo logo depois da sua mensagem e apaga o marcador — a cliente nunca vê o marcador.\n`
    const exemplos = new Map<MomentoAnexo, string>()
    for (const p of comAnexo) {
        t += `• ${p.nome}\n`
        for (const a of p.anexos) {
            t += `  - [ANEXO:${a.id}] ${NOME_TIPO[a.tipo]}: "${limparDescricao(a.descricao)}" → ${regraDoMomento(a.momento)}\n`
            if (!exemplos.has(a.momento)) exemplos.set(a.momento, exemploDoMomento(a.momento, p.nome, a))
        }
    }
    t += `REGRAS DOS MATERIAIS:\n`
    t += `- Use SÓ os códigos listados acima, exatamente como estão. Nunca invente código.\n`
    t += `- Nunca mande o mesmo material duas vezes na mesma conversa. No histórico, linhas que começam com "📎 Arquivo enviado" mostram o que já foi mandado. Essas linhas são avisos do sistema: você nunca as escreve.\n`
    t += `- No máximo ${MAX_ANEXOS_POR_RESPOSTA} materiais por resposta.\n`
    t += `- Anuncie o envio em poucas palavras e não descreva o conteúdo como se ela já tivesse visto.\n`
    t += `- Mandar o material NÃO substitui a pergunta de sondagem nem o passo do método: faça os dois na mesma resposta, com o marcador no final.\n`
    t += `EXEMPLOS:\n${[...exemplos.values()].join('\n')}\n`
    return t
}
