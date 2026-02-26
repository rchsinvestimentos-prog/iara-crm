'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, ChevronRight, Sparkles } from 'lucide-react'
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
        id: 'whatsapp',
        titulo: 'Conectar WhatsApp',
        descricao: 'Configure sua instância para a IARA começar a atender',
        link: '/configuracoes',
        linkLabel: 'Ir para Configurações',
    },
    {
        id: 'procedimentos',
        titulo: 'Cadastrar procedimentos',
        descricao: 'Adicione os procedimentos e preços da sua clínica',
        link: '/configuracoes',
        linkLabel: 'Adicionar procedimentos',
    },
    {
        id: 'diferenciais',
        titulo: 'Escrever seus diferenciais',
        descricao: 'A IARA usa seus diferenciais para convencer e converter',
        link: '/configuracoes',
        linkLabel: 'Editar diferenciais',
    },
    {
        id: 'plano',
        titulo: 'Escolher seu plano',
        descricao: 'Desbloqueie habilidades avançadas conforme sua clínica cresce',
        link: '/plano',
        linkLabel: 'Ver planos',
    },
    {
        id: 'habilidades',
        titulo: 'Explorar habilidades',
        descricao: 'Conheça tudo que a IARA pode fazer pela sua clínica',
        link: '/habilidades',
        linkLabel: 'Ver habilidades',
    },
]

const STORAGE_KEY = 'iara_onboarding_v1'

function getCompleted(): string[] {
    if (typeof window === 'undefined') return []
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

export default function OnboardingChecklist() {
    const [completed, setCompleted] = useState<string[]>(getCompleted)
    const [collapsed, setCollapsed] = useState(false)

    const total = CHECKLIST_ITEMS.length
    const done = completed.length
    const pct = Math.round((done / total) * 100)

    // Auto-collapse when 100% done
    const isAllDone = done === total

    const toggle = (id: string) => {
        const next = completed.includes(id)
            ? completed.filter(c => c !== id)
            : [...completed, id]
        setCompleted(next)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }

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
                        const isDone = completed.includes(item.id)
                        return (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}
                                style={{ backgroundColor: isDone ? 'transparent' : 'var(--bg-subtle)' }}
                            >
                                <button
                                    onClick={() => toggle(item.id)}
                                    className="flex-shrink-0 transition-transform hover:scale-110"
                                    title={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
                                >
                                    {isDone
                                        ? <CheckCircle2 size={19} className="text-green-500" />
                                        : <Circle size={19} style={{ color: 'var(--text-muted)' }} />
                                    }
                                </button>
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
