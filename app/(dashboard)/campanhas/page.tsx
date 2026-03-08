'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Send, Beaker, Loader2, Lock, CheckCircle2, XCircle, Clock, Megaphone, X } from 'lucide-react'

interface Campanha {
    id: string; nome: string; mensagem: string; filtroEtapa?: string
    status: string; totalEnvios: number; totalErros: number; createdAt: string
    _count?: { envios: number }
}
interface Coluna { id: string; nome: string; slug: string }

export default function CampanhasPage() {
    const [campanhas, setCampanhas] = useState<Campanha[]>([])
    const [colunas, setColunas] = useState<Coluna[]>([])
    const [loading, setLoading] = useState(true)
    const [blocked, setBlocked] = useState(false)
    const [showNewModal, setShowNewModal] = useState(false)
    const [nome, setNome] = useState('')
    const [mensagem, setMensagem] = useState('')
    const [filtroEtapa, setFiltroEtapa] = useState('')
    const [saving, setSaving] = useState(false)
    const [dispatching, setDispatching] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            const [campRes, colRes] = await Promise.all([
                fetch('/api/campanhas'),
                fetch('/api/crm-colunas'),
            ])
            if (campRes.status === 403) { setBlocked(true); return }
            const campData = await campRes.json()
            const colData = await colRes.json()
            setCampanhas(campData.campanhas || [])
            setColunas(colData.colunas || [])
        } catch { /* */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const criarCampanha = async () => {
        if (!nome || !mensagem) return
        setSaving(true)
        try {
            const res = await fetch('/api/campanhas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, mensagem, filtroEtapa: filtroEtapa || null }),
            })
            const data = await res.json()
            if (data.error) { alert(data.error); return }
            setShowNewModal(false); setNome(''); setMensagem(''); setFiltroEtapa('')
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const enviarTeste = async (id: string) => {
        try {
            const res = await fetch(`/api/campanhas/${id}/teste`, { method: 'POST' })
            const data = await res.json()
            alert(data.ok ? '✅ Teste enviado para seu WhatsApp!' : `❌ ${data.error}`)
        } catch { alert('Erro ao enviar teste') }
    }

    const disparar = async (id: string) => {
        if (!confirm('Tem certeza que deseja disparar esta campanha? As mensagens serão enviadas para todos os contatos selecionados.')) return
        setDispatching(id)
        try {
            const res = await fetch(`/api/campanhas/${id}/disparar`, { method: 'POST' })
            const data = await res.json()
            if (data.ok) {
                alert(`✅ Campanha concluída!\n\n✅ Enviados: ${data.enviados}\n❌ Erros: ${data.erros}`)
                fetchData()
            } else {
                alert(`❌ ${data.error}`)
            }
        } catch { alert('Erro ao disparar') }
        finally { setDispatching(null) }
    }

    const statusIcon = (s: string) => {
        if (s === 'concluida') return <CheckCircle2 size={14} className="text-green-400" />
        if (s === 'enviando') return <Loader2 size={14} className="animate-spin text-[#D99773]" />
        if (s === 'cancelada') return <XCircle size={14} className="text-red-400" />
        return <Clock size={14} style={{ color: 'var(--text-muted)' }} />
    }

    const statusLabel = (s: string) => {
        if (s === 'concluida') return 'Concluída'
        if (s === 'enviando') return 'Enviando...'
        if (s === 'cancelada') return 'Cancelada'
        return 'Rascunho'
    }

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>

    if (blocked) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <Lock size={48} className="mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Campanhas — Plano 4</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Disparos em massa são exclusivos do Plano 4.</p>
                <a href="/plano" className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">Fazer Upgrade</a>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Campanhas</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Disparo em massa para seus contatos do CRM</p>
                </div>
                <button onClick={() => setShowNewModal(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">
                    <Plus size={15} /> Nova Campanha
                </button>
            </div>

            {campanhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <Megaphone size={48} className="mb-4 opacity-15" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nenhuma campanha ainda</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Crie sua primeira campanha para disparar promoções</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {campanhas.map(c => (
                        <div key={c.id} className="rounded-2xl p-5 transition-all" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {statusIcon(c.status)}
                                        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nome}</h3>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                            {statusLabel(c.status)}
                                        </span>
                                    </div>
                                    <p className="text-[12px] truncate mb-2" style={{ color: 'var(--text-muted)' }}>{c.mensagem}</p>
                                    <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                        <span>📊 {c._count?.envios || 0} contatos</span>
                                        {c.status === 'concluida' && (
                                            <>
                                                <span>✅ {c.totalEnvios} enviados</span>
                                                {c.totalErros > 0 && <span>❌ {c.totalErros} erros</span>}
                                            </>
                                        )}
                                        <span>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                                {c.status === 'rascunho' && (
                                    <div className="flex gap-2">
                                        <button onClick={() => enviarTeste(c.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                                            <Beaker size={13} /> Testar
                                        </button>
                                        <button onClick={() => disparar(c.id)} disabled={dispatching === c.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all disabled:opacity-50">
                                            {dispatching === c.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                            Disparar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Campaign Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewModal(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Nova Campanha</h3>
                            <button onClick={() => setShowNewModal(false)}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
                        </div>

                        <div className="mb-3">
                            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Nome da Campanha</label>
                            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Promoção de Verão"
                                className="w-full rounded-xl px-4 py-2.5 text-[12px] focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                        </div>

                        <div className="mb-3">
                            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Mensagem</label>
                            <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={5}
                                placeholder="🌟 Promoção especial! Botox com 20% de desconto esta semana..."
                                className="w-full rounded-xl px-4 py-3 text-[12px] focus:outline-none resize-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                        </div>

                        <div className="mb-4">
                            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Enviar para (filtro por etapa do CRM)</label>
                            <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}
                                className="w-full rounded-xl px-4 py-2.5 text-[12px] focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                                <option value="">Todos os contatos</option>
                                {colunas.map(col => (
                                    <option key={col.id} value={col.slug}>{col.nome}</option>
                                ))}
                            </select>
                        </div>

                        <button onClick={criarCampanha} disabled={saving}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <><Megaphone size={14} /> Criar Campanha</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
