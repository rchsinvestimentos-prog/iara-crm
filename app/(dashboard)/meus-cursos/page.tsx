'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Trash2, Edit3, Save, X, Loader2,
    BookOpen, DollarSign, Users as UsersIcon, ExternalLink,
    ChevronDown, ChevronUp, Monitor, MapPin
} from 'lucide-react'

interface Curso {
    id: string
    nome: string
    modalidade: string
    valor: number
    duracao: string | null
    vagas: number | null
    desconto: number
    parcelas: string | null
    descricao: string | null
    link: string | null
}

export default function MeusCursosPage() {
    const [cursos, setCursos] = useState<Curso[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [tab, setTab] = useState<'presencial' | 'online'>('presencial')

    const [form, setForm] = useState({
        nome: '', modalidade: 'presencial', valor: '', duracao: '',
        vagas: '', desconto: '', parcelas: '', descricao: '', link: ''
    })

    const resetForm = () => {
        setForm({ nome: '', modalidade: 'presencial', valor: '', duracao: '', vagas: '', desconto: '', parcelas: '', descricao: '', link: '' })
        setEditId(null)
        setShowForm(false)
    }

    const load = () => {
        fetch('/api/profissional/cursos')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCursos(data) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const handleSubmit = async () => {
        if (!form.nome.trim()) return alert('Nome é obrigatório')
        setSaving(true)

        try {
            const res = await fetch('/api/profissional/cursos', {
                method: editId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId,
                    nome: form.nome.trim(),
                    modalidade: form.modalidade,
                    valor: Number(form.valor) || 0,
                    duracao: form.duracao || null,
                    vagas: form.vagas ? Number(form.vagas) : null,
                    desconto: Number(form.desconto) || 0,
                    parcelas: form.parcelas || null,
                    descricao: form.descricao || null,
                    link: form.link || null,
                }),
            })
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Erro'); return }
            resetForm()
            load()
        } catch (err) {
            console.error(err); alert('Erro ao salvar')
        } finally { setSaving(false) }
    }

    const handleEdit = (c: Curso) => {
        setForm({
            nome: c.nome, modalidade: c.modalidade, valor: String(c.valor),
            duracao: c.duracao || '', vagas: c.vagas ? String(c.vagas) : '',
            desconto: String(c.desconto), parcelas: c.parcelas || '',
            descricao: c.descricao || '', link: c.link || '',
        })
        setEditId(c.id)
        setShowForm(true)
        setTab(c.modalidade as any)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este curso?')) return
        await fetch(`/api/profissional/cursos?id=${id}`, { method: 'DELETE' })
        load()
    }

    const filtered = cursos.filter(c => c.modalidade === tab)

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#D99773]" size={24} /></div>

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <BookOpen size={28} className="text-[#D99773]" />
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meus Cursos</h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{cursos.length} curso{cursos.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                {!showForm && (
                    <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus size={16} /> Novo Curso
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button onClick={() => setTab('presencial')}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={tab === 'presencial'
                        ? { backgroundColor: 'rgba(217,151,115,0.15)', color: '#D99773' }
                        : { color: 'var(--text-muted)' }
                    }>
                    <MapPin size={14} className="inline mr-1" /> Presenciais ({cursos.filter(c => c.modalidade === 'presencial').length})
                </button>
                <button onClick={() => setTab('online')}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={tab === 'online'
                        ? { backgroundColor: 'rgba(217,151,115,0.15)', color: '#D99773' }
                        : { color: 'var(--text-muted)' }
                    }>
                    <Monitor size={14} className="inline mr-1" /> Online ({cursos.filter(c => c.modalidade === 'online').length})
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="glass-card p-5 mb-6">
                    <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{editId ? '✏️ Editar' : '➕ Novo'} Curso</h2>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome *</label>
                                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Toxina Avançada" className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Modalidade</label>
                                <select value={form.modalidade} onChange={e => setForm({ ...form, modalidade: e.target.value })} className="input-field">
                                    <option value="presencial">Presencial</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
                                <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Desconto (%)</label>
                                <input type="number" value={form.desconto} onChange={e => setForm({ ...form, desconto: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Vagas</label>
                                <input type="number" value={form.vagas} onChange={e => setForm({ ...form, vagas: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Duração</label>
                                <input value={form.duracao} onChange={e => setForm({ ...form, duracao: e.target.value })} placeholder="Ex: 8h" className="input-field" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Parcelas</label>
                            <input value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} placeholder="Ex: até 12x" className="input-field" />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Descrição</label>
                            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} className="input-field" />
                        </div>
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Link externo (inscrição)</label>
                            <input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="https://..." className="input-field" />
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

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                    <BookOpen size={48} className="mx-auto mb-3" />
                    <p>Nenhum curso {tab} cadastrado</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(c => (
                        <div key={c.id} className="glass-card overflow-hidden">
                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.modalidade === 'online' ? 'rgba(96,165,250,0.1)' : 'rgba(217,151,115,0.1)' }}>
                                        {c.modalidade === 'online' ? <Monitor size={18} className="text-blue-400" /> : <MapPin size={18} className="text-[#D99773]" />}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.nome}</h3>
                                        <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {c.valor > 0 && <span className="flex items-center gap-1"><DollarSign size={12} /> R$ {c.valor.toFixed(2)}</span>}
                                            {c.vagas && <span className="flex items-center gap-1"><UsersIcon size={12} /> {c.vagas} vagas</span>}
                                            {c.duracao && <span>{c.duracao}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={e => { e.stopPropagation(); handleEdit(c) }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                                        <Edit3 size={15} />
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(c.id) }} className="p-2 rounded-lg transition-colors text-red-400 hover:text-red-500">
                                        <Trash2 size={15} />
                                    </button>
                                    {expandedId === c.id ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                                </div>
                            </div>
                            {expandedId === c.id && (
                                <div className="px-4 pb-4 pt-0 text-sm space-y-2" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                                    {c.descricao && <div className="pt-3"><span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Descrição</span><p className="mt-1">{c.descricao}</p></div>}
                                    {c.link && (
                                        <a href={c.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#D99773] text-xs hover:underline">
                                            <ExternalLink size={12} /> Acessar link
                                        </a>
                                    )}
                                    {c.desconto > 0 && <p className="text-green-500 text-xs">{c.desconto}% de desconto</p>}
                                    {c.parcelas && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.parcelas}</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
