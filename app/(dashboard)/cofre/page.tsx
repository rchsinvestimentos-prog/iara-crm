'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, ArrowLeft, Shield, Swords, Route, RotateCcw } from 'lucide-react'
import Link from 'next/link'

interface CofreData {
    padrao: {
        leisImutaveis: string
        arsenalDeObjecoes: string
        roteiroVendas: string
    }
    overrides: Record<string, string>
    merged: {
        leisImutaveis: string
        arsenalDeObjecoes: string
        roteiroVendas: string
    }
}

export default function CofrePage() {
    const [data, setData] = useState<CofreData | null>(null)
    const [leis, setLeis] = useState('')
    const [arsenal, setArsenal] = useState('')
    const [roteiro, setRoteiro] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [tab, setTab] = useState<'leis' | 'arsenal' | 'roteiro'>('leis')

    useEffect(() => {
        fetch('/api/cofre')
            .then(r => r.json())
            .then(d => {
                setData(d)
                setLeis(d.merged?.leisImutaveis || '')
                setArsenal(d.merged?.arsenalDeObjecoes || '')
                setRoteiro(d.merged?.roteiroVendas || '')
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    async function salvar() {
        setSaving(true)
        try {
            const res = await fetch('/api/cofre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leisImutaveis: leis !== data?.padrao?.leisImutaveis ? leis : undefined,
                    arsenalObjecoes: arsenal !== data?.padrao?.arsenalDeObjecoes ? arsenal : undefined,
                    roteiroVendas: roteiro !== data?.padrao?.roteiroVendas ? roteiro : undefined,
                }),
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    function resetar(campo: 'leis' | 'arsenal' | 'roteiro') {
        if (!data?.padrao) return
        if (campo === 'leis') setLeis(data.padrao.leisImutaveis || '')
        if (campo === 'arsenal') setArsenal(data.padrao.arsenalDeObjecoes || '')
        if (campo === 'roteiro') setRoteiro(data.padrao.roteiroVendas || '')
    }

    const tabs = [
        { key: 'leis' as const, label: 'Regras da IARA', icon: Shield, desc: 'Como ela deve se comportar' },
        { key: 'arsenal' as const, label: 'Arsenal de Objeções', icon: Swords, desc: 'Respostas pra objeções de clientes' },
        { key: 'roteiro' as const, label: 'Roteiro de Vendas', icon: Route, desc: 'Passos do processo de vendas' },
    ]

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <Link href="/configuracoes" className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={14} /> Voltar
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center shadow-lg shadow-[#D99773]/20">
                        <Shield size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Personalizar IARA</h1>
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            Edite as regras, objeções e roteiro de vendas da sua assistente
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#D99773]" />
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-medium transition-all flex-1 ${tab === t.key ? 'bg-[#D99773]/15 text-[#D99773] border-[#D99773]/20' : ''
                                    }`}
                                style={{
                                    border: `1px solid ${tab === t.key ? 'rgba(217,151,115,0.2)' : 'var(--border-default)'}`,
                                    color: tab === t.key ? '#D99773' : 'var(--text-muted)',
                                }}
                            >
                                <t.icon size={15} />
                                <div className="text-left">
                                    <div>{t.label}</div>
                                    <div className="text-[10px] opacity-60">{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Editor */}
                    <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {tabs.find(t => t.key === tab)?.label}
                                </h3>
                                <button
                                    onClick={() => resetar(tab)}
                                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all hover:bg-amber-500/10 hover:text-amber-400"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    <RotateCcw size={12} /> Restaurar padrão
                                </button>
                            </div>
                            <textarea
                                value={tab === 'leis' ? leis : tab === 'arsenal' ? arsenal : roteiro}
                                onChange={(e) => {
                                    if (tab === 'leis') setLeis(e.target.value)
                                    if (tab === 'arsenal') setArsenal(e.target.value)
                                    if (tab === 'roteiro') setRoteiro(e.target.value)
                                }}
                                className="w-full rounded-xl p-4 text-[13px] leading-relaxed outline-none resize-none font-mono"
                                style={{
                                    backgroundColor: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-default)',
                                    minHeight: '400px',
                                }}
                            />
                        </div>
                    </div>

                    {/* Save */}
                    <div className="flex justify-end animate-fade-in" style={{ animationDelay: '0.15s' }}>
                        <button
                            onClick={salvar}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
                            style={{
                                background: saved ? '#06D6A0' : 'linear-gradient(135deg, #D99773, #C07A55)',
                                color: 'white',
                            }}
                        >
                            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            {saving ? 'Salvando...' : saved ? 'Salvo! ✨' : 'Salvar Alterações'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
