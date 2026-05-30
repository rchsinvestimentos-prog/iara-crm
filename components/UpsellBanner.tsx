'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Sparkles, X } from 'lucide-react'
import Link from 'next/link'

/**
 * Componente de upsell — aparece quando créditos atingem 80%.
 * Incentiva upgrade de plano.
 */
export default function UpsellBanner() {
    const [show, setShow] = useState(false)
    const [percentual, setPercentual] = useState(0)
    const [plano, setPlano] = useState(1)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Checar se já dispensou hoje
        const dismissKey = `upsell_dismiss_${new Date().toDateString()}`
        if (sessionStorage.getItem(dismissKey)) return

        fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
                const roi = data.roi
                if (roi && roi.percentualCreditos >= 80) {
                    setPercentual(roi.percentualCreditos)
                    setPlano(data.plano || 1)
                    setShow(true)
                }
            })
            .catch(() => { })
    }, [])

    function dismiss() {
        const dismissKey = `upsell_dismiss_${new Date().toDateString()}`
        sessionStorage.setItem(dismissKey, '1')
        setDismissed(true)
        setTimeout(() => setShow(false), 300)
    }

    if (!show || plano >= 4) return null

    const NOMES_PLANOS: Record<number, string> = {
        1: 'Estrategista',
        2: 'Designer',
        3: 'Audiovisual',
    }

    const proximoPlano = NOMES_PLANOS[plano] || 'próximo plano'

    return (
        <div
            className={`relative rounded-xl overflow-hidden transition-all duration-300 ${dismissed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{
                background: 'linear-gradient(135deg, rgba(217,151,115,0.12) 0%, rgba(139,92,246,0.12) 100%)',
                border: '1px solid rgba(217,151,115,0.2)',
            }}
        >
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #D99773, #8B5CF6)' }} />

            <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D99773] to-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Você já usou {percentual}% dos créditos! 🔥
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Libere até 5x mais créditos com o plano {proximoPlano}
                    </p>
                </div>
                <Link
                    href="/plano"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #D99773, #8B5CF6)', color: 'white' }}
                >
                    Upgrade <ArrowUpRight size={12} />
                </Link>
                <button onClick={dismiss} className="p-1 rounded-lg hover:bg-white/10 transition-all" style={{ color: 'var(--text-muted)' }}>
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}
