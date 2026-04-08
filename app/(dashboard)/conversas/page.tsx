'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MessageSquare, Loader2, Sparkles, User, Bot, ArrowLeft, Instagram, Send, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversa {
    telefone: string
    nome: string
    ultimaMensagem: string
    ultimaData: string
    totalMensagens: number
    origem: string
    fotoUrl?: string | null
}

interface IgThread {
    senderId: string
    nome: string
    ultimaMensagem: string
    ultimaData: string
    totalMensagens: number
    falhaEnvio: boolean
}

interface Mensagem {
    id: number
    role: string
    content: string
    pushName?: string | null
    origem?: string | null
    tipo?: string
    data: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    if (!dateStr) return ''
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
}

function formatTime(dateStr: string): string {
    try { return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr)
        const hoje = new Date()
        if (d.toDateString() === hoje.toDateString()) return 'Hoje'
        const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
        if (d.toDateString() === ontem.toDateString()) return 'Ontem'
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    } catch { return '' }
}

function groupByDate(msgs: Mensagem[]) {
    const groups: { date: string; msgs: Mensagem[] }[] = []
    let cur = ''
    for (const msg of msgs) {
        const d = formatDate(msg.data)
        if (d !== cur) { cur = d; groups.push({ date: d, msgs: [] }) }
        groups[groups.length - 1].msgs.push(msg)
    }
    return groups
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'whatsapp' | 'instagram'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConversasPage() {
    const [tab, setTab] = useState<Tab>('whatsapp')

    // WhatsApp state
    const [conversas, setConversas] = useState<Conversa[]>([])
    const [loadingWA, setLoadingWA] = useState(true)

    // Instagram state
    const [igThreads, setIgThreads] = useState<IgThread[]>([])
    const [loadingIG, setLoadingIG] = useState(true)

    // Shared chat state
    const [busca, setBusca] = useState('')
    const [selecionado, setSelecionado] = useState<string | null>(null)
    const [nomeSelecionado, setNomeSelecionado] = useState('')
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const [textoEnvio, setTextoEnvio] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [erroEnvio, setErroEnvio] = useState('')
    const chatEndRef = useRef<HTMLDivElement>(null)

    // Load WhatsApp
    useEffect(() => {
        fetch('/api/conversas')
            .then(r => r.json())
            .then(d => setConversas(d.conversas || []))
            .finally(() => setLoadingWA(false))
    }, [])

    // Load Instagram
    const loadIG = () => {
        setLoadingIG(true)
        fetch('/api/conversas/instagram')
            .then(r => r.json())
            .then(d => setIgThreads(d.threads || []))
            .finally(() => setLoadingIG(false))
    }
    useEffect(() => { loadIG() }, [])

    // Auto-scroll
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])

    // Clear selection when switching tabs
    useEffect(() => { setSelecionado(null); setBusca('') }, [tab])

    // Open WhatsApp conversation
    const abrirWA = async (telefone: string, nome: string) => {
        setSelecionado(telefone); setNomeSelecionado(nome); setLoadingMsgs(true); setMensagens([])
        const r = await fetch(`/api/conversas?telefone=${encodeURIComponent(telefone)}`)
        const d = await r.json()
        setMensagens(d.mensagens || [])
        setLoadingMsgs(false)
    }

    // Open Instagram conversation
    const abrirIG = async (senderId: string, nome: string) => {
        setSelecionado(senderId); setNomeSelecionado(nome); setLoadingMsgs(true); setMensagens([]); setErroEnvio('')
        const r = await fetch(`/api/conversas/instagram?sender=${encodeURIComponent(senderId)}`)
        const d = await r.json()
        setMensagens(d.mensagens || [])
        setLoadingMsgs(false)
    }

    // Send Instagram message
    const enviarIG = async () => {
        if (!textoEnvio.trim() || !selecionado || enviando) return
        setEnviando(true); setErroEnvio('')
        const r = await fetch('/api/conversas/instagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId: selecionado, texto: textoEnvio.trim() })
        })
        const d = await r.json()
        if (d.ok) {
            setTextoEnvio('')
            await abrirIG(selecionado, nomeSelecionado)
        } else {
            setErroEnvio(d.error || 'Erro ao enviar')
        }
        setEnviando(false)
    }

    // ─── Filtered lists ───────────────────────────────────────────────────────

    const filtWA = conversas.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) || c.telefone.includes(busca)
    )
    const filtIG = igThreads.filter(t =>
        t.nome.toLowerCase().includes(busca.toLowerCase()) || t.senderId.includes(busca)
    )
    const grouped = groupByDate(mensagens)
    const loading = tab === 'whatsapp' ? loadingWA : loadingIG

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-5">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Conversas</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Acompanhe os atendimentos da IARA</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setTab('whatsapp')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                        backgroundColor: tab === 'whatsapp' ? 'rgba(217,151,115,0.15)' : 'var(--bg-card)',
                        border: tab === 'whatsapp' ? '1px solid rgba(217,151,115,0.4)' : '1px solid var(--border-default)',
                        color: tab === 'whatsapp' ? '#D99773' : 'var(--text-muted)',
                    }}
                >
                    <span style={{ fontSize: 16 }}>💬</span>
                    WhatsApp
                    {conversas.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(217,151,115,0.2)', color: '#D99773' }}>
                            {conversas.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('instagram')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                        backgroundColor: tab === 'instagram' ? 'rgba(225,48,108,0.12)' : 'var(--bg-card)',
                        border: tab === 'instagram' ? '1px solid rgba(225,48,108,0.35)' : '1px solid var(--border-default)',
                        color: tab === 'instagram' ? '#E1306C' : 'var(--text-muted)',
                    }}
                >
                    <span style={{ fontSize: 16 }}>📷</span>
                    Instagram
                    {igThreads.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(225,48,108,0.15)', color: '#E1306C' }}>
                            {igThreads.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-230px)]">

                {/* ── Lista lateral ── */}
                <div
                    className={`backdrop-blur-xl rounded-2xl p-4 overflow-hidden flex flex-col ${selecionado ? 'hidden lg:flex' : 'flex'}`}
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    <div className="relative mb-4">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl focus:outline-none"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={20} className="animate-spin" style={{ color: tab === 'instagram' ? '#E1306C' : '#D99773' }} />
                            </div>
                        ) : tab === 'whatsapp' ? (
                            filtWA.length === 0 ? (
                                <EmptyState
                                    icon="💬"
                                    msg="Nenhuma conversa no WhatsApp ainda."
                                    sub="Quando um cliente enviar uma mensagem para o número conectado, ela aparecerá aqui automaticamente."
                                />
                            ) : filtWA.map(c => (
                                <ThreadItem
                                    key={c.telefone}
                                    id={c.telefone}
                                    nome={c.nome}
                                    preview={c.ultimaMensagem}
                                    time={c.ultimaData}
                                    count={c.totalMensagens}
                                    selected={selecionado === c.telefone}
                                    onClick={() => abrirWA(c.telefone, c.nome)}
                                    accentColor="#D99773"
                                    fotoUrl={c.fotoUrl}
                                />
                            ))
                        ) : (
                            filtIG.length === 0 ? (
                                <EmptyState
                                    icon="📷"
                                    msg="Nenhuma mensagem do Instagram ainda."
                                    sub="Quando alguém enviar uma DM para o perfil conectado, a conversa aparecerá aqui."
                                />
                            ) : filtIG.map(t => (
                                <ThreadItem
                                    key={t.senderId}
                                    id={t.senderId}
                                    nome={t.nome}
                                    preview={t.ultimaMensagem}
                                    time={t.ultimaData}
                                    count={t.totalMensagens}
                                    selected={selecionado === t.senderId}
                                    onClick={() => abrirIG(t.senderId, t.nome)}
                                    accentColor="#E1306C"
                                    falha={t.falhaEnvio}
                                    isInstagram
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* ── Chat panel ── */}
                <div
                    className={`col-span-1 lg:col-span-2 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col ${selecionado ? 'flex' : 'hidden lg:flex'}`}
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    {!selecionado ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                            <MessageSquare size={48} className="opacity-10" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Selecione uma conversa</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <button
                                    onClick={() => setSelecionado(null)}
                                    className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--bg-subtle)' }}
                                >
                                    <ArrowLeft size={14} style={{ color: 'var(--text-muted)' }} />
                                </button>
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: tab === 'instagram'
                                            ? 'linear-gradient(135deg, #E1306C22, #833AB422)'
                                            : 'rgba(217,151,115,0.15)',
                                        border: tab === 'instagram'
                                            ? '1px solid rgba(225,48,108,0.3)'
                                            : '1px solid rgba(217,151,115,0.2)'
                                    }}
                                >
                                    {tab === 'instagram' ? (
                                        <span style={{ fontSize: 16 }}>📷</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-[#D99773]">
                                            {nomeSelecionado.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{nomeSelecionado}</p>
                                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                        {tab === 'instagram' ? `Instagram DM · ID ${selecionado}` : selecionado}
                                    </p>
                                </div>
                                {tab === 'instagram' && (
                                    <div
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium"
                                        style={{ backgroundColor: 'rgba(225,48,108,0.1)', color: '#E1306C', border: '1px solid rgba(225,48,108,0.2)' }}
                                    >
                                        <span style={{ fontSize: 10 }}>📷</span>
                                        Instagram
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                                {loadingMsgs ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 size={20} className="animate-spin" style={{ color: tab === 'instagram' ? '#E1306C' : '#D99773' }} />
                                    </div>
                                ) : mensagens.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem mensagens</p>
                                    </div>
                                ) : grouped.map(group => (
                                    <div key={group.date}>
                                        <div className="flex items-center justify-center my-4">
                                            <span className="text-[10px] px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                                {group.date}
                                            </span>
                                        </div>
                                        {group.msgs.map(msg => {
                                            const isBot = msg.role === 'assistant'
                                            const isFalha = msg.content.startsWith('[FALHA_ENVIO]')
                                            const accentColor = tab === 'instagram' ? '#E1306C' : '#D99773'
                                            return (
                                                <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-2`}>
                                                    <div
                                                        className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                                                        style={{
                                                            backgroundColor: isBot ? 'var(--bg-subtle)' : `${accentColor}18`,
                                                            border: isBot ? '1px solid var(--border-subtle)' : `1px solid ${accentColor}30`,
                                                            borderBottomLeftRadius: isBot ? 4 : undefined,
                                                            borderBottomRightRadius: !isBot ? 4 : undefined,
                                                            opacity: isFalha ? 0.6 : 1,
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            {isBot ? <Bot size={11} style={{ color: accentColor }} /> : <User size={11} style={{ color: 'var(--text-muted)' }} />}
                                                            <span className="text-[10px] font-medium" style={{ color: isBot ? accentColor : 'var(--text-muted)' }}>
                                                                {isBot ? 'IARA' : (msg.pushName || 'Cliente')}
                                                            </span>
                                                            {isFalha && (
                                                                <span className="text-[9px] px-1 rounded" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                                                                    ⚠ não enviado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                                                            {msg.content.replace('[FALHA_ENVIO] ', '')}
                                                        </p>
                                                        <p className="text-right mt-1">
                                                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{formatTime(msg.data)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Footer */}
                            {tab === 'instagram' ? (
                                <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    {erroEnvio && (
                                        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg text-[11px]"
                                            style={{ backgroundColor: '#ef444415', border: '1px solid #ef444430', color: '#ef4444' }}>
                                            <AlertCircle size={12} />
                                            {erroEnvio.includes('acesso avançado') || erroEnvio.includes('Advanced Access')
                                                ? 'Envio bloqueado pela Meta. Advanced Access pendente de aprovação.'
                                                : erroEnvio
                                            }
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={textoEnvio}
                                            onChange={e => setTextoEnvio(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarIG()}
                                            placeholder="Responder via Instagram DM..."
                                            className="flex-1 px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                        />
                                        <button
                                            onClick={enviarIG}
                                            disabled={!textoEnvio.trim() || enviando}
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity"
                                            style={{
                                                background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                                                opacity: !textoEnvio.trim() || enviando ? 0.5 : 1,
                                                cursor: !textoEnvio.trim() || enviando ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {enviando ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center mt-2 flex items-center justify-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                        <Sparkles size={9} style={{ color: '#E1306C' }} />
                                        A IARA responde automaticamente · Envio manual disponível quando aprovado pela Meta
                                    </p>
                                </div>
                            ) : (
                                <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                    <p className="text-[10px] flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                        <Sparkles size={11} className="text-[#D99773]" />
                                        Conversa gerenciada pela IARA · Somente leitura
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon, msg, sub }: { icon: string; msg: string; sub?: string }) {
    return (
        <div className="text-center py-12 px-4">
            <span style={{ fontSize: 36, opacity: 0.25 }}>{icon}</span>
            <p className="text-xs mt-3 font-medium" style={{ color: 'var(--text-primary)' }}>{msg}</p>
            {sub && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
    )
}

function ThreadItem({
    id, nome, preview, time, count, selected, onClick, accentColor, falha, isInstagram, fotoUrl
}: {
    id: string; nome: string; preview: string; time: string; count: number
    selected: boolean; onClick: () => void; accentColor: string; falha?: boolean; isInstagram?: boolean; fotoUrl?: string | null
}) {
    const initials = nome.startsWith('@')
        ? nome.replace('@', '').slice(0, 2).toUpperCase()
        : nome.split(' ').map((n: string) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '??'

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
            style={{
                backgroundColor: selected ? `${accentColor}12` : 'transparent',
                border: selected ? `1px solid ${accentColor}30` : '1px solid transparent',
            }}
        >
            {fotoUrl ? (
                <img
                    src={fotoUrl}
                    alt={nome}
                    className="w-9 h-9 rounded-full flex-shrink-0 object-cover"
                    style={{ border: `1px solid ${accentColor}25` }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                />
            ) : null}
            <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${fotoUrl ? 'hidden' : ''}`}
                style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}25`, color: accentColor }}
            >
                {isInstagram ? '📷' : initials}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                    <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{nome}</p>
                    <span className="text-[9px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(time)}</span>
                </div>
                <div className="flex items-center gap-1">
                    {falha && <span style={{ color: '#ef4444', fontSize: 9 }}>⚠</span>}
                    <p className="text-[11px] truncate" style={{ color: falha ? '#ef4444' : 'var(--text-muted)' }}>{preview}</p>
                </div>
            </div>
            {count > 0 && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${accentColor}18`, color: accentColor }}>
                    {count}
                </span>
            )}
        </button>
    )
}
