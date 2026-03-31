'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Plus, Upload, Search, GripVertical, Phone, Tag, Clock,
    X, Edit3, Trash2, Send, Loader2, MessageSquare, Calendar,
    ChevronDown, Check, Sparkles, AlertCircle
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
interface Coluna { id: string; nome: string; slug: string; cor: string; ordem: number }
interface Contato {
    id: string; nome: string; telefone: string; email?: string
    etapa: string; tags: string[]; notas?: string; origem: string
    ultimoContato?: string; retornoData?: string; retornoMensagem?: string
    retornoEnviado?: boolean; createdAt: string
}

// Paleta de cores para tags (hash da string → cor)
const TAG_COLORS = [
    { bg: 'rgba(217,151,115,0.18)', text: '#D99773', border: 'rgba(217,151,115,0.35)' },
    { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
    { bg: 'rgba(6,214,160,0.15)', text: '#06D6A0', border: 'rgba(6,214,160,0.3)' },
    { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
    { bg: 'rgba(236,72,153,0.15)', text: '#EC4899', border: 'rgba(236,72,153,0.3)' },
    { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
    { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', border: 'rgba(239,68,68,0.3)' },
    { bg: 'rgba(16,185,129,0.15)', text: '#10B981', border: 'rgba(16,185,129,0.3)' },
]

function getTagColor(tag: string) {
    let hash = 0
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// Templates de mensagem rápida
const MSG_TEMPLATES = [
    { label: '👋 Retorno padrão', texto: 'Oi {nome}! 😊 Passando para ver se ficou com alguma dúvida e se posso te ajudar em algo. Como você está se sentindo?' },
    { label: '📅 Lembrete de agendamento', texto: 'Oi {nome}! Passando para lembrar do seu agendamento amanhã. Qualquer dúvida estou aqui! 💜' },
    { label: '⭐ Pós-procedimento', texto: 'Oi {nome}! Como você está se sentindo após seu procedimento? Tem alguma dúvida sobre os cuidados? 💆‍♀️' },
    { label: '🎁 Oferta especial', texto: 'Oi {nome}! Tenho uma novidade especial que pode te interessar. Posso te contar?' },
    { label: '🔄 Retomar conversa', texto: 'Oi {nome}! Vi que conversamos há um tempo e queria saber se ainda posso te ajudar com alguma coisa. 😊' },
]

// ============================================
// TAG INPUT COMPONENT
// ============================================
function TagInput({
    tags,
    onChange,
    sugestoes = [],
}: {
    tags: string[]
    onChange: (tags: string[]) => void
    sugestoes?: string[]
}) {
    const [input, setInput] = useState('')
    const [showSugestoes, setShowSugestoes] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const filtered = sugestoes
        .filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 6)

    const addTag = (tag: string) => {
        const clean = tag.trim().toLowerCase()
        if (!clean || tags.includes(clean)) return
        onChange([...tags, clean])
        setInput('')
        setShowSugestoes(false)
        inputRef.current?.focus()
    }

    const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag))

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault()
            addTag(input)
        } else if (e.key === 'Backspace' && !input && tags.length) {
            removeTag(tags[tags.length - 1])
        }
    }

    return (
        <div className="relative">
            <div
                className="min-h-[42px] w-full rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map(tag => {
                    const color = getTagColor(tag)
                    return (
                        <span
                            key={tag}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                        >
                            {tag}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                                className="hover:opacity-70 transition-opacity ml-0.5"
                            >
                                <X size={9} />
                            </button>
                        </span>
                    )
                })}
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => { setInput(e.target.value); setShowSugestoes(true) }}
                    onKeyDown={handleKey}
                    onFocus={() => setShowSugestoes(true)}
                    onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                    placeholder={tags.length === 0 ? 'Digite uma tag e pressione Enter...' : ''}
                    className="flex-1 min-w-[100px] bg-transparent outline-none text-[12px]"
                    style={{ color: 'var(--text-primary)' }}
                />
            </div>

            {/* Sugestões dropdown */}
            {showSugestoes && (input || filtered.length > 0) && (
                <div
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg z-20"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    {filtered.map(s => {
                        const color = getTagColor(s)
                        return (
                            <button
                                key={s}
                                type="button"
                                onMouseDown={() => addTag(s)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                <span
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color.text }}
                                />
                                {s}
                            </button>
                        )
                    })}
                    {input.trim() && !tags.includes(input.trim().toLowerCase()) && (
                        <button
                            type="button"
                            onMouseDown={() => addTag(input)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-left transition-colors"
                            style={{
                                color: 'var(--text-muted)',
                                borderTop: filtered.length > 0 ? '1px solid var(--border-subtle)' : 'none'
                            }}
                        >
                            <Plus size={12} />
                            Criar tag "<strong>{input.trim().toLowerCase()}</strong>"
                        </button>
                    )}
                </div>
            )}
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Pressione Enter ou vírgula para adicionar
            </p>
        </div>
    )
}

// ============================================
// MAIN PAGE
// ============================================
export default function CrmPage() {
    const [colunas, setColunas] = useState<Coluna[]>([])
    const [contatos, setContatos] = useState<Contato[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [tagFiltro, setTagFiltro] = useState<string | null>(null)
    const [sugestoesTags, setSugestoesTags] = useState<string[]>([])

    // Modals
    const [showAddModal, setShowAddModal] = useState(false)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState<Contato | null>(null)
    const [showMsgModal, setShowMsgModal] = useState<Contato | null>(null)
    const [showColModal, setShowColModal] = useState(false)
    const [draggedContact, setDraggedContact] = useState<string | null>(null)

    // Form states
    const [formNome, setFormNome] = useState('')
    const [formTel, setFormTel] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formNotas, setFormNotas] = useState('')
    const [formTags, setFormTags] = useState<string[]>([])
    const [importText, setImportText] = useState('')
    const [msgData, setMsgData] = useState('')
    const [msgTexto, setMsgTexto] = useState('')
    const [newColNome, setNewColNome] = useState('')
    const [newColCor, setNewColCor] = useState('#D99773')
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')

    const fetchData = useCallback(async () => {
        try {
            const [colRes, conRes, tagsRes] = await Promise.all([
                fetch('/api/crm-colunas'),
                fetch('/api/contatos'),
                fetch('/api/contatos/tags'),
            ])
            const colData = await colRes.json()
            const conData = await conRes.json()
            const tagsData = tagsRes.ok ? await tagsRes.json() : { tags: [] }

            setColunas(colData.colunas || [])
            setContatos(conData.contatos || [])
            setSugestoesTags(tagsData.tags || [])
        } catch { /* */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Contato — Add ──────────────────────
    const addContact = async () => {
        if (!formNome || !formTel) { setFormError('Nome e Telefone são obrigatórios.'); return }
        setFormError('')
        setSaving(true)
        try {
            const res = await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: formNome, telefone: formTel.replace(/\D/g, ''), email: formEmail, notas: formNotas, tags: formTags }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setFormError(data.error || `Erro ${res.status}`)
                return
            }
            setShowAddModal(false)
            resetForm()
            fetchData()
        } catch { setFormError('Erro de conexão.') }
        finally { setSaving(false) }
    }

    // ── Contato — Edit ─────────────────────
    const editContact = async () => {
        if (!showEditModal) return
        setFormError('')
        setSaving(true)
        try {
            const res = await fetch(`/api/contatos/${showEditModal.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: formNome, telefone: formTel, email: formEmail, notas: formNotas, tags: formTags }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setFormError(data.error || `Erro ${res.status}`)
                return
            }
            setShowEditModal(null)
            fetchData()
        } catch { setFormError('Erro de conexão.') }
        finally { setSaving(false) }
    }

    // ── Contato — Delete ───────────────────
    const deleteContact = async (id: string) => {
        if (!confirm('Excluir este contato?')) return
        await fetch(`/api/contatos/${id}`, { method: 'DELETE' })
        fetchData()
    }

    // ── Import ─────────────────────────────
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
            setShowImportModal(false)
            setImportText('')
            fetchData()
        } catch { /* */ }
        finally { setSaving(false) }
    }

    // ── Mensagem Agendada ──────────────────
    const scheduleMensagem = async () => {
        if (!showMsgModal || !msgData || !msgTexto.trim()) return
        setSaving(true)
        try {
            const res = await fetch(`/api/contatos/${showMsgModal.id}/mensagem-agendada`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: msgData, mensagem: msgTexto }),
            })
            if (!res.ok) {
                const d = await res.json().catch(() => ({}))
                setFormError(d.error || 'Erro ao agendar')
                return
            }
            setShowMsgModal(null)
            setMsgData('')
            setMsgTexto('')
            setFormError('')
            fetchData()
        } catch { setFormError('Erro de conexão.') }
        finally { setSaving(false) }
    }

    const cancelarMensagem = async (contatoId: string) => {
        if (!confirm('Cancelar a mensagem agendada?')) return
        await fetch(`/api/contatos/${contatoId}/mensagem-agendada`, { method: 'DELETE' })
        fetchData()
    }

    // ── Coluna ─────────────────────────────
    const addColumn = async () => {
        if (!newColNome) return
        setSaving(true)
        try {
            await fetch('/api/crm-colunas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: newColNome, cor: newColCor }),
            })
            setShowColModal(false)
            setNewColNome('')
            setNewColCor('#D99773')
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

    // ── Drag & Drop ────────────────────────
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

    // ── Helpers ────────────────────────────
    const openEdit = (c: Contato) => {
        setFormNome(c.nome)
        setFormTel(c.telefone)
        setFormEmail(c.email || '')
        setFormNotas(c.notas || '')
        setFormTags(c.tags || [])
        setFormError('')
        setShowEditModal(c)
    }

    const openMsgModal = (c: Contato) => {
        setMsgTexto(c.nome ? `Oi ${c.nome.split(' ')[0]}! 😊 ` : '')
        setMsgData('')
        setFormError('')
        setShowMsgModal(c)
    }

    const resetForm = () => {
        setFormNome(''); setFormTel(''); setFormEmail(''); setFormNotas(''); setFormTags([]); setFormError('')
    }

    const applyTemplate = (template: typeof MSG_TEMPLATES[0]) => {
        const firstName = showMsgModal?.nome?.split(' ')[0] || 'você'
        setMsgTexto(template.texto.replace(/{nome}/g, firstName))
    }

    // ── Filtros ────────────────────────────
    let filteredContatos = contatos
    if (busca) {
        filteredContatos = filteredContatos.filter(c =>
            c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca)
        )
    }
    if (tagFiltro) {
        filteredContatos = filteredContatos.filter(c => c.tags?.includes(tagFiltro))
    }

    // Todas as tags únicas para filtrar o board
    const allTags = Array.from(new Set(contatos.flatMap(c => c.tags || []))).sort()

    // Helper data preview
    const formatDataPreview = (isoStr: string) => {
        if (!isoStr) return null
        const d = new Date(isoStr)
        if (isNaN(d.getTime())) return null
        return d.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    return (
        <div className="animate-fade-in">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>CRM</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {filteredContatos.length} de {contatos.length} contatos
                        {tagFiltro && <span className="ml-1">• filtrando por <strong>{tagFiltro}</strong></span>}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Busca */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-8 pr-4 py-2 text-[12px] rounded-xl w-36"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                    </div>

                    {/* Botões */}
                    <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                        <Upload size={13} /> Importar
                    </button>
                    <button onClick={() => { resetForm(); setShowAddModal(true) }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">
                        <Plus size={13} /> Adicionar
                    </button>
                    <button onClick={() => setShowColModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                        <Plus size={13} /> Coluna
                    </button>
                </div>
            </div>

            {/* ── Filtro por Tags ── */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="text-[11px] self-center mr-1" style={{ color: 'var(--text-muted)' }}>
                        <Tag size={11} className="inline mr-1" />Filtrar:
                    </span>
                    {allTags.map(tag => {
                        const color = getTagColor(tag)
                        const active = tagFiltro === tag
                        return (
                            <button
                                key={tag}
                                onClick={() => setTagFiltro(active ? null : tag)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                                style={{
                                    backgroundColor: active ? color.text : color.bg,
                                    color: active ? 'white' : color.text,
                                    border: `1px solid ${color.border}`,
                                }}
                            >
                                {active && <Check size={9} />}
                                {tag}
                                <span className="opacity-70 text-[9px]">
                                    ({contatos.filter(c => c.tags?.includes(tag)).length})
                                </span>
                            </button>
                        )
                    })}
                    {tagFiltro && (
                        <button onClick={() => setTagFiltro(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                            <X size={10} /> Limpar filtro
                        </button>
                    )}
                </div>
            )}

            {/* ── Pipeline Stats ── */}
            {colunas.length > 0 && (
                <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(colunas.length, 6)}, 1fr)` }}>
                    {colunas.map((col, i) => {
                        const count = filteredContatos.filter(c => c.etapa === col.slug).length
                        const prevCount = i > 0 ? filteredContatos.filter(c => c.etapa === colunas[i - 1].slug).length : null
                        const conversion = prevCount ? Math.round((count / prevCount) * 100) : null
                        const total = filteredContatos.length || 1
                        return (
                            <div key={col.id} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.cor }} />
                                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{col.nome}</p>
                                </div>
                                <p className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>{count}</p>
                                {conversion !== null && (
                                    <p className="text-[9px]" style={{ color: conversion >= 50 ? '#06D6A0' : conversion >= 25 ? '#EAB308' : '#EF4444' }}>
                                        {conversion}% conversão
                                    </p>
                                )}
                                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((count / total) * 100)}%`, backgroundColor: col.cor }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Kanban Board ── */}
            <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 280px)' }}>
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
                                {colContatos.map(contato => {
                                    const temMsgAgendada = contato.retornoData && !contato.retornoEnviado
                                    const msgDate = temMsgAgendada ? new Date(contato.retornoData!) : null
                                    const msgPassada = msgDate && msgDate < new Date()

                                    return (
                                        <div
                                            key={contato.id}
                                            draggable
                                            onDragStart={() => setDraggedContact(contato.id)}
                                            className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group"
                                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
                                        >
                                            {/* Card header */}
                                            <div className="flex items-start justify-between mb-1.5">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <GripVertical size={12} className="opacity-30 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                                    <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{contato.nome}</span>
                                                </div>
                                                {/* Action buttons — aparecem no hover */}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                                                    <button
                                                        onClick={() => openMsgModal(contato)}
                                                        title="Programar mensagem"
                                                        className="p-0.5 rounded-md hover:bg-[#EC4899]/10 transition-colors"
                                                    >
                                                        <MessageSquare size={11} className="text-[#EC4899]" />
                                                    </button>
                                                    <button onClick={() => openEdit(contato)} title="Editar" className="p-0.5 rounded-md hover:bg-black/5 transition-colors">
                                                        <Edit3 size={11} style={{ color: 'var(--text-muted)' }} />
                                                    </button>
                                                    <button onClick={() => deleteContact(contato.id)} title="Excluir" className="p-0.5 rounded-md hover:bg-red-500/10 transition-colors">
                                                        <Trash2 size={11} className="text-red-400" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Telefone */}
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Phone size={10} style={{ color: 'var(--text-muted)' }} />
                                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{contato.telefone}</span>
                                            </div>

                                            {/* Badge mensagem agendada */}
                                            {temMsgAgendada && msgDate && (
                                                <div
                                                    className="flex items-center justify-between gap-1 mb-1.5 px-2 py-1 rounded-lg cursor-pointer group/msg"
                                                    style={{
                                                        backgroundColor: msgPassada ? 'rgba(239,68,68,0.1)' : 'rgba(236,72,153,0.1)',
                                                        border: `1px solid ${msgPassada ? 'rgba(239,68,68,0.3)' : 'rgba(236,72,153,0.25)'}`,
                                                    }}
                                                    onClick={() => openMsgModal(contato)}
                                                    title="Clique para editar a mensagem"
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        {msgPassada
                                                            ? <AlertCircle size={10} className="text-red-400 flex-shrink-0" />
                                                            : <Clock size={10} className="flex-shrink-0" style={{ color: '#EC4899' }} />
                                                        }
                                                        <span className="text-[10px] font-medium" style={{ color: msgPassada ? '#EF4444' : '#EC4899' }}>
                                                            {msgPassada ? 'Atrasado · ' : ''}
                                                            {msgDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); cancelarMensagem(contato.id) }}
                                                        className="opacity-0 group-hover/msg:opacity-100 transition-opacity"
                                                        title="Cancelar mensagem"
                                                    >
                                                        <X size={9} className="text-red-400" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Tags */}
                                            {contato.tags?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {contato.tags.slice(0, 4).map(tag => {
                                                        const color = getTagColor(tag)
                                                        return (
                                                            <button
                                                                key={tag}
                                                                onClick={() => setTagFiltro(tagFiltro === tag ? null : tag)}
                                                                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-all hover:scale-105"
                                                                style={{ backgroundColor: color.bg, color: color.text, border: `1px solid ${color.border}` }}
                                                                title={`Filtrar por "${tag}"`}
                                                            >
                                                                {tag}
                                                            </button>
                                                        )
                                                    })}
                                                    {contato.tags.length > 4 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}>
                                                            +{contato.tags.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {colContatos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                                        <div className="w-8 h-8 rounded-full mb-2 flex items-center justify-center" style={{ backgroundColor: col.cor + '20' }}>
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.cor }} />
                                        </div>
                                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Nenhum contato</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {colunas.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 opacity-60">
                        <p className="text-[14px] mb-2" style={{ color: 'var(--text-secondary)' }}>Sem colunas ainda</p>
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Clique em "+ Coluna" para começar</p>
                    </div>
                )}
            </div>

            {/* ══════════════ MODALS ══════════════ */}

            {/* Add Contact */}
            {showAddModal && (
                <Modal title="Novo Contato" onClose={() => setShowAddModal(false)}>
                    <MInput label="Nome *" value={formNome} onChange={setFormNome} />
                    <MInput label="Telefone *" value={formTel} onChange={setFormTel} placeholder="5511999998888" />
                    <MInput label="Email" value={formEmail} onChange={setFormEmail} />
                    <MInput label="Notas" value={formNotas} onChange={setFormNotas} textarea />
                    <div className="mb-3">
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            <Tag size={11} className="inline mr-1" />Tags
                        </label>
                        <TagInput tags={formTags} onChange={setFormTags} sugestoes={sugestoesTags} />
                    </div>
                    {formError && <p className="text-[11px] text-red-400 mb-2">{formError}</p>}
                    <MBtn onClick={addContact} loading={saving}>Salvar Contato</MBtn>
                </Modal>
            )}

            {/* Edit Contact */}
            {showEditModal && (
                <Modal title={`Editar — ${showEditModal.nome}`} onClose={() => setShowEditModal(null)}>
                    <MInput label="Nome" value={formNome} onChange={setFormNome} />
                    <MInput label="Telefone" value={formTel} onChange={setFormTel} />
                    <MInput label="Email" value={formEmail} onChange={setFormEmail} />
                    <MInput label="Notas" value={formNotas} onChange={setFormNotas} textarea />
                    <div className="mb-3">
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            <Tag size={11} className="inline mr-1" />Tags
                        </label>
                        <TagInput tags={formTags} onChange={setFormTags} sugestoes={sugestoesTags} />
                    </div>
                    {formError && <p className="text-[11px] text-red-400 mb-2">{formError}</p>}
                    <MBtn onClick={editContact} loading={saving}>Salvar Alterações</MBtn>
                </Modal>
            )}

            {/* Programar Mensagem */}
            {showMsgModal && (
                <Modal title={`💬 Programar Mensagem — ${showMsgModal.nome?.split(' ')[0]}`} onClose={() => { setShowMsgModal(null); setFormError('') }}>
                    {/* Data/Hora */}
                    <div className="mb-4">
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            <Calendar size={11} className="inline mr-1" />Data e Hora de Envio
                        </label>
                        <input
                            type="datetime-local"
                            value={msgData}
                            onChange={e => setMsgData(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full rounded-xl px-4 py-2.5 text-[12px] focus:outline-none"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                        {msgData && formatDataPreview(msgData) && (
                            <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#06D6A0' }}>
                                ✓ Será enviada {formatDataPreview(msgData)}
                            </p>
                        )}
                    </div>

                    {/* Templates Rápidos */}
                    <div className="mb-3">
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            <Sparkles size={11} className="inline mr-1" />Templates Rápidos
                        </label>
                        <div className="grid grid-cols-1 gap-1.5">
                            {MSG_TEMPLATES.map(t => (
                                <button
                                    key={t.label}
                                    onClick={() => applyTemplate(t)}
                                    className="text-left px-3 py-2 rounded-xl text-[11px] transition-all hover:scale-[1.01]"
                                    style={{
                                        backgroundColor: 'var(--bg-subtle)',
                                        border: msgTexto === t.texto.replace(/{nome}/g, showMsgModal?.nome?.split(' ')[0] || 'você')
                                            ? '1px solid #D99773'
                                            : '1px solid var(--border-subtle)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mensagem */}
                    <div className="mb-3">
                        <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                            <MessageSquare size={11} className="inline mr-1" />Mensagem
                        </label>
                        <textarea
                            value={msgTexto}
                            onChange={e => setMsgTexto(e.target.value)}
                            rows={4}
                            placeholder={`Oi ${showMsgModal?.nome?.split(' ')[0] || ''}! 😊`}
                            className="w-full rounded-xl px-4 py-3 text-[12px] focus:outline-none resize-none"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            {msgTexto.length} caracteres
                        </p>
                    </div>

                    {formError && (
                        <p className="flex items-center gap-1.5 text-[11px] text-red-400 mb-2">
                            <AlertCircle size={12} />{formError}
                        </p>
                    )}

                    <MBtn
                        onClick={scheduleMensagem}
                        loading={saving}
                        disabled={!msgData || !msgTexto.trim()}
                    >
                        <Send size={14} /> Agendar Envio
                    </MBtn>

                    {showMsgModal.retornoData && !showMsgModal.retornoEnviado && (
                        <button
                            onClick={() => cancelarMensagem(showMsgModal.id)}
                            className="w-full mt-2 py-2 rounded-xl text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            Cancelar mensagem existente
                        </button>
                    )}
                </Modal>
            )}

            {/* Import */}
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
                    <MBtn onClick={importContacts} loading={saving}>Importar</MBtn>
                </Modal>
            )}

            {/* New Column */}
            {showColModal && (
                <Modal title="Nova Coluna" onClose={() => setShowColModal(false)}>
                    <MInput label="Nome da Coluna" value={newColNome} onChange={setNewColNome} placeholder="Ex: Pós-operatório" />
                    <label className="block text-[11px] font-medium mb-1 mt-3" style={{ color: 'var(--text-muted)' }}>Cor</label>
                    <input type="color" value={newColCor} onChange={e => setNewColCor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <MBtn onClick={addColumn} loading={saving}>Criar Coluna</MBtn>
                </Modal>
            )}
        </div>
    )
}

// ══════════════ MINI COMPONENTS ══════════════

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
                    <button onClick={onClose}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
                </div>
                {children}
            </div>
        </div>
    )
}

function MInput({ label, value, onChange, placeholder, textarea, type }: {
    label: string; value: string; onChange: (v: string) => void
    placeholder?: string; textarea?: boolean; type?: string
}) {
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

function MBtn({ onClick, loading, children, disabled }: {
    onClick: () => void; loading?: boolean; children: React.ReactNode; disabled?: boolean
}) {
    return (
        <button onClick={onClick} disabled={loading || disabled}
            className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={14} className="animate-spin" /> : children}
        </button>
    )
}
