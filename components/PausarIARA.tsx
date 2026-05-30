'use client'

import { useState, useEffect } from 'react'
import { Pause, Play, Loader2, PalmtreeIcon, X, Calendar } from 'lucide-react'

/**
 * PausarIARA — Botão de pausar + Modo Férias
 * 
 * Modo Férias: pausa a IARA até uma data específica.
 * Quando a data chega, o cron de renovação reativa automaticamente.
 */
export default function PausarIARA() {
    const [pausada, setPausada] = useState(false)
    const [nomeIA, setNomeIA] = useState('IARA')
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(false)
    const [showFerias, setShowFerias] = useState(false)
    const [dataRetorno, setDataRetorno] = useState('')
    const [feriasSalvo, setFeriasSalvo] = useState('')
    const [mensagemFerias, setMensagemFerias] = useState('')

    useEffect(() => {
        fetch('/api/iara/pausar')
            .then(r => r.json())
            .then(data => {
                setPausada(data.pausada || false)
                setNomeIA(data.nomeIA || 'IARA')
                setFeriasSalvo(data.feriasTe || '')
                setMensagemFerias(data.mensagemFerias || '')
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
                setFeriasSalvo('')
            }
        } catch (err) {
            console.error('Erro ao alternar:', err)
        } finally {
            setToggling(false)
        }
    }

    const ativarFerias = async () => {
        if (!dataRetorno) return
        setToggling(true)
        try {
            const res = await fetch('/api/iara/pausar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acao: 'ferias',
                    dataRetorno,
                    mensagemFerias: mensagemFerias || `Olá! Estou de férias e retorno em ${new Date(dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR')}. Responderei assim que voltar! 🌴`,
                }),
            })
            const data = await res.json()
            if (data.ok) {
                setPausada(true)
                setFeriasSalvo(dataRetorno)
                setShowFerias(false)
            }
        } catch (err) {
            console.error('Erro ao ativar férias:', err)
        } finally {
            setToggling(false)
        }
    }

    if (loading) return null

    // Data mínima = amanhã
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dataMin = amanha.toISOString().split('T')[0]

    return (
        <div className="relative flex items-center gap-2">
            {/* Modo Férias Button */}
            <button
                onClick={() => setShowFerias(!showFerias)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 hover:-translate-y-0.5"
                style={{
                    backgroundColor: feriasSalvo ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.05)',
                    color: feriasSalvo ? '#8B5CF6' : 'var(--text-muted)',
                    border: `1px solid ${feriasSalvo ? 'rgba(139,92,246,0.25)' : 'var(--border-default)'}`,
                }}
                title="Modo Férias"
            >
                🌴 {feriasSalvo ? `Férias até ${new Date(feriasSalvo + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Férias'}
            </button>

            {/* Pause/Resume */}
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

            {/* Modal Férias */}
            {showFerias && (
                <div className="absolute top-12 right-0 z-50 w-72 rounded-2xl p-4 shadow-2xl animate-fade-in"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🌴</span>
                            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Modo Férias</p>
                        </div>
                        <button onClick={() => setShowFerias(false)} style={{ color: 'var(--text-muted)' }}>
                            <X size={14} />
                        </button>
                    </div>

                    <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                        A {nomeIA} fica pausada até a data de retorno e reativa automaticamente!
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                                📅 Data de retorno
                            </label>
                            <input
                                type="date"
                                min={dataMin}
                                value={dataRetorno}
                                onChange={e => setDataRetorno(e.target.value)}
                                className="w-full px-3 py-2 text-[12px] rounded-xl outline-none"
                                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                                💬 Mensagem automática (opcional)
                            </label>
                            <textarea
                                value={mensagemFerias}
                                onChange={e => setMensagemFerias(e.target.value)}
                                rows={3}
                                placeholder={`Olá! Estou de férias e retorno em breve. 🌴`}
                                className="w-full px-3 py-2 text-[11px] rounded-xl outline-none resize-none"
                                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                            <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                Enviada automaticamente para quem mandar mensagem durante as férias
                            </p>
                        </div>

                        <button
                            onClick={ativarFerias}
                            disabled={!dataRetorno || toggling}
                            className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: 'white' }}
                        >
                            {toggling ? '⏳ Ativando...' : '🌴 Ativar Modo Férias'}
                        </button>

                        {feriasSalvo && (
                            <button
                                onClick={() => { toggle(); setFeriasSalvo(''); setShowFerias(false) }}
                                className="w-full py-2 rounded-xl text-[11px] transition-all"
                                style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                                Cancelar Férias e Retomar Agora
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
