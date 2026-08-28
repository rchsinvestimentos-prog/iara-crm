'use client'

// ============================================
// SOMENTE PRO — bloqueio de tela por plano
// ============================================
// Esconder o item no menu não basta: quem digitar o endereço entra do mesmo
// jeito. Este componente envolve a tela inteira e mostra a oferta de upgrade
// para quem está abaixo do plano necessário.

import { useEffect, useState } from 'react'
import UpgradeOverlay from './UpgradeOverlay'

export default function SomentePro({
    nomeFeature,
    descricao,
    beneficios,
    planoMinimo = 2,
    children,
}: {
    nomeFeature: string
    descricao?: string
    beneficios?: string[]
    planoMinimo?: number
    children: React.ReactNode
}) {
    // null enquanto carrega: sem isso a tela pisca a oferta de upgrade antes
    // de descobrir que a clínica já tem o plano.
    const [nivel, setNivel] = useState<number | null>(null)

    useEffect(() => {
        fetch('/api/clinica')
            .then(r => r.json())
            .then(d => setNivel(Number(d?.nivel) || 1))
            .catch(() => setNivel(1))
    }, [])

    if (nivel === null) return null

    return (
        <UpgradeOverlay
            planoAtual={nivel}
            planoMinimo={planoMinimo}
            nomeFeature={nomeFeature}
            descricao={descricao}
            beneficios={beneficios}
        >
            {children}
        </UpgradeOverlay>
    )
}
