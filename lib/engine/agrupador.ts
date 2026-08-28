// ============================================
// AGRUPADOR — junta mensagens picadas antes de responder
// ============================================
// A paciente raramente escreve tudo de uma vez. Ela manda "oi tudo bem?",
// depois "queria saber valores", depois "de micropigmentação". Respondendo
// cada uma na hora, a IARA solta três respostas soltas e sem contexto — e a
// conversa parece robô.
//
// Aqui a mensagem espera alguns segundos. Se outra chegar nesse intervalo, o
// relógio reinicia. Quando ele finalmente vence, tudo que chegou vira uma
// pergunta só e a IARA responde uma vez, já sabendo o assunto inteiro.
//
// Áudio entra no mesmo lote. A paciente pica o áudio como pica o texto: manda
// três notas de voz seguidas. Como o pipeline só transcreve uma mensagem por
// vez, cada áudio é transcrito aqui na chegada e entra no lote já como texto —
// o lote inteiro vira uma pergunta só, e a IARA responde falando, porque a
// pergunta foi falada.
//
// Foto, vídeo e documento seguem direto: têm tratamento próprio no pipeline.

import { prisma } from '@/lib/prisma'
import { parseFuncionalidades } from './types'
import type { MensagemRecebida } from './types'
import * as audio from './audio'

/** Quanto esperar depois da última mensagem. */
const ESPERA_PADRAO_S = 30

/**
 * Teto absoluto contado da PRIMEIRA mensagem do lote. Sem ele, alguém
 * digitando sem parar seguraria a resposta indefinidamente.
 */
const ESPERA_MAXIMA_S = 90

type Lote = {
    timer: ReturnType<typeof setTimeout>
    primeiraEm: number
    processar: () => void
}

/** Um lote por conversa. Chave: instância + telefone. */
const lotes = new Map<string, Lote>()

const chaveDe = (m: MensagemRecebida) => `${m.instancia}:${m.telefone}`

/** Garante a tabela de pendências. Mesmo padrão do historico_conversas. */
async function garantirTabela(): Promise<void> {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS mensagens_pendentes (
            id SERIAL PRIMARY KEY,
            instancia VARCHAR(120) NOT NULL,
            telefone VARCHAR(50) NOT NULL,
            texto TEXT NOT NULL,
            push_name VARCHAR(200),
            request_id VARCHAR(200),
            veio_de_audio BOOLEAN DEFAULT FALSE,
            audio_url VARCHAR(500),
            criado_em TIMESTAMPTZ DEFAULT NOW()
        )
    `)
    // Colunas novas em bancos que já tinham a tabela
    for (const alter of [
        `ALTER TABLE mensagens_pendentes ADD COLUMN IF NOT EXISTS veio_de_audio BOOLEAN DEFAULT FALSE`,
        `ALTER TABLE mensagens_pendentes ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500)`,
    ]) {
        try { await prisma.$executeRawUnsafe(alter) } catch { /* já existe */ }
    }
    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_pendentes_conversa
        ON mensagens_pendentes (instancia, telefone, criado_em)
    `)
}

/** Segundos de espera configurados pela clínica, com limites de sanidade. */
async function esperaDaClinica(instancia: string): Promise<number> {
    try {
        const c = await prisma.clinica.findFirst({
            where: { evolutionInstance: instancia },
            select: { configuracoes: true },
        })
        const cfg = (c?.configuracoes as Record<string, unknown>) || {}
        const bruto = Number(cfg.agrupar_segundos)
        if (!Number.isFinite(bruto)) return ESPERA_PADRAO_S
        return Math.min(Math.max(bruto, 0), ESPERA_MAXIMA_S)
    } catch {
        return ESPERA_PADRAO_S
    }
}

/**
 * Baixa e transcreve um áudio para ele poder entrar no lote como texto.
 *
 * Devolve null quando a clínica desligou a transcrição ou quando não foi
 * possível ouvir — nesses casos o pipeline assume, porque é ele que sabe
 * responder à paciente que não deu para escutar.
 */
async function transcreverParaOLote(
    msg: MensagemRecebida
): Promise<{ texto: string; audioUrl: string | null } | null> {
    try {
        const clinica = await prisma.clinica.findFirst({
            where: { evolutionInstance: msg.instancia },
            select: { funcionalidades: true, evolutionApikey: true },
        })
        if (!clinica) return null

        const funcs = parseFuncionalidades(clinica.funcionalidades as string | null)
        if (!funcs.transcrever_audio) return null

        let dados = msg.audioBase64
        if (!dados) {
            dados = await audio.downloadAudioFromEvolution(
                msg.instancia, msg.requestId, clinica.evolutionApikey || undefined, msg.rawMessage
            ) || undefined
        }
        if (!dados) return null

        const audioUrl = await audio.saveAudioFile(dados, 'incoming')
        const transcricao = await audio.transcribeAudio(dados)
        if (!transcricao) return null

        console.log(`[Agrupador] 🎤 áudio transcrito: "${transcricao.slice(0, 60)}..."`)
        return { texto: transcricao, audioUrl }
    } catch (err) {
        console.error('[Agrupador] Erro ao transcrever para o lote:', err)
        return null
    }
}

/**
 * Recebe uma mensagem e decide quando ela vira resposta.
 *
 * @param msg       mensagem crua vinda do webhook
 * @param despachar o que fazer com o lote pronto (na prática, processMessage)
 */
export async function receber(
    msg: MensagemRecebida,
    despachar: (m: MensagemRecebida) => void
): Promise<void> {
    // Foto, vídeo e documento têm tratamento próprio no pipeline e seguem
    // direto. Antes, o texto que já esperava é despachado, senão ficaria
    // pendurado atrás de uma mídia que não passa pelo lote.
    if (msg.tipoMensagem !== 'text' && msg.tipoMensagem !== 'audio') {
        await liberar(chaveDe(msg), msg.instancia, msg.telefone, despachar)
        despachar(msg)
        return
    }

    const espera = await esperaDaClinica(msg.instancia)
    if (espera <= 0) {
        despachar(msg)
        return
    }

    // Áudio precisa virar texto antes de entrar no lote: o pipeline transcreve
    // uma mensagem por vez, e o lote junta várias.
    let texto = msg.mensagem
    let audioUrl: string | null = null

    if (msg.tipoMensagem === 'audio') {
        const transcrito = await transcreverParaOLote(msg)
        if (!transcrito) {
            // Não deu para ouvir. Manda a mensagem crua para o pipeline, que
            // sabe avisar a paciente do jeito certo.
            await liberar(chaveDe(msg), msg.instancia, msg.telefone, despachar)
            despachar(msg)
            return
        }
        texto = transcrito.texto
        audioUrl = transcrito.audioUrl
    }

    const chave = chaveDe(msg)

    try {
        await garantirTabela()
        await prisma.$executeRaw`
            INSERT INTO mensagens_pendentes (instancia, telefone, texto, push_name, request_id, veio_de_audio, audio_url, criado_em)
            VALUES (${msg.instancia}, ${msg.telefone}, ${texto}, ${msg.pushName || null}, ${msg.requestId}, ${msg.tipoMensagem === 'audio'}, ${audioUrl}, NOW())
        `
    } catch (err) {
        // Sem onde guardar, é melhor responder na hora do que engolir a
        // mensagem da paciente.
        console.error('[Agrupador] Não consegui guardar a pendência:', err)
        despachar(msg)
        return
    }

    const existente = lotes.get(chave)
    const primeiraEm = existente?.primeiraEm ?? Date.now()
    if (existente) clearTimeout(existente.timer)

    // Quanto falta para o teto contado da primeira mensagem
    const restanteAteTeto = ESPERA_MAXIMA_S * 1000 - (Date.now() - primeiraEm)
    const atraso = Math.max(0, Math.min(espera * 1000, restanteAteTeto))

    const processar = () => {
        lotes.delete(chave)
        liberar(chave, msg.instancia, msg.telefone, despachar, msg).catch(err =>
            console.error('[Agrupador] Erro ao liberar lote:', err)
        )
    }

    lotes.set(chave, {
        primeiraEm,
        processar,
        timer: setTimeout(processar, atraso),
    })

    console.log(`[Agrupador] ⏳ ${msg.telefone}: aguardando ${Math.round(atraso / 1000)}s antes de responder`)
}

/**
 * Junta o que estiver pendente da conversa e manda processar como uma
 * mensagem só. Chamado pelo relógio, pelo cron de resgate, ou quando chega
 * um áudio e o texto precisa sair antes.
 */
export async function liberar(
    chave: string,
    instancia: string,
    telefone: string,
    despachar: (m: MensagemRecebida) => void,
    molde?: MensagemRecebida
): Promise<void> {
    const emAndamento = lotes.get(chave)
    if (emAndamento) {
        clearTimeout(emAndamento.timer)
        lotes.delete(chave)
    }

    let linhas: {
        texto: string
        push_name: string | null
        request_id: string | null
        veio_de_audio: boolean | null
        audio_url: string | null
    }[]
    try {
        // DELETE ... RETURNING numa tacada: duas execuções simultâneas não
        // pegam as mesmas linhas, então a paciente não recebe resposta dobrada.
        linhas = await prisma.$queryRaw`
            DELETE FROM mensagens_pendentes
            WHERE instancia = ${instancia} AND telefone = ${telefone}
            RETURNING texto, push_name, request_id, veio_de_audio, audio_url
        `
    } catch (err) {
        console.error('[Agrupador] Erro ao ler pendências:', err)
        return
    }

    if (!linhas || linhas.length === 0) return

    const juntas = linhas.map(l => l.texto).filter(Boolean).join('\n')

    // Basta um áudio no lote para a resposta sair falada: a paciente escolheu
    // o canal da voz em algum momento da sequência.
    const houveAudio = linhas.some(l => l.veio_de_audio)
    const primeiroAudio = linhas.find(l => l.audio_url)?.audio_url || undefined

    if (linhas.length > 1) {
        console.log(`[Agrupador] 📦 ${telefone}: ${linhas.length} mensagens viraram uma só${houveAudio ? ' (com áudio)' : ''}`)
    }

    despachar({
        telefone,
        instancia,
        pushName: molde?.pushName || linhas[linhas.length - 1]?.push_name || undefined,
        mensagem: houveAudio ? `[ÁUDIO RECEBIDO E TRANSCRITO PARA VOCÊ]: ${juntas}` : juntas,
        tipoMensagem: 'text',
        entradaFoiAudio: houveAudio,
        audioUrlRecebido: primeiroAudio,
        requestId: linhas[linhas.length - 1]?.request_id || `lote-${Date.now()}`,
        canal: molde?.canal || 'whatsapp',
        timestamp: Date.now(),
        isFromMe: false,
        rawMessage: molde?.rawMessage,
    } as MensagemRecebida)
}

/**
 * Resgate: lotes que ficaram para trás porque o contêiner reiniciou no meio
 * da espera. Sem isso, um deploy no momento errado faria a IARA simplesmente
 * não responder aquela paciente.
 */
export async function resgatarAbandonados(
    despachar: (m: MensagemRecebida) => void,
    segundosParado = ESPERA_MAXIMA_S
): Promise<number> {
    try {
        await garantirTabela()
        const conversas = await prisma.$queryRawUnsafe<{ instancia: string; telefone: string }[]>(`
            SELECT instancia, telefone
            FROM mensagens_pendentes
            GROUP BY instancia, telefone
            HAVING MAX(criado_em) < NOW() - INTERVAL '${segundosParado} seconds'
            LIMIT 50
        `)
        for (const c of conversas) {
            console.warn(`[Agrupador] 🛟 Resgatando lote esquecido de ${c.telefone}`)
            await liberar(`${c.instancia}:${c.telefone}`, c.instancia, c.telefone, despachar)
        }
        return conversas.length
    } catch (err) {
        console.error('[Agrupador] Erro no resgate:', err)
        return 0
    }
}
