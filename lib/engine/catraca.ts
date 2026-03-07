// ============================================
// CATRACA — Controle de Acesso
// ============================================
// A Catraca decide se uma mensagem pode ser processada.
// Verifica: clínica existe? está ativa? tem créditos? está pausada?
//
// Era o F03 no n8n. Agora é uma função simples.

import { prisma } from '@/lib/prisma'
import type { DadosClinica, ResultadoCatraca } from './types'

/**
 * Busca a clínica pela instância Evolution ou pelo ID.
 * 
 * COMO FUNCIONA:
 * - Quando a Evolution API manda um webhook, o campo "instance" identifica a clínica
 * - A gente pesquisa no banco quem tem essa instância
 */
export async function findClinicaByInstance(instanceName: string): Promise<DadosClinica | null> {
    if (!instanceName) return null

    const clinica = await prisma.clinica.findFirst({
        where: { evolutionInstance: instanceName },
    })

    return clinica as DadosClinica | null
}

/**
 * Verifica se a mensagem pode ser processada.
 * 
 * REGRAS (em ordem):
 * 1. Clínica precisa existir
 * 2. Se a mensagem é da doutora → SEMPRE permite (ela é a dona)
 * 3. Clínica precisa estar ativa
 * 4. Clínica precisa ter créditos
 * 5. Clínica não pode estar pausada (pausa_iara)
 */
export async function checkAccess(
    instanceName: string,
    telefoneRemetente: string
): Promise<ResultadoCatraca> {

    // 1. Buscar clínica
    const clinica = await findClinicaByInstance(instanceName)

    if (!clinica) {
        return {
            permitido: false,
            motivo: 'clinica_nao_encontrada',
            mensagemBloqueio: undefined,
        }
    }

    // 2. Verificar se é a doutora
    const telefoneLimpo = telefoneRemetente.replace(/\D/g, '')
    const whatsappDoutora = (clinica.whatsappDoutora || '').replace(/\D/g, '')
    const isDoutora = telefoneLimpo && whatsappDoutora && telefoneLimpo === whatsappDoutora

    // Se é a doutora, SEMPRE permite (mesmo sem créditos)
    if (isDoutora) {
        return {
            permitido: true,
            clinica,
            isDoutora: true,
        }
    }

    // 3. Verificar status
    if (clinica.status !== 'ativo') {
        return {
            permitido: false,
            motivo: 'inativo',
            clinica,
            isDoutora: false,
        }
    }

    // 4. Verificar créditos
    const creditosDisponiveis = clinica.creditosDisponiveis ?? 0
    if (creditosDisponiveis <= 0) {
        return {
            permitido: false,
            motivo: 'sem_creditos',
            clinica,
            isDoutora: false,
            mensagemBloqueio: buildMensagemBloqueio('sem_creditos', clinica),
        }
    }

    // 5. Verificar pausa
    const cfg = (clinica.configuracoes as any) || {}
    if (cfg.pausa_iara === true) {
        return {
            permitido: false,
            motivo: 'pausado',
            clinica,
            isDoutora: false,
        }
    }

    // Tudo OK!
    return {
        permitido: true,
        clinica,
        isDoutora: false,
    }
}

/**
 * Descontar 1 crédito da clínica.
 * Chamado após processar uma mensagem com sucesso.
 */
export async function descontarCredito(clinicaId: number): Promise<void> {
    await prisma.$executeRaw`
    UPDATE users 
    SET creditos_disponiveis = GREATEST(0, COALESCE(creditos_disponiveis, 0) - 1),
        total_atendimentos = COALESCE(total_atendimentos, 0) + 1
    WHERE id = ${clinicaId}
  `
}

/**
 * Monta a mensagem de bloqueio pro WhatsApp da cliente.
 */
function buildMensagemBloqueio(motivo: string, clinica: DadosClinica): string {
    const nomeClinica = clinica.nomeClinica || 'a clínica'
    const idioma = clinica.idioma || 'pt-BR'

    if (motivo === 'sem_creditos') {
        if (idioma === 'en-US') {
            return `We apologize, but ${nomeClinica}'s virtual assistant is temporarily unavailable. Please contact us directly. 😊`
        }
        if (idioma === 'es') {
            return `Disculpa, pero la asistente virtual de ${nomeClinica} no está disponible temporalmente. Por favor contáctenos directamente. 😊`
        }
        return `Desculpe, a assistente da ${nomeClinica} está temporariamente indisponível. Por favor entre em contato diretamente. 😊`
    }

    return ''
}
