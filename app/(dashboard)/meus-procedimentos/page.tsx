'use client'

import { useState, useEffect } from 'react'
import {
    Plus, Trash2, Edit3, Save, X, Loader2,
    Stethoscope, DollarSign, Clock, ChevronDown, ChevronUp, Users, UserPlus
} from 'lucide-react'

interface ProfissionalInfo {
    id: string; nome: string; tratamento: string | null
}

interface Procedimento {
    id: number
    nome: string
    valor: number
    desconto: number
    parcelas: number | null
    duracao: number | null
    descricao: string | null
    posProcedimento: string | null
    profissionalIds: string[]
    profissionalId: string | null
    profissionaisInfo: ProfissionalInfo[]
}

interface ProfissionalSimples {
    id: string; nome: string; tratamento: string | null
    bio: string | null; especialidade: string | null; fotoUrl: string | null
}

export default function MeusProcedimentosPage() {
    const [procs, setProcs] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState<number | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<number | null>(null)

    // Equipe
    const [comEquipe, setComEquipe] = useState(false)
    const [profissionais, setProfissionais] = useState<ProfissionalSimples[]>([])
    const [loadingProfs, setLoadingProfs] = useState(false)
    const [showProfForm, setShowProfForm] = useState(false)
    const [savingProf, setSavingProf] = useState(false)
    const [profForm, setProfForm] = useState({ nome: '', tratamento: '', bio: '', especialidade: '' })
    const [editProfId, setEditProfId] = useState<string | null>(null)

    // Form state
    const [form, setForm] = useState({
        nome: '', valor: '', desconto: '', parcelas: '',
        duracao: '', descricao: '', posProcedimento: '',
        profissionalIds: [] as string[],
    })

    const resetForm = () => {
        setForm({ nome: '', valor: '', desconto: '', parcelas: '', duracao: '', descricao: '', posProcedimento: '', profissionalIds: [] })
        setEditId(null)
        setShowForm(false)
    }

    const loadProcs = () => {
        fetch('/api/procedimentos')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setProcs(data) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    const loadProfissionais = () => {
        setLoadingProfs(true)
        fetch('/api/clinica/profissionais')
            .then(r => r.json())
            .then(data => {
                const list = data.profissionais || []
                setProfissionais(list)
                if (list.length > 0) setComEquipe(true)
            })
            .catch(console.error)
            .finally(() => setLoadingProfs(false))
    }

    useEffect(() => { loadProcs(); loadProfissionais() }, [])

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
            profissionalIds: comEquipe ? form.profissionalIds : [],
        }

        try {
            const res = await fetch('/api/procedimentos', {
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
            profissionalIds: p.profissionalIds || [],
        })
        setEditId(p.id)
        setShowForm(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Deseja excluir este procedimento?')) return
        try {
            await fetch(`/api/procedimentos?id=${id}`, { method: 'DELETE' })
            loadProcs()
        } catch (err) {
            console.error(err)
        }
    }

    // ===== Profissional CRUD =====
    const handleSaveProf = async () => {
        if (!profForm.nome.trim()) return alert('Nome é obrigatório')
        setSavingProf(true)
        try {
            const method = editProfId ? 'PUT' : 'POST'
            const body = {
                ...(editProfId ? { id: editProfId } : {}),
                nome: profForm.nome.trim(),
                tratamento: profForm.tratamento || null,
                bio: profForm.bio || null,
                especialidade: profForm.especialidade || null,
            }
            const res = await fetch('/api/clinica/profissionais', {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            })
            if (res.ok) {
                setShowProfForm(false); setEditProfId(null)
                setProfForm({ nome: '', tratamento: '', bio: '', especialidade: '' })
                loadProfissionais()
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao salvar')
            }
        } catch { alert('Erro de conexão') }
        setSavingProf(false)
    }

    const handleDeleteProf = async (id: string) => {
        if (!confirm('Deseja remover este profissional?')) return
        try {
            await fetch(`/api/clinica/profissionais?id=${id}`, { method: 'DELETE' })
            loadProfissionais()
            // Remover das seleções de procedimentos
            setForm(prev => ({ ...prev, profissionalIds: prev.profissionalIds.filter(pid => pid !== id) }))
        } catch { alert('Erro ao remover') }
    }

    const toggleProfInForm = (id: string) => {
        setForm(prev => ({
            ...prev,
            profissionalIds: prev.profissionalIds.includes(id)
                ? prev.profissionalIds.filter(pid => pid !== id)
                : [...prev.profissionalIds, id]
        }))
    }

    const TRATAMENTOS = [
        { value: '', label: 'Selecione...' },
        { value: 'Dra.', label: 'Dra.' },
        { value: 'Dr.', label: 'Dr.' },
        { value: 'Nutri', label: 'Nutri' },
        { value: 'nome', label: 'Pelo nome' },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#D99773]" size={24} />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            {/* Header */}
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

            {/* ========== TOGGLE EQUIPE ========== */}
            <div className="glass-card p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: comEquipe ? 'rgba(217,151,115,0.15)' : 'rgba(100,116,139,0.1)' }}>
                            <Users size={20} className={comEquipe ? 'text-[#D99773]' : 'text-gray-400'} />
                        </div>
                        <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Trabalho com equipe</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {comEquipe ? 'Cadastre sua equipe e vincule aos procedimentos' : 'Ative para cadastrar profissionais da sua clínica'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setComEquipe(!comEquipe)}
                        style={{
                            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative',
                            transition: 'background 0.2s',
                            background: comEquipe ? 'linear-gradient(135deg, #D99773, #C07A55)' : '#d1d5db',
                        }}
                    >
                        <div style={{
                            width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                            left: comEquipe ? 25 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                    </button>
                </div>

                {/* Mini cadastro de profissionais */}
                {comEquipe && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-default, #e2e8f0)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                                👩‍⚕️ Profissionais ({profissionais.length})
                            </p>
                            <button
                                onClick={() => { setShowProfForm(true); setEditProfId(null); setProfForm({ nome: '', tratamento: '', bio: '', especialidade: '' }) }}
                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg"
                                style={{ background: 'rgba(15,76,97,0.08)', color: '#0F4C61', border: 'none', cursor: 'pointer' }}
                            >
                                <UserPlus size={14} /> Adicionar
                            </button>
                        </div>

                        {/* Form de profissional */}
                        {showProfForm && (
                            <div className="glass-card p-4 mb-3" style={{ border: '1px solid rgba(217,151,115,0.2)' }}>
                                <div className="grid gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome *</label>
                                            <input value={profForm.nome} onChange={e => setProfForm({ ...profForm, nome: e.target.value })} placeholder="Ex: Maria Silva" className="input-field" />
                                        </div>
                                        <div>
                                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Tratamento</label>
                                            <select value={profForm.tratamento} onChange={e => setProfForm({ ...profForm, tratamento: e.target.value })} className="input-field">
                                                {TRATAMENTOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Especialidade</label>
                                        <input value={profForm.especialidade} onChange={e => setProfForm({ ...profForm, especialidade: e.target.value })} placeholder="Ex: Harmonização Facial" className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Bio</label>
                                        <textarea value={profForm.bio} onChange={e => setProfForm({ ...profForm, bio: e.target.value })} rows={2} placeholder="Breve descrição sobre o profissional..." className="input-field" />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={handleSaveProf} disabled={savingProf} className="btn-primary flex items-center gap-1 text-xs">
                                        {savingProf ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                        {editProfId ? 'Salvar' : 'Adicionar'}
                                    </button>
                                    <button onClick={() => { setShowProfForm(false); setEditProfId(null) }} className="btn-secondary text-xs">Cancelar</button>
                                </div>
                            </div>
                        )}

                        {/* Lista de profissionais */}
                        {loadingProfs ? (
                            <div className="text-center py-4"><Loader2 className="animate-spin text-[#D99773] mx-auto" size={18} /></div>
                        ) : profissionais.length === 0 ? (
                            <p className="text-center py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                                Nenhum profissional cadastrado. Adicione sua equipe acima.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {profissionais.map(prof => (
                                    <div key={prof.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-default, #e2e8f0)' }}>
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                            style={{
                                                background: prof.fotoUrl ? `url(${prof.fotoUrl}) center/cover` : 'linear-gradient(135deg, #0F4C61, #1a6b84)',
                                            }}>
                                            {!prof.fotoUrl && prof.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                                {prof.tratamento && prof.tratamento !== 'nome' ? `${prof.tratamento} ` : ''}{prof.nome}
                                            </p>
                                            {prof.especialidade && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{prof.especialidade}</p>}
                                        </div>
                                        <div className="flex gap-1 flex-shrink-0">
                                            <button onClick={() => {
                                                setEditProfId(prof.id)
                                                setProfForm({ nome: prof.nome, tratamento: prof.tratamento || '', bio: prof.bio || '', especialidade: prof.especialidade || '' })
                                                setShowProfForm(true)
                                            }} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteProf(prof.id)} className="p-1.5 rounded-lg text-red-400 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========== FORM DE PROCEDIMENTO ========== */}
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

                        {/* ===== MULTI-SELECT DE PROFISSIONAIS ===== */}
                        {comEquipe && profissionais.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--border-default, #e2e8f0)', paddingTop: 12 }}>
                                <label className="text-xs font-semibold mb-2 block" style={{ color: '#0F4C61' }}>
                                    👩‍⚕️ Quem realiza este procedimento?
                                </label>
                                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                    Selecione os profissionais que realizam este procedimento
                                </p>
                                <div className="space-y-2">
                                    {profissionais.map(prof => {
                                        const selected = form.profissionalIds.includes(prof.id)
                                        return (
                                            <button
                                                key={prof.id}
                                                type="button"
                                                onClick={() => toggleProfInForm(prof.id)}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                                                style={{
                                                    background: selected ? 'rgba(217,151,115,0.1)' : 'var(--bg-secondary, #f8fafc)',
                                                    border: `2px solid ${selected ? '#D99773' : 'var(--border-default, #e2e8f0)'}`,
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {/* Checkbox visual */}
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: 6,
                                                    border: `2px solid ${selected ? '#D99773' : '#cbd5e1'}`,
                                                    background: selected ? 'linear-gradient(135deg, #D99773, #C07A55)' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0, transition: 'all 0.2s',
                                                }}>
                                                    {selected && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                                                </div>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                                    style={{ background: 'linear-gradient(135deg, #0F4C61, #1a6b84)' }}>
                                                    {prof.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {prof.tratamento && prof.tratamento !== 'nome' ? `${prof.tratamento} ` : ''}{prof.nome}
                                                    </p>
                                                    {prof.especialidade && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{prof.especialidade}</p>}
                                                </div>
                                            </button>
                                        )
                                    })}
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

            {/* ========== LISTA DE PROCEDIMENTOS ========== */}
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
                                        {/* Badges de profissionais */}
                                        {p.profissionaisInfo && p.profissionaisInfo.length > 0 && (
                                            <div className="flex gap-1 mt-1.5 flex-wrap">
                                                {p.profissionaisInfo.map(prof => (
                                                    <span key={prof.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{ background: 'rgba(15,76,97,0.08)', color: '#0F4C61' }}>
                                                        {prof.tratamento && prof.tratamento !== 'nome' ? `${prof.tratamento} ` : ''}{prof.nome}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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
                                    {p.profissionaisInfo && p.profissionaisInfo.length > 0 && (
                                        <div>
                                            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Profissionais</span>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {p.profissionaisInfo.map(prof => (
                                                    <span key={prof.id} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                                                        style={{ background: 'rgba(217,151,115,0.1)', color: '#C07A55', border: '1px solid rgba(217,151,115,0.2)' }}>
                                                        👩‍⚕️ {prof.tratamento && prof.tratamento !== 'nome' ? `${prof.tratamento} ` : ''}{prof.nome}
                                                    </span>
                                                ))}
                                            </div>
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
