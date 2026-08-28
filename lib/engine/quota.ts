// ============================================
// COTA — Teto de uso por plano
// ============================================
// O custo da IARA sobe com o uso, a mensalidade não. Sem teto, uma
// clínica movimentada consome sozinha a margem de várias outras.
// Aqui ficam as duas travas: mensagens de IA e áudios gerados.
//
// Os limites por nível estão em lib/feature-limits.ts.

import { checkFeature, incrementFeature, getLimite } from '@/lib/feature-limits'
import { prisma } from '@/lib/prisma'
import { sendText } from './sender'
import type { DadosClinica } from './types'

/** Percentual a partir do qual a dona recebe o primeiro aviso. */
const AVISO_EM = 0.8

type Resultado = {
    permitido: boolean
    usado: number
    limite: number
    restante: number
}

/**
 * A clínica ainda pode gastar uma mensagem de IA neste mês?
 *
 * Só consulta — quem gasta é registrarMensagem(), chamada depois que a
 * resposta deu certo. Assim uma falha de API não consome a cota do cliente.
 */
export async function podeResponder(clinica: DadosClinica): Promise<Resultado> {
    const r = await checkFeature(clinica.id, clinica.nivel || 1, 'mensagensIA')
    return { permitido: r.permitido, usado: r.usado, limite: r.limite, restante: r.restante }
}

/** A clínica ainda pode gerar um áudio neste mês? */
export async function podeGerarAudio(clinica: DadosClinica): Promise<Resultado> {
    const r = await checkFeature(clinica.id, clinica.nivel || 1, 'audiosIA')
    return { permitido: r.permitido, usado: r.usado, limite: r.limite, restante: r.restante }
}

/**
 * Registra uma mensagem consumida e avisa a dona quando ela cruza 80%.
 * O aviso sai uma vez só por mês — a marca fica em configuracoes.
 */
export async function registrarMensagem(clinica: DadosClinica): Promise<void> {
    const limite = getLimite(clinica.nivel || 1, 'mensagensIA')
    const usado = await incrementFeature(clinica.id, 'mensagensIA', 1)
    if (limite === -1) return

    if (usado === Math.floor(limite * AVISO_EM)) {
        await avisarDona(
            clinica,
            `⚠️ Sua IARA já usou ${Math.round(AVISO_EM * 100)}% das mensagens do plano este mês.\n\n` +
            `Ela continua atendendo normalmente. Se chegar no limite, eu te aviso de novo e passo os atendimentos pra você.`,
            'aviso80'
        )
    }
}

/** Registra um áudio gerado. */
export async function registrarAudio(clinica: DadosClinica): Promise<void> {
    await incrementFeature(clinica.id, 'audiosIA', 1)
}

/**
 * Chamado quando a mensagem bateu no teto. Responde a paciente com um
 * texto de transição (nunca silêncio — silêncio parece clínica abandonada)
 * e avisa a dona uma vez por mês.
 */
export async function tratarEstouro(
    clinica: DadosClinica,
    telefonePaciente: string
): Promise<void> {
    const opts = {
        instancia: clinica.evolutionInstance || '',
        telefone: telefonePaciente,
        apikey: clinica.evolutionApikey || '',
    }

    await sendText(
        opts,
        'Oi! Recebi sua mensagem 💛 Nossa equipe vai te responder pessoalmente daqui a pouquinho, tá?'
    )

    await avisarDona(
        clinica,
        `🚨 Sua IARA atingiu o limite de mensagens do plano este mês.\n\n` +
        `A partir de agora as pacientes recebem um aviso de que a equipe vai responder — ` +
        `então dá uma olhada no WhatsApp da clínica.\n\n` +
        `Quer continuar com a IARA atendendo? Responda aqui que a gente libera.`,
        'aviso100'
    )
}

/**
 * Manda um aviso pro WhatsApp da dona, no máximo uma vez por mês para
 * cada tipo. A marca fica em configuracoes.avisosCota = { aviso80: "2026-08" }.
 */
async function avisarDona(
    clinica: DadosClinica,
    texto: string,
    tipo: 'aviso80' | 'aviso100'
): Promise<void> {
    const destino = clinica.whatsappDoutora || clinica.whatsappClinica
    if (!destino) return

    const mes = new Date().toISOString().slice(0, 7)
    const cfg = ((clinica as any).configuracoes || {}) as any
    const avisos = cfg.avisosCota || {}
    if (avisos[tipo] === mes) return   // já avisou este mês

    const ok = await sendText(
        {
            instancia: clinica.evolutionInstance || '',
            telefone: destino,
            apikey: clinica.evolutionApikey || '',
        },
        texto
    )
    if (!ok) return

    try {
        await prisma.clinica.update({
            where: { id: clinica.id },
            data: { configuracoes: { ...cfg, avisosCota: { ...avisos, [tipo]: mes } } },
        })
    } catch (err) {
        console.error('[Quota] Não consegui marcar o aviso como enviado:', err)
    }
}
