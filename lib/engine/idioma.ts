// ============================================
// IDIOMA — em que língua a paciente fala
// ============================================
// A clínica tem um idioma no cadastro (users.idioma: pt-BR, pt-PT, en-US, es),
// mas a paciente pode escrever em outro: turista no Brasil, brasileira numa
// clínica de Madri. Aqui fica a decisão de qual idioma usar com ela — no
// prompt, nas mensagens prontas e na voz.
//
// A detecção é por palavras típicas de cada língua. Só entram palavras que NÃO
// existem nas outras duas: "para", "que", "como", "no", "da", "do", "vale",
// "horario" ficam de fora porque aparecem em português, espanhol e/ou inglês.
// Mensagem curta e neutra ("ok", "👍", "15h") devolve null: aí vale o idioma
// do resto da conversa ou o da clínica.

import { prisma } from '@/lib/prisma'

/** Os quatro idiomas que a IARA atende (mesmos códigos gravados em users.idioma). */
export type Idioma = 'pt-BR' | 'pt-PT' | 'es' | 'en-US'

/** Língua sem a variante regional — é o que a detecção consegue dizer. */
export type Lingua = 'pt' | 'es' | 'en'

const PALAVRAS: Record<Lingua, Set<string>> = {
    pt: new Set([
        'oi', 'olá', 'ola', 'obrigada', 'obrigado', 'obg', 'você', 'voce', 'vc', 'vcs', 'não', 'nao', 'sim',
        'tá', 'ta', 'tô', 'pra', 'pro', 'quanto', 'quanta', 'custa', 'custam', 'quero', 'posso', 'pode', 'podem',
        'tem', 'tenho', 'fala', 'falar', 'falo', 'português', 'agendar', 'agendamento', 'horário', 'preciso',
        'muito', 'muita', 'mas', 'é', 'e', 'estou', 'amanhã', 'amanha', 'quinta', 'segunda', 'terça',
        'terca', 'quarta', 'sexta', 'hoje', 'agora', 'também', 'tambem', 'onde', 'quando', 'isso', 'isto',
        'bem', 'boa', 'bom', 'senhora', 'com', 'meu', 'minha', 'sobrancelha', 'sobrancelhas', 'unhas',
        'ao', 'na', 'beleza', 'né', 'gente', 'tudo', 'vou', 'vai', 'gostaria', 'ainda', 'depois', 'então',
        'entao', 'já', 'consegue', 'vocês', 'voces', 'dela', 'dele', 'nossa', 'aí',
    ]),
    es: new Set([
        'hola', 'buenas', 'buenos', 'gracias', 'cuánto', 'cuanto', 'cuánta', 'cuesta', 'cuestan', 'quiero',
        'quería', 'quisiera', 'puedo', 'puedes', 'podéis', 'podría', 'tienes', 'tenéis', 'teneis', 'tengo',
        'tienen', 'hablas', 'habla', 'hablan', 'hablo', 'español', 'espanol', 'castellano', 'sí', 'cita', 'citas',
        'precio', 'precios', 'necesito', 'muy', 'pero', 'el', 'los', 'las', 'y', 'es', 'estoy', 'estás',
        'usted', 'ustedes', 'vosotros', 'vosotras', 'mañana', 'jueves', 'lunes', 'martes', 'miércoles',
        'miercoles', 'viernes', 'hoy', 'ahora', 'también', 'qué', 'cómo', 'dónde', 'cuándo', 'donde', 'cuando',
        'eso', 'esto', 'bien', 'bueno', 'señora', 'hueco', 'con', 'del', 'al', 'hacer', 'hecho', 'cejas',
        'labios', 'uñas', 'piel', 'mi', 'mis', 'su', 'sus', 'ya', 'hay', 'hasta', 'gustaría', 'gustaria',
        'vuestro', 'vuestra', 'guay', 'aquí', 'allí', 'luego', 'después', 'entonces',
    ]),
    // Sem as palavras inglesas que brasileira usa no meio do português
    // ("hi", "lips", "brows", "good", "price", "book", "like", "just"):
    // "Oi, quero fazer lips" não pode virar conversa em inglês.
    en: new Set([
        'hello', 'thanks', 'thank', 'you', 'your', "you're", 'is', 'are', 'the', 'and', 'how',
        'much', 'what', 'when', 'where', 'can', 'could', 'would', 'i', "i'm", 'im', 'does', 'have', 'has',
        'appointment', 'available', 'availability', 'tomorrow', 'today',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'please', 'yes',
        'morning', 'afternoon', 'evening', 'eyebrows', 'want', 'need', 'it',
        'my', 'this', 'that', 'with', 'there', 'will', 'be', 'am', 'was', 'speak', 'english', 'of',
        'which', 'any', 'next', 'week', 'about', 'sure', 'thx',
    ]),
}

/**
 * Tira os marcadores que o próprio sistema põe na mensagem — "[ÁUDIO RECEBIDO
 * E TRANSCRITO PARA VOCÊ]: ...", "[IMAGE ENVIADO]" — que são português e
 * fariam toda paciente parecer brasileira.
 */
function semMarcadores(texto: string): string {
    return texto.replace(/\[[^\]]*\]:?/g, ' ')
}

/**
 * Língua de um texto curto de WhatsApp, ou null quando não dá para saber.
 * Só decide quando uma língua ganha das outras duas com pelo menos `minimo`
 * pontos (uma palavra típica = 1 ponto; ñ ¿ ¡ ã õ ç = 2).
 */
export function detectarLingua(texto: string | null | undefined, minimo = 1): Lingua | null {
    if (!texto) return null
    const limpo = semMarcadores(texto).toLowerCase()
    const pontos: Record<Lingua, number> = { pt: 0, es: 0, en: 0 }

    // Letras e sinais que só uma das línguas usa valem mais que uma palavra.
    if (/[ñ¿¡]/.test(limpo)) pontos.es += 2
    if (/[ãõç]/.test(limpo)) pontos.pt += 2

    for (const palavra of limpo.match(/[\p{L}']+/gu) || []) {
        for (const lingua of ['pt', 'es', 'en'] as Lingua[]) {
            if (PALAVRAS[lingua].has(palavra)) pontos[lingua]++
        }
    }

    const ordem = (Object.entries(pontos) as [Lingua, number][]).sort((a, b) => b[1] - a[1])
    const [primeira, segunda] = ordem
    if (primeira[1] < Math.max(1, minimo) || primeira[1] === segunda[1]) return null
    return primeira[0]
}

/** Aceita o que estiver gravado ('es-ES', 'ES', 'en', 'pt_PT'...) e devolve um dos quatro códigos. */
export function normalizarIdioma(idioma: string | null | undefined): Idioma {
    const i = (idioma || '').toLowerCase().replace('_', '-')
    if (i.startsWith('es')) return 'es'
    if (i.startsWith('en')) return 'en-US'
    if (i === 'pt-pt') return 'pt-PT'
    return 'pt-BR'
}

export function linguaDoIdioma(idioma: string | null | undefined): Lingua {
    const n = normalizarIdioma(idioma)
    return n === 'es' ? 'es' : n === 'en-US' ? 'en' : 'pt'
}

/** Converte a língua detectada no idioma completo; português segue a variante da clínica. */
function idiomaDaLingua(lingua: Lingua, idiomaClinica: string | null | undefined): Idioma {
    if (lingua === 'es') return 'es'
    if (lingua === 'en') return 'en-US'
    return normalizarIdioma(idiomaClinica) === 'pt-PT' ? 'pt-PT' : 'pt-BR'
}

/**
 * Idioma para responder a esta mensagem: o da mensagem quando dá para saber,
 * senão o da clínica.
 */
export function idiomaDaMensagem(idiomaClinica: string | null | undefined, mensagem: string | null | undefined): Idioma {
    const lingua = detectarLingua(mensagem)
    return lingua ? idiomaDaLingua(lingua, idiomaClinica) : normalizarIdioma(idiomaClinica)
}

/**
 * Idioma da paciente pelas últimas mensagens dela no histórico. Serve às
 * mensagens que a IARA manda sozinha (lembrete, aniversário, "recebi sua
 * foto"), quando não há uma mensagem nova para olhar.
 *
 * Se o banco falhar, usa o idioma da clínica — o lembrete sai no idioma do
 * cadastro em vez de não sair — e deixa o erro no log.
 */
export async function idiomaDaPaciente(
    clinicaId: number,
    telefone: string | null | undefined,
    idiomaClinica: string | null | undefined,
): Promise<Idioma> {
    if (!telefone) return normalizarIdioma(idiomaClinica)
    // O agendamento pode ter o telefone digitado no painel ("(11) 99999-0000")
    // e o histórico tem o do WhatsApp ("5511999990000"): compara também pelos
    // últimos 8 dígitos.
    const digitos = telefone.replace(/\D/g, '')
    const final8 = digitos.length >= 8 ? digitos.slice(-8) : null
    try {
        const consulta = prisma.$queryRaw<{ content: string | null }[]>`
            SELECT content FROM historico_conversas
            WHERE user_id = ${clinicaId} AND role = 'user'
              AND (telefone_cliente = ${telefone}
                   OR (${final8}::text IS NOT NULL AND right(regexp_replace(telefone_cliente, '\D', '', 'g'), 8) = ${final8}::text))
            ORDER BY created_at DESC
            LIMIT 5
        `
        // Banco travado não pode segurar o lembrete das outras pacientes
        const linhas = await Promise.race([
            consulta,
            new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('demorou mais de 5 s')), 5000)),
        ])
        for (const linha of linhas) {
            const lingua = detectarLingua(linha.content)
            if (lingua) return idiomaDaLingua(lingua, idiomaClinica)
        }
    } catch (err) {
        console.error(`[Idioma] Não consegui ler o histórico de ${telefone} (clínica ${clinicaId}) — usando o idioma da clínica:`, err)
    }
    return normalizarIdioma(idiomaClinica)
}

/** Formato de data e hora de cada idioma (pt-PT segue o pt-BR, como sempre foi). */
export function localeDoIdioma(idioma: string | null | undefined): 'pt-BR' | 'es-ES' | 'en-US' {
    const lingua = linguaDoIdioma(idioma)
    return lingua === 'es' ? 'es-ES' : lingua === 'en' ? 'en-US' : 'pt-BR'
}
