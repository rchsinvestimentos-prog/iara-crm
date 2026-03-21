'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Trash2, Edit3, Save, X, Loader2,
    Package, DollarSign, ChevronDown, ChevronUp, Check
} from 'lucide-react'

interface Procedimento { id: number; nome: string }
interface Combo {
    id: string; nome: string; descricao: string | null
    valor_original: number; valor_combo: number; procedimentos: string[]
}

export default function MeusCombosPage() {
    const [combos, setCombos] = useState<Combo[]>([])
    const [procs, setProcs] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [selectedProcs, setSelectedProcs] = useState<number[]>([])

    const [form, setForm] = useState({ nome: '', descricao: '', valorOriginal: '', valorCombo: '' })

    const resetForm = () => {
        setForm({ nome: '', descricao: '', valorOriginal: '', valorCombo: '' })
        setSelectedProcs([])
        setEditId(null)
        setShowForm(false)
    }

    const load = () => {
        Promise.all([
            fetch('/api/profissional/combos').then(r => r.json()),
            fetch('/api/profissional/procedimentos').then(r => r.json()),
        ]).then(([c, p]) => {
            if (Array.isArray(c)) setCombos(c)
            if (Array.isArray(p)) setProcs(p)
        }).catch(console.error).finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleSubmit = async () => {
        if (!form.nome.trim()) return alert('Nome é obrigatório')
        setSaving(true)
        try {
            const res = await fetch('/api/profissional/combos', {
                method: editId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId, nome: form.nome.trim(), descricao: form.descricao || null,
                    valorOriginal: Number(form.valorOriginal) || 0,
                    valorCombo: Number(form.valorCombo) || 0,
                    procedimentoIds: selectedProcs,
                }),
            })
            if (!res.ok) { const err = await res.json(); alert(err.error); return }
            resetForm(); load()
        } catch { alert('Erro ao salvar') } finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este combo?')) return
        await fetch(`/api/profissional/combos?id=${id}`, { method: 'DELETE' })
        load()
    }

    const toggleProc = (id: number) => {
        setSelectedProcs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const economia = (c: Combo) => {
        if (c.valor_original <= 0) return 0
        return Math.round(((c.valor_original - c.valor_combo) / c.valor_original) * 100)
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] focus:outline-none transition-colors"

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#D99773]" size={24} /></div>

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Package size={28} className="text-[#D99773]" />
                    <div>
                        <h1 className="text-2xl font-bold">Meus Combos</h1>
                        <p className="text-sm opacity-60">{combos.length} combo{combos.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true) }}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:-translate-y-0.5"
                        style={{ backgroundColor: '#d4a853', color: '#1a1a2e' }}>
                        <Plus size={16} /> Novo Combo
                    </button>
                )}
            </div>

            {showForm && (
                <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="font-semibold mb-4">{editId ? '✏️ Editar' : '➕ Novo'} Combo</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs opacity-60 mb-1 block">Nome *</label>
                            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Combo Harmonização" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs opacity-60 mb-1 block">Valor Original (R$)</label>
                                <input type="number" value={form.valorOriginal} onChange={e => setForm({ ...form, valorOriginal: e.target.value })} className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs opacity-60 mb-1 block">Valor Combo (R$)</label>
                                <input type="number" value={form.valorCombo} onChange={e => setForm({ ...form, valorCombo: e.target.value })} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs opacity-60 mb-1 block">Descrição</label>
                            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} className={inputClass} />
                        </div>
                        {procs.length > 0 && (
                            <div>
                                <label className="text-xs opacity-60 mb-2 block">Procedimentos incluídos</label>
                                <div className="grid grid-cols-2 gap-1">
                                    {procs.map(p => (
                                        <button key={p.id} onClick={() => toggleProc(p.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all ${selectedProcs.includes(p.id) ? 'bg-[rgba(212,168,83,0.15)] text-[#d4a853]' : 'bg-[rgba(255,255,255,0.03)] opacity-60 hover:opacity-80'}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedProcs.includes(p.id) ? 'border-[#d4a853] bg-[#d4a853]' : 'border-[rgba(255,255,255,0.2)]'}`}>
                                                {selectedProcs.includes(p.id) && <Check size={10} className="text-[#1a1a2e]" />}
                                            </div>
                                            {p.nome}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: '#d4a853', color: '#1a1a2e' }}>
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {editId ? 'Salvar' : 'Criar'}
                        </button>
                        <button onClick={resetForm} className="px-4 py-2.5 rounded-lg text-sm opacity-60 hover:opacity-100 flex items-center gap-2">
                            <X size={16} /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {combos.length === 0 ? (
                <div className="text-center py-16 opacity-40">
                    <Package size={48} className="mx-auto mb-3" />
                    <p>Nenhum combo cadastrado</p>
                    <p className="text-sm mt-1">Monte pacotes de procedimentos com desconto</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {combos.map(c => (
                        <div key={c.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212,168,83,0.1)' }}>
                                        <Package size={18} className="text-[#d4a853]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-sm truncate">{c.nome}</h3>
                                        <div className="flex items-center gap-2 text-xs mt-0.5">
                                            <span className="line-through opacity-30">R$ {c.valor_original.toFixed(2)}</span>
                                            <span className="text-green-400 font-semibold">R$ {c.valor_combo.toFixed(2)}</span>
                                            {economia(c) > 0 && (
                                                <span className="bg-green-500/20 text-green-400 rounded-full px-2 py-0.5 text-[10px] font-bold">-{economia(c)}%</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={e => { e.stopPropagation(); handleDelete(c.id) }} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                                        <Trash2 size={15} className="text-red-400 opacity-40" />
                                    </button>
                                    {expandedId === c.id ? <ChevronUp size={16} className="opacity-30" /> : <ChevronDown size={16} className="opacity-30" />}
                                </div>
                            </div>
                            {expandedId === c.id && (
                                <div className="px-4 pb-4 text-sm opacity-70 space-y-2 border-t border-[rgba(255,255,255,0.05)]">
                                    {c.descricao && <p className="pt-3">{c.descricao}</p>}
                                    {c.procedimentos.length > 0 && (
                                        <div className="pt-2">
                                            <span className="text-xs font-semibold opacity-50 uppercase">Inclui:</span>
                                            <ul className="mt-1 space-y-1">{c.procedimentos.map((p, i) => <li key={i} className="text-xs flex items-center gap-1"><Check size={10} className="text-[#d4a853]" /> {p}</li>)}</ul>
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
