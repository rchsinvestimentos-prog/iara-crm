'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Upload, Search, GripVertical, Phone, MessageSquare, Tag, Clock, X, Edit3, Trash2, Calendar, Send, Loader2, Lock } from 'lucide-react'

interface Coluna { id: string; nome: string; slug: string; cor: string; ordem: number }
interface Contato {
    id: string; nome: string; telefone: string; email?: string
    etapa: string; tags: string[]; notas?: string; origem: string
    ultimoContato?: string; retornoData?: string; retornoMensagem?: string
    createdAt: string
}

export default function CrmPage() {
    const [colunas, setColunas] = useState<Coluna[]>([])
    const [contatos, setContatos] = useState<Contato[]>([])
    const [loading, setLoading] = useState(true)
    const [blocked, setBlocked] = useState(false)
    const [busca, setBusca] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState<Contato | null>(null)
    const [showRetornoModal, setShowRetornoModal] = useState<Contato | null>(null)
    const [showColModal, setShowColModal] = useState(false)
    const [draggedContact, setDraggedContact] = useState<string | null>(null)

    // Form states
    const [formNome, setFormNome] = useState('')
    const [formTel, setFormTel] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formNotas, setFormNotas] = useState('')
    const [formTags, setFormTags] = useState('')
    const [importText, setImportText] = useState('')
    const [retornoData, setRetornoData] = useState('')
    const [retornoMsg, setRetornoMsg] = useState('')
    const [newColNome, setNewColNome] = useState('')
    const [newColCor, setNewColCor] = useState('#D99773')
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const [colRes, conRes] = await Promise.all([
                fetch('/api/crm-colunas'),
                fetch('/api/contatos'),
            ])
            const colData = await colRes.json()
            const conData = await conRes.json()

            if (colRes.status === 403 || conRes.status === 403) {
                setBlocked(true)
                return
            }

            setColunas(colData.colunas || [])
            setContatos(conData.contatos || [])
        } catch { /* */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const addContact = async () => {
        if (!formNome || !formTel) return
        setSaving(true)
        try {
            await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: formNome, telefone: formTel.replace(/\D/g, ''), email: formEmail, notas: formNotas, tags: formTags ? formTags.split(',').map(t => t.trim()) : [] }),
            })
            setShowAddModal(false)
            setFormNome(''); setFormTel(''); setFormEmail(''); setFormNotas(''); setFormTags('')
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const editContact = async () => {
        if (!showEditModal) return
        setSaving(true)
        try {
            await fetch(`/api/contatos/${showEditModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: formNome, telefone: formTel, email: formEmail, notas: formNotas, tags: formTags ? formTags.split(',').map(t => t.trim()) : [] }),
            })
            setShowEditModal(null)
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const deleteContact = async (id: string) => {
        if (!confirm('Excluir este contato?')) return
        await fetch(`/api/contatos/${id}`, { method: 'DELETE' })
        fetchData()
    }

    const importContacts = async () => {
        setSaving(true)
        const lines = importText.split('\n').map(l => l.trim()).filter(Boolean)
        const parsed = lines.map(line => {
            const parts = line.split(/[,;\t]/).map(p => p.trim())
            return { nome: parts[0] || '', telefone: (parts[1] || parts[0] || '').replace(/\D/g, '') }
        })
        try {
            await fetch('/api/contatos/importar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contatos: parsed }),
            })
            setShowImportModal(false); setImportText('')
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const scheduleRetorno = async () => {
        if (!showRetornoModal || !retornoData || !retornoMsg) return
        setSaving(true)
        try {
            await fetch(`/api/contatos/${showRetornoModal.id}/retorno`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: retornoData, mensagem: retornoMsg }),
            })
            setShowRetornoModal(null); setRetornoData(''); setRetornoMsg('')
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const addColumn = async () => {
        if (!newColNome) return
        setSaving(true)
        try {
            await fetch('/api/crm-colunas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: newColNome, cor: newColCor }),
            })
            setShowColModal(false); setNewColNome(''); setNewColCor('#D99773')
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const deleteColumn = async (id: string) => {
        if (!confirm('Excluir esta coluna?')) return
        await fetch('/api/crm-colunas', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        })
        fetchData()
    }

    const handleDrop = async (etapa: string) => {
        if (!draggedContact) return
        try {
            await fetch('/api/contatos/mover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contatoId: draggedContact, etapa }),
            })
            setContatos(prev => prev.map(c => c.id === draggedContact ? { ...c, etapa } : c))
        } catch { /* */ }
        setDraggedContact(null)
    }

    const openEdit = (c: Contato) => {
        setFormNome(c.nome); setFormTel(c.telefone); setFormEmail(c.email || ''); setFormNotas(c.notas || '')
        setFormTags(c.tags.join(', '))
        setShowEditModal(c)
    }

    const filteredContatos = busca
        ? contatos.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca))
        : contatos

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    if (blocked) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <Lock size={48} className="mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>CRM — Plano 4</h2>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>O CRM com Kanban e Disparos em Massa é exclusivo do Plano 4.</p>
                <a href="/plano" className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">
                    Fazer Upgrade
                </a>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>CRM</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {contatos.length} contatos • Arraste entre colunas
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                            className="pl-9 pr-4 py-2 text-[12px] rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                    </div>
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                        <Upload size={14} /> Importar
                    </button>
                    <button onClick={() => { setFormNome(''); setFormTel(''); setFormEmail(''); setFormNotas(''); setFormTags(''); setShowAddModal(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">
                        <Plus size={14} /> Adicionar
                    </button>
                    <button onClick={() => setShowColModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                        <Plus size={14} /> Coluna
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
                {colunas.map(col => {
                    const colContatos = filteredContatos.filter(c => c.etapa === col.slug)
                    return (
                        <div
                            key={col.id}
                            className="flex-shrink-0 w-[280px] rounded-2xl flex flex-col"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(col.slug)}
                        >
                            {/* Column header */}
                            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.cor }} />
                                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{col.nome}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                        {colContatos.length}
                                    </span>
                                </div>
                                <button onClick={() => deleteColumn(col.id)} className="opacity-30 hover:opacity-100 transition-opacity">
                                    <X size={12} style={{ color: 'var(--text-muted)' }} />
                                </button>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {colContatos.map(contato => (
                                    <div
                                        key={contato.id}
                                        draggable
                                        onDragStart={() => setDraggedContact(contato.id)}
                                        className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group"
                                        style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <GripVertical size={12} className="opacity-30" style={{ color: 'var(--text-muted)' }} />
                                                <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{contato.nome}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {col.slug !== 'retorno' ? (
                                                    <button onClick={() => { setRetornoData(''); setRetornoMsg(''); setShowRetornoModal(contato) }} title="Agendar retorno">
                                                        <Calendar size={11} className="text-[#EC4899]" />
                                                    </button>
                                                ) : null}
                                                <button onClick={() => openEdit(contato)} title="Editar">
                                                    <Edit3 size={11} style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                                <button onClick={() => deleteContact(contato.id)} title="Excluir">
                                                    <Trash2 size={11} className="text-red-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Phone size={10} style={{ color: 'var(--text-muted)' }} />
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{contato.telefone}</span>
                                        </div>
                                        {contato.retornoData && col.slug === 'retorno' && (
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Clock size={10} className="text-[#EC4899]" />
                                                <span className="text-[10px] text-[#EC4899]">
                                                    {new Date(contato.retornoData).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                        {contato.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {contato.tags.slice(0, 3).map(tag => (
                                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${col.cor}20`, color: col.cor }}>
                                                        <Tag size={8} className="inline mr-0.5" />{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ========== MODALS ========== */}

            {/* Add Contact Modal */}
            {showAddModal && (
                <Modal title="Novo Contato" onClose={() => setShowAddModal(false)}>
                    <Input label="Nome *" value={formNome} onChange={setFormNome} />
                    <Input label="Telefone *" value={formTel} onChange={setFormTel} placeholder="5511999998888" />
                    <Input label="Email" value={formEmail} onChange={setFormEmail} />
                    <Input label="Notas" value={formNotas} onChange={setFormNotas} textarea />
                    <Input label="Tags (separadas por vírgula)" value={formTags} onChange={setFormTags} placeholder="vip, retorno" />
                    <Btn onClick={addContact} loading={saving}>Salvar Contato</Btn>
                </Modal>
            )}

            {/* Edit Contact Modal */}
            {showEditModal && (
                <Modal title="Editar Contato" onClose={() => setShowEditModal(null)}>
                    <Input label="Nome" value={formNome} onChange={setFormNome} />
                    <Input label="Telefone" value={formTel} onChange={setFormTel} />
                    <Input label="Email" value={formEmail} onChange={setFormEmail} />
                    <Input label="Notas" value={formNotas} onChange={setFormNotas} textarea />
                    <Input label="Tags" value={formTags} onChange={setFormTags} />
                    <Btn onClick={editContact} loading={saving}>Salvar Alterações</Btn>
                </Modal>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <Modal title="Importar Contatos" onClose={() => setShowImportModal(false)}>
                    <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                        Cole uma lista com Nome e Telefone (separados por vírgula, tab ou ponto-e-vírgula). Um contato por linha.
                    </p>
                    <textarea
                        value={importText} onChange={e => setImportText(e.target.value)}
                        rows={8} placeholder={"Maria Silva, 5511999998888\nAna Souza, 5521988887777"}
                        className="w-full rounded-xl px-4 py-3 text-[12px] focus:outline-none resize-none"
                        style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />
                    <p className="text-[10px] mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>
                        {importText.split('\n').filter(Boolean).length} linhas detectadas
                    </p>
                    <Btn onClick={importContacts} loading={saving}>Importar</Btn>
                </Modal>
            )}

            {/* Retorno Modal */}
            {showRetornoModal && (
                <Modal title={`Retorno — ${showRetornoModal.nome}`} onClose={() => setShowRetornoModal(null)}>
                    <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                        Agende uma mensagem de retorno para esta cliente. Ela será enviada automaticamente na data/hora marcada.
                    </p>
                    <Input label="Data e Hora" value={retornoData} onChange={setRetornoData} type="datetime-local" />
                    <label className="block text-[11px] font-medium mb-1 mt-3" style={{ color: 'var(--text-muted)' }}>Mensagem</label>
                    <textarea
                        value={retornoMsg} onChange={e => setRetornoMsg(e.target.value)} rows={4}
                        placeholder="Oi Maria! Tudo bem? Passando para lembrar do seu retorno 💜"
                        className="w-full rounded-xl px-4 py-3 text-[12px] focus:outline-none resize-none"
                        style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />
                    <Btn onClick={scheduleRetorno} loading={saving}><Calendar size={14} /> Agendar Retorno</Btn>
                </Modal>
            )}

            {/* New Column Modal */}
            {showColModal && (
                <Modal title="Nova Coluna" onClose={() => setShowColModal(false)}>
                    <Input label="Nome da Coluna" value={newColNome} onChange={setNewColNome} placeholder="Ex: Pós-operatório" />
                    <label className="block text-[11px] font-medium mb-1 mt-3" style={{ color: 'var(--text-muted)' }}>Cor</label>
                    <input type="color" value={newColCor} onChange={e => setNewColCor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <Btn onClick={addColumn} loading={saving}>Criar Coluna</Btn>
                </Modal>
            )}
        </div>
    )
}

// ========== Reusable Components ==========

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <button onClick={onClose}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

function Input({ label, value, onChange, placeholder, textarea, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string }) {
    const Tag = textarea ? 'textarea' : 'input'
    return (
        <div className="mb-3">
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
            <Tag value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'}
                rows={textarea ? 3 : undefined}
                className="w-full rounded-xl px-4 py-2.5 text-[12px] focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
        </div>
    )
}

function Btn({ onClick, loading, children }: { onClick: () => void; loading?: boolean; children: React.ReactNode }) {
    return (
        <button onClick={onClick} disabled={loading}
            className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : children}
        </button>
    )
}
