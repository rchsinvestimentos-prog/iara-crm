import { prisma } from '@/lib/prisma'

// ==========================================
// Limites de features por nível de plano
// -1 = ilimitado
// ==========================================

export const FEATURE_LIMITS: Record<number, Record<string, number>> = {
    1: {
        roteiros: 3,         // degustação (Carrossel, Reels, Stories) → bloqueia pra upgrade
        posts: 3,            // degustação → bloqueia 
        raioX: 1,            // degustação → bloqueia
        fotosIA: 3,          // degustação → bloqueia
        marca: 1,            // degustação → bloqueia
        antesDepois: 3,      // degustação → bloqueia
        campanhaContatos: 10,
    },
    2: {
        roteiros: 20,
        posts: 10,
        raioX: 3,
        fotosIA: 10,
        marca: 3,
        antesDepois: 15,
        campanhaContatos: 50,
    },
    3: {
        roteiros: 60,
        posts: 30,
        raioX: 10,
        fotosIA: 20,
        marca: 10,
        antesDepois: 30,
        campanhaContatos: 200,
    },
    4: {
        roteiros: -1,
        posts: -1,
        raioX: -1,
        fotosIA: -1,
        marca: -1,
        antesDepois: -1,
        campanhaContatos: -1,
    },
}

/**
 * Retorna o mês atual no formato "2026-03"
 */
function mesAtual(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Retorna o limite de uma feature para um dado nível de plano.
 * -1 = ilimitado
 */
export function getLimite(nivel: number, feature: string): number {
    const nivelConfig = FEATURE_LIMITS[nivel] || FEATURE_LIMITS[1]
    return nivelConfig[feature] ?? 0
}

/**
 * Retorna quantas vezes a clínica usou uma feature no mês atual.
 */
export async function getUso(clinicaId: number, feature: string): Promise<number> {
    const registro = await prisma.usoFeature.findUnique({
        where: { clinicaId_feature_mesAno: { clinicaId, feature, mesAno: mesAtual() } },
    })
    return registro?.usado ?? 0
}

/**
 * Verifica se a clínica pode usar uma feature.
 * Retorna { permitido, usado, limite, restante }
 */
export async function checkFeature(clinicaId: number, nivel: number, feature: string) {
    const limite = getLimite(nivel, feature)
    const usado = await getUso(clinicaId, feature)

    if (limite === -1) {
        return { permitido: true, usado, limite: -1, restante: -1, ilimitado: true }
    }

    return {
        permitido: usado < limite,
        usado,
        limite,
        restante: Math.max(0, limite - usado),
        ilimitado: false,
    }
}

/**
 * Incrementa o uso de uma feature. Chame APÓS a ação ser executada com sucesso.
 * Retorna o novo total de uso.
 */
export async function incrementFeature(clinicaId: number, feature: string, quantidade = 1): Promise<number> {
    const mes = mesAtual()

    const registro = await prisma.usoFeature.upsert({
        where: { clinicaId_feature_mesAno: { clinicaId, feature, mesAno: mes } },
        update: { usado: { increment: quantidade } },
        create: { clinicaId, feature, mesAno: mes, usado: quantidade },
    })

    return registro.usado
}

/**
 * Retorna o resumo de uso de TODAS as features de uma clínica no mês.
 * Útil para mostrar no dashboard / UI.
 */
export async function getResumoUso(clinicaId: number, nivel: number) {
    const features = Object.keys(FEATURE_LIMITS[1])
    const mes = mesAtual()

    const registros = await prisma.usoFeature.findMany({
        where: { clinicaId, mesAno: mes },
    })

    const usoMap = new Map(registros.map(r => [r.feature, r.usado]))

    return features.map(feature => {
        const limite = getLimite(nivel, feature)
        const usado = usoMap.get(feature) ?? 0
        return {
            feature,
            usado,
            limite,
            restante: limite === -1 ? -1 : Math.max(0, limite - usado),
            ilimitado: limite === -1,
            percentual: limite === -1 ? 0 : Math.round((usado / limite) * 100),
        }
    })
}
