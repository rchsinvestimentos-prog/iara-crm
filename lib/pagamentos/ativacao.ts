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
import { PLANOS, PACOTES, type PlanoKey, type PacoteKey } from '@/lib/planos'

export type Provedor = 'asaas' | 'assiny' | 'manual'
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
        const plano = PLANOS[item as PlanoKey]
        if (!plano) return { ok: false, mensagem: `plano desconhecido: ${item}` }

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                nivel: plano.nivel,
                plano: item,
                status: 'ativo',
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
 * Suspende uma compra: cancelamento, estorno ou parcela não paga.
 *
 * Plano cancelado volta para o Essencial em vez de bloquear o acesso — a
 * clínica continua atendendo, só perde o que era do plano maior. Cortar o
 * atendimento de quem esqueceu de pagar o cartão gera mais dano que a
 * mensalidade perdida.
 */
export async function suspenderCompra(dados: {
    clinicaId: number
    tipo: TipoItem
    item: string
    motivo: string
}): Promise<{ ok: boolean; mensagem: string }> {
    const { clinicaId, tipo, item, motivo } = dados
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
        // Os créditos precisam cair junto com o nível. Sem isso a clínica
        // cancelava o Premium e seguia com o teto de 15.000 do plano grande.
        const essencial = PLANOS.essencial
        const atual = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { creditosDisponiveis: true },
        })
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                nivel: essencial.nivel,
                plano: 'essencial',
                creditosMensais: essencial.creditos,
                // Não devolve crédito que ela já gastou: se usou mais do que o
                // Essencial dá, fica com o que sobrou, não com o teto cheio.
                creditosDisponiveis: Math.min(atual?.creditosDisponiveis ?? essencial.creditos, essencial.creditos),
            },
        })
    }

    await prisma.$executeRaw`
        UPDATE assinaturas SET status = 'cancelada', atualizado_em = NOW()
        WHERE clinica_id = ${clinicaId} AND tipo = ${tipo} AND item = ${item}
    `

    console.log(`[Pagamentos] ⛔ clínica ${clinicaId}: ${tipo} "${item}" suspenso (${motivo})`)
    return { ok: true, mensagem: `${tipo} ${item} suspenso` }
}
