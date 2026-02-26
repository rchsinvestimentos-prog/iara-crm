'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useIdioma } from './IdiomaProvider'

export default function SeletorIdioma() {
    const { idioma, setIdioma, flag, todosIdiomas, t } = useIdioma()
    const [aberto, setAberto] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setAberto(!aberto)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                    backgroundColor: aberto ? 'var(--bg-subtle)' : 'transparent',
                    color: 'var(--text-muted)',
                }}
            >
                <Globe size={16} />
                <span className="flex-1 text-left text-xs">{flag} {t.idioma}</span>
            </button>

            {aberto && (
                <div
                    className="absolute bottom-full left-0 mb-1 w-48 rounded-xl p-1 shadow-xl z-50"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                    }}
                >
                    {todosIdiomas.map(lang => (
                        <button
                            key={lang.id}
                            onClick={() => { setIdioma(lang.id); setAberto(false) }}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
                            style={{
                                backgroundColor: idioma === lang.id ? 'rgba(217,151,115,0.1)' : 'transparent',
                                color: idioma === lang.id ? '#D99773' : 'var(--text-primary)',
                            }}
                        >
                            <span>{lang.flag}</span>
                            <span className="flex-1 text-left text-xs">{lang.nome}</span>
                            {idioma === lang.id && <span className="text-xs">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
