'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Send, Trash2, Volume2, Play, Pause, RefreshCw, Info, PhoneOff, ImagePlus, X } from 'lucide-react'

// ============================================
// TIPOS
// ============================================
type Bubble = {
    id: string
    role: 'user' | 'iara'
    text: string
    audioUrl?: string        // áudio do usuário ou resposta TTS
    imageDataUrl?: string    // imagem que o usuário enviou (para exibir na bolha)
    tipo: 'text' | 'audio' | 'image'
    timestamp: Date
    transcricao?: string     // se enviou áudio, mostra o que foi transcrito
    loading?: boolean
    logs?: string[]
    silencio?: boolean
    motivo?: string
    creditosRestantes?: number
}

type PipelineStatus = 'idle' | 'ativo' | 'pausado' | 'sem_creditos' | 'inativo'

// ============================================
// UTILITÁRIOS
// ============================================
function formatTime(date: Date) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function audioB64ToUrl(b64: string): string {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'audio/mp3' })
    return URL.createObjectURL(blob)
}

/** Converte um File/Blob de imagem para base64 puro (sem o prefixo data:...) */
async function fileToBase64(file: File | Blob): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // result = "data:image/jpeg;base64,/9j/4AAQ..."
            const [meta, data] = result.split(',')
            const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
            resolve({ base64: data, mimeType })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// ============================================
// COMPONENTE: BolhaAudio
// ============================================
function BolhaAudio({ audioUrl, compact = false }: { audioUrl: string; compact?: boolean }) {
    const [playing, setPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)
    const audioRef = useRef<HTMLAudioElement>(null)

    const togglePlay = () => {
        if (!audioRef.current) return
        if (playing) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
    }

    const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

    return (
        <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} max-w-[220px]`}>
            <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProgress(0) }}
                onDurationChange={e => setDuration(e.currentTarget.duration)}
                onTimeUpdate={e => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100 || 0)}
            />
            <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0"
            >
                {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] opacity-70">{formatDuration(duration * (progress / 100))} / {formatDuration(duration)}</span>
            </div>
        </div>
    )
}

// ============================================
// COMPONENTE: BolhaMensagem
// ============================================
function BolhaMensagem({ bubble }: { bubble: Bubble }) {
    const isUser = bubble.role === 'user'
    const [showLogs, setShowLogs] = useState(false)

    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
            {/* Avatar IARA */}
            {!isUser && !bubble.silencio && (
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#a67c52] to-[#7a5735] flex items-center justify-center text-white text-xs font-bold">
                        IA
                    </div>
                    <span className="text-xs text-gray-400 font-medium">IARA</span>
                </div>
            )}

            <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 relative ${
                    bubble.loading
                        ? 'bg-gray-700/60 text-gray-300'
                        : bubble.silencio
                        ? 'bg-gray-700/40 border border-dashed border-gray-600 text-gray-400'
                        : isUser
                        ? 'bg-[#005C4B] text-white'
                        : 'bg-[#1f2c33] text-white'
                } ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            >
                {bubble.loading ? (
                    <div className="flex items-center gap-1 py-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                ) : bubble.silencio ? (
                    <div className="flex items-center gap-2 text-sm">
                        <PhoneOff size={14} className="text-yellow-400" />
                        <span>
                            {bubble.motivo === 'pausado_manual' && '⏸️ IARA pausada manualmente'}
                            {bubble.motivo === 'pausa_doutora' && '⏸️ Pausa: Doutora respondeu (10min)'}
                            {bubble.motivo === 'doutora_respondeu' && '👩‍⚕️ Pausa de 10min criada'}
                            {bubble.motivo === 'sem_creditos' && '💳 Sem créditos — pipeline bloqueado'}
                            {bubble.motivo === 'clinica_inativa' && '🔴 Clínica inativa'}
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Transcrição do áudio */}
                        {bubble.transcricao && (
                            <div className="text-xs opacity-60 mb-1 italic">
                                🎤 &ldquo;{bubble.transcricao}&rdquo;
                            </div>
                        )}

                        {/* Imagem enviada pelo usuário */}
                        {bubble.imageDataUrl && (
                            <div className="mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={bubble.imageDataUrl}
                                    alt="imagem enviada"
                                    className="rounded-xl max-w-[240px] max-h-[280px] object-cover w-full"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => window.open(bubble.imageDataUrl, '_blank')}
                                />
                                <div className="text-[10px] opacity-50 mt-0.5 flex items-center gap-1">
                                    <ImagePlus size={9} /> foto
                                </div>
                            </div>
                        )}

                        {/* Player de áudio (enviado pelo usuário) */}
                        {bubble.audioUrl && bubble.tipo === 'audio' && isUser && (
                            <BolhaAudio audioUrl={bubble.audioUrl} />
                        )}

                        {/* Texto (caption da foto ou mensagem normal) */}
                        {bubble.text && (
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{bubble.text}</p>
                        )}

                        {/* Player de áudio da IARA (TTS) */}
                        {bubble.audioUrl && !isUser && (
                            <div className="mt-2">
                                <div className="text-xs opacity-60 mb-1 flex items-center gap-1">
                                    <Volume2 size={11} /> Resposta em voz
                                </div>
                                <BolhaAudio audioUrl={bubble.audioUrl} />
                            </div>
                        )}
                    </>
                )}

                {/* Horário + créditos */}
                <div className="flex items-center justify-end gap-2 mt-1">
                    {bubble.creditosRestantes !== undefined && !isUser && (
                        <span className="text-[10px] opacity-40">💳 {bubble.creditosRestantes}</span>
                    )}
                    <span className="text-[10px] opacity-40">{formatTime(bubble.timestamp)}</span>
                </div>
            </div>

            {/* Logs do pipeline */}
            {bubble.logs && bubble.logs.length > 0 && (
                <button
                    onClick={() => setShowLogs(v => !v)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                    <Info size={10} />
                    {showLogs ? 'Ocultar logs' : `Ver pipeline (${bubble.logs.length} steps)`}
                </button>
            )}

            {showLogs && bubble.logs && (
                <div className="bg-black/40 border border-gray-700 rounded-lg p-2 text-[10px] font-mono text-green-400 max-w-[80%] space-y-0.5 max-h-40 overflow-y-auto">
                    {bubble.logs.map((l, i) => (
                        <div key={i} className="leading-tight">{l}</div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ============================================
// COMPONENTE PRINCIPAL — WhatsApp Fake
// ============================================
export default function WhatsAppFakePage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const isAdmin = (session?.user as any)?.userType === 'admin'

    // Guard: redirecionar não-admins
    useEffect(() => {
        if (status === 'loading') return
        if (!isAdmin) {
            router.replace('/dashboard')
        }
    }, [status, isAdmin, router])

    // Enquanto carrega sessão ou não é admin — tela em branco
    if (status === 'loading' || !isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-400">
                <div className="text-center">
                    <div className="text-4xl mb-3">🔒</div>
                    <p className="text-sm">Acesso restrito ao administrador</p>
                </div>
            </div>
        )
    }

    const [bubbles, setBubbles] = useState<Bubble[]>([
        {
            id: 'system-welcome',
            role: 'iara',
            text: '👋 Olá! Sou a IARA em modo de teste. Escreva, grave um áudio ou envie uma foto 📷 para testar o pipeline completo.\n\n🔬 Pipeline: catraca → cache → IA (Vision para fotos) → TTS',
            tipo: 'text',
            timestamp: new Date(),
        }
    ])

    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(false)
    const [modoVoz, setModoVoz] = useState(false)
    const [recording, setRecording] = useState(false)
    const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('ativo')
    const [creditosRestantes, setCreditosRestantes] = useState<number | null>(null)

    // Estados de imagem
    const [imagemPendente, setImagemPendente] = useState<{
        dataUrl: string
        base64: string
        mimeType: string
        caption: string
    } | null>(null)

    const bottomRef = useRef<HTMLDivElement>(null)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const audioChunks = useRef<Blob[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)

    // Scroll automático
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [bubbles])

    const addBubble = (b: Omit<Bubble, 'id' | 'timestamp'>) => {
        const bubble: Bubble = { ...b, id: randomId(), timestamp: new Date() }
        setBubbles(prev => [...prev, bubble])
        return bubble.id
    }

    const updateBubble = (id: string, updates: Partial<Bubble>) => {
        setBubbles(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    }

    // ========================
    // PROCESSAR IMAGEM
    // ========================
    const processarImagem = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) return
        const sizeKB = file.size / 1024
        if (sizeKB > 4096) {
            alert('Imagem muito grande. Máximo 4MB.')
            return
        }
        const { base64, mimeType } = await fileToBase64(file)
        const dataUrl = `data:${mimeType};base64,${base64}`
        setImagemPendente({ dataUrl, base64, mimeType, caption: '' })
    }, [])

    // Drag and drop no chat
    useEffect(() => {
        const el = dropZoneRef.current
        if (!el) return

        const onDrag = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
        const onDrop = async (e: DragEvent) => {
            e.preventDefault()
            const file = e.dataTransfer?.files?.[0]
            if (file) await processarImagem(file)
        }

        el.addEventListener('dragover', onDrag)
        el.addEventListener('drop', onDrop)
        return () => { el.removeEventListener('dragover', onDrag); el.removeEventListener('drop', onDrop) }
    }, [processarImagem])

    // Paste de imagem do clipboard
    useEffect(() => {
        const onPaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return
            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile()
                    if (file) await processarImagem(file)
                    break
                }
            }
        }
        window.addEventListener('paste', onPaste)
        return () => window.removeEventListener('paste', onPaste)
    }, [processarImagem])

    // ========================
    // ENVIAR IMAGEM
    // ========================
    const sendImagem = async () => {
        if (!imagemPendente || loading) return

        const { dataUrl, base64, mimeType, caption } = imagemPendente
        setImagemPendente(null)

        // Bolha do usuário com thumbnail
        addBubble({
            role: 'user',
            text: caption || '',
            imageDataUrl: dataUrl,
            tipo: 'image',
        })
        const loadingId = addBubble({ role: 'iara', text: '', tipo: 'text', loading: true })
        setLoading(true)

        try {
            const res = await fetch('/api/whatsapp-fake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensagem: caption || '',
                    imageBase64: base64,
                    imageMimeType: mimeType,
                    tipoMensagem: 'image',
                    modoVoz,
                    historico: bubbles
                        .filter(b => !b.loading && !b.silencio && b.id !== 'system-welcome')
                        .slice(-6)
                        .map(b => ({ role: b.role === 'user' ? 'user' : 'assistant', content: b.text })),
                }),
            })
            const data = await res.json()
            handleResponse(loadingId, data)
        } catch (err: any) {
            updateBubble(loadingId, { loading: false, text: `❌ Erro: ${err.message}`, silencio: true, motivo: 'erro' })
        } finally {
            setLoading(false)
        }
    }

    // ========================
    // ENVIAR TEXTO
    // ========================
    const sendText = async () => {
        // Se tem imagem pendente, enviar a imagem
        if (imagemPendente) {
            await sendImagem()
            return
        }

        const text = inputText.trim()
        if (!text || loading) return

        setInputText('')
        addBubble({ role: 'user', text, tipo: 'text' })

        const loadingId = addBubble({ role: 'iara', text: '', tipo: 'text', loading: true })
        setLoading(true)

        try {
            const historico = bubbles
                .filter(b => !b.loading && !b.silencio && b.id !== 'system-welcome')
                .slice(-10)
                .map(b => ({ role: b.role === 'user' ? 'user' : 'assistant', content: b.text }))

            const res = await fetch('/api/whatsapp-fake', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem: text, tipoMensagem: 'text', modoVoz, historico }),
            })
            const data = await res.json()
            handleResponse(loadingId, data)
        } catch (err: any) {
            updateBubble(loadingId, { loading: false, text: `❌ Erro: ${err.message}`, silencio: true, motivo: 'erro' })
        } finally {
            setLoading(false)
        }
    }

    // ========================
    // GRAVAR ÁUDIO
    // ========================
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioChunks.current = []
            mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' })

            mediaRecorder.current.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.current.push(e.data)
            }

            mediaRecorder.current.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
                const audioUrl = URL.createObjectURL(blob)
                const arrayBuffer = await blob.arrayBuffer()
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

                addBubble({ role: 'user', text: '', audioUrl, tipo: 'audio' })
                const loadingId = addBubble({ role: 'iara', text: '', tipo: 'text', loading: true })
                setLoading(true)

                try {
                    const res = await fetch('/api/whatsapp-fake', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audioBase64: base64, tipoMensagem: 'audio', modoVoz: true, historico: [] }),
                    })
                    const data = await res.json()
                    handleResponse(loadingId, data)
                } catch (err: any) {
                    updateBubble(loadingId, { loading: false, text: `❌ Erro: ${err.message}`, silencio: true })
                } finally {
                    setLoading(false)
                }
            }

            mediaRecorder.current.start()
            setRecording(true)
        } catch {
            alert('Permissão de microfone negada')
        }
    }

    const stopRecording = () => {
        mediaRecorder.current?.stop()
        setRecording(false)
    }

    // ========================
    // PROCESSAR RESPOSTA API
    // ========================
    const handleResponse = (loadingId: string, data: any) => {
        if (data.blocked || data.silencio) {
            updateBubble(loadingId, {
                loading: false,
                text: '',
                silencio: true,
                motivo: data.motivo,
                logs: data.logs,
            })
            if (data.motivo === 'sem_creditos') setPipelineStatus('sem_creditos')
            if (data.motivo === 'pausa_doutora' || data.motivo === 'pausado_manual') setPipelineStatus('pausado')
            return
        }

        if (data.error) {
            updateBubble(loadingId, { loading: false, text: `❌ ${data.error}`, tipo: 'text' })
            return
        }

        let audioUrl: string | undefined
        if (data.audioBase64) {
            try { audioUrl = audioB64ToUrl(data.audioBase64) } catch { }
        }

        if (data.creditosRestantes !== undefined) setCreditosRestantes(data.creditosRestantes)
        setPipelineStatus('ativo')

        updateBubble(loadingId, {
            loading: false,
            text: data.resposta || '',
            audioUrl,
            transcricao: data.textoTranscrito,
            logs: data.logs,
            creditosRestantes: data.creditosRestantes,
            tipo: 'text',
        })
    }

    // ========================
    // SIMULAR DOUTORA RESPONDER
    // ========================
    const simularDoutora = async () => {
        addBubble({ role: 'user', text: '👩‍⚕️ [Simulando: doutora respondeu]', tipo: 'text' })
        const loadingId = addBubble({ role: 'iara', text: '', tipo: 'text', loading: true })
        setLoading(true)

        const res = await fetch('/api/whatsapp-fake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensagem: 'Oi', simularIsFromMe: true }),
        })
        const data = await res.json()
        handleResponse(loadingId, data)
        setLoading(false)
        setPipelineStatus('pausado')
    }

    // ========================
    // REMOVER PAUSA
    // ========================
    const removerPausa = async () => {
        await fetch('/api/whatsapp-fake', { method: 'DELETE' })
        setPipelineStatus('ativo')
        addBubble({ role: 'iara', text: '▶️ Pausa removida! IARA voltou a atender.', tipo: 'text', silencio: false })
    }

    // ========================
    // LIMPAR CHAT
    // ========================
    const limparChat = () => {
        setBubbles([{
            id: 'system-welcome',
            role: 'iara',
            text: '🔄 Chat limpo. Pipeline pronto para novo teste.',
            tipo: 'text',
            timestamp: new Date(),
        }])
        setPipelineStatus('ativo')
        setCreditosRestantes(null)
        setImagemPendente(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendText()
        }
        if (e.key === 'Escape' && imagemPendente) {
            setImagemPendente(null)
        }
    }

    const statusColor = {
        ativo: 'bg-green-400', pausado: 'bg-yellow-400',
        sem_creditos: 'bg-red-400', inativo: 'bg-gray-400', idle: 'bg-gray-400',
    }[pipelineStatus]

    const statusLabel = {
        ativo: 'Pipeline ativo', pausado: 'IARA pausada',
        sem_creditos: 'Sem créditos', inativo: 'Clínica inativa', idle: 'Aguardando',
    }[pipelineStatus]

    return (
        <div className="flex flex-col h-screen bg-[#0b141a] text-white" ref={dropZoneRef}>
            {/* input hidden para upload de arquivo */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async e => {
                    const file = e.target.files?.[0]
                    if (file) await processarImagem(file)
                    e.target.value = ''
                }}
            />

            {/* ================================================
                HEADER
            ================================================ */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1f2c33] border-b border-gray-700/30 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a67c52] to-[#7a5735] flex items-center justify-center text-white font-bold">
                        IA
                    </div>
                    <div>
                        <h1 className="font-semibold text-[15px]">IARA — WhatsApp Fake</h1>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
                            <span className="text-xs text-gray-400">{statusLabel}</span>
                            {creditosRestantes !== null && (
                                <span className="text-xs text-gray-500 ml-2">· 💳 {creditosRestantes} créditos</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Modo Voz */}
                    <button
                        onClick={() => setModoVoz(v => !v)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                            modoVoz
                                ? 'bg-[#a67c52]/20 border-[#a67c52] text-[#a67c52]'
                                : 'border-gray-600 text-gray-400 hover:border-gray-400'
                        }`}
                    >
                        <Volume2 size={12} />
                        {modoVoz ? 'Voz ON' : 'Voz OFF'}
                    </button>

                    {/* Simular pausa doutora */}
                    <button
                        onClick={simularDoutora}
                        disabled={loading}
                        title="Simula doutora respondendo → cria pausa 10min"
                        className="text-xs px-3 py-1.5 rounded-full border border-orange-600/50 text-orange-400 hover:bg-orange-900/20 transition-all disabled:opacity-40"
                    >
                        👩‍⚕️ Pausa
                    </button>

                    {/* Remover pausa */}
                    {pipelineStatus === 'pausado' && (
                        <button
                            onClick={removerPausa}
                            className="text-xs px-3 py-1.5 rounded-full border border-green-600 text-green-400 hover:bg-green-900/20 transition-all"
                        >
                            <RefreshCw size={11} className="inline mr-1" />
                            Retomar
                        </button>
                    )}

                    {/* Limpar */}
                    <button
                        onClick={limparChat}
                        title="Limpar chat"
                        className="w-8 h-8 rounded-full border border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-white transition-all flex items-center justify-center"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* ================================================
                AREA DO CHAT
            ================================================ */}
            <div
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            >
                <div className="text-center">
                    <span className="text-[11px] text-gray-500 bg-[#1f2c33] px-3 py-1 rounded-full">
                        HOJE — TESTE DE PIPELINE · arrastar imagem ou ctrl+v para colar foto
                    </span>
                </div>

                {bubbles.map(b => (
                    <BolhaMensagem key={b.id} bubble={b} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* ================================================
                PREVIEW DA IMAGEM PENDENTE
            ================================================ */}
            {imagemPendente && (
                <div className="flex-shrink-0 bg-[#1a2830] border-t border-gray-700/40 px-4 py-3">
                    <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imagemPendente.dataUrl}
                                alt="preview"
                                className="w-20 h-20 object-cover rounded-xl border border-gray-600"
                            />
                            <button
                                onClick={() => setImagemPendente(null)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all"
                            >
                                <X size={11} />
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                <ImagePlus size={11} /> Imagem pronta para envio
                                <span className="text-gray-600 ml-1">
                                    ({imagemPendente.mimeType} · {(imagemPendente.base64.length * 0.75 / 1024).toFixed(0)}KB)
                                </span>
                            </span>
                            <input
                                type="text"
                                placeholder="Caption opcional..."
                                value={imagemPendente.caption}
                                onChange={e => setImagemPendente(prev => prev ? { ...prev, caption: e.target.value } : null)}
                                onKeyDown={e => e.key === 'Enter' && sendImagem()}
                                autoFocus
                                className="bg-[#2a3942] rounded-xl px-3 py-2 text-[13px] text-gray-100 placeholder-gray-600 outline-none border border-transparent focus:border-[#a67c52]/50 transition-colors"
                            />
                            <p className="text-[10px] text-gray-600">Enter para enviar · Esc para cancelar · Claude analisará a imagem como doutorizador AI</p>
                        </div>
                        <button
                            onClick={sendImagem}
                            disabled={loading}
                            className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008f6e] disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0 self-center"
                        >
                            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                        </button>
                    </div>
                </div>
            )}

            {/* ================================================
                BARRA DE INPUT
            ================================================ */}
            <div className="flex-shrink-0 bg-[#1f2c33] px-4 py-3 border-t border-gray-700/30">
                {recording && (
                    <div className="flex items-center justify-center gap-2 mb-2 text-red-400 text-sm animate-pulse">
                        <Mic size={14} />
                        Gravando... clique no botão para parar
                    </div>
                )}

                <div className="flex items-end gap-2">
                    {/* Botão de foto */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || recording}
                        title="Enviar imagem (ou arraste para o chat / ctrl+v)"
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                            imagemPendente
                                ? 'bg-[#a67c52] text-white'
                                : 'bg-[#2a3942] hover:bg-[#374954] text-gray-400 hover:text-white'
                        } disabled:opacity-40`}
                    >
                        <ImagePlus size={18} />
                    </button>

                    {/* Campo de texto */}
                    <div className="flex-1 bg-[#2a3942] rounded-2xl px-4 py-2 min-h-[44px] flex items-end">
                        <textarea
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={imagemPendente ? 'Caption da imagem (opcional)...' : 'Digite uma mensagem de teste...'}
                            rows={1}
                            className="flex-1 bg-transparent outline-none text-[14px] text-gray-100 placeholder-gray-500 resize-none max-h-24 leading-relaxed"
                            style={{ scrollbarWidth: 'none' }}
                            disabled={loading || recording}
                        />
                    </div>

                    {/* Botão gravar voz */}
                    <button
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        disabled={loading || !!imagemPendente}
                        title="Segure para gravar áudio"
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                            recording
                                ? 'bg-red-500 scale-110 animate-pulse'
                                : 'bg-[#a67c52] hover:bg-[#8a6540]'
                        } disabled:opacity-40`}
                    >
                        {recording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>

                    {/* Botão enviar */}
                    <button
                        onClick={sendText}
                        disabled={(!inputText.trim() && !imagemPendente) || loading || recording}
                        className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#008f6e] disabled:opacity-40 flex items-center justify-center transition-all"
                    >
                        {loading ? (
                            <RefreshCw size={18} className="animate-spin" />
                        ) : (
                            <Send size={18} className="ml-0.5" />
                        )}
                    </button>
                </div>

                {/* Atalhos rápidos */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                        'Quero agendar uma consulta',
                        'Qual o preço do botox?',
                        'Vocês têm horário amanhã?',
                        'Quero cancelar',
                    ].map(msg => (
                        <button
                            key={msg}
                            onClick={() => setInputText(msg)}
                            disabled={loading}
                            className="text-[11px] px-2.5 py-1 bg-[#2a3942] hover:bg-[#374954] rounded-full text-gray-400 hover:text-gray-200 transition-all disabled:opacity-40"
                        >
                            {msg}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

function randomId() {
    return Math.random().toString(36).slice(2, 9)
}
