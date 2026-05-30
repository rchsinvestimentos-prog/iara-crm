'use client'

import { useEffect, useState } from 'react'
import { Instagram, Plus, Trash2, MessageSquare, Send, Loader2, Lock, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface RespostaAuto {
    id: number
    tipo: string
    gatilho: string
    palavras_chave: string[]
    respostas: string[]
    acao_follow_up: string
    dm_automatica: string
    ativo: boolean
}

const TEMPLATES = [
    {
        nome: '💬 Genérico — Resposta Natural',
        tipo: 'comentario',
        gatilho: 'qualquer',
        palavrasChave: [],
        respostas: ['Que bom que gostou! 💜', 'Obrigada, flor! 🌸', 'Amamos ver vocês por aqui! ✨', '💜💜'],
        acaoFollowUp: 'nenhuma',
        dmAutomatica: '',
    },
    {
        nome: '💰 Preço → Entra no Direct',
        tipo: 'comentario',
        gatilho: 'palavra_chave',
        palavrasChave: ['preço', 'valor', 'quanto', 'custa', 'parcela'],
        respostas: ['Te mandei no direct! 💜', 'Olha o direct que te mandei tudinho! 📩', 'Confere o direct, amiga! 💅'],
        acaoFollowUp: 'enviar_dm',
        dmAutomatica: 'Oii! Vi que você perguntou sobre valores 💅\n\nVou te passar nosso cardápio completo! Qual procedimento te interessa mais?',
    },
    {
        nome: '📸 Engajamento — Agradece',
        tipo: 'comentario',
        gatilho: 'palavra_chave',
        palavrasChave: ['linda', 'perfeita', 'amei', 'resultado', 'ficou', 'maravilhosa'],
        respostas: ['Ficou demais, né? 😍', 'Resultado incrível! 💜✨', 'Obrigada pelo carinho! 💅', 'Amamos esse resultado! 🌸'],
        acaoFollowUp: 'nenhuma',
        dmAutomatica: '',
    },
]

export default function InstagramPage() {
    const [respostas, setRespostas] = useState<RespostaAuto[]>([])
    const [loading, setLoading] = useState(true)
    const [plano, setPlano] = useState(1)
    const [salvando, setSalvando] = useState(false)
    const [conectado, setConectado] = useState(false)
    const [igUsername, setIgUsername] = useState('')
    const [conectando, setConectando] = useState(false)

    useEffect(() => {
        // Checar URL params (volta do OAuth)
        const params = new URLSearchParams(window.location.search)
        if (params.get('connected') === 'true') {
            setConectado(true)
            setIgUsername(params.get('username') || '')
        }

        fetch('/api/instagram/respostas')
            .then(r => r.json())
            .then(data => {
                if (data.error && data.planoNecessario) {
                    setPlano(data.planoAtual || 1)
                } else {
                    setRespostas(data.respostas || [])
                    setPlano(data.plano || 2)
                    if (data.config?.ig_username) {
                        setConectado(true)
                        setIgUsername(data.config.ig_username)
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const conectarInstagram = async () => {
        setConectando(true)
        try {
            const res = await fetch('/api/instagram/auth')
            const data = await res.json()
            if (data.authUrl) {
                window.location.href = data.authUrl
            }
        } catch (e) { console.error(e); setConectando(false) }
    }

    const salvarTemplate = async (tpl: typeof TEMPLATES[0]) => {
        setSalvando(true)
        try {
            const res = await fetch('/api/instagram/respostas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tpl),
            })
            if (res.ok) {
                const data = await fetch('/api/instagram/respostas').then(r => r.json())
                setRespostas(data.respostas || [])
            }
        } catch (e) { console.error(e) }
        finally { setSalvando(false) }
    }

    const deletar = async (id: number) => {
        await fetch(`/api/instagram/respostas?id=${id}`, { method: 'DELETE' })
        setRespostas(prev => prev.filter(r => r.id !== id))
    }

    // Plano 1 → bloqueado
    if (!loading && plano < 2) {
        return (
            <div className="max-w-3xl space-y-6">
                <div className="flex items-center gap-3">
                    <Instagram size={28} className="text-[#D99773]" />
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Instagram</h1>
                </div>
                <div className="backdrop-blur-xl rounded-2xl p-10 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <Lock size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                    <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Instagram disponível a partir do Plano Estrategista
                    </h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                        Com o Instagram ativado, a IARA responde comentários automaticamente e envia DMs personalizadas — igual ao ManyChat, só que integrado!
                    </p>
                    <ul className="text-left max-w-sm mx-auto space-y-2 mb-6">
                        {['Auto-resposta em comentários (3-5 rotações)', 'DM automática após comentário', 'Respostas por palavra-chave', 'Atendimento completo no DM via IA', 'Analytics de engajamento'].map(f => (
                            <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                <Sparkles size={13} className="text-[#D99773] flex-shrink-0" /> {f}
                            </li>
                        ))}
                    </ul>
                    <Link href="/plano" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                        Fazer Upgrade <ChevronRight size={15} />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Instagram size={28} className="text-[#D99773]" />
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Instagram</h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Auto-respostas em comentários e DMs</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#D99773]" /></div>
            ) : (
                <>
                    {/* Card de Conexão */}
                    <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${conectado ? 'bg-green-500/10' : 'bg-gray-100'}`}>
                                    <Instagram size={20} className={conectado ? 'text-green-500' : 'text-gray-400'} />
                                </div>
                                <div>
                                    {conectado ? (
                                        <>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                @{igUsername} <span className="text-green-500 text-xs font-normal ml-1">● Conectado</span>
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                IARA está respondendo DMs e comentários automaticamente
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                Conecte seu Instagram
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                A IARA vai responder DMs e comentários por você, 24/7
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                            {!conectado && (
                                <button
                                    onClick={conectarInstagram}
                                    disabled={conectando}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg, #E1306C, #C13584, #833AB4)' }}
                                >
                                    {conectando ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Instagram size={14} />
                                    )}
                                    Conectar Instagram
                                </button>
                            )}
                            {conectado && (
                                <button
                                    onClick={conectarInstagram}
                                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                                    style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}
                                >
                                    Reconectar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Templates prontos */}
                    <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Sparkles size={15} className="text-[#D99773]" /> Templates Prontos (estilo ManyChat)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {TEMPLATES.map((tpl, i) => (
                                <div key={i} className="p-4 rounded-xl transition-all hover:-translate-y-1" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                                    <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{tpl.nome}</h3>
                                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                                        Gatilho: {tpl.gatilho === 'qualquer' ? 'Qualquer comentário' : tpl.palavrasChave.join(', ')}
                                    </p>
                                    <p className="text-xs mb-3 truncate" style={{ color: 'var(--text-muted)' }}>
                                        {tpl.respostas.length} respostas rotativas
                                    </p>
                                    <button
                                        onClick={() => salvarTemplate(tpl)}
                                        disabled={salvando}
                                        className="w-full text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1 text-white"
                                        style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}
                                    >
                                        {salvando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                                        Ativar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Respostas configuradas */}
                    <div className="backdrop-blur-xl rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <div className="p-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <MessageSquare size={15} className="text-[#D99773]" />
                                Respostas Ativas ({respostas.length})
                            </h2>
                        </div>

                        {respostas.length === 0 ? (
                            <div className="py-12 text-center">
                                <Instagram size={40} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma auto-resposta configurada.</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Use os templates acima para começar!</p>
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                                {respostas.map(r => (
                                    <div key={r.id} className="p-4 flex items-start gap-3">
                                        <Send size={14} className="text-[#D99773] mt-1 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {r.gatilho === 'qualquer' ? 'Qualquer comentário' : `Palavras: ${(r.palavras_chave || []).join(', ')}`}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(r.respostas || []).map((resp, i) => (
                                                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                                        {resp.length > 40 ? resp.slice(0, 37) + '...' : resp}
                                                    </span>
                                                ))}
                                            </div>
                                            {r.dm_automatica && (
                                                <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                                                    📩 DM: {r.dm_automatica}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => deletar(r.id)} className="text-red-400 hover:text-red-300 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.15)', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>💡 Como funciona (estilo ManyChat):</strong>
                        <ol className="list-decimal pl-4 mt-2 space-y-1 text-xs">
                            <li>Cliente comenta no seu post do Instagram</li>
                            <li>IARA responde o comentário com uma das frases (alternando entre elas)</li>
                            <li>Automaticamente envia DM personalizada para a cliente</li>
                            <li>Na DM, a IARA pode continuar a conversa usando IA (como no WhatsApp!)</li>
                        </ol>
                    </div>
                </>
            )}
        </div>
    )
}
