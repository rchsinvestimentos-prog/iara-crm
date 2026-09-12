'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Mic, Video, Image, Loader2, Lock, ChevronRight, CheckCircle2, Sparkles, Trash2, X, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { AVATAR_VIDEO_HABILITADO } from '@/lib/planos'

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
    // A clonagem é pacote avulso, não nível de plano. A aba travava em
    // "Plano 3+", então quem comprava o pacote no Start ou no Master nunca
    // conseguia gravar — e liberar pelo admin não adiantava nada.
    const [temPacoteClonagem, setTemPacoteClonagem] = useState(false)
    // Depois de clonar, a doutora precisa OUVIR como ficou. Sem isso ela grava,
    // o sistema diz "pronto", e ela só descobre o resultado quando a paciente
    // ouve — tarde demais para regravar.
    const [ouvindo, setOuvindo] = useState(false)
    const [amostraVoz, setAmostraVoz] = useState<string | null>(null)
    const [erroAmostra, setErroAmostra] = useState('')

    const ouvirMinhaVoz = async () => {
        setOuvindo(true)
        setErroAmostra('')
        try {
            const r = await fetch('/api/voz/testar-pronuncia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voz: 'clone',
                    texto: 'Oi! Consegui encaixar você na quinta às quinze horas, pode ser? Qualquer coisa é só me chamar por aqui.',
                }),
            })
            const d = await r.json()
            if (d.audioBase64) setAmostraVoz(`data:audio/mp3;base64,${d.audioBase64.split(',').pop()}`)
            else setErroAmostra(d.error || 'Não consegui gerar o áudio agora.')
        } catch {
            setErroAmostra('Não consegui gerar o áudio agora.')
        } finally {
            setOuvindo(false)
        }
    }
    const [temAvatar, setTemAvatar] = useState(false)
    const [msg, setMsg] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    // Gravação guiada. A clínica não sabe clonar voz: sem passo a passo, ela
    // manda um áudio com eco, com a TV ligada, ou de 5 segundos — e o clone
    // sai ruim sem ninguém entender por quê.
    const [gravando, setGravando] = useState(false)
    const [segundos, setSegundos] = useState(0)
    const [gravacao, setGravacao] = useState<{ blob: Blob; url: string } | null>(null)
    const [erroMic, setErroMic] = useState('')
    const recorderRef = useRef<MediaRecorder | null>(null)
    const cronometroRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const SEGUNDOS_MINIMO = 30
    const SEGUNDOS_MAXIMO = 90

    const pararGravacao = () => {
        recorderRef.current?.stop()
        recorderRef.current?.stream.getTracks().forEach(t => t.stop())
        if (cronometroRef.current) clearInterval(cronometroRef.current)
        setGravando(false)
    }

    const comecarGravacao = async () => {
        setErroMic('')
        setGravacao(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            })
            const rec = new MediaRecorder(stream)
            const pedacos: Blob[] = []
            rec.ondataavailable = e => { if (e.data.size > 0) pedacos.push(e.data) }
            rec.onstop = () => {
                const blob = new Blob(pedacos, { type: rec.mimeType || 'audio/webm' })
                setGravacao({ blob, url: URL.createObjectURL(blob) })
            }
            recorderRef.current = rec
            rec.start()
            setGravando(true)
            setSegundos(0)
            cronometroRef.current = setInterval(() => {
                setSegundos(s => {
                    if (s + 1 >= SEGUNDOS_MAXIMO) { pararGravacao(); return SEGUNDOS_MAXIMO }
                    return s + 1
                })
            }, 1000)
        } catch {
            setErroMic('Não consegui acessar o microfone. Autorize o microfone no navegador e tente de novo.')
        }
    }

    useEffect(() => {
        Promise.all([
            fetch('/api/stats').then(r => r.json()),
            fetch('/api/midia/clonar-voz').then(r => r.json()).catch(() => ({ plano: 1 })),
            fetch('/api/midia/clonar-avatar').then(r => r.json()).catch(() => ({ plano: 1 })),
        ]).then(([stats, voz, avatar]) => {
            setPlano(stats?.plano || voz?.plano || 1)
            setTemVoz(voz?.temVoz || false)
            setTemPacoteClonagem(!!voz?.temPacote)
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

    // Confirmação antes de clonar. O aviso só aparece aqui, no momento do
    // clique — deixá-lo fixo na tela antes disso fazia a clínica desistir de
    // clonar antes mesmo de tentar.
    const [confirmandoClone, setConfirmandoClone] = useState(false)
    const [ajustandoModo, setAjustandoModo] = useState(false)
    const [modoAjustado, setModoAjustado] = useState(false)

    /** Liga o Modo IA sem sair da tela: a IARA passa a responder sem se apresentar. */
    const ativarModoIA = async () => {
        setAjustandoModo(true)
        try {
            const r = await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modoIA: 'ia_pura' }),
            })
            if (r.ok) setModoAjustado(true)
            else setMsg('❌ Não consegui alterar a configuração. Tente por Atendimento → Modo de Operação.')
        } catch {
            setMsg('❌ Não consegui alterar a configuração. Tente por Atendimento → Modo de Operação.')
        } finally {
            setAjustandoModo(false)
        }
    }

    const clonarVoz = async () => {
        setConfirmandoClone(false)
        if (!gravacao && arquivos.length === 0) { setMsg('Grave a sua voz ou envie um áudio primeiro'); return }
        setClonando('voz')
        try {
            // A gravação feita aqui na tela tem prioridade: ela passou pelo
            // passo a passo e tem duração conferida.
            let blob: Blob
            let nome: string
            if (gravacao) {
                blob = gravacao.blob
                nome = 'gravacao.webm'
            } else {
                const audioRes = await fetch(arquivos[0].url)
                blob = await audioRes.blob()
                nome = arquivos[0].nome
            }
            const form = new FormData()
            form.append('audio', blob, nome)
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

    const tabs: { id: Tipo; label: string; icon: typeof Image; liberada: boolean }[] = [
        { id: 'foto', label: 'Fotos', icon: Image, liberada: true },
        { id: 'audio', label: 'Voz', icon: Mic, liberada: temPacoteClonagem },
        ...(AVATAR_VIDEO_HABILITADO ? [{ id: 'video' as Tipo, label: 'Avatar', icon: Video, liberada: plano >= 3 }] : []),
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
            <div className={`grid grid-cols-1 gap-3 ${AVATAR_VIDEO_HABILITADO ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {[
                    { label: 'Fotos', ok: true, desc: 'Todos os planos', icon: '📸' },
                    { label: 'Voz Clonada', ok: temVoz, desc: temPacoteClonagem ? (temVoz ? 'sua voz está ativa ✓' : 'Disponível — grave a sua voz') : 'Pacote à parte', icon: '🎤', locked: !temPacoteClonagem },
                    ...(AVATAR_VIDEO_HABILITADO ? [{ label: 'Avatar Vídeo', ok: temAvatar, desc: temAvatar ? 'HeyGen ativo ✓' : 'Disponível — envie vídeo', icon: '🎬', locked: false }] : []),
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
                    const locked = !t.liberada
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

            {/* ============ Ouvir a voz clonada ============ */}
            {tab === 'audio' && temVoz && (
                <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div>
                        <h3 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <CheckCircle2 size={16} style={{ color: '#06D6A0' }} /> A sua voz está ativa
                        </h3>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            Ouça como ficou antes de a primeira paciente ouvir.
                        </p>
                    </div>

                    {amostraVoz ? (
                        <div className="space-y-2">
                            <audio controls autoPlay src={amostraVoz} className="w-full" />
                            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                                Não ficou parecida, ou saiu com eco? Grave de novo num lugar com mais tecido — o resultado depende da gravação.
                            </p>
                        </div>
                    ) : erroAmostra ? (
                        <p className="text-[12px] rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{erroAmostra}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <button onClick={ouvirMinhaVoz} disabled={ouvindo}
                            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                            {ouvindo ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                            {ouvindo ? 'Gerando...' : amostraVoz ? 'Ouvir de novo' : 'Ouvir a minha voz'}
                        </button>
                        <button onClick={() => { setTemVoz(false); setGravacao(null); setAmostraVoz(null) }}
                            className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                            Regravar a minha voz
                        </button>
                    </div>
                </div>
            )}

            {/* ============ Gravação guiada da voz ============ */}
            {tab === 'audio' && !temVoz && (
                <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div>
                        <h3 className="text-[14px] font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Mic size={16} style={{ color: '#D99773' }} /> Gravar a sua voz
                        </h3>
                        <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            Leva um minuto. O resultado depende bem mais de <strong>onde</strong> você grava do que do que você fala.
                        </p>
                    </div>

                    <div className="rounded-xl p-4 space-y-2.5" style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.2)' }}>
                        <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Antes de começar</p>
                        <ul className="text-[12px] space-y-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            <li><strong>Grave dentro do closet, com a porta fechada</strong>, ou num quarto com cortina, tapete e cama. Roupa e tecido absorvem o eco.</li>
                            <li><strong>Evite sala vazia, piso frio e parede nua.</strong> O eco entra na gravação e a sua voz clonada fica com som de banheiro — e isso não tem como tirar depois.</li>
                            <li><strong>Desligue ar-condicionado, TV e música.</strong> Ninguém mais falando no ambiente.</li>
                            <li><strong>Celular a um palmo da boca</strong>, falando no tom que você usa com paciente. Nem locutora, nem sussurrando.</li>
                            <li><strong>Fale sem parar até o fim</strong>, no mesmo volume e no mesmo ânimo, com pausas curtas entre as frases.</li>
                        </ul>
                    </div>

                    <div>
                        <p className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                            Não sabe o que falar? Lê isso em voz alta:
                        </p>
                        <div className="rounded-xl p-3.5 text-[12.5px] leading-relaxed italic" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                            “Oi, tudo bem? Que bom que você entrou em contato com a gente. Eu cuido dos atendimentos
                            aqui da clínica e vou te ajudar a encontrar o melhor horário. A gente trabalha com vários
                            procedimentos, e cada pessoa tem uma necessidade diferente, então eu gosto sempre de
                            entender primeiro o que você está buscando. Me conta um pouco do que você tem vontade de
                            fazer, que eu te explico com calma como funciona, quanto tempo leva e como a gente
                            costuma conduzir. Fico à disposição, tá bom? Vai ser um prazer te atender.”
                        </div>
                        <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                            Pode falar com as suas palavras também — sai até mais natural.
                        </p>
                    </div>

                    {erroMic && (
                        <p className="text-[12px] rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>{erroMic}</p>
                    )}

                    {gravando ? (
                        <div className="flex items-center gap-3">
                            <button onClick={pararGravacao}
                                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center gap-2"
                                style={{ backgroundColor: '#EF4444' }}>
                                <span className="w-2.5 h-2.5 rounded-sm bg-white" /> Parar
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#EF4444' }} />
                                <span className="text-[15px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}
                                </span>
                                <span className="text-[11px]" style={{ color: segundos < SEGUNDOS_MINIMO ? '#D99773' : '#06D6A0' }}>
                                    {segundos < SEGUNDOS_MINIMO ? `continue falando — faltam ${SEGUNDOS_MINIMO - segundos}s` : 'já dá! pode parar quando quiser'}
                                </span>
                            </div>
                        </div>
                    ) : gravacao ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: segundos < SEGUNDOS_MINIMO ? '#D99773' : '#06D6A0' }}>
                                {segundos < SEGUNDOS_MINIMO
                                    ? `Ficou com ${segundos}s — curto demais. O ideal é passar de ${SEGUNDOS_MINIMO}s.`
                                    : `Gravação de ${segundos}s pronta. Ouça antes de usar.`}
                            </div>
                            <audio controls src={gravacao.url} className="w-full" />
                            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                                Ouviu eco, chiado ou barulho de fundo? Grave de novo — o clone sai igual ao que você ouviu aqui.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={comecarGravacao}
                                    className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                                    style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                                    Gravar de novo
                                </button>
                                <button onClick={() => setConfirmandoClone(true)} disabled={clonando === 'voz' || segundos < SEGUNDOS_MINIMO}
                                    className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                                    {clonando === 'voz' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Usar esta gravação
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={comecarGravacao}
                            className="px-5 py-3 rounded-xl text-[13px] font-semibold text-white flex items-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                            <Mic size={15} /> Começar a gravar
                        </button>
                    )}
                </div>
            )}

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
                    onClick={() => setConfirmandoClone(true)}
                    disabled={!!clonando}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}
                >
                    {clonando === 'voz' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {temVoz ? 'Reclonar Minha Voz' : 'Clonar Minha Voz'}
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

            {/* Sem o pacote: convite para comprar, não para trocar de plano —
                subir de plano não destrava a clonagem e a clínica pagaria à toa. */}
            {tab === 'audio' && !temPacoteClonagem && (
                <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <Lock size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        A clonagem de voz é um pacote à parte
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                        Some ao seu plano atual, seja ele qual for. Nenhum plano já inclui.
                    </p>
                    <Link href="/plano" className="inline-flex items-center gap-1 text-sm font-semibold text-[#D99773]">
                        Ver o pacote <ChevronRight size={14} />
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
                <p>• Áudio: enviado para o Fish Audio para clonar sua voz</p>
                {AVATAR_VIDEO_HABILITADO && <p>• Vídeo: enviado para HeyGen para criar seu avatar</p>}
            </div>

            {/* ============ Confirmação antes de clonar a voz ============ */}
            {/* Com a voz da doutora, a paciente assume que está falando com ela.
                Se a IARA seguir se apresentando pelo próprio nome, a conversa
                fica incoerente. O ajuste é feito aqui mesmo, num clique, para
                não obrigar a clínica a sair da tela no meio do processo. */}
            {confirmandoClone && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(8,20,26,0.55)' }}
                    onClick={() => setConfirmandoClone(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
                        style={{ backgroundColor: 'var(--bg-card, #fff)', border: '1px solid var(--border-default)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'rgba(217,151,115,0.15)' }}>
                                <Mic size={18} style={{ color: '#D99773' }} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                                    Sua voz vai atender por você
                                </h3>
                                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                    A partir de agora a paciente vai ouvir a sua voz e achar que
                                    está falando com você.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl p-4 flex flex-col gap-3"
                            style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.25)' }}>
                            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                Só falta um ajuste: hoje a IARA se apresenta dizendo o nome dela.
                                Com a sua voz, isso soa estranho — a voz é sua, mas o nome é de
                                outra pessoa. Melhor ela responder direto, sem se apresentar.
                            </p>

                            {modoAjustado ? (
                                <div className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: '#06D6A0' }}>
                                    <CheckCircle2 size={15} />
                                    Pronto! Agora ela responde direto, sem se apresentar.
                                </div>
                            ) : (
                                <button
                                    onClick={ativarModoIA}
                                    disabled={ajustandoModo}
                                    className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center justify-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)', opacity: ajustandoModo ? 0.6 : 1 }}
                                >
                                    {ajustandoModo ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    Ajustar para não se apresentar
                                </button>
                            )}
                        </div>

                        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            Mesmo com a sua voz, quem responde é a IARA. Assuma a conversa
                            pessoalmente quando a paciente pedir algo que só você pode responder.
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmandoClone(false)}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={clonarVoz}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                                style={{ background: 'linear-gradient(135deg, #0F4C61, #0A3845)' }}
                            >
                                Clonar minha voz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
