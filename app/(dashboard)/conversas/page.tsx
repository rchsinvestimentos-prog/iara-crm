'use client'

import { useState, useEffect } from 'react'
import { Search, MessageSquare, Shield, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Conversa {
    telefone: string
    nome: string
    ultimaMensagem: string
    ultimaData: string
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

export default function ConversasPage() {
    const [conversas, setConversas] = useState<Conversa[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(data => setConversas(data.conversasRecentes || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const filtradas = conversas.filter(
        (c) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            c.telefone.includes(busca)
    )

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Conversas</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Acompanhe os atendimentos da IARA</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
                {/* Lista de conversas */}
                <div className="backdrop-blur-xl rounded-2xl p-4 overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
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
                    <div className="flex-1 overflow-y-auto space-y-2">
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
                                <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    <div className="flex items-center gap-2 justify-center mb-2">
                                        <Sparkles size={14} className="text-[#D99773]" />
                                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Dica</span>
                                    </div>
                                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                        Conecte seu WhatsApp em{' '}
                                        <Link href="/configuracoes" className="text-[#D99773] font-medium hover:underline">Configurações</Link>{' '}
                                        para a IARA começar a atender 24/7.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            filtradas.map((conv) => (
                                <button
                                    key={conv.telefone}
                                    onClick={() => setConversaSelecionada(conv.telefone)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${conversaSelecionada === conv.telefone
                                        ? 'border-2 border-[#D99773]/30'
                                        : ''
                                        }`}
                                    style={{
                                        backgroundColor: conversaSelecionada === conv.telefone ? 'rgba(217,151,115,0.1)' : 'transparent',
                                    }}
                                >
                                    <div className="w-11 h-11 rounded-full bg-[#D99773]/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[#D99773] font-bold text-sm">
                                            {conv.nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{conv.nome}</span>
                                            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(conv.ultimaData)}</span>
                                        </div>
                                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{conv.ultimaMensagem}</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-[#D99773] flex-shrink-0 shadow-[0_0_8px_rgba(217,151,115,0.5)]" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat */}
                <div className="lg:col-span-2 backdrop-blur-xl rounded-2xl p-6 flex flex-col" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    {conversaSelecionada ? (
                        <>
                            {/* Header do chat */}
                            <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#D99773]/20 flex items-center justify-center">
                                        <span className="text-[#D99773] font-bold text-sm">
                                            {conversas.find((c) => c.telefone === conversaSelecionada)?.nome.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {conversas.find((c) => c.telefone === conversaSelecionada)?.nome}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{conversaSelecionada}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Preview da conversa */}
                            <div className="flex-1 flex items-center justify-center py-8">
                                <div className="text-center">
                                    <MessageSquare size={40} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Visualização completa disponível em breve</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Última mensagem: {conversas.find(c => c.telefone === conversaSelecionada)?.ultimaMensagem}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>Selecione uma conversa</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
