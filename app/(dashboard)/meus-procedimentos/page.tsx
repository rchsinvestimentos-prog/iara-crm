'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Trash2, Edit3, Save, X, Loader2,
    Stethoscope, DollarSign, Clock, FileText, ChevronDown, ChevronUp
} from 'lucide-react'

interface Procedimento {
    id: number
    nome: string
    valor: number
    desconto: number
    parcelas: number | null
    duracao: number | null
    descricao: string | null
    posProcedimento: string | null
}

export default function MeusProcedimentosPage() {
    const [procs, setProcs] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    // Form state
    const [form, setForm] = useState({
        nome: '', valor: '', desconto: '', parcelas: '',
        duracao: '', descricao: '', posProcedimento: ''
    })

    const resetForm = () => {
        setForm({ nome: '', valor: '', desconto: '', parcelas: '', duracao: '', descricao: '', posProcedimento: '' })
        setEditId(null)
        setShowForm(false)
    }

    const loadProcs = () => {
        fetch('/api/profissional/procedimentos')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setProcs(data) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadProcs() }, [])

    const handleSubmit = async () => {
        if (!form.nome.trim()) return alert('Nome é obrigatório')
        setSaving(true)

        const payload = {
            id: editId,
            nome: form.nome.trim(),
            valor: Number(form.valor) || 0,
            desconto: Number(form.desconto) || 0,
            parcelas: form.parcelas ? Number(form.parcelas) : null,
            duracao: form.duracao ? Number(form.duracao) : null,
            descricao: form.descricao || null,
            posProcedimento: form.posProcedimento || null,
        }

        try {
            const res = await fetch('/api/profissional/procedimentos', {
                method: editId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                alert(err.error || 'Erro ao salvar')
                return
            }

            resetForm()
            loadProcs()
        } catch (err) {
            console.error(err)
            alert('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (p: Procedimento) => {
        setForm({
            nome: p.nome,
            valor: String(p.valor),
            desconto: String(p.desconto),
            parcelas: p.parcelas ? String(p.parcelas) : '',
            duracao: p.duracao ? String(p.duracao) : '',
            descricao: p.descricao || '',
            posProcedimento: p.posProcedimento || '',
        })
        setEditId(p.id)
        setShowForm(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Deseja excluir este procedimento?')) return
        try {
            await fetch(`/api/profissional/procedimentos?id=${id}`, { method: 'DELETE' })
            loadProcs()
        } catch (err) {
            console.error(err)
        }
    }

    const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] focus:border-[#d4a853] focus:outline-none transition-colors"

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#D99773]" size={24} />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Stethoscope size={28} className="text-[#D99773]" />
                    <div>
                        <h1 className="text-2xl font-bold">Meus Procedimentos</h1>
                        <p className="text-sm opacity-60">{procs.length} procedimento{procs.length !== 1 ? 's' : ''} cadastrado{procs.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true) }}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all hover:-translate-y-0.5"
                        style={{ backgroundColor: '#d4a853', color: '#1a1a2e' }}
                    >
                        <Plus size={16} /> Novo
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h2 className="font-semibold mb-4">{editId ? '✏️ Editar' : '➕ Novo'} Procedimento</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs opacity-60 mb-1 block">Nome *</label>
                            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Toxina Botulínica" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs opacity-60 mb-1 block">Valor (R$)</label>
                                <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0" className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs opacity-60 mb-1 block">Desconto (R$)</label>
                                <input type="number" value={form.desconto} onChange={e => setForm({ ...form, desconto: e.target.value })} placeholder="0" className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs opacity-60 mb-1 block">Parcelas</label>
                                <input type="number" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} placeholder="1" className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs opacity-60 mb-1 block">Duração (min)</label>
                                <input type="number" value={form.duracao} onChange={e => setForm({ ...form, duracao: e.target.value })} placeholder="30" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs opacity-60 mb-1 block">Descrição</label>
                            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} placeholder="Descreva o procedimento..." className={inputClass} />
                        </div>
                        <div>
                            <label className="text-xs opacity-60 mb-1 block">Cuidados Pós-Procedimento</label>
                            <textarea value={form.posProcedimento} onChange={e => setForm({ ...form, posProcedimento: e.target.value })} rows={2} placeholder="Orientações pós-procedimento..." className={inputClass} />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2" style={{ backgroundColor: '#d4a853', color: '#1a1a2e' }}>
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {editId ? 'Salvar' : 'Criar'}
                        </button>
                        <button onClick={resetForm} className="px-4 py-2.5 rounded-lg text-sm opacity-60 hover:opacity-100 transition-opacity flex items-center gap-2">
                            <X size={16} /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de procedimentos */}
            {procs.length === 0 ? (
                <div className="text-center py-16 opacity-40">
                    <Stethoscope size={48} className="mx-auto mb-3" />
                    <p>Nenhum procedimento cadastrado</p>
                    <p className="text-sm mt-1">Adicione seus procedimentos para montar seu catálogo</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {procs.map(p => (
                        <div
                            key={p.id}
                            className="rounded-xl overflow-hidden transition-all"
                            style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212,168,83,0.1)' }}>
                                        <Stethoscope size={18} className="text-[#d4a853]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-sm truncate">{p.nome}</h3>
                                        <div className="flex items-center gap-3 text-xs opacity-50 mt-0.5">
                                            {p.valor > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign size={12} />
                                                    R$ {p.valor.toFixed(2)}
                                                    {p.desconto > 0 && <span className="text-green-400 ml-1">(-R$ {p.desconto.toFixed(2)})</span>}
                                                </span>
                                            )}
                                            {p.duracao && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {p.duracao}min
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(p) }} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                                        <Edit3 size={15} className="opacity-40 hover:opacity-100" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className="p-2 rounded-lg hover:bg-red-500/20 transition-colors">
                                        <Trash2 size={15} className="text-red-400 opacity-40 hover:opacity-100" />
                                    </button>
                                    {expandedId === p.id ? <ChevronUp size={16} className="opacity-30" /> : <ChevronDown size={16} className="opacity-30" />}
                                </div>
                            </div>

                            {expandedId === p.id && (
                                <div className="px-4 pb-4 pt-0 text-sm opacity-70 space-y-2 border-t border-[rgba(255,255,255,0.05)]">
                                    {p.descricao && (
                                        <div className="pt-3">
                                            <span className="text-xs font-semibold opacity-50 uppercase">Descrição</span>
                                            <p className="mt-1">{p.descricao}</p>
                                        </div>
                                    )}
                                    {p.posProcedimento && (
                                        <div>
                                            <span className="text-xs font-semibold opacity-50 uppercase">Pós-Procedimento</span>
                                            <p className="mt-1">{p.posProcedimento}</p>
                                        </div>
                                    )}
                                    {p.parcelas && (
                                        <div>
                                            <span className="text-xs opacity-50">Até {p.parcelas}x no cartão</span>
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
