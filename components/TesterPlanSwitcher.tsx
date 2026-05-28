'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { FlaskConical, Sparkles, Star, Crown, Gem, Loader2 } from 'lucide-react'

const PLAN_LEVELS = [
    { nivel: 1, label: 'Plano 1 (Essencial)', icon: Sparkles, color: '#06D6A0' },
    { nivel: 2, label: 'Plano 2 (Pro)', icon: Star, color: '#8B5CF6' },
    { nivel: 3, label: 'Plano 3 (Premium)', icon: Crown, color: '#F59E0B' },
    { nivel: 4, label: 'Plano 4 (VIP/Unlimited)', icon: Gem, color: '#EF4444' },
]

export default function TesterPlanSwitcher() {
    const { data: session } = useSession()
    const isTester = (session?.user as any)?.role === 'tester'
    const [planoAtual, setPlanoAtual] = useState<number | null>(null)
    const [changing, setChanging] = useState<number | null>(null)
    const [visible, setVisible] = useState(true)

    // Buscar plano atual ao carregar
    useEffect(() => {
        if (!isTester) return
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                if (data?.nivel) setPlanoAtual(Number(data.nivel))
            })
            .catch(() => { })
    }, [isTester])

    if (!isTester) return null

    const handleSwitchPlan = async (nivel: number) => {
        if (nivel === planoAtual) return
        setChanging(nivel)
        try {
            const res = await fetch('/api/clinica/switch-plan-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nivel })
            })
            if (res.ok) {
                setPlanoAtual(nivel)
                // Recarregar síncronamente para propagar mudanças
                window.location.reload()
            }
        } catch (err) {
            console.error('Erro ao alternar plano de teste:', err)
        } finally {
            setChanging(null)
        }
    }

    if (!visible) {
        return (
            <button
                onClick={() => setVisible(true)}
                className="fixed bottom-4 left-4 z-50 p-3 rounded-full shadow-lg border backdrop-blur-md transition-all hover:scale-105 animate-bounce"
                style={{
                    backgroundColor: 'rgba(217,151,115,0.15)',
                    borderColor: '#D99773',
                    color: '#D99773',
                }}
                title="Abrir Seletor de Planos de Teste 🧪"
            >
                <FlaskConical size={18} />
            </button>
        )
    }

    return (
        <div 
            className="fixed bottom-4 left-4 z-50 max-w-[280px] p-4 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-all duration-300 animate-fade-in"
            style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-hover)',
                boxShadow: 'var(--shadow-glass)',
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center gap-1.5">
                    <FlaskConical size={15} className="text-[#D99773] animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider uppercase text-[#D99773]">IARA Lab 🧪</span>
                </div>
                <button 
                    onClick={() => setVisible(false)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                    Minimizar
                </button>
            </div>

            <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">
                Alterne entre planos com 1 clique para testar as travas do Follow-Up e permissões do console.
            </p>

            {/* Plan options */}
            <div className="space-y-1.5">
                {PLAN_LEVELS.map(p => {
                    const isSelected = planoAtual === p.nivel
                    const isUpdating = changing === p.nivel
                    return (
                        <button
                            key={p.nivel}
                            onClick={() => handleSwitchPlan(p.nivel)}
                            disabled={changing !== null}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[11px] font-semibold transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50`}
                            style={{
                                backgroundColor: isSelected ? `${p.color}15` : 'var(--bg-subtle)',
                                border: isSelected ? `1.5px solid ${p.color}` : '1px solid var(--border-default)',
                                color: isSelected ? p.color : 'var(--text-secondary)',
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <p.icon size={13} style={{ color: isSelected ? p.color : 'gray' }} />
                                <span>{p.label}</span>
                            </div>
                            {isUpdating ? (
                                <Loader2 size={11} className="animate-spin" />
                            ) : isSelected ? (
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                            ) : null}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
