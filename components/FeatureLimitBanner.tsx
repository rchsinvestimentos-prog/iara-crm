'use client'

import { Zap, Lock } from 'lucide-react'

interface Props {
    permitido: boolean
    usado: number
    limite: number
    restante: number
    ilimitado: boolean
    featureName: string
    loading: boolean
}

export default function FeatureLimitBanner({ permitido, usado, limite, restante, ilimitado, featureName, loading }: Props) {
    if (loading || ilimitado) return null

    if (!permitido) {
        return (
            <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between"
                style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center gap-2">
                    <Lock size={14} className="text-red-400" />
                    <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                        Você usou seus <strong>{limite} {featureName}</strong> grátis este mês!
                    </span>
                </div>
                <a href="/plano" className="text-[11px] font-semibold text-[#D99773] hover:underline whitespace-nowrap">
                    Fazer Upgrade →
                </a>
            </div>
        )
    }

    return (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between"
            style={{ backgroundColor: 'rgba(217,151,115,0.06)', border: '1px solid rgba(217,151,115,0.12)' }}>
            <div className="flex items-center gap-2">
                <Zap size={14} className="text-[#D99773]" />
                <span className="text-[12px]" style={{ color: 'var(--text-primary)' }}>
                    <strong>{restante}</strong> de {limite} {featureName} restantes este mês
                </span>
            </div>
            {restante <= 1 && (
                <a href="/plano" className="text-[11px] font-semibold text-[#D99773] hover:underline whitespace-nowrap">
                    Upgrade →
                </a>
            )}
        </div>
    )
}
