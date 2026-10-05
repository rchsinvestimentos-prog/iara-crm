// ============================================
// TRIAGEM DE FOTOS — estado por foto + lembretes da doutora
// ============================================
// Regras do Rafael (05/10/2026):
// - Foto chegou: a IARA avisa a cliente e a doutora UMA vez por leva e
//   CONTINUA o atendimento normal (antes ficava 2 h calada).
// - Sobre a foto, a IARA nunca opina: "a Doutora está analisando".
// - Enquanto houver foto sem parecer, a doutora recebe lembrete a cada
//   15 min, só no horário da clínica. Se a cliente perguntar da foto, vai um
//   lembrete extra na hora (no máximo 1 a cada 5 min).
// - A foto só sai da lista quando a doutora decide: resposta enviada, "esta
//   não precisa de resposta", "não fazer nada", "deixa que eu assumo" ou
//   "pode agendar".
//
// Tabelas fora do schema.prisma (como whatsapp_queda): o boot nunca apaga.
//   triagem_midia     — uma linha por foto já decidida
//   triagem_pendencia — uma linha por cliente com foto esperando; guarda o
//                       horário do próximo lembrete

import { prisma } from '@/lib/prisma'
import * as sender from '@/lib/engine/sender'
import { ANOTACAO_RECEBIDO_WHATSAPP } from '@/lib/midia-na-conversa'
import type { DadosClinica } from '@/lib/engine/types'

const LEMBRETE_A_CADA_MIN = 15
const LEMBRETE_EXTRA_INTERVALO_MIN = 5
// Foto mais velha que isso sai da lista (com um último aviso à doutora).
const JANELA_PENDENTE_MS = 7 * 24 * 60 * 60 * 1000
// Fotos de antes desta versão foram tratadas no fluxo antigo (pausa de 2 h):
// não podem virar uma enxurrada de lembretes no dia da publicação.
const INICIO_TRIAGEM_POR_FOTO = Date.parse('2026-10-05T18:00:00Z')
// SQL equivalente: created_at é "timestamp sem fuso" gravado em UTC, então
// compara com NOW() AT TIME ZONE 'UTC' (não depende do fuso da sessão)
const SQL_FOTO_PENDENTE = `
    mc.anotacoes = 'Recebido via WhatsApp'
    AND NOT EXISTS (SELECT 1 FROM triagem_midia tm WHERE tm.midia_id = mc.id)
    AND mc.created_at > (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    AND mc.created_at > TIMESTAMP '2026-10-05 18:00:00'
    AND NOT EXISTS (
        SELECT 1 FROM triagem_resolvida tr
        JOIN contatos c2 ON c2.id = mc.contato_id
        WHERE tr.user_id = mc.clinica_id AND tr.telefone_cliente = c2.numero_whatsapp
          AND mc.created_at <= (tr.resolvida_em AT TIME ZONE 'UTC')
    )`

export type ComoDecidiu = 'respondida' | 'sem_resposta' | 'nada' | 'assumiu' | 'agendou'

export interface MidiaPendente {
    id: string
    url: string
    tipo: string
    createdAt: Date
}

// ---------------------------------------------
// Tabelas
// ---------------------------------------------
let tabelasProntas: Promise<unknown> | null = null
function garantirTabelas() {
    if (!tabelasProntas) {
        tabelasProntas = (async () => {
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS triagem_midia (
                    midia_id TEXT PRIMARY KEY,
                    clinica_id INT NOT NULL,
                    como VARCHAR(20) NOT NULL,
                    decidida_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `)
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS triagem_pendencia (
                    clinica_id INT NOT NULL,
                    contato_id INT NOT NULL,
                    criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    proximo_lembrete_em TIMESTAMPTZ NOT NULL,
                    ultimo_lembrete_em TIMESTAMPTZ,
                    PRIMARY KEY (clinica_id, contato_id)
                )
            `)
            // Criada pela versão de 03/10 (resolução por horário). Só é lida.
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS triagem_resolvida (
                    user_id INT NOT NULL,
                    telefone_cliente VARCHAR(50) NOT NULL,
                    resolvida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (user_id, telefone_cliente)
                )
            `)
        })().catch(err => {
            tabelasProntas = null
            throw err
        })
    }
    return tabelasProntas
}

// ---------------------------------------------
// Quais fotos esperam a doutora
// ---------------------------------------------

/** Fotos recebidas pelo WhatsApp que ainda não têm decisão (mais antiga primeiro). */
export async function midiasPendentesDoContato(clinicaId: number, contatoId: number): Promise<MidiaPendente[]> {
    await garantirTabelas()
    const linhas = await prisma.$queryRaw<{ id: string; url: string; tipo: string; created_at: Date; telefone: string }[]>`
        SELECT mc.id, mc.url, mc.tipo, mc.created_at, c.numero_whatsapp AS telefone
        FROM midia_contatos mc
        JOIN contatos c ON c.id = mc.contato_id
        LEFT JOIN triagem_midia tm ON tm.midia_id = mc.id
        WHERE mc.clinica_id = ${clinicaId}
          AND mc.contato_id = ${contatoId}
          AND mc.anotacoes = ${ANOTACAO_RECEBIDO_WHATSAPP}
          AND tm.midia_id IS NULL
        ORDER BY mc.created_at ASC
    `
    if (linhas.length === 0) return []

    // Decisões da versão de 03/10 valiam "tudo até tal horário"
    const legado = await prisma.$queryRaw<{ resolvida_em: Date }[]>`
        SELECT resolvida_em FROM triagem_resolvida
        WHERE user_id = ${clinicaId} AND telefone_cliente = ${linhas[0].telefone}
    `
    // Comparação no JS: midia_contatos.created_at é "timestamp sem fuso"
    const desde = Math.max(legado[0]?.resolvida_em.getTime() ?? 0, Date.now() - JANELA_PENDENTE_MS, INICIO_TRIAGEM_POR_FOTO)
    return linhas
        .filter(l => l.created_at.getTime() > desde)
        .map(l => ({ id: l.id, url: l.url, tipo: l.tipo, createdAt: l.created_at }))
}

export async function midiasPendentesPorTelefone(clinicaId: number, telefone: string): Promise<{ contatoId: number | null; midias: MidiaPendente[] }> {
    const contato = await prisma.contato.findFirst({ where: { clinicaId, telefone }, select: { id: true } })
    if (!contato) return { contatoId: null, midias: [] }
    return { contatoId: contato.id, midias: await midiasPendentesDoContato(clinicaId, contato.id) }
}

// ---------------------------------------------
// Foto chegou / doutora decidiu
// ---------------------------------------------

// Fotos com menos que isso de diferença são a mesma "rodada" para a cliente
const MESMA_RODADA_MS = 10 * 60 * 1000

/**
 * Chamar quando uma foto da cliente foi salva (depois de gravar em midia_contatos).
 * - primeiraDaLeva: não havia foto esperando → a IARA avisa a cliente E a doutora.
 * - avisarCliente: mesmo sem ser a primeira, a foto anterior chegou há mais de
 *   10 min (outra rodada) → a cliente ouve "recebi" de novo; a doutora não.
 */
export async function registrarFotoRecebida(clinicaId: number, contatoId: number): Promise<{ primeiraDaLeva: boolean; avisarCliente: boolean }> {
    await garantirTabelas()
    const novas = await prisma.$queryRaw<{ contato_id: number }[]>`
        INSERT INTO triagem_pendencia (clinica_id, contato_id, proximo_lembrete_em, ultimo_lembrete_em)
        VALUES (${clinicaId}, ${contatoId}, NOW() + ${LEMBRETE_A_CADA_MIN + ' minutes'}::INTERVAL, NOW())
        ON CONFLICT (clinica_id, contato_id) DO NOTHING
        RETURNING contato_id
    `
    iniciarRelogioTriagem()
    if (novas.length > 0) return { primeiraDaLeva: true, avisarCliente: true }

    // Pendência velha cujas fotos já saíram da janela de 72 h: esta é, na
    // prática, a primeira — recomeça o relógio e avisa todo mundo
    if ((await midiasPendentesDoContato(clinicaId, contatoId)).length <= 1) {
        await prisma.$executeRaw`
            UPDATE triagem_pendencia
            SET criada_em = NOW(), ultimo_lembrete_em = NOW(),
                proximo_lembrete_em = NOW() + ${LEMBRETE_A_CADA_MIN + ' minutes'}::INTERVAL
            WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId}
        `
        return { primeiraDaLeva: true, avisarCliente: true }
    }

    // As duas mais recentes desta cliente: a que acabou de chegar e a anterior
    const ultimas = await prisma.$queryRaw<{ created_at: Date }[]>`
        SELECT created_at FROM midia_contatos
        WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId} AND anotacoes = ${ANOTACAO_RECEBIDO_WHATSAPP}
        ORDER BY created_at DESC LIMIT 2
    `
    const outraRodada = ultimas.length < 2 || ultimas[0].created_at.getTime() - ultimas[1].created_at.getTime() > MESMA_RODADA_MS
    return { primeiraDaLeva: false, avisarCliente: outraRodada }
}

/**
 * Marca as fotos como decididas. Devolve quantas ainda esperam a doutora;
 * se nenhuma, os lembretes param.
 */
export async function decidirMidias(clinicaId: number, contatoId: number, midiaIds: string[], como: ComoDecidiu): Promise<number> {
    await garantirTabelas()
    // Só fotos desta clínica e deste contato — o id vem da tela
    const validas = midiaIds.length === 0 ? [] : await prisma.midiaContato.findMany({
        where: { id: { in: midiaIds }, clinicaId, contatoId },
        select: { id: true },
    })
    for (const { id } of validas) {
        await prisma.$executeRaw`
            INSERT INTO triagem_midia (midia_id, clinica_id, como)
            VALUES (${id}, ${clinicaId}, ${como})
            ON CONFLICT (midia_id) DO NOTHING
        `
    }
    const restantes = (await midiasPendentesDoContato(clinicaId, contatoId)).length
    if (restantes === 0) {
        await apagarPendenciaSeVazia(clinicaId, contatoId)
    }
    return restantes
}

/**
 * Apaga a pendência só se não houver foto esperando — checado no mesmo comando,
 * para uma foto que chega no meio não ficar sem lembrete.
 */
async function apagarPendenciaSeVazia(clinicaId: number, contatoId: number) {
    await prisma.$executeRawUnsafe(`
        DELETE FROM triagem_pendencia p
        WHERE p.clinica_id = $1 AND p.contato_id = $2
          AND NOT EXISTS (
              SELECT 1 FROM midia_contatos mc
              WHERE mc.clinica_id = p.clinica_id AND mc.contato_id = p.contato_id AND ${SQL_FOTO_PENDENTE}
          )
    `, clinicaId, contatoId)
}

/**
 * Recria a pendência de quem tem foto esperando e ficou sem ela (falha ao
 * registrar a foto, corrida). Roda no relógio: nenhuma foto fica sem lembrete.
 */
async function recriarPendenciasOrfas() {
    const criadas = await prisma.$queryRawUnsafe<{ contato_id: number }[]>(`
        INSERT INTO triagem_pendencia (clinica_id, contato_id, proximo_lembrete_em)
        SELECT DISTINCT mc.clinica_id, mc.contato_id, NOW()
        FROM midia_contatos mc
        WHERE ${SQL_FOTO_PENDENTE}
          AND NOT EXISTS (
              SELECT 1 FROM triagem_pendencia p
              WHERE p.clinica_id = mc.clinica_id AND p.contato_id = mc.contato_id
          )
        ON CONFLICT (clinica_id, contato_id) DO NOTHING
        RETURNING contato_id
    `)
    if (criadas.length > 0) {
        console.warn(`[Triagem] ${criadas.length} cliente(s) com foto esperando estavam sem lembrete — pendência recriada: ${criadas.map(c => c.contato_id).join(', ')}`)
    }
}

/** "Me lembre em X min": o próximo lembrete fica para daqui a X minutos. */
export async function adiarLembrete(clinicaId: number, contatoId: number, minutos: number) {
    await garantirTabelas()
    await prisma.$executeRaw`
        INSERT INTO triagem_pendencia (clinica_id, contato_id, proximo_lembrete_em)
        VALUES (${clinicaId}, ${contatoId}, NOW() + ${minutos + ' minutes'}::INTERVAL)
        ON CONFLICT (clinica_id, contato_id)
        DO UPDATE SET proximo_lembrete_em = NOW() + ${minutos + ' minutes'}::INTERVAL
    `
    iniciarRelogioTriagem()
}

// A cliente falou da foto? ("e a foto?", "a doutora viu?", "o resultado")
const FALA_DA_FOTO = /\b(fotos?|imagens?|prints?|resultados?|analis\w*|avali\w*|viu|olhou|doutora|dra)\b/i
export function clienteFalouDaFoto(texto: string): boolean {
    return FALA_DA_FOTO.test(texto || '')
}

/** Lembrete extra porque a cliente perguntou — no máximo 1 a cada 5 min, só no horário da clínica. */
export async function lembreteExtra(clinicaId: number, contatoId: number) {
    await garantirTabelas()
    const pegou = await prisma.$queryRaw<{ contato_id: number }[]>`
        UPDATE triagem_pendencia
        SET ultimo_lembrete_em = NOW(),
            proximo_lembrete_em = NOW() + ${LEMBRETE_A_CADA_MIN + ' minutes'}::INTERVAL
        WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId}
          AND (ultimo_lembrete_em IS NULL
               OR ultimo_lembrete_em < NOW() - ${LEMBRETE_EXTRA_INTERVALO_MIN + ' minutes'}::INTERVAL)
        RETURNING contato_id
    `
    if (pegou.length === 0) return
    const r = await lembrarUm(clinicaId, contatoId, 'a cliente perguntou')
    if (r === 'fechada' || r === 'falhou') {
        // Não chegou na doutora: a próxima pergunta da cliente pode tentar de novo
        await prisma.$executeRaw`
            UPDATE triagem_pendencia SET ultimo_lembrete_em = NULL
            WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId}
        `
    }
}

// ---------------------------------------------
// Relógio dos lembretes
// ---------------------------------------------

/**
 * Liga (uma vez por processo) a checagem a cada minuto. Chamado no boot
 * (instrumentation.ts) e sempre que surge pendência — se o processo
 * reiniciar, a primeira foto ou o Guardian religam.
 */
export function iniciarRelogioTriagem() {
    const g = globalThis as unknown as { __relogioTriagem?: ReturnType<typeof setInterval> }
    if (g.__relogioTriagem) return
    g.__relogioTriagem = setInterval(() => {
        processarLembretes().catch(err => console.error('[Triagem] Erro no relógio de lembretes:', err))
    }, 60 * 1000)
    console.log('[Triagem] ⏰ Relógio de lembretes ligado (checa a cada 1 min)')
}

/** Manda os lembretes vencidos. Roda pelo relógio e pelo Guardian. */
export async function processarLembretes() {
    await garantirTabelas()
    await recriarPendenciasOrfas()
    // Pega e já agenda o próximo: relógio e Guardian juntos não mandam duas vezes
    const vencidas = await prisma.$queryRaw<{ clinica_id: number; contato_id: number }[]>`
        UPDATE triagem_pendencia
        SET proximo_lembrete_em = NOW() + ${LEMBRETE_A_CADA_MIN + ' minutes'}::INTERVAL
        WHERE proximo_lembrete_em <= NOW()
        RETURNING clinica_id, contato_id
    `
    for (const p of vencidas) {
        let r: ResultadoLembrete = 'falhou'
        try {
            r = await lembrarUm(p.clinica_id, p.contato_id, 'a cada 15 min')
        } catch (err) {
            console.error(`[Triagem] Erro no lembrete do contato ${p.contato_id} (clínica ${p.clinica_id}):`, err)
        }
        if (r === 'falhou') {
            // Não chegou em ninguém: tenta de novo em 2 min, não em 15
            await prisma.$executeRaw`
                UPDATE triagem_pendencia SET proximo_lembrete_em = NOW() + INTERVAL '2 minutes'
                WHERE clinica_id = ${p.clinica_id} AND contato_id = ${p.contato_id}
            `.catch(err => console.error(`[Triagem] Erro ao reagendar lembrete do contato ${p.contato_id}:`, err))
        }
    }
}

type ResultadoLembrete = 'enviado' | 'fechada' | 'falhou' | 'sem_pendencia'

async function lembrarUm(clinicaId: number, contatoId: number, motivo: string): Promise<ResultadoLembrete> {
    const pendentes = await midiasPendentesDoContato(clinicaId, contatoId)
    if (pendentes.length === 0) {
        await avisarSeExpirou(clinicaId, contatoId)
        await apagarPendenciaSeVazia(clinicaId, contatoId)
        return 'sem_pendencia'
    }

    const clinica = await prisma.clinica.findFirst({ where: { id: clinicaId } }) as DadosClinica | null
    const contato = await prisma.contato.findFirst({ where: { id: contatoId, clinicaId } })
    if (!clinica || !contato) {
        console.warn(`[Triagem] Contato ${contatoId} ou clínica ${clinicaId} não existe mais — pendência apagada`)
        await prisma.$executeRaw`DELETE FROM triagem_pendencia WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId}`
        return 'sem_pendencia'
    }

    // Fora do horário da clínica: espera. O relógio tenta de novo em 15 min.
    const { checkBusinessHours } = await import('@/lib/engine/pipeline')
    if (!checkBusinessHours(clinica).aberto) {
        console.log(`[Triagem] Clínica ${clinicaId} fechada — lembrete de ${contato.telefone} fica para quando abrir`)
        return 'fechada'
    }

    const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: clinica.timezone || 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    const quais = pendentes.length === 1
        ? `1 foto (recebida às ${hora(pendentes[0].createdAt)})`
        : `${pendentes.length} fotos (recebidas às ${pendentes.map(p => hora(p.createdAt)).join(', ')})`
    const panelUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'
    const texto = `⏰ *Lembrete:* ${contato.nome || 'a cliente'} ainda espera a sua análise de ${quais}.\n📱 ${contato.telefone}\n`
        + (motivo === 'a cliente perguntou' ? `\nEla acabou de perguntar da foto.\n` : '')
        + `\nMesmo que não precise responder, toque em *Não fazer nada* para eu parar de lembrar:\n🔗 ${panelUrl}/clientes?contatoId=${contato.id}&triage=true`

    const entregues = await mandarParaDoutora(clinica, texto)
    if (entregues === 0) {
        console.error(`[Triagem] Lembrete (${motivo}) de ${contato.telefone} NÃO chegou em ninguém`)
        return 'falhou'
    }
    await prisma.$executeRaw`
        UPDATE triagem_pendencia SET ultimo_lembrete_em = NOW()
        WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId}
    `
    console.log(`[Triagem] Lembrete (${motivo}) de ${contato.telefone}: ${pendentes.length} foto(s), entregue a ${entregues} número(s)`)
    return 'enviado'
}

/** Fotos que passaram de 7 dias sem decisão saem da lista — com um último aviso, nunca em silêncio. */
async function avisarSeExpirou(clinicaId: number, contatoId: number) {
    const velhas = await prisma.$queryRawUnsafe<{ n: number }[]>(`
        SELECT COUNT(*)::int AS n FROM midia_contatos mc
        WHERE mc.clinica_id = $1 AND mc.contato_id = $2
          AND mc.anotacoes = 'Recebido via WhatsApp'
          AND NOT EXISTS (SELECT 1 FROM triagem_midia tm WHERE tm.midia_id = mc.id)
          AND mc.created_at > TIMESTAMP '2026-10-05 18:00:00'
          AND mc.created_at <= (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
    `, clinicaId, contatoId)
    const n = velhas[0]?.n ?? 0
    if (n === 0) return
    const clinica = await prisma.clinica.findFirst({ where: { id: clinicaId } }) as DadosClinica | null
    const contato = await prisma.contato.findFirst({ where: { id: contatoId, clinicaId } })
    if (!clinica || !contato) return
    console.warn(`[Triagem] ${n} foto(s) de ${contato.telefone} passaram de 7 dias sem decisão — saem da lista`)
    await mandarParaDoutora(clinica, `📷 ${n === 1 ? '1 foto' : `${n} fotos`} de ${contato.nome || contato.telefone} ficaram 7 dias sem análise e saíram da lista de lembretes. Se ainda precisar responder, abra a conversa dela no painel.`)
    // Marca como decididas para o aviso não repetir
    await prisma.$executeRawUnsafe(`
        INSERT INTO triagem_midia (midia_id, clinica_id, como)
        SELECT mc.id, mc.clinica_id, 'expirou' FROM midia_contatos mc
        WHERE mc.clinica_id = $1 AND mc.contato_id = $2
          AND mc.anotacoes = 'Recebido via WhatsApp'
          AND NOT EXISTS (SELECT 1 FROM triagem_midia tm WHERE tm.midia_id = mc.id)
          AND mc.created_at <= (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'
        ON CONFLICT (midia_id) DO NOTHING
    `, clinicaId, contatoId)
}

// ---------------------------------------------
// Mensagens
// ---------------------------------------------

/** Instância que fala pela clínica: a do cadastro, senão a primeira conectada em Conexões. */
export async function instanciaDaClinica(clinica: Pick<DadosClinica, 'id' | 'evolutionInstance'>): Promise<string | null> {
    if (clinica.evolutionInstance) return clinica.evolutionInstance
    const rows = await prisma.$queryRaw<{ evolution_instance: string }[]>`
        SELECT evolution_instance FROM instancias_clinica
        WHERE user_id = ${clinica.id} AND ativo = true AND canal = 'whatsapp' AND evolution_instance IS NOT NULL
        ORDER BY (status_conexao = 'conectado') DESC, id ASC
        LIMIT 1
    `.catch(() => [])
    return rows[0]?.evolution_instance || null
}

/** Mesmo destino do alerta de foto: profissionais com WhatsApp, senão a dona. Devolve quantos receberam. */
export async function mandarParaDoutora(clinica: DadosClinica, texto: string, instancia?: string): Promise<number> {
    const inst = instancia || await instanciaDaClinica(clinica)
    if (!inst) {
        console.error(`[Triagem] Clínica ${clinica.id} sem instância do WhatsApp — aviso para a doutora não saiu`)
        return 0
    }
    const profs = await prisma.$queryRaw<{ whatsapp: string | null }[]>`
        SELECT whatsapp FROM profissionais
        WHERE clinica_id = ${clinica.id} AND ativo = true AND whatsapp IS NOT NULL AND whatsapp <> ''
    `
    const destinos = new Set(profs.map(p => p.whatsapp as string))
    if (destinos.size === 0 && clinica.whatsappDoutora) destinos.add(clinica.whatsappDoutora)
    if (destinos.size === 0) {
        console.error(`[Triagem] Clínica ${clinica.id} sem WhatsApp de profissional nem da dona — aviso não saiu`)
        return 0
    }
    let entregues = 0
    for (const telefone of destinos) {
        const ok = await sender.sendText({ instancia: inst, telefone, apikey: clinica.evolutionApikey || undefined }, texto)
        if (ok) entregues++
        else console.error(`[Triagem] Falha ao mandar aviso para ${telefone} (clínica ${clinica.id})`)
    }
    return entregues
}

/** "Dra. Denise", "Denise" ou "a Doutora" — como a clínica configurou (igual ao ai-engine). */
export function nomeDaDoutora(clinica: Pick<DadosClinica, 'nomeDoutora' | 'tratamentoDoutora'>): string {
    const primeiro = clinica.nomeDoutora?.split(' ')[0]
    if (!primeiro) return 'a Doutora'
    const forma = clinica.tratamentoDoutora || 'Pelo nome'
    return forma === 'Pelo nome' ? primeiro : `${forma} ${primeiro}`
}

/** Tira emoji quando a clínica pediu atendimento sem emoji. */
export function semEmojiSePreciso(clinica: Pick<DadosClinica, 'emojis'>, texto: string): string {
    if (clinica.emojis !== 'nenhum') return texto
    return texto.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/ {2,}/g, ' ').trim()
}

/** Instrução para a IARA enquanto houver foto sem parecer (vai na parte volátil do prompt). */
export function instrucaoFotosPendentes(qtd: number, doutora: string): string {
    return `

📷 FOTOS AGUARDANDO A ANÁLISE DA DOUTORA (REGRA OBRIGATÓRIA):
A cliente mandou ${qtd === 1 ? '1 foto que ainda está' : `${qtd} fotos que ainda estão`} com ${doutora} para análise. Você NÃO viu as fotos.
- Se a cliente perguntar sobre a(s) foto(s), responda SEMPRE apenas que ${doutora} está analisando e que assim que ela der o parecer vocês retornam.
- NUNCA comente, avalie, diagnostique, estime sessões, preço ou resultado com base nas fotos. Não invente nada sobre elas.
- Fora isso, continue o atendimento normalmente (dúvidas, agendamento, procedimentos).
`
}
