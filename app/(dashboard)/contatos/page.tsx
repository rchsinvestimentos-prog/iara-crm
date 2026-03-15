'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Search, Pencil, Trash2, X, Cake, Brain, Phone, Mail, FileText, Save, Loader2 } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

interface Contato {
    id: number
    nome: string | null
    telefone: string
    cpf: string | null
    email: string | null
    dataNascimento: string | null
    memoriaIA: string | null
    origem: string | null
    etapa: string | null
    tags: string[]
    notas: string | null
    createdAt: string | null
}

const ETAPAS = [
    { value: 'novo', label: 'Novo', cor: '#6366f1' },
    { value: 'agendado', label: 'Agendado', cor: '#f59e0b' },
    { value: 'atendido', label: 'Atendido', cor: '#10b981' },
    { value: 'inativo', label: 'Inativo', cor: '#6b7280' },
    { value: 'vip', label: 'VIP', cor: '#D99773' },
]

function formatPhone(phone: string) {
    if (phone.length >= 12) {
        return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`
    }
    return phone
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR')
}

function isAniversarioMes(dateStr: string | null) {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const now = new Date()
    return d.getMonth() === now.getMonth()
}

export default function ContatosPage() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const [contatos, setContatos] = useState<Contato[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtroEtapa, setFiltroEtapa] = useState('')

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState({
        nome: '', telefone: '', cpf: '', email: '',
        dataNascimento: '', memoriaIA: '', notas: '', etapa: 'novo',
    })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

    const cardBg = isDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.7)'
    const cardBorder = isDark
        ? '1px solid rgba(255,255,255,0.06)'
        : '1px solid rgba(15,76,97,0.08)'
    const inputStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,76,97,0.1)',
        color: isDark ? '#F3F4F6' : '#1F2937',
    }

    const fetchContatos = useCallback(async () => {
        try {
            const params = new URLSearchParams()
            if (busca) params.set('busca', busca)
            if (filtroEtapa) params.set('etapa', filtroEtapa)
            const res = await fetch(`/api/contatos?${params}`)
            if (res.ok) {
                const data = await res.json()
                setContatos(data.contatos || [])
            }
        } catch (err) {
            console.error('Erro ao buscar contatos:', err)
        } finally {
            setLoading(false)
        }
    }, [busca, filtroEtapa])

    useEffect(() => { fetchContatos() }, [fetchContatos])

    const openNew = () => {
        setEditingId(null)
        setForm({ nome: '', telefone: '', cpf: '', email: '', dataNascimento: '', memoriaIA: '', notas: '', etapa: 'novo' })
        setModalOpen(true)
    }

    const openEdit = (c: Contato) => {
        setEditingId(c.id)
        setForm({
            nome: c.nome || '',
            telefone: c.telefone.startsWith('55') ? c.telefone.slice(2) : c.telefone,
            cpf: c.cpf || '',
            email: c.email || '',
            dataNascimento: c.dataNascimento ? c.dataNascimento.split('T')[0] : '',
            memoriaIA: c.memoriaIA || '',
            notas: c.notas || '',
            etapa: c.etapa || 'novo',
        })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!form.nome.trim() || !form.telefone.trim()) return
        setSaving(true)
        try {
            const payload = {
                nome: form.nome.trim(),
                telefone: '55' + form.telefone.replace(/\D/g, ''),
                cpf: form.cpf.trim() || null,
                email: form.email.trim() || null,
                dataNascimento: form.dataNascimento || null,
                memoriaIA: form.memoriaIA.trim() || null,
                notas: form.notas.trim() || null,
                etapa: form.etapa,
            }

            if (editingId) {
                await fetch(`/api/contatos/${editingId}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            } else {
                await fetch('/api/contatos', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            }

            setModalOpen(false)
            setLoading(true)
            fetchContatos()
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        await fetch(`/api/contatos/${id}`, { method: 'DELETE' })
        setDeleteConfirm(null)
        setLoading(true)
        fetchContatos()
    }

    const aniversariantes = contatos.filter(c => isAniversarioMes(c.dataNascimento))

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Users size={24} /> Contatos
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {contatos.length} contato(s) cadastrado(s)
                    </p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #D99773, #c17f5f)', color: '#fff' }}>
                    <Plus size={16} /> Novo contato
                </button>
            </div>

            {/* Aniversariantes do mês */}
            {aniversariantes.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(217,151,115,0.08)' : 'rgba(217,151,115,0.06)', border: '1px solid rgba(217,151,115,0.2)' }}>
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: '#D99773' }}>
                        <Cake size={16} /> Aniversariante(s) do mês
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {aniversariantes.map(c => (
                            <span key={c.id} className="text-xs px-3 py-1.5 rounded-full font-medium"
                                style={{ background: 'rgba(217,151,115,0.15)', color: '#D99773' }}>
                                🎂 {c.nome} — {formatDate(c.dataNascimento)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Busca & Filtro */}
            <div className="flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] flex items-center rounded-xl overflow-hidden" style={{ ...inputStyle, padding: 0 }}>
                    <span className="px-3"><Search size={16} style={{ color: 'var(--text-muted)' }} /></span>
                    <input
                        value={busca} onChange={e => setBusca(e.target.value)}
                        placeholder="Buscar por nome, telefone, CPF ou email..."
                        className="flex-1 bg-transparent border-none outline-none px-2 py-2.5 text-sm"
                        style={{ color: 'var(--text-primary)' }}
                    />
                    {busca && <button onClick={() => setBusca('')} className="px-2"><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
                </div>
                <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}
                    className="rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={inputStyle}>
                    <option value="">Todas etapas</option>
                    {ETAPAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
            </div>

            {/* Tabela */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#D99773' }} />
                </div>
            ) : contatos.length === 0 ? (
                <div className="text-center py-20 rounded-2xl" style={{ background: cardBg, border: cardBorder }}>
                    <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                    <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Nenhum contato encontrado</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {busca ? 'Tente outra busca' : 'Clique em "Novo contato" para começar'}
                    </p>
                </div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: cardBorder }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: cardBorder }}>
                                    {['Nome', 'Telefone', 'CPF', 'Nasc.', 'Etapa', 'Memória IA', 'Ações'].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {contatos.map(c => {
                                    const etapaInfo = ETAPAS.find(e => e.value === c.etapa)
                                    const niver = isAniversarioMes(c.dataNascimento)
                                    return (
                                        <tr key={c.id} className="transition-colors hover:bg-white/5"
                                            style={{ borderBottom: cardBorder }}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {niver && '🎂 '}{c.nome || '—'}
                                                </div>
                                                {c.email && <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.email}</div>}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                                                {formatPhone(c.telefone)}
                                            </td>
                                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {c.cpf || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs" style={{ color: niver ? '#D99773' : 'var(--text-muted)' }}>
                                                {formatDate(c.dataNascimento)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-md"
                                                    style={{ background: `${etapaInfo?.cor || '#6b7280'}20`, color: etapaInfo?.cor || '#6b7280' }}>
                                                    {etapaInfo?.label || c.etapa}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {c.memoriaIA ? (
                                                    <span className="flex items-center gap-1 text-[11px]" style={{ color: '#818cf8' }}>
                                                        <Brain size={12} /> {c.memoriaIA.slice(0, 40)}{c.memoriaIA.length > 40 ? '...' : ''}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" title="Editar">
                                                        <Pencil size={14} className="text-amber-400" />
                                                    </button>
                                                    {deleteConfirm === c.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => handleDelete(c.id)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30">Sim</button>
                                                            <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded-lg text-[10px] bg-white/5 hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Não</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10" title="Excluir">
                                                            <Trash2 size={14} className="text-red-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        style={{ background: isDark ? '#0F1729' : '#FFFFFF', border: cardBorder }}
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                {editingId ? 'Editar Contato' : 'Novo Contato'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                                <X size={18} style={{ color: 'var(--text-muted)' }} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome *</label>
                                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="Maria Silva" />
                            </div>

                            {/* Telefone */}
                            <div>
                                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Telefone *</label>
                                <div className="flex items-center rounded-xl overflow-hidden" style={{ ...inputStyle, padding: 0 }}>
                                    <span className="px-3 py-2.5 text-xs font-semibold shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>+55</span>
                                    <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value.replace(/\D/g, '') }))}
                                        className="flex-1 bg-transparent border-none outline-none px-3 py-2.5 text-sm" style={{ color: 'var(--text-primary)' }}
                                        placeholder="11999998888" maxLength={11} type="tel" />
                                </div>
                            </div>

                            {/* CPF + Email */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>CPF</label>
                                    <input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="000.000.000-00" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>E-mail</label>
                                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} placeholder="maria@email.com" type="email" />
                                </div>
                            </div>

                            {/* Data Nascimento + Etapa */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                        <Cake size={12} /> Data de Nascimento
                                    </label>
                                    <input value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} type="date" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Etapa</label>
                                    <select value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                                        {ETAPAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Memória IA */}
                            <div>
                                <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#818cf8' }}>
                                    <Brain size={12} /> Memória para a IARA
                                </label>
                                <textarea value={form.memoriaIA} onChange={e => setForm(f => ({ ...f, memoriaIA: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} rows={3}
                                    placeholder="Ex: Gestante, prefere horários pela manhã, alérgica a látex, fez botox em jan/26..." />
                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                    A IARA consulta essas informações antes de cada interação com este contato.
                                </p>
                            </div>

                            {/* Notas internas */}
                            <div>
                                <label className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                    <FileText size={12} /> Notas internas
                                </label>
                                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none" style={inputStyle} rows={2}
                                    placeholder="Anotações pessoais (não acessadas pela IARA)" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
                                style={{ color: 'var(--text-muted)', border: cardBorder }}>
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={saving || !form.nome.trim() || !form.telefone.trim()}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #D99773, #c17f5f)', color: '#fff' }}>
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {editingId ? 'Salvar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
