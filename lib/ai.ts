import OpenAI from 'openai'

// ─── Client ──────────────────────────────────────────────────────────────────
function getClient() {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
    return new OpenAI({ apiKey })
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// ─── Generate Text (genérico) ────────────────────────────────────────────────
export async function generateText(opts: {
    system: string
    user: string
    maxTokens?: number
    temperature?: number
}): Promise<string> {
    const openai = getClient()
    const completion = await openai.chat.completions.create({
        model: MODEL,
        max_tokens: opts.maxTokens || 1500,
        temperature: opts.temperature || 0.7,
        messages: [
            { role: 'system', content: opts.system },
            { role: 'user', content: opts.user },
        ],
    })
    return completion.choices[0]?.message?.content?.trim() || ''
}

// ─── Gerar Roteiro de Vídeo ──────────────────────────────────────────────────
export async function gerarRoteiro(assunto: string, formato: string = 'reels') {
    const system = `Você é a IARA, assistente de IA especializada em marketing para clínicas de estética.
Gere roteiros de vídeo criativos, envolventes e prontos para gravar.
Sempre inclua: gancho inicial, desenvolvimento, CTA, sugestão de áudio/música e hashtags.
Formato: ${formato}. Tom: profissional mas acessível.`

    const user = `Crie um roteiro completo de vídeo ${formato} sobre: "${assunto}"

Formato de resposta:
🎬 ROTEIRO: [título criativo]

📱 FORMATO: ${formato}
⏱️ DURAÇÃO: [tempo estimado]

CENA 1 - GANCHO (0-3s)
[ação visual] + [fala/texto]

CENA 2 - DESENVOLVIMENTO
[ação visual] + [fala/texto]

CENA 3 - PROVA SOCIAL
[ação visual] + [fala/texto]

CENA 4 - CTA
[ação visual] + [fala/texto]

🎵 Áudio sugerido: [sugestão]
📝 Legenda para o post: [legenda com emojis]
#hashtags relevantes`

    return generateText({ system, user, maxTokens: 1500 })
}

// ─── Gerar Post / Legenda ────────────────────────────────────────────────────
export async function gerarPost(tema: string, tipo: string = 'carrossel') {
    const system = `Você é a IARA, assistente de IA especializada em marketing para clínicas de estética.
Gere conteúdo para posts de Instagram de alta conversão.
Use metodologias como AIDA, storytelling e value-first.
Tom: profissional, empático e que gera conexão.`

    const user = `Crie um post completo tipo "${tipo}" sobre: "${tema}"

Formato de resposta:
📸 POST: [título]
📐 TIPO: ${tipo}

${tipo === 'carrossel' ? `
SLIDE 1 (CAPA): [texto impactante - gancho]
SLIDE 2: [problema/dor]
SLIDE 3: [solução]
SLIDE 4: [prova/resultado]
SLIDE 5: [CTA]
` : ''}

📝 LEGENDA:
[legenda completa com emojis, storytelling e CTA]

#hashtags (10-15 relevantes)`

    return generateText({ system, user, maxTokens: 1500 })
}

// ─── Raio-X Instagram ────────────────────────────────────────────────────────
export async function analisarInstagram(handle: string) {
    const system = `Você é a IARA, consultora especialista em Instagram para estéticas.
Analise perfis de Instagram e gere relatórios SWOT completos com plano de ação.
Retorne a resposta em JSON válido, sem markdown.`

    const user = `Analise o perfil @${handle.replace('@', '')} (clínica de estética) e retorne um JSON com:
{
  "handle": "@${handle.replace('@', '')}",
  "score": <nota de 0 a 100>,
  "resumo": "<resumo em 2 linhas>",
  "metricas": {
    "seguidores_estimado": <número estimado>,
    "engajamento_estimado": "<porcentagem>",
    "frequencia_posts": "<ex: 3x por semana>"
  },
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_fracos": ["ponto 1", "ponto 2", "ponto 3"],
  "oportunidades": ["ponto 1", "ponto 2", "ponto 3"],
  "ameacas": ["ponto 1", "ponto 2"],
  "plano_acao": [
    { "passo": 1, "titulo": "<título>", "descricao": "<ação específica>" },
    { "passo": 2, "titulo": "<título>", "descricao": "<ação específica>" },
    { "passo": 3, "titulo": "<título>", "descricao": "<ação específica>" },
    { "passo": 4, "titulo": "<título>", "descricao": "<ação específica>" }
  ]
}`

    const raw = await generateText({ system, user, maxTokens: 2000, temperature: 0.5 })
    try {
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return { error: 'Falha ao parsear resposta da IA', raw }
    }
}

// ─── Gerar Identidade de Marca ───────────────────────────────────────────────
export async function gerarMarca(nomeClinica: string, especialidade: string, estilo: string) {
    const system = `Você é a IARA, designer de marcas especialista em estética e saúde.
Crie identidades visuais profissionais e modernas para clínicas.
Retorne em JSON válido, sem markdown.`

    const user = `Crie uma identidade de marca para:
Clínica: "${nomeClinica}"
Especialidade: "${especialidade}"
Estilo desejado: "${estilo}"

Retorne JSON:
{
  "nome": "${nomeClinica}",
  "tagline": "<slogan profissional>",
  "paleta": {
    "primaria": "<hex>",
    "secundaria": "<hex>",
    "accent": "<hex>",
    "fundo": "<hex>",
    "texto": "<hex>"
  },
  "tipografia": {
    "titulo": "<nome da fonte>",
    "corpo": "<nome da fonte>"
  },
  "personalidade": ["adjetivo1", "adjetivo2", "adjetivo3"],
  "tom_de_voz": "<descrição do tom>",
  "sugestao_bio": "<bio Instagram otimizada>",
  "elementos_visuais": ["elemento1", "elemento2", "elemento3"]
}`

    const raw = await generateText({ system, user, maxTokens: 1500, temperature: 0.8 })
    try {
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim()
        return JSON.parse(cleaned)
    } catch {
        return { error: 'Falha ao parsear resposta da IA', raw }
    }
}
