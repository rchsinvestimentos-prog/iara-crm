'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, ArrowLeft, Bot, User, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Msg {
    role: 'user' | 'assistant'
    content: string
}

export default function SimuladorPage() {
    const [msgs, setMsgs] = useState<Msg[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
    }, [msgs])

    async function enviar() {
        if (!input.trim() || loading) return

        const novaMensagem = input.trim()
        setInput('')
        const novoHistorico: Msg[] = [...msgs, { role: 'user', content: novaMensagem }]
        setMsgs(novoHistorico)
        setLoading(true)

        try {
            const res = await fetch('/api/simulador', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensagem: novaMensagem,
                    historico: novoHistorico.slice(-10), // últimas 10 msgs
                }),
            })

            if (res.ok) {
                const data = await res.json()
                setMsgs(prev => [...prev, { role: 'assistant', content: data.resposta }])
            } else {
                setMsgs(prev => [...prev, { role: 'assistant', content: '❌ Erro ao gerar resposta. Tente novamente.' }])
            }
        } catch {
            setMsgs(prev => [...prev, { role: 'assistant', content: '❌ Erro de conexão.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Header */}
            <div className="flex-none pb-4 animate-fade-in">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={14} /> Voltar ao Dashboard
                </Link>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center shadow-lg shadow-[#D99773]/20">
                            <Bot size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Simulador de Conversa</h1>
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                Teste como sua IARA responde — sem gastar créditos
                            </p>
                        </div>
                    </div>
                    {msgs.length > 0 && (
                        <button
                            onClick={() => setMsgs([])}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all hover:bg-red-500/10 hover:text-red-400"
                            style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                        >
                            <Trash2 size={13} /> Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto rounded-2xl p-4 space-y-4 mb-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
                {msgs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Bot size={48} className="mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Fale como se fosse uma cliente
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            Ex: &quot;Oi, quanto custa botox?&quot; ou &quot;Quero agendar uma consulta&quot;
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {['Oi, tudo bem?', 'Quanto custa botox?', 'Quero agendar', 'Vocês têm promoção?'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => { setInput(q); }}
                                    className="px-3 py-1.5 rounded-full text-[11px] transition-all hover:bg-[#D99773]/15"
                                    style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {msgs.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot size={14} className="text-white" />
                            </div>
                        )}
                        <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${m.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                                }`}
                            style={m.role === 'user' ? {
                                background: 'linear-gradient(135deg, #D99773, #C07A55)',
                                color: 'white',
                            } : {
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            {m.content}
                        </div>
                        {m.role === 'user' && (
                            <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center flex-shrink-0 mt-1">
                                <User size={14} className="text-[#8B5CF6]" />
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center flex-shrink-0">
                            <Bot size={14} className="text-white" />
                        </div>
                        <div className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                            <Loader2 size={14} className="animate-spin text-[#D99773]" />
                            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Digitando...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="flex-none">
                <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && enviar()}
                        placeholder="Fale como uma cliente..."
                        className="flex-1 bg-transparent outline-none text-[13px]"
                        style={{ color: 'var(--text-primary)' }}
                        disabled={loading}
                    />
                    <button
                        onClick={enviar}
                        disabled={loading || !input.trim()}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                        style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin text-white" /> : <Send size={16} className="text-white" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
