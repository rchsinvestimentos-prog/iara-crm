'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Mic, Video, Image, Loader2, Lock, ChevronRight, CheckCircle2, Sparkles, Trash2, X } from 'lucide-react'
import Link from 'next/link'

type Tipo = 'foto' | 'audio' | 'video'

interface Arquivo {
    nome: string
    url: string
    tamanho: number
    data: string
}

export default function MidiaPage() {
    const [plano, setPlano] = useState(1)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [clonando, setClonando] = useState<string | null>(null)
    const [tab, setTab] = useState<Tipo>('foto')
    const [arquivos, setArquivos] = useState<Arquivo[]>([])
    const [temVoz, setTemVoz] = useState(false)
    const [temAvatar, setTemAvatar] = useState(false)
    const [msg, setMsg] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        Promise.all([
            fetch('/api/stats').then(r => r.json()),
            fetch('/api/midia/clonar-voz').then(r => r.json()).catch(() => ({ plano: 1 })),
            fetch('/api/midia/clonar-avatar').then(r => r.json()).catch(() => ({ plano: 1 })),
        ]).then(([stats, voz, avatar]) => {
            setPlano(stats?.plano || voz?.plano || 1)
            setTemVoz(voz?.temVoz || false)
            setTemAvatar(avatar?.temAvatar || false)
        }).finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!loading) carregarArquivos()
    }, [tab, loading])

    const carregarArquivos = async () => {
        try {
            const r = await fetch(`/api/midia/upload?tipo=${tab}`)
            const data = await r.json()
            setArquivos(data.arquivos || [])
        } catch { setArquivos([]) }
    }

    const upload = async (file: File) => {
        setUploading(true)
        setMsg('')
        try {
            const form = new FormData()
            form.append('file', file)
            form.append('tipo', tab)
            const r = await fetch('/api/midia/upload', { method: 'POST', body: form })
            const data = await r.json()
            if (data.ok) {
                setMsg(data.mensagem)
                carregarArquivos()
            } else {
                setMsg(`❌ ${data.error}`)
            }
        } catch { setMsg('❌ Erro no upload') }
        finally { setUploading(false) }
    }

    const clonarVoz = async () => {
        if (arquivos.length === 0) { setMsg('Envie um áudio primeiro'); return }
        setClonando('voz')
        try {
            // Fetch the uploaded audio file and send to ElevenLabs
            const audioUrl = arquivos[0].url
            const audioRes = await fetch(audioUrl)
            const blob = await audioRes.blob()
            const form = new FormData()
            form.append('audio', blob, arquivos[0].nome)
            const r = await fetch('/api/midia/clonar-voz', { method: 'POST', body: form })
            const data = await r.json()
            if (data.ok) {
                setMsg(`✅ ${data.mensagem}`)
                setTemVoz(true)
            } else setMsg(`❌ ${data.error}`)
        } catch { setMsg('❌ Erro ao clonar voz') }
        finally { setClonando(null) }
    }

    const clonarAvatar = async () => {
        if (arquivos.length === 0) { setMsg('Envie um vídeo primeiro'); return }
        setClonando('avatar')
        try {
            const videoUrl = arquivos[0].url
            const videoRes = await fetch(videoUrl)
            const blob = await videoRes.blob()
            const form = new FormData()
            form.append('video', blob, arquivos[0].nome)
            const r = await fetch('/api/midia/clonar-avatar', { method: 'POST', body: form })
            const data = await r.json()
            if (data.ok) {
                setMsg(`✅ ${data.mensagem}`)
                setTemAvatar(true)
            } else setMsg(`❌ ${data.error}`)
        } catch { setMsg('❌ Erro ao criar avatar') }
        finally { setClonando(null) }
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    const accepts: Record<Tipo, string> = {
        foto: 'image/*',
        audio: 'audio/*',
        video: 'video/*',
    }

    const tabs: { id: Tipo; label: string; icon: typeof Image; planoMin: number }[] = [
        { id: 'foto', label: 'Fotos', icon: Image, planoMin: 1 },
        { id: 'audio', label: 'Voz', icon: Mic, planoMin: 3 },
        { id: 'video', label: 'Avatar', icon: Video, planoMin: 4 },
    ]

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#D99773]" /></div>
    }

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                    <Upload size={26} className="text-[#D99773]" /> Mídia & Clonagem
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Envie fotos, clone sua voz e crie seu avatar com IA
                </p>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                    { label: 'Fotos', ok: true, desc: 'Todos os planos', icon: '📸' },
                    { label: 'Voz Clonada', ok: temVoz, desc: plano >= 3 ? (temVoz ? 'ElevenLabs ativo ✓' : 'Disponível — envie áudio') : 'Plano 3+', icon: '🎤', locked: plano < 3 },
                    { label: 'Avatar Vídeo', ok: temAvatar, desc: plano >= 4 ? (temAvatar ? 'HeyGen ativo ✓' : 'Disponível — envie vídeo') : 'Plano 4', icon: '🎬', locked: plano < 4 },
                ].map(card => (
                    <div key={card.label} className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <span className="text-2xl">{card.icon}</span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                {card.label}
                                {card.locked && <Lock size={12} className="text-[#D99773]" />}
                                {card.ok && !card.locked && <CheckCircle2 size={13} className="text-green-400" />}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                {tabs.map(t => {
                    const Icon = t.icon
                    const locked = plano < t.planoMin
                    return (
                        <button
                            key={t.id}
                            onClick={() => !locked && setTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'shadow-sm' : ''}`}
                            style={{
                                backgroundColor: tab === t.id ? 'var(--bg-card)' : 'transparent',
                                color: locked ? 'var(--text-muted)' : tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                                opacity: locked ? 0.5 : 1,
                            }}
                            disabled={locked}
                        >
                            <Icon size={15} /> {t.label}
                            {locked && <Lock size={11} />}
                        </button>
                    )
                })}
            </div>

            {/* Upload zone */}
            <div
                className="rounded-2xl p-8 text-center cursor-pointer transition-all hover:scale-[1.01]"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '2px dashed var(--border-default)',
                }}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f) }}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={accepts[tab]}
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }}
                />
                {uploading ? (
                    <Loader2 size={32} className="mx-auto animate-spin text-[#D99773] mb-3" />
                ) : (
                    <Upload size={32} className="mx-auto mb-3 text-[#D99773]" />
                )}
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {uploading ? 'Enviando...' : tab === 'foto'
                        ? 'Arraste fotos ou toque para selecionar da galeria'
                        : tab === 'audio'
                            ? 'Envie áudio de 1-3 minutos da sua voz (fale naturalmente)'
                            : 'Envie vídeo de 2-5 minutos (rosto frontal, boa iluminação)'}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {tab === 'foto' ? 'JPG, PNG até 10MB' : tab === 'audio' ? 'MP3, WAV, M4A até 25MB' : 'MP4, MOV até 200MB'}
                </p>
            </div>

            {/* Mensagem de feedback */}
            {msg && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{
                    backgroundColor: msg.startsWith('✅') ? 'rgba(6,214,160,0.1)' : msg.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(217,151,115,0.1)',
                    color: msg.startsWith('✅') ? '#06D6A0' : msg.startsWith('❌') ? '#EF4444' : '#D99773',
                }}>
                    <span className="flex-1">{msg}</span>
                    <button onClick={() => setMsg('')}><X size={14} /></button>
                </div>
            )}

            {/* Clone buttons */}
            {tab === 'audio' && arquivos.length > 0 && (
                <button
                    onClick={clonarVoz}
                    disabled={!!clonando}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}
                >
                    {clonando === 'voz' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {temVoz ? 'Reclonar Voz (ElevenLabs)' : 'Clonar Minha Voz (ElevenLabs)'}
                </button>
            )}

            {tab === 'video' && arquivos.length > 0 && (
                <button
                    onClick={clonarAvatar}
                    disabled={!!clonando}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #0F4C61, #0A3845)' }}
                >
                    {clonando === 'avatar' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {temAvatar ? 'Recriar Avatar (HeyGen)' : 'Criar Meu Avatar (HeyGen)'}
                </button>
            )}

            {/* Locked upgrade CTA */}
            {((tab === 'audio' && plano < 3) || (tab === 'video' && plano < 4)) && (
                <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <Lock size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                        {tab === 'audio' ? 'Clonagem de voz disponível no Plano Designer (3)' : 'Avatar em vídeo disponível no Plano Audiovisual (4)'}
                    </p>
                    <Link href="/plano" className="inline-flex items-center gap-1 text-sm font-semibold text-[#D99773]">
                        Fazer Upgrade <ChevronRight size={14} />
                    </Link>
                </div>
            )}

            {/* Arquivos enviados */}
            {arquivos.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {tab === 'foto' ? '📸' : tab === 'audio' ? '🎤' : '🎬'} Arquivos ({arquivos.length})
                        </h3>
                    </div>
                    {tab === 'foto' ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-1 p-1">
                            {arquivos.map(a => (
                                <div key={a.nome} className="relative aspect-square rounded-lg overflow-hidden group">
                                    <img src={a.url} alt={a.nome} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-[10px] text-white">{formatSize(a.tamanho)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                            {arquivos.map(a => (
                                <div key={a.nome} className="p-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                        {tab === 'audio' ? <Mic size={14} className="text-[#D99773]" /> : <Video size={14} className="text-[#D99773]" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{a.nome}</p>
                                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatSize(a.tamanho)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Info block */}
            <div className="rounded-xl p-4 text-xs space-y-1" style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.15)', color: 'var(--text-muted)' }}>
                <p><strong style={{ color: 'var(--text-primary)' }}>📁 Onde seus arquivos ficam salvos?</strong></p>
                <p>Seus arquivos são armazenados no servidor da IARA em pasta exclusiva da sua clínica. Nenhum dado é compartilhado entre clínicas.</p>
                <p>• Fotos: usadas para posts e portfólio IA</p>
                <p>• Áudio (Plano 3): enviado para ElevenLabs para clonar sua voz</p>
                <p>• Vídeo (Plano 4): enviado para HeyGen para criar seu avatar</p>
            </div>
        </div>
    )
}
