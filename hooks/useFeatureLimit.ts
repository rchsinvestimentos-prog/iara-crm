'use client'

import { useState, useEffect, useCallback } from 'react'

interface FeatureStatus {
    permitido: boolean
    usado: number
    limite: number
    restante: number
    ilimitado: boolean
    loading: boolean
}

const FEATURE_NAMES: Record<string, string> = {
    antesDepois: 'Antes e Depois',
    roteiros: 'Roteiros de Vídeo',
    raioX: 'Raio-X Instagram',
    fotosIA: 'Fotos com IA',
    posts: 'Posts e Legendas',
    marca: 'Criação de Marca',
    campanhaContatos: 'Envios de Campanha',
}

export function useFeatureLimit(feature: string) {
    const [status, setStatus] = useState<FeatureStatus>({
        permitido: true, usado: 0, limite: -1, restante: -1, ilimitado: true, loading: true,
    })

    const check = useCallback(async () => {
        try {
            const res = await fetch('/api/check-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature }),
            })
            const data = await res.json()
            setStatus({ ...data, loading: false })
        } catch {
            setStatus(prev => ({ ...prev, loading: false }))
        }
    }, [feature])

    useEffect(() => { check() }, [check])

    const increment = useCallback(async () => {
        try {
            const res = await fetch('/api/check-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature, increment: true }),
            })
            const data = await res.json()
            setStatus({ ...data, loading: false })
            return data.permitido
        } catch {
            return false
        }
    }, [feature])

    const featureName = FEATURE_NAMES[feature] || feature

    return { ...status, increment, check, featureName }
}
