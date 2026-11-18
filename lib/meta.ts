// ============================================================================
// META (Facebook, Instagram, WhatsApp oficial) — peças comuns
//
// - Endereço da Graph API (versão por variável de ambiente).
// - Conferência da assinatura dos webhooks (X-Hub-Signature-256).
// - "state" assinado do login com o Facebook: sem a assinatura, qualquer um
//   montava o state com o número de outra clínica e o Instagram de uma caía na
//   conta da outra.
// - Leitura do signed_request que a Meta manda quando a pessoa remove o app
//   ou pede para apagar os dados.
//
// Só roda no servidor (usa os segredos do app).
// ============================================================================
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v22.0'
/** Trocável para teste local (servidor falso no lugar da Meta). */
export const META_GRAPH_URL = `${(process.env.META_GRAPH_URL || 'https://graph.facebook.com').replace(/\/$/, '')}/${META_GRAPH_VERSION}`

export const META_APP_ID = process.env.META_APP_ID || ''
const META_APP_SECRET = process.env.META_APP_SECRET || ''
// Na troca do app da Meta (o "Be Livv CRM (OFICIAL)" para o app próprio da
// IARA) os dois mandam webhook por um tempo. O segredo do app antigo fica aqui
// até as clínicas reconectarem pelo app novo.
const META_APP_SECRET_ANTERIOR = process.env.META_APP_SECRET_ANTERIOR || ''

function segredosDoApp(): string[] {
    return [META_APP_SECRET, META_APP_SECRET_ANTERIOR].filter(Boolean)
}

export function metaConfigurada(): boolean {
    return !!(META_APP_ID && META_APP_SECRET)
}

function iguais(a: string, b: string): boolean {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/**
 * Confere o cabeçalho X-Hub-Signature-256 de um webhook da Meta contra o
 * corpo cru. Sem segredo configurado devolve false: webhook sem conferência
 * deixava qualquer um mandar "mensagem de paciente" e gastar crédito.
 */
export function assinaturaDoWebhookValida(corpoCru: string, cabecalho: string | null): boolean {
    if (!cabecalho || !cabecalho.startsWith('sha256=')) return false
    return segredosDoApp().some(segredo =>
        iguais(cabecalho, 'sha256=' + createHmac('sha256', segredo).update(corpoCru).digest('hex'))
    )
}

// ---------------------------------------------------------------------------
// Liberação antes da aprovação da Meta
// ---------------------------------------------------------------------------
/**
 * Enquanto a Meta não aprova o app, só contas com papel no app conseguem
 * conectar. Estas clínicas (e-mails em META_TESTE_EMAILS, separados por
 * vírgula) veem os botões de conexão para testar e gravar os vídeos da
 * revisão. Depois da aprovação: INSTAGRAM_HABILITADO (lib/planos.ts) e
 * WHATSAPP_OFICIAL_HABILITADO=1 abrem para todo mundo.
 */
export function clinicaDeTesteDaMeta(email: string | null | undefined): boolean {
    if (!email) return false
    const lista = (process.env.META_TESTE_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    return lista.includes(email.trim().toLowerCase())
}

/** Config do cadastro do WhatsApp oficial (Embedded Signup) presente? */
export function whatsappOficialConfigurado(): boolean {
    return metaConfigurada() && !!process.env.WHATSAPP_ES_CONFIG_ID
}

export function whatsappOficialLiberado(email: string | null | undefined): boolean {
    return whatsappOficialConfigurado() && (process.env.WHATSAPP_OFICIAL_HABILITADO === '1' || clinicaDeTesteDaMeta(email))
}

// ---------------------------------------------------------------------------
// state do OAuth
// ---------------------------------------------------------------------------
const VALIDADE_DO_STATE_MS = 30 * 60 * 1000

function segredoDoState(): string {
    const s = process.env.NEXTAUTH_SECRET || ''
    if (!s) throw new Error('NEXTAUTH_SECRET não configurado: sem ele não dá para assinar o state do login da Meta')
    return s
}

function base64url(buf: Buffer | string): string {
    return Buffer.from(buf).toString('base64url')
}

/** state = dados (base64url) + "." + assinatura. Vale 30 minutos. */
export function assinarState(dados: { clinicaId: number }): string {
    const corpo = base64url(JSON.stringify({ ...dados, exp: Date.now() + VALIDADE_DO_STATE_MS, n: randomBytes(8).toString('hex') }))
    const assinatura = base64url(createHmac('sha256', segredoDoState()).update(corpo).digest())
    return `${corpo}.${assinatura}`
}

/** Devolve os dados do state, ou null se a assinatura não bate ou venceu. */
export function lerState(state: string | null): { clinicaId: number } | null {
    if (!state) return null
    const [corpo, assinatura] = state.split('.')
    if (!corpo || !assinatura) return null
    const esperada = base64url(createHmac('sha256', segredoDoState()).update(corpo).digest())
    if (!iguais(assinatura, esperada)) return null
    try {
        const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString())
        if (typeof dados.exp !== 'number' || dados.exp < Date.now()) return null
        const clinicaId = Number(dados.clinicaId)
        return Number.isInteger(clinicaId) && clinicaId > 0 ? { clinicaId } : null
    } catch {
        return null
    }
}

// ---------------------------------------------------------------------------
// signed_request (remover o app / pedir exclusão de dados)
// ---------------------------------------------------------------------------
/**
 * Lê o signed_request da Meta: "<assinatura>.<dados>", os dois em base64url,
 * assinatura HMAC-SHA256 dos dados com o segredo do app. Devolve o user_id
 * (id do usuário do Facebook para este app) ou null se não confere.
 */
export function lerSignedRequest(signedRequest: string | null): { userId: string } | null {
    if (!signedRequest) return null
    const [assinatura, dados] = signedRequest.split('.')
    if (!assinatura || !dados) return null
    const confere = segredosDoApp().some(segredo =>
        iguais(assinatura, createHmac('sha256', segredo).update(dados).digest('base64url'))
    )
    if (!confere) return null
    try {
        const json = JSON.parse(Buffer.from(dados, 'base64url').toString())
        if (json.algorithm && String(json.algorithm).toUpperCase() !== 'HMAC-SHA256') return null
        return json.user_id ? { userId: String(json.user_id) } : null
    } catch {
        return null
    }
}
