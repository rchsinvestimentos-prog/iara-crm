'use client'

import { useState, useEffect } from 'react'
import {
    MessageSquare, Star, ThumbsUp, Send, Filter, Search,
    Mic, Video, FileText, Paperclip, CheckCircle, Clock,
    Sparkles, Loader2, ChevronDown, Eye
} from 'lucide-react'

interface Sugestao {
    id: number
    user_id: number
    nome_clinica: string
    email: string
    tipo: string
    mensagem: string
    arquivo_url: string | null
    arquivo_nome: string | null
    status: string
    resposta_admin: string | null
    respondido_em: string | null
    criado_em: string
}

const statusColor: Record<string, string> = {
    novo: 'bg-amber-500/10 text-amber-400',
    lido: 'bg-blue-500/10 text-blue-400',
    respondido: 'bg-green-500/10 text-green-400',
    implementado: 'bg-purple-500/10 text-purple-400',
}

const tipoIcon: Record<string, typeof FileText> = {
    texto: FileText,
    audio: Mic,
    video: Video,
    arquivo: Paperclip,
}

export default function FeedbackPage() {
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('todos')
    const [respostaAberta, setRespostaAberta] = useState<number | null>(null)
    const [respostaTexto, setRespostaTexto] = useState('')
    const [enviando, setEnviando] = useState(false)

    useEffect(() => { fetchData() }, [])

    async function fetchData() {
        try {
            const res = await fetch('/api/admin/sugestoes')
            if (res.ok) {
                const data = await res.json()
                setSugestoes(data.sugestoes || [])
            }
        } catch (err) {
            console.error('Erro:', err)
        } finally {
            setLoading(false)
        }
    }

    async function responder(id: number) {
        if (!respostaTexto.trim()) return
        setEnviando(true)
        try {
            await fetch('/api/admin/sugestoes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'respondido', resposta_admin: respostaTexto }),
            })
            setRespostaAberta(null)
            setRespostaTexto('')
            fetchData()
        } catch (err) {
            console.error('Erro:', err)
        } finally {
            setEnviando(false)
        }
    }

    async function mudarStatus(id: number, status: string) {
        try {
            await fetch('/api/admin/sugestoes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            })
            fetchData()
        } catch (err) {
            console.error('Erro:', err)
        }
    }

    const filtered = filtro === 'todos' ? sugestoes : sugestoes.filter(s => s.status === filtro)

    const stats = {
        total: sugestoes.length,
        novos: sugestoes.filter(s => s.status === 'novo').length,
        respondidos: sugestoes.filter(s => s.status === 'respondido').length,
        implementados: sugestoes.filter(s => s.status === 'implementado').length,
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquare size={22} className="text-[#D99773]" />
                        Sugestões dos Clientes
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Feedback das clínicas para melhorar a IARA</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, icon: MessageSquare, color: '#8B5CF6' },
                    { label: 'Novos', value: stats.novos, icon: Clock, color: '#F59E0B' },
                    { label: 'Respondidos', value: stats.respondidos, icon: CheckCircle, color: '#10B981' },
                    { label: 'Implementados', value: stats.implementados, icon: Sparkles, color: '#D99773' },
                ].map((s, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <s.icon size={16} style={{ color: s.color }} />
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    {['todos', 'novo', 'lido', 'respondido', 'implementado'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFiltro(t)}
                            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all capitalize ${filtro === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin text-[#D99773]" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                    <MessageSquare size={32} className="mx-auto mb-3 text-gray-700" />
                    <p className="text-sm text-gray-500">Nenhuma sugestão {filtro !== 'todos' ? `com status "${filtro}"` : ''}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(s => {
                        const TipoIcon = tipoIcon[s.tipo] || FileText
                        return (
                            <div key={s.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5 hover:bg-white/[0.07] transition-colors">
                                {/* Header */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="text-[13px] font-semibold text-white">{s.nome_clinica}</span>
                                    <span className="text-[10px] text-gray-500">• {s.email}</span>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <TipoIcon size={11} /> {s.tipo}
                                        </span>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[s.status]}`}>
                                            {s.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Message */}
                                <p className="text-[13px] text-gray-300 leading-relaxed mb-3">{s.mensagem}</p>

                                {/* File attachment */}
                                {s.arquivo_url && (
                                    <a href={s.arquivo_url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-400 hover:text-white transition-colors mb-3">
                                        <Paperclip size={12} /> {s.arquivo_nome || 'Arquivo anexo'}
                                    </a>
                                )}

                                {/* Admin response (if exists) */}
                                {s.resposta_admin && (
                                    <div className="bg-[#D99773]/5 border border-[#D99773]/15 rounded-lg p-3 mb-3">
                                        <p className="text-[10px] font-semibold text-[#D99773] mb-1">Sua resposta:</p>
                                        <p className="text-[12px] text-gray-300">{s.resposta_admin}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                                    <span className="text-[10px] text-gray-600">
                                        {new Date(s.criado_em).toLocaleDateString('pt-BR')} às {new Date(s.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div className="flex items-center gap-2 ml-auto">
                                        {s.status === 'novo' && (
                                            <button
                                                onClick={() => mudarStatus(s.id, 'lido')}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                            >
                                                <Eye size={12} /> Marcar lido
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setRespostaAberta(s.id === respostaAberta ? null : s.id); setRespostaTexto(s.resposta_admin || '') }}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#D99773]/10 text-[#D99773] hover:bg-[#D99773]/20 transition-colors"
                                        >
                                            <Send size={12} /> Responder
                                        </button>
                                        {s.status !== 'implementado' && (
                                            <button
                                                onClick={() => mudarStatus(s.id, 'implementado')}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
                                            >
                                                <Sparkles size={12} /> Implementado
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Response input */}
                                {respostaAberta === s.id && (
                                    <div className="mt-3 flex gap-2">
                                        <textarea
                                            value={respostaTexto}
                                            onChange={(e) => setRespostaTexto(e.target.value)}
                                            placeholder="Escreva sua resposta para a cliente..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-gray-500 outline-none resize-none min-h-[60px]"
                                        />
                                        <button
                                            onClick={() => responder(s.id)}
                                            disabled={enviando || !respostaTexto.trim()}
                                            className="self-end px-4 py-2.5 rounded-xl text-[12px] font-semibold disabled:opacity-30 transition-all"
                                            style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)', color: 'white' }}
                                        >
                                            {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
