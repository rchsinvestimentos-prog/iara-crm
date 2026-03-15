'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, ChevronRight, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ChecklistItem {
    id: string
    titulo: string
    descricao: string
    link: string
    linkLabel: string
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
    {
        id: 'dados',
        titulo: 'Etapa 1 — Cadastre seus dados',
        descricao: 'Clínica, procedimentos e horários',
        link: '/configuracoes',
        linkLabel: 'Ir para Configurações',
    },
    {
        id: 'secretaria',
        titulo: 'Etapa 2 — Configure a sua Secretária',
        descricao: 'Humor, tom de voz e personalidade',
        link: '/habilidades/atendimento',
        linkLabel: 'Configurar IA',
    },
    {
        id: 'conexoes',
        titulo: 'Etapa 3 — Conecte no Whats',
        descricao: 'WhatsApp e Instagram para ela atender',
        link: '/instancias',
        linkLabel: 'Conectar agora',
    },
    {
        id: 'contatos',
        titulo: 'Etapa 4 — Conecte seus Contatos',
        descricao: 'Importe do Google ou cadastre manualmente',
        link: '/contatos',
        linkLabel: 'Importar contatos',
    },
    {
        id: 'aproveitar',
        titulo: 'Etapa 5 — Aproveite tudo! 🎉',
        descricao: 'Veja sua IARA trabalhando 24/7',
        link: '#video-funcionalidades',
        linkLabel: 'Assistir vídeo',
    },
]

interface OnboardingStatus {
    dados: boolean
    secretaria: boolean
    conexoes: boolean
    contatos: boolean
    aproveitar: boolean
}

export default function OnboardingChecklist() {
    const [status, setStatus] = useState<OnboardingStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        fetch('/api/onboarding')
            .then(r => r.json())
            .then(data => {
                if (data && !data.error) {
                    setStatus(data)
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="backdrop-blur-xl rounded-2xl p-5 animate-fade-in flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Verificando configurações...</span>
            </div>
        )
    }

    if (!status) return null

    const completedIds = CHECKLIST_ITEMS.filter(item => status[item.id as keyof OnboardingStatus]).map(item => item.id)
    const total = CHECKLIST_ITEMS.length
    const done = completedIds.length
    const pct = Math.round((done / total) * 100)
    const isAllDone = done === total

    if (isAllDone) {
        return (
            <div className="backdrop-blur-xl rounded-2xl p-5 animate-fade-in flex items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(6,214,160,0.3)' }}>
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={20} className="text-green-500" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>🎉 Setup completo! Sua IARA está pronta.</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sua clínica está configurada e atendendo automaticamente.</p>
                </div>
                <Sparkles size={20} className="text-[#D99773] flex-shrink-0" />
            </div>
        )
    }

    return (
        <div className="backdrop-blur-xl rounded-2xl overflow-hidden animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            {/* Header */}
            <button
                onClick={() => setCollapsed(prev => !prev)}
                className="w-full flex items-center gap-3 p-4 text-left"
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles size={15} className="text-[#D99773]" />
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Primeiros passos — {done}/{total} concluídos
                        </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #D99773, #C07A55)' }}
                        />
                    </div>
                </div>
                <ChevronRight size={16} className={`transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`} style={{ color: 'var(--text-muted)' }} />
            </button>

            {/* Items */}
            {!collapsed && (
                <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {CHECKLIST_ITEMS.map((item) => {
                        const isDone = completedIds.includes(item.id)
                        return (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}
                                style={{ backgroundColor: isDone ? 'transparent' : 'var(--bg-subtle)' }}
                            >
                                <div className="flex-shrink-0">
                                    {isDone
                                        ? <CheckCircle2 size={19} className="text-green-500" />
                                        : <Circle size={19} style={{ color: 'var(--text-muted)' }} />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${isDone ? 'line-through' : ''}`} style={{ color: 'var(--text-primary)' }}>
                                        {item.titulo}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.descricao}</p>
                                </div>
                                {!isDone && (
                                    <Link
                                        href={item.link}
                                        className="text-[11px] font-semibold text-[#D99773] hover:text-[#C07A55] flex-shrink-0 flex items-center gap-0.5"
                                    >
                                        {item.linkLabel} <ChevronRight size={11} />
                                    </Link>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
