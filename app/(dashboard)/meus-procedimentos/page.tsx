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
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meus Procedimentos</h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{procs.length} procedimento{procs.length !== 1 ? 's' : ''} cadastrado{procs.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { resetForm(); setShowForm(true) }}
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        <Plus size={16} /> Novo
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-card p-5 mb-6">
                    <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{editId ? '✏️ Editar' : '➕ Novo'} Procedimento</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome *</label>
                            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Toxina Botulínica" className="input-field" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
                                <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0" className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Desconto (R$)</label>
                                <input type="number" value={form.desconto} onChange={e => setForm({ ...form, desconto: e.target.value })} placeholder="0" className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Parcelas</label>
                                <input type="number" value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} placeholder="1" className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Duração (min)</label>
                                <input type="number" value={form.duracao} onChange={e => setForm({ ...form, duracao: e.target.value })} placeholder="30" className="input-field" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Descrição</label>
                            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} placeholder="Descreva o procedimento..." className="input-field" />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Cuidados Pós-Procedimento</label>
                            <textarea value={form.posProcedimento} onChange={e => setForm({ ...form, posProcedimento: e.target.value })} rows={2} placeholder="Orientações pós-procedimento..." className="input-field" />
                        </div>
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

            {/* Lista de procedimentos */}
            {procs.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <Stethoscope size={48} className="mx-auto mb-3" />
                    <p>Nenhum procedimento cadastrado</p>
                    <p className="text-sm mt-1">Adicione seus procedimentos para montar seu catálogo</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {procs.map(p => (
                        <div
                            key={p.id}
                            className="glass-card overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(217,151,115,0.1)' }}>
                                        <Stethoscope size={18} className="text-[#D99773]" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.nome}</h3>
                                        <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {p.valor > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <DollarSign size={12} />
                                                    R$ {p.valor.toFixed(2)}
                                                    {p.desconto > 0 && <span className="text-green-500 ml-1">(-R$ {p.desconto.toFixed(2)})</span>}
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
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(p) }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        <Edit3 size={15} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} className="p-2 rounded-lg transition-colors text-red-400 hover:text-red-500">
                                        <Trash2 size={15} />
                                    </button>
                                    {expandedId === p.id ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                                </div>
                            </div>

                            {expandedId === p.id && (
                                <div className="px-4 pb-4 pt-0 text-sm space-y-2" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                                    {p.descricao && (
                                        <div className="pt-3">
                                            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Descrição</span>
                                            <p className="mt-1">{p.descricao}</p>
                                        </div>
                                    )}
                                    {p.posProcedimento && (
                                        <div>
                                            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Pós-Procedimento</span>
                                            <p className="mt-1">{p.posProcedimento}</p>
                                        </div>
                                    )}
                                    {p.parcelas && (
                                        <div>
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Até {p.parcelas}x no cartão</span>
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
