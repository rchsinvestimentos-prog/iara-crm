// ============================================================================
// ANEXOS DO PROCEDIMENTO — envio pelo WhatsApp
// Regras e marcador: lib/anexos-procedimento.ts
// ============================================================================
import { readFile } from 'fs/promises'
import { resolve, relative, isAbsolute } from 'path'
import { prisma } from '@/lib/prisma'
import * as sender from './sender'
import {
    normalizarAnexos,
    linhaHistoricoAnexo,
    MAX_ANEXOS_POR_RESPOSTA,
    type AnexoProcedimento,
} from '@/lib/anexos-procedimento'

const UPLOADS_DIR = resolve(process.env.UPLOADS_DIR || '/app/uploads')

const MEDIATYPE: Record<AnexoProcedimento['tipo'], 'image' | 'video' | 'document'> = {
    imagem: 'image',
    video: 'video',
    documento: 'document',
}

/** Já mandou este anexo para esta paciente? Olha o histórico da conversa. */
async function jaEnviado(clinicaId: number, telefone: string, anexoId: string): Promise<boolean> {
    try {
        const padrao = `%(#${anexoId})%`
        const r = await prisma.$queryRaw<{ n: number }[]>`
            SELECT 1 AS n FROM historico_conversas
            WHERE user_id = ${clinicaId} AND telefone_cliente = ${telefone}
              AND role = 'assistant' AND content LIKE ${padrao}
            LIMIT 1
        `
        return r.length > 0
    } catch {
        return false
    }
}

/**
 * Manda os anexos pedidos na resposta da IA. Devolve os que saíram, para o
 * pipeline gravar no histórico.
 */
export async function enviarAnexosDaResposta(
    clinicaId: number,
    sendOpts: { instancia: string; telefone: string; apikey?: string },
    ids: string[]
): Promise<AnexoProcedimento[]> {
    if (!ids.length) return []

    let mapa = new Map<string, AnexoProcedimento>()
    try {
        const linhas = await prisma.$queryRaw<{ anexos: unknown }[]>`
            SELECT anexos FROM procedimentos
            WHERE user_id = ${clinicaId} AND ativo = true AND anexos IS NOT NULL
        `
        for (const l of linhas) for (const a of normalizarAnexos(l.anexos)) mapa.set(a.id, a)
    } catch (err) {
        console.error('[Anexos] ❌ Erro ao ler anexos dos procedimentos:', err)
        return []
    }

    const enviados: AnexoProcedimento[] = []
    for (const id of ids.slice(0, MAX_ANEXOS_POR_RESPOSTA)) {
        const anexo = mapa.get(id)
        if (!anexo) {
            console.warn(`[Anexos] ⚠️ A IA pediu o anexo ${id}, que não existe nesta clínica`)
            continue
        }
        if (await jaEnviado(clinicaId, sendOpts.telefone, anexo.id)) {
            console.log(`[Anexos] ↩️ Anexo ${id} já foi enviado para ${sendOpts.telefone} — não repete`)
            continue
        }

        // O caminho vem do banco, mas confere que é da pasta desta clínica.
        const caminho = resolve(UPLOADS_DIR, anexo.arquivo)
        const rel = relative(resolve(UPLOADS_DIR, String(clinicaId)), caminho)
        if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
            console.error(`[Anexos] ❌ Caminho fora da pasta da clínica: ${anexo.arquivo}`)
            continue
        }

        let base64: string
        try {
            base64 = (await readFile(caminho)).toString('base64')
        } catch {
            console.error(`[Anexos] ❌ Arquivo do anexo ${id} não encontrado no disco (${anexo.arquivo})`)
            continue
        }

        const ok = await sender.sendMedia(sendOpts, {
            mediatype: MEDIATYPE[anexo.tipo],
            mimetype: anexo.mimetype,
            base64,
            fileName: anexo.nomeArquivo,
        })
        if (ok) enviados.push(anexo)
    }
    return enviados
}

export { linhaHistoricoAnexo }
