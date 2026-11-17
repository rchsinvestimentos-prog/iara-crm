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

// 5 e 5: a clínica cadastra 4 ou 5 fotos de trabalhos e, quando a paciente
// aceita ver, vão todas juntas na mesma resposta.
export const MAX_ANEXOS_POR_PROCEDIMENTO = 5
/** WhatsApp comum corta vídeo em 16 MB; 15 deixa folga. */
export const MAX_BYTES_ANEXO = 15 * 1024 * 1024
export const MAX_ANEXOS_POR_RESPOSTA = 5
export const MAX_DESCRICAO_ANEXO = 300

export type MomentoAnexo = 'perguntar' | 'apos_falar' | 'duvida' | 'apos_agendar' | 'se_pedir'
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
    { valor: 'perguntar', rotulo: 'Perguntar antes ("posso te mandar?") e mandar se ela aceitar' },
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

// Os materiais "perguntar antes" de um procedimento vão para o prompt em
// grupo, com uma regra só: a paciente aceita uma vez e recebe todos juntos.
// Os outros momentos continuam um por linha.
type MomentoDireto = Exclude<MomentoAnexo, 'perguntar'>

function regraDoMomento(m: MomentoDireto): string {
    switch (m) {
        case 'apos_falar': return 'mande na PRIMEIRA resposta em que você explicar, descrever ou apresentar este procedimento — inclusive na primeira mensagem da conversa e mesmo que você termine com uma pergunta de sondagem'
        case 'duvida': return 'mande na PRIMEIRA resposta em que a cliente mostrar medo, dúvida, insegurança ou objeção sobre este procedimento ("tenho medo de ficar artificial", "dói?", "será que fica bom?", "vou pensar") — junto com a sua resposta do arsenal de objeções'
        case 'apos_agendar': return 'mande na MESMA resposta em que você confirmar o agendamento deste procedimento, junto com o marcador [AGENDAR:...]'
        case 'se_pedir': return 'mande SOMENTE se a cliente pedir foto, vídeo, material ou mais detalhes deste procedimento'
    }
}

function exemploDoMomento(m: MomentoDireto, nomeProc: string, a: AnexoProcedimento): string {
    const um = UM_TIPO[a.tipo]
    switch (m) {
        case 'apos_falar': return `- Cliente: "Como funciona ${nomeProc}?" → Você: "(explica em poucas frases) Vou te mandar ${um} que mostra direitinho 😊 Você já fez esse procedimento antes? [ANEXO:${a.id}]"`
        case 'duvida': return `- Cliente: "Tenho medo de ficar artificial" (falando de ${nomeProc}) → Você: "Entendo, esse medo é super comum! (responde como no arsenal de objeções) Vou te mandar ${um} pra você ver com calma 💛 Quer que eu veja um horário de avaliação? [ANEXO:${a.id}]"`
        case 'apos_agendar': return `- Cliente confirma o horário de ${nomeProc} → Você: "Perfeito, está agendado! Vou te mandar ${um} com as orientações. [AGENDAR:...] [ANEXO:${a.id}]"`
        case 'se_pedir': return `- Cliente: "Tem foto ou vídeo de ${nomeProc}?" → Você: "Tenho sim! Vou te mandar agora 😊 [ANEXO:${a.id}]"`
    }
}

// A frase da oferta vai no idioma da conversa. Com ela só em português, a
// IARA em espanhol seguia o roteiro de sondagem e nunca oferecia as fotos.
type LinguaOferta = 'pt' | 'es' | 'en'

function linguaDaOferta(idioma?: string | null): LinguaOferta {
    const i = (idioma || '').toLowerCase()
    return i.startsWith('es') ? 'es' : i.startsWith('en') ? 'en' : 'pt'
}

const NOMES_OFERTA: Record<LinguaOferta, Record<TipoAnexo, [string, string]> & { e: string }> = {
    pt: { imagem: ['uma foto', 'umas fotos'], video: ['um vídeo', 'uns vídeos'], documento: ['um PDF', 'uns PDFs'], e: 'e' },
    es: { imagem: ['una foto', 'unas fotos'], video: ['un vídeo', 'unos vídeos'], documento: ['un PDF', 'unos PDF'], e: 'y' },
    en: { imagem: ['a photo', 'some photos'], video: ['a video', 'some videos'], documento: ['a PDF', 'some PDFs'], e: 'and' },
}

/** "umas fotos", "un vídeo", "some photos and a video"... — o que a IARA oferece. */
function oQueOferecer(anexos: AnexoProcedimento[], lingua: LinguaOferta): string {
    const nomes = NOMES_OFERTA[lingua]
    const partes: string[] = []
    for (const tipo of ['imagem', 'video', 'documento'] as TipoAnexo[]) {
        const n = anexos.filter(a => a.tipo === tipo).length
        if (n) partes.push(nomes[tipo][n === 1 ? 0 : 1])
    }
    return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} ${nomes.e} ${partes[partes.length - 1]}` : partes[0]
}

/** A oferta e os exemplos do momento "perguntar antes", no idioma da conversa. */
function frasesDaOferta(lingua: LinguaOferta, oferta: string, profissional: string | null | undefined, nomeProc: string, marcadores: string) {
    // Só o tratamento diz o gênero. "Pelo nome" chega só o primeiro nome:
    // sem artigo, para não sair "da João".
    const fem = !!profissional && /^(dra|dona)\b/i.test(profissional)
    const masc = !!profissional && /^dr\b\.?(?!a)/i.test(profissional)
    if (lingua === 'es') {
        const quem = !profissional ? 'de la profesional' : fem ? `de la ${profissional}` : masc ? `del ${profissional}` : `de ${profissional}`
        const pergunta = `¿Te puedo mandar ${oferta} de trabajos ${quem}?`
        return {
            pergunta,
            exemplos: `- Cliente: "¿Cómo funciona ${nomeProc}?" → Você: "(explica en pocas frases) ${pergunta.slice(0, -1)} para que veas el resultado? 😊" (sem marcador)\n`
                + `- Cliente: "¡Sí, vale!" → Você: "¡Te las mando ahora! 💛 (segue o método com UMA pergunta) ${marcadores}"\n`
                + `- Cliente: "¿Tenéis fotos de ${nomeProc}?" → Você: "¡Claro! Te las mando ahora 😊 (segue o método com UMA pergunta) ${marcadores}"`,
        }
    }
    if (lingua === 'en') {
        const quem = profissional ? `${profissional}'s` : "the specialist's"
        const pergunta = `Can I send you ${oferta} of ${quem} work?`
        return {
            pergunta,
            exemplos: `- Cliente: "How does ${nomeProc} work?" → Você: "(explains in a few sentences) ${pergunta.slice(0, -1)} so you can see the results? 😊" (sem marcador)\n`
                + `- Cliente: "Yes, please!" → Você: "Sending them now! 💛 (segue o método com UMA pergunta) ${marcadores}"\n`
                + `- Cliente: "Do you have photos of ${nomeProc}?" → Você: "Sure! Sending them now 😊 (segue o método com UMA pergunta) ${marcadores}"`,
        }
    }
    const quem = !profissional ? 'da profissional' : fem ? `da ${profissional}` : masc ? `do ${profissional}` : `de ${profissional}`
    const pergunta = `Posso te mandar ${oferta} de trabalhos ${quem}?`
    return {
        pergunta,
        exemplos: `- Cliente: "Como funciona ${nomeProc}?" → Você: "(explica em poucas frases) ${pergunta.slice(0, -1)} pra você ver o resultado? 😊" (sem marcador)\n`
            + `- Cliente: "Pode sim!" → Você: "Vou te mandar agora 💛 (segue o método com UMA pergunta) ${marcadores}"\n`
            + `- Cliente: "Vocês têm fotos de ${nomeProc}?" → Você: "Tenho sim! Vou te mandar agora 😊 (segue o método com UMA pergunta) ${marcadores}"`,
    }
}

/**
 * Trecho do prompt com os materiais. Vai na parte estável (cacheada): muda
 * quando a clínica mexe nos anexos e com o idioma da conversa, como o resto
 * da parte estável (o cofre também é escolhido pelo idioma).
 */
export function textoAnexosParaPrompt(
    procedimentos: { nome: string; anexos?: unknown }[],
    profissional?: string | null,
    idioma?: string | null,
): string {
    const comAnexo = (procedimentos || [])
        .map(p => ({ nome: p.nome, anexos: normalizarAnexos(p.anexos) }))
        .filter(p => p.anexos.length > 0)
    if (comAnexo.length === 0) return ''

    const lingua = linguaDaOferta(idioma)
    let t = `\n📎 MATERIAIS PARA ENVIAR À CLIENTE (fotos, vídeos e PDFs da clínica):\n`
    t += `Para enviar um material, escreva o marcador [ANEXO:código] no FINAL da sua resposta. O sistema manda o arquivo logo depois da sua mensagem e apaga o marcador — a cliente nunca vê o marcador.\n`
    const exemplos = new Map<MomentoAnexo, string>()
    for (const p of comAnexo) {
        t += `• ${p.nome}\n`

        const perguntar = p.anexos.filter(a => a.momento === 'perguntar').slice(0, MAX_ANEXOS_POR_RESPOSTA)
        if (perguntar.length > 0) {
            const oferta = oQueOferecer(perguntar, lingua)
            const marcadores = perguntar.map(a => `[ANEXO:${a.id}]`).join(' ')
            const frases = frasesDaOferta(lingua, oferta, profissional, p.nome, marcadores)
            // Fotos subidas juntas têm a mesma descrição: aparece uma vez só.
            const descricoes = [...new Set(perguntar.map(a => limparDescricao(a.descricao)))]
            t += `  - PERGUNTAR ANTES — ${oferta}: ${descricoes.map(d => `"${d}"`).join('; ')}\n`
            // Pedido direto vem primeiro: sem isso a IARA respondia "Tem fotos?"
            // com "Posso te mandar?", uma pergunta a mais à toa.
            t += `    → Se a cliente pedir foto, vídeo ou resultado de ${p.nome}, ou perguntar se vocês têm, isso já é o "sim": mande na hora, sem perguntar: ${marcadores}\n`
            t += `    → Senão, ofereça UMA vez só, na primeira resposta em que você explicar ou apresentar ${p.nome}, ou em que a cliente mostrar dúvida ou medo sobre o resultado: "${frases.pergunta}". Nessa resposta a oferta é a sua pergunta (a pergunta de sondagem fica para a resposta seguinte) e NÃO vai marcador. Se o roteiro pediu a sondagem antes, ofereça logo na resposta seguinte, depois que ela responder.\n`
            t += `    → Só mande quando a mensagem dela logo depois da oferta for um sim ("sim", "pode", "manda", "quero", "claro", "sí", "vale", "yes"): aí mande todos juntos no final da resposta: ${marcadores}\n`
            t += `    → Se ela recusar, ou responder a oferta falando de outra coisa, não mande e não ofereça de novo.\n`
            if (!exemplos.has('perguntar')) exemplos.set('perguntar', frases.exemplos)
        }

        for (const a of p.anexos) {
            if (a.momento === 'perguntar') continue
            t += `  - [ANEXO:${a.id}] ${NOME_TIPO[a.tipo]}: "${limparDescricao(a.descricao)}" → ${regraDoMomento(a.momento)}\n`
            if (!exemplos.has(a.momento)) exemplos.set(a.momento, exemploDoMomento(a.momento, p.nome, a))
        }
    }
    t += `REGRAS DOS MATERIAIS:\n`
    t += `- Use SÓ os códigos listados acima, exatamente como estão. Nunca invente código.\n`
    t += `- Nunca mande o mesmo material duas vezes na mesma conversa. No histórico, linhas que começam com "📎 Arquivo enviado" mostram o que já foi mandado. Essas linhas são avisos do sistema: você nunca as escreve.\n`
    t += `- No máximo ${MAX_ANEXOS_POR_RESPOSTA} materiais por resposta.\n`
    t += `- Anuncie o envio em poucas palavras e não descreva o conteúdo como se ela já tivesse visto.\n`
    t += `- Mandar o material NÃO substitui a pergunta de sondagem nem o passo do método: faça os dois na mesma resposta, com o marcador no final. A única exceção é a resposta em que você OFERECE um material "perguntar antes": ali a oferta é a pergunta.\n`
    t += `EXEMPLOS:\n${[...exemplos.values()].join('\n')}\n`
    return t
}

/** Códigos que aparecem nas linhas "📎 Arquivo enviado ... (#código)". */
export function idsDeAnexosEnviados(textos: (string | null | undefined)[]): Set<string> {
    const ids = new Set<string>()
    for (const t of textos) {
        if (typeof t !== 'string' || !t.includes('📎 Arquivo enviado')) continue
        for (const m of t.matchAll(/\(#([a-z0-9]{6,16})\)/g)) ids.add(m[1])
    }
    return ids
}

/**
 * Lembrete na parte variável do prompt (fora do cache) para os materiais
 * "perguntar antes". Sem ele, nas clínicas em espanhol e inglês a IARA seguia
 * o roteiro de sondagem e quase nunca oferecia as fotos.
 *
 * `jaEnviados` vem do banco (conversa inteira). O histórico do prompt só tem
 * as últimas mensagens: numa conversa longa a linha "📎 Arquivo enviado" some
 * dele, e a IARA oferecia de novo uma foto que o envio ia barrar por já ter
 * saído — "vou te mandar" sem arquivo nenhum. Sem `jaEnviados` (o banco
 * falhou), usa o histórico que tiver.
 */
export function lembreteAnexosPerguntar(
    procedimentos: { nome: string; anexos?: unknown }[],
    historico: { content: string }[],
    profissional?: string | null,
    idioma?: string | null,
    jaEnviados?: Set<string> | null,
): string {
    const lingua = linguaDaOferta(idioma)
    const enviados = jaEnviados ?? idsDeAnexosEnviados(historico.map(m => m.content))
    const pendentes: { nome: string; faltam: AnexoProcedimento[] }[] = []
    const jaForam: string[] = []
    for (const p of procedimentos || []) {
        const perguntar = normalizarAnexos(p.anexos).filter(a => a.momento === 'perguntar').slice(0, MAX_ANEXOS_POR_RESPOSTA)
        if (perguntar.length === 0) continue
        const faltam = perguntar.filter(a => !enviados.has(a.id))
        if (faltam.length) pendentes.push({ nome: p.nome, faltam })
        else jaForam.push(p.nome)
    }

    let t = ''
    if (pendentes.length) {
        const linhas = pendentes.map(p => {
            const { pergunta } = frasesDaOferta(lingua, oQueOferecer(p.faltam, lingua), profissional, p.nome, '')
            return `- ${p.nome}: "${pergunta}" → ${p.faltam.map(a => `[ANEXO:${a.id}]`).join(' ')}`
        })
        t += `\n📎 FOTOS PARA OFERECER (ainda não enviadas nesta conversa):\n${linhas.join('\n')}\n`
        t += `Se a cliente está falando de um destes procedimentos e você ainda não ofereceu, ofereça nesta resposta — a oferta é a sua pergunta. Mande os marcadores só se a mensagem dela logo depois da oferta foi um sim. Se ela recusou ou respondeu outra coisa, não mande e não ofereça de novo.\n`
    }
    if (jaForam.length) {
        t += `\n📎 Já enviadas a esta cliente: as fotos de ${jaForam.join(', ')}. Não ofereça nem prometa mandar de novo.\n`
    }
    return t
}
