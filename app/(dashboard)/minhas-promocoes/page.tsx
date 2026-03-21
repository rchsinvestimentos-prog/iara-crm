'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Trash2, Save, X, Loader2,
    Tag, Percent, DollarSign, CalendarDays, ChevronDown, ChevronUp, Check
} from 'lucide-react'

interface Procedimento { id: number; nome: string }
interface Promocao {
    id: string; nome: string; descricao: string | null
    tipo_desconto: string; valor_desconto: number
    data_inicio: string; data_fim: string; procedimentos: string[]
}

export default function MinhasPromocoesPage() {
    const [promos, setPromos] = useState<Promocao[]>([])
    const [procs, setProcs] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [selectedProcs, setSelectedProcs] = useState<number[]>([])

    const [form, setForm] = useState({
        nome: '', descricao: '', tipoDesconto: 'percentual',
        valorDesconto: '', dataInicio: '', dataFim: ''
    })

    const resetForm = () => {
        setForm({ nome: '', descricao: '', tipoDesconto: 'percentual', valorDesconto: '', dataInicio: '', dataFim: '' })
        setSelectedProcs([])
        setEditId(null)
        setShowForm(false)
    }

    const load = () => {
        Promise.all([
            fetch('/api/profissional/promocoes').then(r => r.json()),
            fetch('/api/profissional/procedimentos').then(r => r.json()),
        ]).then(([p, pr]) => {
            if (Array.isArray(p)) setPromos(p)
            if (Array.isArray(pr)) setProcs(pr)
        }).catch(console.error).finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleSubmit = async () => {
        if (!form.nome.trim()) return alert('Nome é obrigatório')
        if (!form.dataInicio || !form.dataFim) return alert('Datas são obrigatórias')
        setSaving(true)
        try {
            const res = await fetch('/api/profissional/promocoes', {
                method: editId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId, nome: form.nome.trim(),
                    descricao: form.descricao || null,
                    tipoDesconto: form.tipoDesconto,
                    valorDesconto: Number(form.valorDesconto) || 0,
                    dataInicio: form.dataInicio, dataFim: form.dataFim,
                    procedimentoIds: selectedProcs,
                }),
            })
            if (!res.ok) { const err = await res.json(); alert(err.error); return }
            resetForm(); load()
        } catch { alert('Erro ao salvar') } finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta promoção?')) return
        await fetch(`/api/profissional/promocoes?id=${id}`, { method: 'DELETE' })
        load()
    }

    const toggleProc = (id: number) => {
        setSelectedProcs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const isActive = (p: Promocao) => {
        const now = new Date()
        return now >= new Date(p.data_inicio) && now <= new Date(p.data_fim)
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#D99773]" size={24} /></div>

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Tag size={28} className="text-[#D99773]" />
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Minhas Promoções</h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{promos.length} promoção(ões)</p>
                    </div>
                </div>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={16} /> Nova Promoção
                    </button>
                )}
            </div>

            {showForm && (
                <div className="glass-card p-5 mb-6">
                    <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{editId ? '✏️ Editar' : '➕ Nova'} Promoção</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome *</label>
                            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Black Friday" className="input-field" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tipo</label>
                                <select value={form.tipoDesconto} onChange={e => setForm({ ...form, tipoDesconto: e.target.value })} className="input-field">
                                    <option value="percentual">Percentual (%)</option>
                                    <option value="fixo">Valor fixo (R$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Desconto</label>
                                <input type="number" value={form.valorDesconto} onChange={e => setForm({ ...form, valorDesconto: e.target.value })} className="input-field" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Início *</label>
                                <input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Fim *</label>
                                <input type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} className="input-field" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Descrição</label>
                            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} className="input-field" />
                        </div>
                        {procs.length > 0 && (
                            <div>
                                <label className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Procedimentos na promoção</label>
                                <div className="grid grid-cols-2 gap-1">
                                    {procs.map(p => (
                                        <button key={p.id} onClick={() => toggleProc(p.id)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
                                            style={selectedProcs.includes(p.id)
                                                ? { backgroundColor: 'rgba(217,151,115,0.12)', color: '#D99773' }
                                                : { color: 'var(--text-muted)' }
                                            }>
                                            <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                                                style={selectedProcs.includes(p.id)
                                                    ? { borderColor: '#D99773', backgroundColor: '#D99773' }
                                                    : { borderColor: 'var(--border-default)' }
                                                }>
                                                {selectedProcs.includes(p.id) && <Check size={10} className="text-white" />}
                                            </div>
                                            {p.nome}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {editId ? 'Salvar' : 'Criar'}
                        </button>
                        <button onClick={resetForm} className="btn-secondary flex items-center gap-2 text-sm">
                            <X size={16} /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {promos.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <Tag size={48} className="mx-auto mb-3" />
                    <p>Nenhuma promoção cadastrada</p>
                    <p className="text-sm mt-1">Crie promoções para atrair novos clientes</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {promos.map(p => (
                        <div key={p.id} className="glass-card overflow-hidden">
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isActive(p) ? 'rgba(74,222,128,0.1)' : 'rgba(156,163,175,0.1)' }}>
                                        <Tag size={18} className={isActive(p) ? 'text-green-500' : 'text-gray-400'} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.nome}</h3>
                                            {isActive(p) ? (
                                                <span className="bg-green-500/20 text-green-500 text-[10px] px-2 py-0.5 rounded-full font-bold">ATIVA</span>
                                            ) : (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>INATIVA</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            <span className="flex items-center gap-1">
                                                {p.tipo_desconto === 'percentual' ? <Percent size={12} /> : <DollarSign size={12} />}
                                                {p.valor_desconto}{p.tipo_desconto === 'percentual' ? '%' : ' reais'} off
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CalendarDays size={12} /> {formatDate(p.data_inicio)} → {formatDate(p.data_fim)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} className="p-2 rounded-lg transition-colors text-red-400 hover:text-red-500">
                                        <Trash2 size={15} />
                                    </button>
                                    {expandedId === p.id ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                                </div>
                            </div>
                            {expandedId === p.id && (
                                <div className="px-4 pb-4 text-sm space-y-2" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                                    {p.descricao && <p className="pt-3">{p.descricao}</p>}
                                    {p.procedimentos.length > 0 && (
                                        <div className="pt-2">
                                            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Procedimentos:</span>
                                            <ul className="mt-1 space-y-1">{p.procedimentos.map((pr, i) => <li key={i} className="text-xs flex items-center gap-1"><Check size={10} className="text-[#D99773]" /> {pr}</li>)}</ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
