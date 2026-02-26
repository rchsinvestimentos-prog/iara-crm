'use client'

import { useState, useEffect } from 'react'
import { Pause, Play, Loader2 } from 'lucide-react'

export default function PausarIARA() {
    const [pausada, setPausada] = useState(false)
    const [nomeIA, setNomeIA] = useState('IARA')
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(false)

    useEffect(() => {
        fetch('/api/iara/pausar')
            .then(r => r.json())
            .then(data => {
                setPausada(data.pausada || false)
                setNomeIA(data.nomeIA || 'IARA')
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const toggle = async () => {
        setToggling(true)
        try {
            const res = await fetch('/api/iara/pausar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acao: pausada ? 'retomar' : 'pausar' }),
            })
            const data = await res.json()
            if (data.ok) {
                setPausada(data.status === 'pausado')
            }
        } catch (err) {
            console.error('Erro ao alternar:', err)
        } finally {
            setToggling(false)
        }
    }

    if (loading) return null

    return (
        <button
            onClick={toggle}
            disabled={toggling}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
            style={{
                backgroundColor: pausada ? 'rgba(6,214,160,0.12)' : 'rgba(239,68,68,0.1)',
                color: pausada ? '#06D6A0' : '#EF4444',
                border: `1px solid ${pausada ? 'rgba(6,214,160,0.25)' : 'rgba(239,68,68,0.2)'}`,
            }}
            title={pausada ? `Retomar ${nomeIA}` : `Pausar ${nomeIA}`}
        >
            {toggling ? (
                <Loader2 size={15} className="animate-spin" />
            ) : pausada ? (
                <Play size={15} />
            ) : (
                <Pause size={15} />
            )}
            {pausada ? `Retomar ${nomeIA}` : `Pausar ${nomeIA}`}
        </button>
    )
}
