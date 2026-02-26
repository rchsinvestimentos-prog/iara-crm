'use client'

import { useState, useEffect } from 'react'
import {
    Sparkles, Send, Mic, FileText, Video, Paperclip,
    CheckCircle, Clock, MessageCircle, Loader2, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface Sugestao {
    id: number
    tipo: string
    mensagem: string
    arquivo_url: string | null
    arquivo_nome: string | null
    status: string
    resposta_admin: string | null
    respondido_em: string | null
    criado_em: string
}

const statusLabel: Record<string, { text: string; color: string; icon: typeof Clock }> = {
    novo: { text: 'Enviado', color: 'text-amber-400 bg-amber-500/10', icon: Clock },
    lido: { text: 'Visualizado', color: 'text-blue-400 bg-blue-500/10', icon: CheckCircle },
    respondido: { text: 'Respondido', color: 'text-green-400 bg-green-500/10', icon: MessageCircle },
    implementado: { text: 'Implementado! ✨', color: 'text-purple-400 bg-purple-500/10', icon: Sparkles },
}

export default function MelhorarIARA() {
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [enviado, setEnviado] = useState(false)
    const [tipo, setTipo] = useState<'texto' | 'audio' | 'video' | 'arquivo'>('texto')
    const [mensagem, setMensagem] = useState('')

    useEffect(() => {
        fetchSugestoes()
    }, [])

    async function fetchSugestoes() {
        try {
            // TODO: pegar user_id real da sessão
            const res = await fetch('/api/sugestoes?user_id=1')
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

    async function enviar() {
        if (!mensagem.trim()) return
        setEnviando(true)
        try {
            const res = await fetch('/api/sugestoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 1, // TODO: pegar da sessão
                    nome_clinica: 'Minha Clínica', // TODO: pegar da sessão
                    tipo,
                    mensagem,
                }),
            })
            if (res.ok) {
                setMensagem('')
                setEnviado(true)
                setTimeout(() => setEnviado(false), 3000)
                fetchSugestoes()
            }
        } catch (err) {
            console.error('Erro:', err)
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="animate-fade-in">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={14} /> Voltar ao Dashboard
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center shadow-lg shadow-[#D99773]/20">
                        <Sparkles size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Melhorar a IARA</h1>
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                            Suas sugestões ajudam a IARA evoluir para todas as clínicas! 💜
                        </p>
                    </div>
                </div>
            </div>

            {/* New suggestion form */}
            <div
                className="glass-card p-5 animate-fade-in"
                style={{ animationDelay: '0.1s' }}
            >
                <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Send size={15} className="text-[#D99773]" />
                    Enviar Sugestão
                </h3>

                {/* Type selector */}
                <div className="flex gap-2 mb-4">
                    {[
                        { key: 'texto', label: 'Texto', icon: FileText },
                        { key: 'audio', label: 'Áudio', icon: Mic },
                        { key: 'video', label: 'Vídeo', icon: Video },
                        { key: 'arquivo', label: 'Arquivo', icon: Paperclip },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTipo(t.key as typeof tipo)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all ${tipo === t.key
                                    ? 'bg-[#D99773]/15 text-[#D99773] border border-[#D99773]/20'
                                    : 'border hover:border-[#D99773]/15'
                                }`}
                            style={{
                                borderColor: tipo === t.key ? undefined : 'var(--border-default)',
                                color: tipo === t.key ? undefined : 'var(--text-muted)',
                            }}
                        >
                            <t.icon size={13} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Texto input */}
                {tipo === 'texto' && (
                    <textarea
                        value={mensagem}
                        onChange={(e) => setMensagem(e.target.value)}
                        placeholder="Conte como podemos melhorar a IARA... Ex: 'Quando a cliente manda só um emoji, a IARA não deveria encerrar a conversa'"
                        className="w-full rounded-xl p-4 text-[13px] outline-none resize-none min-h-[100px] transition-all"
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-default)',
                        }}
                    />
                )}

                {/* Audio/Video/File placeholder */}
                {tipo !== 'texto' && (
                    <div
                        className="flex flex-col items-center justify-center rounded-xl p-8 cursor-pointer transition-all hover:border-[#D99773]/30"
                        style={{
                            border: '2px dashed var(--border-default)',
                            backgroundColor: 'var(--bg-subtle)',
                        }}
                    >
                        {tipo === 'audio' && <Mic size={28} className="text-[#D99773] mb-2" />}
                        {tipo === 'video' && <Video size={28} className="text-[#D99773] mb-2" />}
                        {tipo === 'arquivo' && <Paperclip size={28} className="text-[#D99773] mb-2" />}
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Clique para enviar {tipo === 'audio' ? 'um áudio' : tipo === 'video' ? 'um vídeo' : 'um arquivo'}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            {tipo === 'audio' ? 'MP3, WAV, OGG' : tipo === 'video' ? 'MP4, MOV' : 'PDF, DOC, Imagem'}
                        </p>
                        <textarea
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            placeholder="Adicione uma descrição (opcional)..."
                            className="w-full mt-4 rounded-lg p-3 text-[12px] outline-none resize-none min-h-[50px]"
                            style={{
                                backgroundColor: 'var(--bg-input)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-default)',
                            }}
                        />
                    </div>
                )}

                {/* Send button */}
                <div className="flex justify-end mt-4">
                    <button
                        onClick={enviar}
                        disabled={enviando || !mensagem.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
                        style={{
                            background: enviado ? '#06D6A0' : 'linear-gradient(135deg, #D99773, #C07A55)',
                            color: 'white',
                        }}
                    >
                        {enviando ? <Loader2 size={15} className="animate-spin" /> : enviado ? <CheckCircle size={15} /> : <Send size={15} />}
                        {enviando ? 'Enviando...' : enviado ? 'Enviado! ✨' : 'Enviar Sugestão'}
                    </button>
                </div>
            </div>

            {/* History */}
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-[14px] font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Clock size={15} className="text-[#D99773]" />
                    Suas Sugestões
                </h3>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={20} className="animate-spin text-[#D99773]" />
                    </div>
                ) : sugestoes.length === 0 ? (
                    <div className="glass-card text-center py-12">
                        <Sparkles size={28} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Nenhuma sugestão enviada ainda</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Sua opinião é muito importante para nós!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sugestoes.map(s => {
                            const st = statusLabel[s.status] || statusLabel.novo
                            return (
                                <div key={s.id} className="glass-card p-4">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ color: 'var(--text-muted)' }}>
                                                {s.tipo === 'texto' ? '📝' : s.tipo === 'audio' ? '🎤' : s.tipo === 'video' ? '🎬' : '📎'} {s.tipo}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${st.color}`}>
                                                {st.text}
                                            </span>
                                        </div>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>

                                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                        {s.mensagem}
                                    </p>

                                    {s.resposta_admin && (
                                        <div
                                            className="mt-3 p-3 rounded-xl"
                                            style={{
                                                backgroundColor: 'rgba(217, 151, 115, 0.05)',
                                                border: '1px solid rgba(217, 151, 115, 0.1)',
                                            }}
                                        >
                                            <p className="text-[10px] font-semibold text-[#D99773] mb-1">💬 Resposta da equipe IARA:</p>
                                            <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                                                {s.resposta_admin}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
