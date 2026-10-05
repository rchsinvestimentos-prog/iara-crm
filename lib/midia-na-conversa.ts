// ============================================
// FOTO DENTRO DA CONVERSA
// ============================================
// Quando a cliente manda foto, vídeo ou documento, o histórico guarda só o
// texto "[IMAGE ENVIADO]" e o arquivo vai para midia_contatos (ver
// handleMediaTriage no pipeline). As telas de conversa mostravam esse texto
// cru e a doutora não via a foto.
//
// Aqui cada "[... ENVIADO]" é ligado ao arquivo salvo no mesmo momento. O
// pipeline grava o arquivo segundos antes da linha do histórico, então basta
// procurar o arquivo mais próximo no tempo. Funciona também para as conversas
// antigas, sem mexer no banco.

import { prisma } from '@/lib/prisma'

export type TipoMidia = 'imagem' | 'video' | 'documento'

export interface MidiaDaMensagem {
    url: string
    tipo: TipoMidia
}

const MARCADOR = /^\[(IMAGE|VIDEO|DOCUMENT) ENVIADO\]$/

/** Anotação que o pipeline grava no arquivo recebido pelo WhatsApp. É ela que separa
 *  o que a cliente mandou do que a clínica subiu pelo painel. */
export const ANOTACAO_RECEBIDO_WHATSAPP = 'Recebido via WhatsApp'

// O arquivo é salvo ANTES da linha do histórico; entre os dois vão o "Recebi!"
// para a cliente e um alerta por profissional. Janela curta de propósito: um
// marcador sem arquivo (encaminhar foto desligado, download que falhou) não
// pode pegar a foto de outra mensagem.
const ANTES_MS = 2 * 60 * 1000
const DEPOIS_MS = 5 * 1000

const ROTULO: Record<string, string> = {
    IMAGE: '📷 Foto',
    VIDEO: '🎬 Vídeo',
    DOCUMENT: '📄 Documento',
}

export function ehMarcadorDeMidia(content: string): boolean {
    return MARCADOR.test(content.trim())
}

/** Texto amigável no lugar do marcador, para a lista de conversas. */
export function rotuloDaMidia(content: string): string {
    const m = content.trim().match(MARCADOR)
    return m ? ROTULO[m[1]] : content
}

// O pipeline grava vídeo com tipo 'documento', então a extensão desempata.
function tipoDoArquivo(tipoNoBanco: string, url: string): TipoMidia {
    if (tipoNoBanco === 'imagem') return 'imagem'
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'imagem'
    if (['mp4', 'mov', 'webm', '3gp', 'ogv', 'm4v'].includes(ext)) return 'video'
    return 'documento'
}

/**
 * Para cada mensagem "[... ENVIADO]", devolve o arquivo correspondente
 * (ou null se ele não foi salvo — encaminhar foto desligado, download falhou).
 * As outras mensagens não entram no mapa.
 */
export async function ligarMidias(
    clinicaId: number,
    telefone: string,
    mensagens: { id: number; content: string; created_at: string | Date }[],
): Promise<Map<number, MidiaDaMensagem | null>> {
    const resultado = new Map<number, MidiaDaMensagem | null>()
    const marcadores = mensagens.filter(m => ehMarcadorDeMidia(m.content))
    if (marcadores.length === 0) return resultado

    // A janela de tempo é aplicada aqui, não no SQL: midia_contatos.created_at
    // é "timestamp sem fuso" e a comparação no banco depende do fuso da sessão
    // (no banco local, em São Paulo, deslocava tudo 3 horas e nada casava).
    const arquivos = await prisma.$queryRaw<{ url: string; tipo: string; created_at: Date }[]>`
        SELECT mc.url, mc.tipo, mc.created_at
        FROM midia_contatos mc
        JOIN contatos c ON c.id = mc.contato_id
        WHERE mc.clinica_id = ${clinicaId}
          AND c.numero_whatsapp = ${telefone}
          AND mc.anotacoes = ${ANOTACAO_RECEBIDO_WHATSAPP}
        ORDER BY mc.created_at ASC
    `

    // Arquivos e marcadores estão na mesma ordem: cada marcador fica com o
    // primeiro arquivo ainda livre dentro da janela. (Pegar o mais próximo
    // trocava a ordem quando duas fotos chegam juntas.)
    const usados = new Set<number>()
    for (const msg of marcadores) {
        const t = new Date(msg.created_at).getTime()
        const melhor = arquivos.findIndex((a, i) => {
            if (usados.has(i)) return false
            const diff = t - new Date(a.created_at).getTime()
            return diff <= ANTES_MS && diff >= -DEPOIS_MS
        })
        if (melhor >= 0) {
            usados.add(melhor)
            const { url, tipo } = arquivos[melhor]
            resultado.set(msg.id, { url, tipo: tipoDoArquivo(tipo, url) })
        } else {
            resultado.set(msg.id, null)
        }
    }
    return resultado
}

// O estado de triagem (fotos esperando a doutora, lembretes) vive em lib/triagem.ts.
