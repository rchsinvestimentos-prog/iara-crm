// ============================================================================
// WEBHOOK — WhatsApp oficial (Cloud API da Meta)
//
// URL para cadastrar no app da Meta (produto WhatsApp → Configuração):
//   https://app.iara.click/api/webhook/whatsapp-oficial
// Token de verificação: META_VERIFY_TOKEN (o mesmo do Instagram).
// Campos para assinar: messages, smb_message_echoes, account_update.
//
// Faz o papel do webhook da Evolution para os números oficiais: transforma o
// evento da Meta numa MensagemRecebida com a instância "oficial_<id>" e
// entrega ao mesmo agrupador/pipeline. Daí em diante tudo é igual.
//
// smb_message_echoes: na coexistência (número que continua no WhatsApp
// Business do celular), é o que a doutora digitou no celular — vira
// mensagem "da doutora" e pausa a IARA, como na Evolution.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/engine'
import * as agrupador from '@/lib/engine/agrupador'
import { foiEnviadaPelaIara } from '@/lib/engine/sender'
import type { MensagemRecebida } from '@/lib/engine'
import { autoCaptureCRM } from '@/lib/auto-capture'
import { assinaturaDoWebhookValida } from '@/lib/meta'
import { baixarMidia, contaDoNumero, instanciaOficial, registrarErroConta, type ContaOficial } from '@/lib/whatsapp-oficial'

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || ''

// A Meta reenvia o mesmo evento quando não recebe 200 a tempo.
const processadas: Map<string, number> = ((globalThis as any).__waOficialProcessadas ??= new Map<string, number>())
const VALIDADE_DEDUP_MS = 10 * 60 * 1000

function jaProcessada(id: string): boolean {
    const agora = Date.now()
    if (processadas.has(id)) return true
    processadas.set(id, agora)
    if (processadas.size > 5000) {
        for (const [k, t] of processadas) if (agora - t > VALIDADE_DEDUP_MS) processadas.delete(k)
    }
    return false
}

// GET — verificação do webhook pela Meta
export async function GET(request: NextRequest) {
    const p = request.nextUrl.searchParams
    if (VERIFY_TOKEN && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === VERIFY_TOKEN) {
        return new NextResponse(p.get('hub.challenge') || '', { status: 200 })
    }
    console.warn('[WA Oficial] ❌ Verificação do webhook falhou')
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — eventos
export async function POST(request: NextRequest) {
    const corpo = await request.text()
    if (!assinaturaDoWebhookValida(corpo, request.headers.get('x-hub-signature-256'))) {
        console.error('[WA Oficial] ❌ Assinatura ausente ou inválida — evento recusado')
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    }
    let body: any
    try {
        body = JSON.parse(corpo)
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }
    if (body?.object !== 'whatsapp_business_account') {
        return NextResponse.json({ ok: true, ignored: body?.object || 'sem_object' })
    }

    // Responde já: a Meta espera 200 rápido. O processamento segue em seguida.
    void processarEventos(body).catch(err => console.error('[WA Oficial] ❌ Erro ao processar eventos:', err))
    return NextResponse.json({ ok: true })
}

async function processarEventos(body: any) {
    for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
            const valor = change.value || {}
            try {
                if (change.field === 'messages') {
                    await tratarMensagens(valor)
                } else if (change.field === 'smb_message_echoes') {
                    await tratarEcos(valor)
                } else if (change.field === 'account_update') {
                    await tratarAtualizacaoDaConta(String(entry.id || ''), valor)
                } else {
                    console.log(`[WA Oficial] ℹ️ Evento ${change.field}: ${JSON.stringify(valor).slice(0, 300)}`)
                }
            } catch (err) {
                console.error(`[WA Oficial] ❌ Erro no evento ${change.field}:`, err)
            }
        }
    }
}

const despachar = (m: MensagemRecebida) => {
    processMessage(m).catch(err => console.error('[WA Oficial] ❌ Erro no pipeline:', err))
}

async function contaDoEvento(valor: any): Promise<ContaOficial | null> {
    const phoneNumberId = String(valor?.metadata?.phone_number_id || '')
    if (!phoneNumberId) return null
    const conta = await contaDoNumero(phoneNumberId)
    if (!conta) console.warn(`[WA Oficial] ⚠️ Evento do número ${phoneNumberId}, que não está conectado a nenhuma clínica`)
    return conta
}

/** Converte a mensagem da Meta em texto + tipo + mídia; null = tipo que a IARA não trata. */
async function lerMensagem(conta: ContaOficial, m: any): Promise<{
    tipo: MensagemRecebida['tipoMensagem']; texto: string; audioBase64?: string; mediaId?: string
} | null> {
    switch (m.type) {
        case 'text':
            return { tipo: 'text', texto: String(m.text?.body || '') }
        case 'button':
            return { tipo: 'text', texto: String(m.button?.text || '') }
        case 'interactive':
            return { tipo: 'text', texto: String(m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '') }
        case 'audio': {
            const midia = await baixarMidia(conta, m.audio?.id)
            // Sem o arquivo o pipeline ainda tenta pelo mediaId e, se não
            // conseguir, responde que não deu para ouvir.
            return { tipo: 'audio', texto: '', audioBase64: midia?.base64, mediaId: m.audio?.id }
        }
        case 'image':
            return { tipo: 'image', texto: m.image?.caption || '[imagem]', mediaId: m.image?.id }
        case 'video':
            return { tipo: 'video', texto: m.video?.caption || '[vídeo]', mediaId: m.video?.id }
        case 'document':
            return { tipo: 'document', texto: m.document?.filename || m.document?.caption || '[documento]', mediaId: m.document?.id }
        default:
            // reaction, sticker, location, contacts, unsupported...
            return null
    }
}

async function tratarMensagens(valor: any) {
    // Falha de entrega da mensagem que a IARA mandou: só a Meta sabe
    for (const s of valor.statuses || []) {
        if (s.status === 'failed') {
            console.error(`[WA Oficial] ❌ Mensagem ${s.id} para ${s.recipient_id} não foi entregue: ${JSON.stringify(s.errors || []).slice(0, 400)}`)
        }
    }

    const mensagens: any[] = valor.messages || []
    if (mensagens.length === 0) return
    const conta = await contaDoEvento(valor)
    if (!conta) return
    const instancia = instanciaOficial(conta.phoneNumberId)
    const nomes = new Map<string, string>((valor.contacts || []).map((c: any) => [String(c.wa_id), String(c.profile?.name || '')]))

    for (const m of mensagens) {
        if (!m?.id || !m?.from || jaProcessada(m.id)) continue
        // Uma mensagem com problema não derruba as outras do mesmo evento.
        try {
            await entregarMensagem(conta, instancia, nomes, m)
        } catch (err) {
            console.error(`[WA Oficial] ❌ Mensagem ${m.id} não entrou no pipeline:`, err)
        }
    }
}

// Sem recibo de leitura: os tiques azuis sairiam antes de saber se a IARA
// vai responder (sem crédito, pausada, doutora atendendo) e, na coexistência,
// tirariam o "não lida" do celular da doutora.
async function entregarMensagem(conta: ContaOficial, instancia: string, nomes: Map<string, string>, m: any) {
    const lida = await lerMensagem(conta, m)
    if (!lida) {
        console.log(`[WA Oficial] ℹ️ Tipo ${m.type} ignorado (de ${m.from})`)
        return
    }
    const telefone = String(m.from)
    const pushName = nomes.get(telefone) || ''

    autoCaptureCRM({ clinicaId: conta.userId, telefone, pushName, canal: 'whatsapp', instancia })
        .catch(err => console.error('[WA Oficial] AutoCapture error:', err))

    const mensagem: MensagemRecebida = {
        telefone,
        pushName,
        mensagem: lida.texto,
        tipoMensagem: lida.tipo,
        instancia,
        audioBase64: lida.audioBase64,
        requestId: m.id,
        canal: 'whatsapp',
        timestamp: Number(m.timestamp) * 1000 || Date.now(),
        isFromMe: false,
        rawMessage: { oficial: true, mediaId: lida.mediaId, message: m },
    }
    agrupador.receber(mensagem, despachar).catch(err => {
        console.error('[WA Oficial] ❌ Erro no agrupador, processando direto:', err)
        despachar(mensagem)
    })
}

/**
 * Mudança na conta do WhatsApp (entry.id = id da conta WABA). Número banido,
 * conta apagada, parceiro removido, coexistência desfeita no celular: o
 * número para de funcionar e a tela precisa mostrar.
 */
async function tratarAtualizacaoDaConta(wabaId: string, valor: any) {
    const evento = String(valor?.event || '')
    console.log(`[WA Oficial] ℹ️ account_update da conta ${wabaId}: ${JSON.stringify(valor).slice(0, 400)}`)
    if (wabaId && /REMOVED|DELETED|DISABLED|OFFBOARD|BANNED|UNINSTALL/i.test(evento)) {
        await registrarErroConta({ wabaId }, `A Meta avisou: ${evento}${valor?.ban_info?.waba_ban_state ? ` (${valor.ban_info.waba_ban_state})` : ''}`)
    }
}

/** Coexistência: o que foi digitado no WhatsApp Business do celular. */
async function tratarEcos(valor: any) {
    const ecos: any[] = valor.message_echoes || []
    if (ecos.length === 0) return
    const conta = await contaDoEvento(valor)
    if (!conta) return
    const instancia = instanciaOficial(conta.phoneNumberId)

    for (const e of ecos) {
        if (!e?.id || !e?.to || jaProcessada(e.id) || foiEnviadaPelaIara(e.id)) continue
        const texto = e.type === 'text' ? String(e.text?.body || '') : `[${e.type || 'mensagem'}]`
        despachar({
            telefone: String(e.to),
            mensagem: texto,
            tipoMensagem: 'text',
            instancia,
            requestId: e.id,
            canal: 'whatsapp',
            timestamp: Number(e.timestamp) * 1000 || Date.now(),
            isFromMe: true,
            rawMessage: { oficial: true, eco: true, message: e },
        })
    }
}
