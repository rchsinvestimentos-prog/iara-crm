// ============================================================================
// Pedidos de exclusão de dados (LGPD e Meta)
//
// Dois caminhos chegam aqui:
// - o formulário público /legal/exclusao-de-dados (paciente ou clínica);
// - a Meta, quando alguém remove o app ou pede a exclusão pelo Facebook
//   (/api/webhook/meta/exclusao-de-dados).
// Cada pedido fica gravado com um código e o suporte recebe um e-mail.
// ============================================================================
import { randomBytes } from 'crypto'
import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'

const SUPORTE_EMAIL = process.env.SUPORTE_EMAIL || 'suporte@iara.click'

export interface PedidoExclusao {
    origem: 'formulario' | 'meta'
    email?: string | null
    telefone?: string | null
    motivo?: string | null
    metaUserId?: string | null
    registrosAfetados?: number
}

/** Grava o pedido e devolve o código. Lança erro se não conseguir gravar. */
export async function registrarPedidoExclusao(p: PedidoExclusao): Promise<string> {
    const codigo = `EXC-${randomBytes(6).toString('hex').toUpperCase()}`
    await prisma.$executeRaw`
        INSERT INTO pedidos_exclusao_dados (codigo, origem, email, telefone, motivo, meta_user_id, registros_afetados)
        VALUES (${codigo}, ${p.origem}, ${p.email || null}, ${p.telefone || null}, ${p.motivo || null},
                ${p.metaUserId || null}, ${p.registrosAfetados ?? 0})
    `
    void avisarSuporte(codigo, p)
    return codigo
}

/** E-mail para o suporte. Falha só vai para o log: o pedido já está gravado. */
async function avisarSuporte(codigo: string, p: PedidoExclusao): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
        console.error(`[Exclusão] ⚠️ Pedido ${codigo} gravado, mas sem RESEND_API_KEY para avisar ${SUPORTE_EMAIL}`)
        return
    }
    try {
        const linhas = [
            `Código: ${codigo}`,
            `Origem: ${p.origem === 'meta' ? 'Meta (Facebook/Instagram)' : 'formulário do site'}`,
            p.email ? `E-mail: ${p.email}` : '',
            p.telefone ? `Telefone: ${p.telefone}` : '',
            p.motivo ? `Motivo: ${p.motivo}` : '',
            p.metaUserId ? `Usuário da Meta: ${p.metaUserId}` : '',
            p.origem === 'meta'
                ? `Registros apagados automaticamente: ${p.registrosAfetados ?? 0}`
                : 'Prazo da LGPD: responder em até 15 dias.',
        ].filter(Boolean)
        const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
            from: process.env.RESEND_FROM || 'IARA <noreply@iara.click>',
            to: SUPORTE_EMAIL,
            subject: `Pedido de exclusão de dados ${codigo}`,
            text: linhas.join('\n'),
        })
        if (error) console.error(`[Exclusão] ❌ E-mail do pedido ${codigo} não saiu:`, error)
    } catch (err) {
        console.error(`[Exclusão] ❌ E-mail do pedido ${codigo} não saiu:`, err)
    }
}

/**
 * Apaga o que a IARA guardou da conta da Meta deste usuário: a conexão do
 * Instagram (tokens, ids). As conversas com as pacientes são da clínica e
 * continuam. Devolve quantas conexões saíram.
 */
export async function apagarConexoesDaMeta(metaUserId: string, modo: 'desativar' | 'apagar'): Promise<number> {
    const linhas = await prisma.$queryRaw<{ user_id: number }[]>`
        SELECT user_id FROM config_instagram WHERE meta_user_id = ${metaUserId}
    `
    if (linhas.length === 0) return 0
    if (modo === 'apagar') {
        await prisma.$executeRaw`DELETE FROM config_instagram WHERE meta_user_id = ${metaUserId}`
    } else {
        await prisma.$executeRaw`
            UPDATE config_instagram SET ativo = false, meta_access_token = NULL, updated_at = NOW()
            WHERE meta_user_id = ${metaUserId}
        `
    }
    // O card da tela mostrar "desconectado" é detalhe: a conexão já foi
    // apagada/desligada acima, então uma falha aqui não desfaz o pedido.
    const ids = linhas.map(l => l.user_id)
    try {
        await prisma.$executeRaw`
            UPDATE instancias_clinica SET status_conexao = 'desconectado'
            WHERE canal = 'instagram' AND user_id = ANY(${ids})
        `
    } catch (err) {
        console.error(`[Exclusão] ⚠️ Conexões do usuário ${metaUserId} apagadas, mas o status na tela não foi atualizado:`, err)
    }
    return linhas.length
}
