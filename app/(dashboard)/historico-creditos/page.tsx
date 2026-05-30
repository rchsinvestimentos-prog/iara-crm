'use client'

import { useState, useEffect } from 'react'
import { CreditCard, TrendingDown, MessageSquare, Mic, Image, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface CreditEvent {
    type: 'text' | 'audio' | 'image' | 'charge' | 'purchase'
    descricao: string
    valor: number
    saldo: number
    createdAt: string
}

export default function HistoricoPage() {
    const [events, setEvents] = useState<CreditEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [saldoAtual, setSaldoAtual] = useState(0)

    useEffect(() => {
        fetch('/api/historico-creditos')
            .then(r => r.json())
            .then(data => {
                setEvents(data.historico || [])
                setSaldoAtual(data.saldoAtual || 0)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const getIcon = (type: string) => {
        if (type === 'audio') return <Mic size={13} className="text-purple-400" />
        if (type === 'image') return <Image size={13} className="text-blue-400" />
        if (type === 'purchase') return <CreditCard size={13} className="text-green-400" />
        return <MessageSquare size={13} className="text-[#D99773]" />
    }

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }

    return (
        <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
                <Link href="/dashboard" className="p-2 rounded-xl transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Histórico de Créditos 💳
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Todos os usos e recargas
                    </p>
                </div>
            </div>

            {/* Saldo Atual */}
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={cardStyle}>
                <div>
                    <p className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: 'var(--text-muted)' }}>Saldo Atual</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: saldoAtual > 200 ? '#06D6A0' : saldoAtual > 50 ? '#EAB308' : '#EF4444' }}>
                        {saldoAtual.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>créditos disponíveis</p>
                </div>
                <Link
                    href="/plano"
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #D99773, #C17A50)', color: 'white' }}
                >
                    Recarregar
                </Link>
            </div>

            {/* Legenda de custos */}
            <div className="rounded-2xl p-3 mb-4 grid grid-cols-3 gap-2" style={{ ...cardStyle, backgroundColor: 'var(--bg-subtle)' }}>
                <div className="text-center">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>💬 Mensagem texto</p>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>1 crédito</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🎙️ Áudio</p>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>3 créditos</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🖼️ Foto IA</p>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>10 créditos</p>
                </div>
            </div>

            {/* Lista de eventos */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-5 h-5 rounded-full border-2 border-[#D99773] border-t-transparent animate-spin" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Nenhum histórico ainda</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            O uso de créditos vai aparecer aqui conforme a IARA atender
                        </p>
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                        {events.map((ev, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    {getIcon(ev.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                        {ev.descricao}
                                    </p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(ev.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-[13px] font-bold ${ev.valor > 0 ? 'text-green-500' : 'text-red-400'}`}>
                                        {ev.valor > 0 ? `+${ev.valor}` : ev.valor}
                                    </p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        saldo: {ev.saldo}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
