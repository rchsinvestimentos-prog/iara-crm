// ============================================================================
// WHATSAPP OFICIAL (Cloud API da Meta)
//
// O resto do motor fala em "instância", como na Evolution. Um número oficial
// vira a instância "oficial_<phone_number_id>": a catraca acha a clínica por
// ela, o sender sabe que tem de mandar pela Meta e não pela Evolution, e o
// agrupador, a triagem e o histórico funcionam sem mudança.
//
// Tabela whatsapp_oficial (criada no boot, lib/banco/setup-db.js).
// Webhook: app/api/webhook/whatsapp-oficial. Conexão: app/api/whatsapp-oficial.
// ============================================================================
import { prisma } from '@/lib/prisma'
import { META_GRAPH_URL } from '@/lib/meta'

const PREFIXO = 'oficial_'

export function ehInstanciaOficial(instancia: string | null | undefined): boolean {
    return !!instancia && instancia.startsWith(PREFIXO)
}

export function instanciaOficial(phoneNumberId: string): string {
    return `${PREFIXO}${phoneNumberId}`
}

export function phoneNumberIdDaInstancia(instancia: string): string {
    return instancia.slice(PREFIXO.length)
}

export interface ContaOficial {
    id: number
    userId: number
    wabaId: string
    phoneNumberId: string
    numero: string | null
    accessToken: string
}

// Cada mensagem enviada consultaria o banco: 1 minuto de memória basta.
// Desconectar limpa a memória (esquecerConta) para não mandar com token velho.
const memoria = new Map<string, { conta: ContaOficial | null; ate: number }>()

export function esquecerConta(phoneNumberId: string) {
    memoria.delete(phoneNumberId)
}

/** Conta conectada deste número, ou null se não existe/está desconectada. */
export async function contaDoNumero(phoneNumberId: string): Promise<ContaOficial | null> {
    const guardada = memoria.get(phoneNumberId)
    if (guardada && guardada.ate > Date.now()) return guardada.conta
    const linhas = await prisma.$queryRaw<{ id: number; user_id: number; waba_id: string; phone_number_id: string; numero: string | null; access_token: string }[]>`
        SELECT id, user_id, waba_id, phone_number_id, numero, access_token
        FROM whatsapp_oficial
        WHERE phone_number_id = ${phoneNumberId} AND status = 'conectado'
        LIMIT 1
    `
    const l = linhas[0]
    const conta = l ? { id: l.id, userId: l.user_id, wabaId: l.waba_id, phoneNumberId: l.phone_number_id, numero: l.numero, accessToken: l.access_token } : null
    memoria.set(phoneNumberId, { conta, ate: Date.now() + 60_000 })
    return conta
}

/** Número oficial conectado da clínica (o primeiro), para mensagens que a IARA inicia. */
export async function instanciaOficialDaClinica(clinicaId: number): Promise<string | null> {
    const linhas = await prisma.$queryRaw<{ phone_number_id: string }[]>`
        SELECT phone_number_id FROM whatsapp_oficial
        WHERE user_id = ${clinicaId} AND status = 'conectado'
        ORDER BY created_at LIMIT 1
    `
    return linhas[0] ? instanciaOficial(linhas[0].phone_number_id) : null
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------
export interface ResultadoEnvio {
    ok: boolean
    /** Id da mensagem na Meta (wamid), quando saiu. */
    id?: string
    /** Mensagem de erro da Meta, quando não saiu. */
    erro?: string
    /** 131047: passou a janela de 24 h — fora dela só modelo aprovado. */
    foraDaJanela?: boolean
    /** Código de erro da Meta, quando houver. */
    codigo?: number
}

// Erros que querem dizer "este número parou de funcionar" (token revogado,
// sem permissão, conta bloqueada, número desregistrado). Com eles o número
// passa a "erro": a tela mostra e a IARA para de tentar por ele.
const ERROS_DA_CONTA = new Set([190, 10, 200, 368, 131005, 131031, 133010])

export function erroDeContaQuebrada(codigo: number | undefined): boolean {
    return codigo !== undefined && ERROS_DA_CONTA.has(codigo)
}

/** Marca o número (ou todos os da conta WABA) como com erro. Falha só vai para o log. */
export async function registrarErroConta(alvo: { phoneNumberId?: string; wabaId?: string }, erro: string): Promise<void> {
    try {
        if (alvo.phoneNumberId) {
            await prisma.$executeRaw`
                UPDATE whatsapp_oficial SET status = 'erro', ultimo_erro = ${erro.slice(0, 500)}, updated_at = NOW()
                WHERE phone_number_id = ${alvo.phoneNumberId} AND status = 'conectado'
            `
            esquecerConta(alvo.phoneNumberId)
        } else if (alvo.wabaId) {
            const linhas = await prisma.$queryRaw<{ phone_number_id: string }[]>`
                UPDATE whatsapp_oficial SET status = 'erro', ultimo_erro = ${erro.slice(0, 500)}, updated_at = NOW()
                WHERE waba_id = ${alvo.wabaId} AND status = 'conectado'
                RETURNING phone_number_id
            `
            for (const l of linhas) esquecerConta(l.phone_number_id)
        }
        console.error(`[WA Oficial] ❌ Número ${alvo.phoneNumberId || `(conta ${alvo.wabaId})`} marcado com erro: ${erro}`)
    } catch (err) {
        console.error(`[WA Oficial] ❌ Não consegui marcar o erro do número ${alvo.phoneNumberId || alvo.wabaId}:`, err)
    }
}

function soDigitos(telefone: string): string {
    return telefone.replace(/\D/g, '')
}

async function chamarGraph(conta: ContaOficial, caminho: string, init: RequestInit): Promise<{ ok: boolean; status: number; dados: any }> {
    const res = await fetch(`${META_GRAPH_URL}/${caminho}`, {
        ...init,
        headers: { Authorization: `Bearer ${conta.accessToken}`, ...(init.headers || {}) },
        signal: AbortSignal.timeout(60_000),
    })
    const dados = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, dados }
}

async function enviarMensagem(conta: ContaOficial, telefone: string, conteudo: Record<string, unknown>): Promise<ResultadoEnvio> {
    try {
        const r = await chamarGraph(conta, `${conta.phoneNumberId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: soDigitos(telefone), ...conteudo }),
        })
        const id = r.dados?.messages?.[0]?.id
        if (r.ok && id) return { ok: true, id }
        const codigo = typeof r.dados?.error?.code === 'number' ? r.dados.error.code : undefined
        const erro = r.dados?.error?.message || `HTTP ${r.status}`
        return { ok: false, erro: `${erro}${codigo ? ` (código ${codigo})` : ''}`, foraDaJanela: codigo === 131047, codigo }
    } catch (err: any) {
        return { ok: false, erro: err?.message || String(err) }
    }
}

/** Sobe um arquivo para a Meta e devolve o id da mídia. */
async function subirMidia(conta: ContaOficial, base64: string, mimetype: string, nomeArquivo: string): Promise<{ id?: string; erro?: string }> {
    try {
        const form = new FormData()
        form.append('messaging_product', 'whatsapp')
        form.append('type', mimetype)
        form.append('file', new Blob([new Uint8Array(Buffer.from(base64, 'base64'))], { type: mimetype }), nomeArquivo)
        const r = await chamarGraph(conta, `${conta.phoneNumberId}/media`, { method: 'POST', body: form })
        if (r.ok && r.dados?.id) return { id: String(r.dados.id) }
        return { erro: r.dados?.error?.message || `HTTP ${r.status}` }
    } catch (err: any) {
        return { erro: err?.message || String(err) }
    }
}

export async function enviarTexto(conta: ContaOficial, telefone: string, texto: string): Promise<ResultadoEnvio> {
    return enviarMensagem(conta, telefone, { type: 'text', text: { body: texto, preview_url: false } })
}

/** Áudio da IARA (mp3 da voz). Sobe o arquivo e manda pelo id. */
export async function enviarAudio(conta: ContaOficial, telefone: string, base64: string, mimetype = 'audio/mpeg'): Promise<ResultadoEnvio> {
    const midia = await subirMidia(conta, base64, mimetype, mimetype === 'audio/ogg' ? 'audio.ogg' : 'audio.mp3')
    if (!midia.id) return { ok: false, erro: `upload do áudio falhou: ${midia.erro}` }
    return enviarMensagem(conta, telefone, { type: 'audio', audio: { id: midia.id } })
}

export async function enviarArquivo(
    conta: ContaOficial,
    telefone: string,
    arquivo: { tipo: 'image' | 'video' | 'document'; base64: string; mimetype: string; nomeArquivo: string; legenda?: string },
): Promise<ResultadoEnvio> {
    const midia = await subirMidia(conta, arquivo.base64, arquivo.mimetype, arquivo.nomeArquivo)
    if (!midia.id) return { ok: false, erro: `upload do arquivo falhou: ${midia.erro}` }
    const corpo: Record<string, unknown> = { id: midia.id }
    if (arquivo.legenda && arquivo.tipo !== 'document') corpo.caption = arquivo.legenda
    if (arquivo.tipo === 'document') corpo.filename = arquivo.nomeArquivo
    return enviarMensagem(conta, telefone, { type: arquivo.tipo, [arquivo.tipo]: corpo })
}

/** Imagem por link público (usado por quem já manda imagem por URL na Evolution). */
export async function enviarImagemPorLink(conta: ContaOficial, telefone: string, url: string, legenda?: string): Promise<ResultadoEnvio> {
    return enviarMensagem(conta, telefone, { type: 'image', image: { link: url, ...(legenda ? { caption: legenda } : {}) } })
}

// ---------------------------------------------------------------------------
// Recebimento
// ---------------------------------------------------------------------------
/**
 * Baixa uma mídia recebida (áudio, foto, vídeo, documento) e devolve em
 * base64. São duas chamadas: a primeira dá o endereço temporário, a segunda
 * baixa o arquivo — as duas com o token da conta.
 */
function enderecoDaMeta(url: string): boolean {
    try {
        const host = new URL(url).hostname
        if (/(^|\.)(fbsbx\.com|facebook\.com|fbcdn\.net|whatsapp\.net)$/.test(host)) return true
        return host === new URL(META_GRAPH_URL).hostname
    } catch {
        return false
    }
}

export async function baixarMidia(conta: ContaOficial, mediaId: string): Promise<{ base64: string; mimetype: string } | null> {
    try {
        const info = await chamarGraph(conta, mediaId, { method: 'GET' })
        const url = info.dados?.url
        if (!info.ok || !url) {
            console.error(`[WA Oficial] ❌ Mídia ${mediaId} sem endereço: ${info.dados?.error?.message || `HTTP ${info.status}`}`)
            return null
        }
        // O token só vai para endereço da Meta (ou o da Graph configurada, no teste local)
        if (!enderecoDaMeta(url)) {
            console.error(`[WA Oficial] ❌ Mídia ${mediaId} com endereço fora da Meta: ${url.slice(0, 120)}`)
            return null
        }
        const res = await fetch(url, { headers: { Authorization: `Bearer ${conta.accessToken}` }, signal: AbortSignal.timeout(60_000) })
        if (!res.ok) {
            console.error(`[WA Oficial] ❌ Download da mídia ${mediaId} falhou: HTTP ${res.status}`)
            return null
        }
        const buf = Buffer.from(await res.arrayBuffer())
        return { base64: buf.toString('base64'), mimetype: info.dados?.mime_type || res.headers.get('content-type') || 'application/octet-stream' }
    } catch (err) {
        console.error(`[WA Oficial] ❌ Erro ao baixar a mídia ${mediaId}:`, err)
        return null
    }
}
