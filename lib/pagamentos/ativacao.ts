// ============================================
// ATIVAÇÃO — o que acontece quando o dinheiro entra
// ============================================
// Ponto único de liberação. Asaas e Assiny avisam em formatos diferentes,
// mas os dois terminam aqui: "a clínica X pagou o item Y, libere".
//
// Ter um lugar só evita o problema clássico de dois caminhos de liberação
// que divergem com o tempo — um libera o pacote e esquece a cota, o outro
// grava o plano e esquece os créditos.

import { prisma } from '@/lib/prisma'
import { PLANO_UNICO, PLANO_UNICO_CHAVE, PACOTES, PLAN_ALIASES, type PacoteKey } from '@/lib/planos'
import { limparPendencia } from '@/lib/pagamentos/pendencia'

export type Provedor = 'asaas' | 'assiny' | 'hotmart' | 'manual'
export type TipoItem = 'plano' | 'pacote'

/** Garante as tabelas de cobrança. Mesmo padrão do resto do projeto. */
export async function garantirTabelas(): Promise<void> {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS assinaturas (
            id SERIAL PRIMARY KEY,
            clinica_id INT NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            item VARCHAR(50) NOT NULL,
            provedor VARCHAR(20) NOT NULL,
            id_externo VARCHAR(200),
            status VARCHAR(20) NOT NULL DEFAULT 'ativa',
            valor NUMERIC(10,2),
            proxima_cobranca TIMESTAMPTZ,
            criado_em TIMESTAMPTZ DEFAULT NOW(),
            atualizado_em TIMESTAMPTZ DEFAULT NOW()
        )
    `)
    await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_assinatura_item
        ON assinaturas (clinica_id, tipo, item)
    `)
    // Registro cru de tudo que os provedores mandam. Serve de auditoria
    // quando um cliente diz que pagou e o sistema discorda — e, no caso do
    // Assiny, é como a gente descobre o formato do aviso deles.
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS pagamentos_log (
            id SERIAL PRIMARY KEY,
            provedor VARCHAR(20) NOT NULL,
            evento VARCHAR(80),
            id_externo VARCHAR(200),
            clinica_id INT,
            payload JSONB,
            resultado VARCHAR(200),
            criado_em TIMESTAMPTZ DEFAULT NOW()
        )
    `)
    await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_pagamentos_log_data
        ON pagamentos_log (criado_em DESC)
    `)
}

/** Guarda o que chegou, mesmo quando não foi possível entender. */
export async function registrarLog(dados: {
    provedor: Provedor
    evento?: string
    idExterno?: string
    clinicaId?: number
    payload: unknown
    resultado: string
}): Promise<void> {
    try {
        await garantirTabelas()
        await prisma.$executeRaw`
            INSERT INTO pagamentos_log (provedor, evento, id_externo, clinica_id, payload, resultado, criado_em)
            VALUES (${dados.provedor}, ${dados.evento || null}, ${dados.idExterno || null},
                    ${dados.clinicaId || null}, ${JSON.stringify(dados.payload)}::jsonb, ${dados.resultado}, NOW())
        `
    } catch (err) {
        console.error('[Pagamentos] Falha ao registrar log:', err)
    }
}

/**
 * O item foi pago (por qualquer provedor) depois desta data?
 *
 * Serve para o PIX esquecido: a clínica gera um PIX, acaba pagando no cartão,
 * e dias depois o Asaas avisa que o PIX venceu. Sem esta conferência o aviso
 * abriria uma carência nova e cortaria quem está em dia.
 *
 * Sem data (ou data estragada) responde false: na dúvida segue a regra
 * normal de atraso, que só corta depois de 7 dias e avisa no admin.
 */
export async function pagoDepoisDe(
    clinicaId: number, tipo: TipoItem, item: string, data: unknown
): Promise<boolean> {
    const t = typeof data === 'string' ? Date.parse(data) : NaN
    if (Number.isNaN(t)) return false
    await garantirTabelas()
    const r = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM assinaturas
        WHERE clinica_id = ${clinicaId} AND tipo = ${tipo} AND item = ${item}
          AND status = 'ativa' AND atualizado_em > ${new Date(t)}
    `
    return Number(r[0]?.n ?? 0) > 0
}

/**
 * Libera uma compra. Chamado pelos webhooks dos dois provedores.
 *
 * É idempotente: o mesmo aviso chegando duas vezes não cobra nem libera em
 * dobro. Provedores reenviam webhook quando não recebem 200 na primeira.
 */
export async function ativarCompra(dados: {
    clinicaId: number
    tipo: TipoItem
    item: string
    provedor: Provedor
    idExterno?: string
    valor?: number
    proximaCobranca?: Date | null
}): Promise<{ ok: boolean; mensagem: string }> {
    const { clinicaId, tipo, item, provedor, idExterno, valor, proximaCobranca } = dados

    await garantirTabelas()

    if (tipo === 'plano') {
        // Plano único: qualquer nome de plano (antigo ou novo) libera o mesmo.
        // Nome que não é plano nenhum continua sendo recusado.
        if (!PLAN_ALIASES[String(item).toLowerCase()]) {
            return { ok: false, mensagem: `plano desconhecido: ${item}` }
        }
        const plano = PLANO_UNICO
        const atual = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })
        if (!atual) return { ok: false, mensagem: `clínica ${clinicaId} não encontrada` }
        const cfgPago = limparPendencia((atual.configuracoes as Record<string, unknown>) || {})

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                nivel: plano.nivel,
                plano: PLANO_UNICO_CHAVE,
                status: 'ativo',
                configuracoes: cfgPago as object,
                maxInstanciasWhatsapp: plano.whatsapps,
                maxInstanciasInstagram: plano.instagrams,
                creditosMensais: plano.creditos,
                creditosDisponiveis: plano.creditos,
                proximaRenovacao: proximaCobranca ?? new Date(Date.now() + 30 * 24 * 3600 * 1000),
            },
        })
    } else {
        const pacote = PACOTES[item as PacoteKey]
        if (!pacote) return { ok: false, mensagem: `pacote desconhecido: ${item}` }

        // O pacote vive em configuracoes, que é onde audio.ts procura.
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })
        if (!clinica) return { ok: false, mensagem: `clínica ${clinicaId} não encontrada` }

        const cfg = (clinica.configuracoes as Record<string, any>) || {}
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: { configuracoes: { ...cfg, [pacote.chave]: true } },
        })
    }

    // Uma linha por item comprado. Comprar de novo renova em vez de duplicar.
    await prisma.$executeRaw`
        INSERT INTO assinaturas (clinica_id, tipo, item, provedor, id_externo, status, valor, proxima_cobranca, criado_em, atualizado_em)
        VALUES (${clinicaId}, ${tipo}, ${item}, ${provedor}, ${idExterno || null}, 'ativa',
                ${valor ?? null}, ${proximaCobranca ?? null}, NOW(), NOW())
        ON CONFLICT (clinica_id, tipo, item)
        DO UPDATE SET status = 'ativa', provedor = ${provedor}, id_externo = ${idExterno || null},
                      valor = ${valor ?? null}, proxima_cobranca = ${proximaCobranca ?? null},
                      atualizado_em = NOW()
    `

    console.log(`[Pagamentos] ✅ clínica ${clinicaId}: ${tipo} "${item}" liberado via ${provedor}`)
    return { ok: true, mensagem: `${tipo} ${item} liberado` }
}

/**
 * Suspende uma compra.
 *
 * gravidade 'atraso' (cartão recusado, assinatura cancelada, parcela não
 * paga): o plano entra em carência de CARENCIA_PAGAMENTO_DIAS — a IARA
 * continua atendendo, o PIX aparece na tela de planos, e só depois da
 * carência a catraca para de responder.
 *
 * gravidade 'estorno' (reembolso, chargeback): o dinheiro voltou, a IARA
 * para na hora.
 *
 * Pacote (voz) é desligado nos dois casos — a clínica volta para a voz
 * padrão, sem parar de atender.
 */
export async function suspenderCompra(dados: {
    clinicaId: number
    tipo: TipoItem
    item: string
    motivo: string
    gravidade: 'atraso' | 'estorno'
}): Promise<{ ok: boolean; mensagem: string }> {
    const { clinicaId, tipo, item, motivo, gravidade } = dados
    await garantirTabelas()

    if (tipo === 'pacote') {
        const pacote = PACOTES[item as PacoteKey]
        if (!pacote) return { ok: false, mensagem: `pacote desconhecido: ${item}` }
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId }, select: { configuracoes: true },
        })
        const cfg = (clinica?.configuracoes as Record<string, any>) || {}
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: { configuracoes: { ...cfg, [pacote.chave]: false } },
        })
    } else {
        const atual = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })
        if (!atual) return { ok: false, mensagem: `clínica ${clinicaId} não encontrada` }
        const cfg = (atual.configuracoes as Record<string, unknown>) || {}

        if (gravidade === 'estorno') {
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { status: 'inativo' },
            })
        } else {
            // Não reinicia a carência se ela já está correndo: dois avisos de
            // cartão recusado não podem dar 14 dias.
            const desde = typeof cfg.pagamento_pendente_desde === 'string'
                ? cfg.pagamento_pendente_desde
                : new Date().toISOString()
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { configuracoes: { ...cfg, pagamento_pendente_desde: desde, pix_liberado: true } as object },
            })
        }
    }

    await prisma.$executeRaw`
        UPDATE assinaturas SET status = 'cancelada', atualizado_em = NOW()
        WHERE clinica_id = ${clinicaId} AND tipo = ${tipo} AND item = ${item}
    `

    const como = tipo === 'plano' ? (gravidade === 'estorno' ? 'IARA parada' : 'carência + PIX liberado') : 'pacote desligado'
    console.log(`[Pagamentos] ⛔ clínica ${clinicaId}: ${tipo} "${item}" suspenso (${motivo}) → ${como}`)
    return { ok: true, mensagem: `${tipo} ${item} suspenso: ${como}` }
}
