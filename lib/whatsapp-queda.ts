// ============================================
// AVISO DE QUEDA DO WHATSAPP
// ============================================
// Quando o WhatsApp de uma clínica cai e não volta sozinho em 5 minutos,
// a IARA avisa a dona pelo WhatsApp de suporte e por e-mail. Quando volta,
// avisa de novo. Só vale para quem estava conectado: QR que nunca foi
// escaneado e "Desconectar" clicado no painel não geram aviso.
//
// USADA POR: webhook da Evolution (connection.update), Guardian, rota de desconectar.
// A tabela fica fora do schema.prisma, como guardian_log: o boot nunca apaga.

import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const INSTANCIA_SUPORTE = process.env.EVOLUTION_ADMIN_INSTANCE || 'IARA_Suporte'

// A Evolution reconecta sozinha em segundos na maioria das quedas.
// Só avisa se continuar fora depois disso.
const ESPERA_MS = 5 * 60 * 1000

let tabelaPronta: Promise<unknown> | null = null
function garantirTabela() {
    if (!tabelaPronta) {
        tabelaPronta = prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS whatsapp_queda (
                evolution_instance TEXT PRIMARY KEY,
                caiu_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                avisado_em TIMESTAMPTZ
            )
        `).catch(err => {
            tabelaPronta = null
            throw err
        })
    }
    return tabelaPronta
}

/**
 * Anota que a instância caiu, se ela estava conectada.
 * Chamar ANTES de marcar o status como 'desconectado' no banco — e só marcar se
 * devolver true: se a anotação falhou e o status virar 'desconectado', a queda
 * some para sempre (só quem está 'conectado' é anotado).
 */
export async function registrarQueda(instanceName: string): Promise<boolean> {
    try {
        await garantirTabela()
        const novas = await prisma.$executeRaw`
            INSERT INTO whatsapp_queda (evolution_instance)
            SELECT evolution_instance FROM instancias_clinica
            WHERE evolution_instance = ${instanceName}
              AND status_conexao = 'conectado' AND ativo = true
            ON CONFLICT (evolution_instance) DO NOTHING
        `
        if (novas > 0) {
            console.log(`[Queda] 📉 ${instanceName} caiu — confere de novo em 5 min`)
            setTimeout(() => {
                conferirQuedas().catch(err => console.error('[Queda] Erro ao conferir:', err))
            }, ESPERA_MS + 5000)
        }
        return true
    } catch (err) {
        console.error(`[Queda] Erro ao registrar queda de ${instanceName} — status fica como está para tentar de novo:`, err)
        return false
    }
}

/**
 * A instância voltou. Se a dona já tinha sido avisada da queda, avisa que voltou.
 */
export async function registrarVolta(instanceName: string) {
    try {
        await garantirTabela()
        const apagadas = await prisma.$queryRaw<{ avisado_em: Date | null }[]>`
            DELETE FROM whatsapp_queda WHERE evolution_instance = ${instanceName}
            RETURNING avisado_em
        `
        if (apagadas[0]?.avisado_em && !(await avisarDona(instanceName, 'voltou'))) {
            console.error(`[Queda] Aviso de volta de ${instanceName} não chegou por nenhum canal`)
        }
    } catch (err) {
        console.error(`[Queda] Erro ao registrar volta de ${instanceName}:`, err)
    }
}

/**
 * A dona desconectou de propósito pelo painel — não é queda.
 */
export async function esquecerQueda(instanceName: string) {
    try {
        await garantirTabela()
        await prisma.$executeRaw`DELETE FROM whatsapp_queda WHERE evolution_instance = ${instanceName}`
    } catch (err) {
        console.error(`[Queda] Erro ao limpar queda de ${instanceName}:`, err)
    }
}

/**
 * Avisa as donas cujas instâncias estão fora há mais de 5 minutos.
 * Roda pelo setTimeout da queda e pelo Guardian (se o reinício do servidor
 * perder o setTimeout, o Guardian cobre).
 */
export async function conferirQuedas() {
    await garantirTabela()
    const pendentes = await prisma.$queryRaw<{ evolution_instance: string }[]>`
        SELECT evolution_instance FROM whatsapp_queda
        WHERE avisado_em IS NULL AND caiu_em < NOW() - INTERVAL '5 minutes'
    `

    for (const { evolution_instance: instanceName } of pendentes) {
        try {
            await conferirUma(instanceName)
        } catch (err) {
            // Uma instância com erro não pode deixar as outras sem aviso
            console.error(`[Queda] Erro ao conferir ${instanceName}:`, err)
        }
    }
}

async function conferirUma(instanceName: string) {
    const estado = await estadoNaEvolution(instanceName)

    if (estado === 'open') {
        await registrarVolta(instanceName)
        return
    }
    // Sem resposta da Evolution não dá pra saber se caiu — tenta na próxima rodada
    if (estado === 'desconhecido') return

    // Instância apagada ou desativada nesse meio-tempo: esquece
    const ativa = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM instancias_clinica
        WHERE evolution_instance = ${instanceName} AND ativo = true LIMIT 1
    `
    if (ativa.length === 0) {
        await esquecerQueda(instanceName)
        return
    }

    // Marca antes de enviar: dois setTimeout ou Guardian ao mesmo tempo não mandam aviso duplicado
    const marcadas = await prisma.$executeRaw`
        UPDATE whatsapp_queda SET avisado_em = NOW()
        WHERE evolution_instance = ${instanceName} AND avisado_em IS NULL
    `
    if (marcadas === 0) return

    let chegou = false
    try {
        chegou = await avisarDona(instanceName, 'caiu')
    } finally {
        if (!chegou) {
            // Nenhum canal entregou: desfaz a marca para o Guardian tentar de novo
            // (e para não mandar "voltou" a quem nunca soube que caiu)
            console.error(`[Queda] Aviso de queda de ${instanceName} não chegou por nenhum canal — tenta de novo na próxima rodada`)
            await prisma.$executeRaw`
                UPDATE whatsapp_queda SET avisado_em = NULL WHERE evolution_instance = ${instanceName}
            `
        }
    }
}

let avisouSemEvolution = false
async function estadoNaEvolution(instanceName: string): Promise<'open' | 'fora' | 'desconhecido'> {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        if (!avisouSemEvolution) console.error('[Queda] EVOLUTION_API_URL/KEY não configuradas — nenhum aviso de queda vai sair')
        avisouSemEvolution = true
        return 'desconhecido'
    }
    try {
        const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY },
            signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) {
            console.warn(`[Queda] connectionState de ${instanceName} respondeu ${res.status}`)
            return 'desconhecido'
        }
        const data = await res.json()
        const state = data?.instance?.state || data?.state
        return state === 'open' ? 'open' : 'fora'
    } catch (err: any) {
        console.warn(`[Queda] connectionState de ${instanceName} falhou: ${err?.message}`)
        return 'desconhecido'
    }
}

/** Devolve true se o aviso chegou por pelo menos um canal. */
async function avisarDona(instanceName: string, tipo: 'caiu' | 'voltou'): Promise<boolean> {
    const rows = await prisma.$queryRaw<any[]>`
        SELECT ic.nome_instancia, ic.numero_whatsapp,
               u.nome, u.email, u.telefone, u.whatsapp_doutora, u.nome_clinica
        FROM instancias_clinica ic
        JOIN users u ON u.id = ic.user_id
        WHERE ic.evolution_instance = ${instanceName}
        LIMIT 1
    `
    const d = rows[0]
    if (!d) {
        console.warn(`[Queda] ${instanceName} sem clínica no banco — aviso de "${tipo}" não enviado`)
        return false
    }

    const primeiroNome = String(d.nome || '').split(' ')[0] || 'tudo bem'
    const conexao = d.nome_instancia || 'WhatsApp'
    const numero = d.numero_whatsapp ? ` (${d.numero_whatsapp})` : ''
    const hora = new Date().toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
    })

    const texto = tipo === 'caiu'
        ? `⚠️ Oi, ${primeiroNome}! O WhatsApp *${conexao}*${numero} desconectou da IARA às ${hora}.\n\n` +
          `Enquanto ele estiver desconectado, a IARA não responde as pacientes nesse número.\n\n` +
          `Para reconectar:\n1. Entre em https://app.iara.click/instancias\n2. Clique em *Escanear QR*\n3. Leia o código com o celular desse número`
        : `✅ ${primeiroNome}, o WhatsApp *${conexao}*${numero} voltou a funcionar às ${hora}. A IARA já está respondendo de novo.`

    const telefone = String(d.whatsapp_doutora || d.telefone || '').replace(/\D/g, '')
    let enviouZap = false
    if (telefone && EVOLUTION_API_URL && EVOLUTION_API_KEY) {
        const numeroZap = telefone.length <= 11 ? `55${telefone}` : telefone
        try {
            const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCIA_SUPORTE}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
                body: JSON.stringify({ number: numeroZap, text: texto }),
                signal: AbortSignal.timeout(15000),
            })
            enviouZap = res.ok
            if (!res.ok) {
                const erro = await res.text().catch(() => '')
                console.error(`[Queda] WhatsApp de aviso (${tipo}) para ${instanceName} falhou: ${res.status} ${erro.slice(0, 200)}`)
            }
        } catch (err: any) {
            console.error(`[Queda] WhatsApp de aviso (${tipo}) para ${instanceName} falhou: ${err?.message}`)
        }
    } else {
        console.warn(`[Queda] ${instanceName} sem telefone da dona — aviso de "${tipo}" só por e-mail`)
    }

    let enviouEmail = false
    if (d.email && process.env.RESEND_API_KEY) {
        try {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const { error } = await resend.emails.send({
                from: process.env.RESEND_FROM || 'Iara - Secretária Virtual com IA <noreply@iara.click>',
                to: d.email,
                subject: tipo === 'caiu'
                    ? `⚠️ O WhatsApp ${conexao} desconectou da IARA`
                    : `✅ O WhatsApp ${conexao} voltou a funcionar`,
                text: texto.replace(/\*/g, ''),
            })
            enviouEmail = !error
            if (error) console.error(`[Queda] E-mail de aviso (${tipo}) para ${instanceName} falhou:`, error)
        } catch (err: any) {
            console.error(`[Queda] E-mail de aviso (${tipo}) para ${instanceName} falhou: ${err?.message}`)
        }
    }

    console.log(`[Queda] Aviso "${tipo}" de ${instanceName}: whatsapp=${enviouZap ? 'ok' : 'não'}, email=${enviouEmail ? 'ok' : 'não'}`)
    return enviouZap || enviouEmail
}
