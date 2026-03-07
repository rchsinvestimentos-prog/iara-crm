'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, MessageSquare, Loader2, Sparkles, User, Bot, ArrowLeft } from 'lucide-react'

interface Conversa {
    telefone: string
    nome: string
    ultimaMensagem: string
    ultimaData: string
    totalMensagens: number
    origem: string
}

interface Mensagem {
    id: number
    role: string
    content: string
    pushName: string | null
    origem: string | null
    data: string
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
}

function formatTime(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return ''
    }
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr)
        const hoje = new Date()
        if (d.toDateString() === hoje.toDateString()) return 'Hoje'
        const ontem = new Date()
        ontem.setDate(ontem.getDate() - 1)
        if (d.toDateString() === ontem.toDateString()) return 'Ontem'
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    } catch {
        return ''
    }
}

export default function ConversasPage() {
    const [conversas, setConversas] = useState<Conversa[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null)
    const [nomeSelecionado, setNomeSelecionado] = useState('')
    const [mensagens, setMensagens] = useState<Mensagem[]>([])
    const [loadingMsgs, setLoadingMsgs] = useState(false)
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetch('/api/conversas')
            .then(r => r.json())
            .then(data => setConversas(data.conversas || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const abrirConversa = async (telefone: string, nome: string) => {
        setConversaSelecionada(telefone)
        setNomeSelecionado(nome)
        setLoadingMsgs(true)
        try {
            const r = await fetch(`/api/conversas?telefone=${encodeURIComponent(telefone)}`)
            const data = await r.json()
            setMensagens(data.mensagens || [])
        } catch {
            setMensagens([])
        } finally {
            setLoadingMsgs(false)
        }
    }

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [mensagens])

    const filtradas = conversas.filter(
        (c) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            c.telefone.includes(busca)
    )

    // Group messages by date
    const groupedMessages: { date: string; msgs: Mensagem[] }[] = []
    let currentDate = ''
    for (const msg of mensagens) {
        const d = formatDate(msg.data)
        if (d !== currentDate) {
            currentDate = d
            groupedMessages.push({ date: d, msgs: [] })
        }
        groupedMessages[groupedMessages.length - 1].msgs.push(msg)
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Conversas</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Acompanhe os atendimentos da IARA</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
                {/* Lista de conversas */}
                <div
                    className={`backdrop-blur-xl rounded-2xl p-4 overflow-hidden flex flex-col ${conversaSelecionada ? 'hidden lg:flex' : 'flex'}`}
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    {/* Busca */}
                    <div className="relative mb-4">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar conversa..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none transition-colors"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Lista */}
                    <div className="flex-1 overflow-y-auto space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={20} className="animate-spin text-[#D99773]" />
                            </div>
                        ) : filtradas.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nenhuma conversa ainda</p>
                                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                    Quando clientes mandarem mensagem no WhatsApp, as conversas aparecerão aqui automaticamente.
                                </p>
                            </div>
                        ) : (
                            filtradas.map((c) => (
                                <button
                                    key={c.telefone}
                                    onClick={() => abrirConversa(c.telefone, c.nome)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${conversaSelecionada === c.telefone
                                        ? 'bg-[#D99773]/10 border border-[#D99773]/20'
                                        : 'hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#D99773]/15 border border-[#D99773]/20">
                                        <span className="text-[11px] font-bold text-[#D99773]">
                                            {c.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.nome}</p>
                                            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.ultimaData)}</span>
                                        </div>
                                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{c.ultimaMensagem}</p>
                                    </div>
                                    {c.totalMensagens > 0 && (
                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[#D99773]/15 text-[#D99773]">
                                            {c.totalMensagens}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Painel de conversa */}
                <div
                    className={`col-span-1 lg:col-span-2 backdrop-blur-xl rounded-2xl overflow-hidden flex flex-col ${conversaSelecionada ? 'flex' : 'hidden lg:flex'}`}
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    {!conversaSelecionada ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <MessageSquare size={48} className="mb-4 opacity-15" style={{ color: 'var(--text-muted)' }} />
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Selecione uma conversa</p>
                        </div>
                    ) : (
                        <>
                            {/* Header do chat */}
                            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <button
                                    onClick={() => setConversaSelecionada(null)}
                                    className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--bg-subtle)' }}
                                >
                                    <ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} />
                                </button>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#D99773]/15 border border-[#D99773]/20">
                                    <span className="text-[10px] font-bold text-[#D99773]">
                                        {nomeSelecionado.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{nomeSelecionado}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{conversaSelecionada}</p>
                                </div>
                            </div>

                            {/* Mensagens */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                                {loadingMsgs ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 size={20} className="animate-spin text-[#D99773]" />
                                    </div>
                                ) : mensagens.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem mensagens</p>
                                    </div>
                                ) : (
                                    groupedMessages.map((group) => (
                                        <div key={group.date}>
                                            {/* Date separator */}
                                            <div className="flex items-center justify-center my-4">
                                                <span className="text-[10px] px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                                    {group.date}
                                                </span>
                                            </div>

                                            {group.msgs.map((msg) => {
                                                const isAssistant = msg.role === 'assistant'
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-2`}
                                                    >
                                                        <div
                                                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isAssistant
                                                                ? 'rounded-bl-md'
                                                                : 'rounded-br-md'
                                                                }`}
                                                            style={{
                                                                backgroundColor: isAssistant
                                                                    ? 'var(--bg-subtle)'
                                                                    : 'rgba(217,151,115,0.15)',
                                                                border: isAssistant
                                                                    ? '1px solid var(--border-subtle)'
                                                                    : '1px solid rgba(217,151,115,0.2)',
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                {isAssistant ? (
                                                                    <Bot size={11} className="text-[#D99773]" />
                                                                ) : (
                                                                    <User size={11} style={{ color: 'var(--text-muted)' }} />
                                                                )}
                                                                <span className="text-[10px] font-medium" style={{ color: isAssistant ? '#D99773' : 'var(--text-muted)' }}>
                                                                    {isAssistant ? 'IA' : (msg.pushName || 'Cliente')}
                                                                </span>
                                                            </div>
                                                            <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                                                                {msg.content}
                                                            </p>
                                                            <p className="text-right mt-1">
                                                                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                                                    {formatTime(msg.data)}
                                                                </span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Footer info */}
                            <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                <p className="text-[10px] flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                    <Sparkles size={11} className="text-[#D99773]" />
                                    Conversa gerenciada pela IARA • Somente leitura
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
