// ============================================
// HORÁRIOS — leitura do expediente da clínica
// ============================================
// A clínica cadastra o expediente como texto ("08:00 às 18:00"), com
// variações para sábado, domingo e feriado. Aqui esse texto vira número,
// num lugar só, para o pipeline e os crons enxergarem a mesma coisa.

import type { DadosClinica } from './types'

/**
 * Converte "08:00 às 18:00" em { inicio: 8, fim: 18 }.
 * Aceita "as", "a", "-" e "–" como separador.
 */
export function parseHorario(texto: string): { inicio: number; fim: number } {
    const match = texto.match(/(\d{1,2}):(\d{2})\s*(?:às|as|a|-|–)\s*(\d{1,2}):(\d{2})/i)
    if (match) {
        return {
            inicio: parseInt(match[1]) + parseInt(match[2]) / 60,
            fim: parseInt(match[3]) + parseInt(match[4]) / 60,
        }
    }
    return { inicio: 8, fim: 18 }
}

/** Que horas são agora no fuso da clínica. */
export function agoraNaClinica(clinica: DadosClinica): { hora: number; diaSemana: number } {
    const tz = clinica.timezone || 'America/Sao_Paulo'
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
    return {
        hora: agora.getHours() + agora.getMinutes() / 60,
        diaSemana: agora.getDay(), // 0 = domingo, 6 = sábado
    }
}

/**
 * O expediente de hoje desta clínica, no fuso dela.
 *
 * Devolve atende=false quando é um dia em que ela não abre — aí inicio e fim
 * não têm significado.
 */
export function horarioDeHoje(
    clinica: DadosClinica
): { atende: boolean; inicio: number; fim: number } {
    const { diaSemana } = agoraNaClinica(clinica)
    let texto = clinica.horarioSemana || '08:00 às 18:00'

    if (diaSemana === 0) {
        if (!clinica.atendeDomingo) return { atende: false, inicio: 0, fim: 0 }
        texto = clinica.horarioDomingo || texto
    } else if (diaSemana === 6) {
        if (!clinica.atendeSabado) return { atende: false, inicio: 0, fim: 0 }
        texto = clinica.horarioSabado || texto
    }

    return { atende: true, ...parseHorario(texto) }
}

/**
 * A clínica está abrindo ou fechando NESTA hora?
 *
 * Usado pelo "Batendo Ponto", que roda de hora em hora e precisa acertar o
 * horário de cada clínica em vez de mandar tudo na mesma hora para todas.
 *
 * A comparação é por hora cheia: quem fecha 18:00 e quem fecha 18:30 recebem
 * na execução das 18h. Marcar o minuto exato exigiria rodar o cron a cada
 * minuto, o que não compensa para uma mensagem de bom dia e boa noite.
 */
export function momentoDoPonto(clinica: DadosClinica): 'entrada' | 'saida' | null {
    const h = horarioDeHoje(clinica)
    if (!h.atende) return null

    const { hora } = agoraNaClinica(clinica)
    if (Math.floor(hora) === Math.floor(h.inicio)) return 'entrada'
    if (Math.floor(hora) === Math.floor(h.fim)) return 'saida'
    return null
}
