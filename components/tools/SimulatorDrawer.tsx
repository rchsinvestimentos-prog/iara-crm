import { useState, useRef, useEffect } from 'react'
import { Send, Volume2, X, Sparkles, Loader2, Bot, User, Mic, Square } from 'lucide-react'

type SimMsg = {
    role: 'user' | 'assistant'
    content: string
    /** Voz da IARA, quando a resposta veio em áudio. */
    audioBase64?: string
    /** O áudio que a própria pessoa gravou, para ela poder reouvir. */
    audioUrl?: string
}

interface SimulatorDrawerProps {
    isOpen: boolean
    onClose: () => void
    /** Nome da assistente escolhido pela clínica, quando não há config em edição. */
    nomeIA?: string
    /**
     * Configuração ainda não salva, para testar antes de gravar.
     *
     * Opcional: quando o simulador é aberto de fora da tela de Atendimento
     * (pelo botão flutuante), não há nada em edição — aí ele roda com a
     * configuração salva da clínica, que é o comportamento real da IARA.
     */
    config?: {
        nomeIA: string
        humor: string
        tom: string
        emojis: string
        fraseFavorita: string
        feedbacks: string[]
        funcionalidades: Record<string, boolean>
    }
}

export default function SimulatorDrawer({ isOpen, onClose, config, nomeIA }: SimulatorDrawerProps) {
    // Em edição, vale o nome que está sendo digitado; fora dela, o salvo.
    const nomeAssistente = config?.nomeIA || nomeIA || 'IARA'
    const [simInput, setSimInput] = useState('')
    const [simHistory, setSimHistory] = useState<SimMsg[]>([])
    const [simLoading, setSimLoading] = useState(false)
    // Quem decide se a resposta vem em voz é o canal da pergunta, igual ao
    // atendimento real: áudio pede áudio, texto pede texto. Antes havia um
    // botão para forçar voz, e ela respondia em áudio a uma mensagem digitada
    // — coisa que nunca acontece no WhatsApp.

    // Só um áudio toca por vez. Sem isso, clicar duas vezes empilhava a voz
    // da IARA sobre ela mesma.
    const [tocandoId, setTocandoId] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const simEndRef = useRef<HTMLDivElement>(null)

    // Gravar e mandar áudio, como a paciente faz no WhatsApp. Testa também a
    // compreensão: sotaque e nome de procedimento mal pronunciado só aparecem
    // como problema quando se fala, não quando se digita.
    const [gravando, setGravando] = useState(false)
    const [transcrevendo, setTranscrevendo] = useState(false)
    const [segundos, setSegundos] = useState(0)
    const gravadorRef = useRef<MediaRecorder | null>(null)
    const pedacosRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Scroll to bottom when history changes
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => simEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        }
    }, [simHistory, isOpen])

    // Reset history when opening a fresh session
    useEffect(() => {
        if (isOpen && simHistory.length === 0) {
            setSimHistory([{
                role: 'assistant',
                content: `Olá! Eu sou a ${nomeAssistente}. Faça um teste simulando uma cliente me chamando no WhatsApp.`
            }])
        }
    }, [isOpen, nomeAssistente])

    if (!isOpen) return null

    /**
     * @param textoDireto  texto vindo da transcrição de um áudio gravado
     * @param audioUrl     o áudio gravado, para a pessoa reouvir o que mandou
     *
     * Quando veio de áudio, a resposta vem em áudio. Quando foi digitado, vem
     * em texto. É a mesma regra do atendimento real.
     */
    const sendSimulation = async (textoDireto?: string, audioUrl?: string) => {
        const texto = (textoDireto ?? simInput).trim()
        if (!texto || simLoading) return

        const veioDeAudio = !!audioUrl
        const userMsg: SimMsg = { role: 'user', content: texto, audioUrl }
        const newHistory = [...simHistory, userMsg]
        setSimHistory(newHistory)
        setSimInput('')
        setSimLoading(true)

        try {
            // Preparar histórico para a API:
            // 1. Excluir a msg atual (já vai como 'message')
            // 2. Excluir a saudação inicial do simulador (é fake, não é IA real)
            // 3. Reverter para newest-first (convenção do banco de dados)
            const historyForApi = simHistory
                .filter((m, i) => !(i === 0 && m.role === 'assistant' && m.content.includes('Faça um teste')))
                .slice(-20)
                .reverse()

            const res = await fetch('/api/iara/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    leadName: 'Cliente Teste',
                    history: historyForApi,
                    withAudio: veioDeAudio,
                    // Sem config em edição, vai vazio: a API usa o que está
                    // salvo, que é exatamente como a IARA responde de verdade.
                    overrides: config ? {
                        nomeAssistente: config.nomeIA,
                        humor: config.humor,
                        tomAtendimento: config.tom,
                        emojis: config.emojis,
                        fraseDespedida: config.fraseFavorita,
                        feedbacks: config.feedbacks,
                        funcionalidades: JSON.stringify(config.funcionalidades)
                    } : {}
                }),
            })
            const data = await res.json()

            if (data.error) {
                setSimHistory(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${data.error}` }])
            } else {
                setSimHistory(prev => [...prev, { role: 'assistant', content: data.text, audioBase64: data.audioBase64 }])
            }
        } catch (err) {
            console.error(err)
            setSimHistory(prev => [...prev, { role: 'assistant', content: '❌ Erro de conexão ao simular.' }])
        } finally {
            setSimLoading(false)
        }
    }

    // ============================================
    // GRAVAR ÁUDIO — igual a paciente faz no WhatsApp
    // ============================================
    const iniciarGravacao = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const gravador = new MediaRecorder(stream)
            gravadorRef.current = gravador
            pedacosRef.current = []

            gravador.ondataavailable = e => { if (e.data.size > 0) pedacosRef.current.push(e.data) }

            gravador.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || 'audio/webm' })
                if (blob.size < 1000) return   // clique sem fala

                setTranscrevendo(true)
                try {
                    const base64 = await new Promise<string>((ok, erro) => {
                        const fr = new FileReader()
                        fr.onload = () => ok(String(fr.result).split(',')[1] || '')
                        fr.onerror = erro
                        fr.readAsDataURL(blob)
                    })
                    const res = await fetch('/api/voz/transcrever', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audioBase64: base64 }),
                    })
                    const data = await res.json()
                    if (data.texto) sendSimulation(data.texto, URL.createObjectURL(blob))
                    else setSimHistory(prev => [...prev, { role: 'assistant', content: `❌ ${data.error || 'Não consegui entender o áudio.'}` }])
                } catch {
                    setSimHistory(prev => [...prev, { role: 'assistant', content: '❌ Erro ao enviar o áudio.' }])
                } finally {
                    setTranscrevendo(false)
                }
            }

            gravador.start()
            setGravando(true)
            setSegundos(0)
            timerRef.current = setInterval(() => {
                setSegundos(prev => {
                    if (prev >= 60) { pararGravacao(); return 60 }   // teto de 1 minuto
                    return prev + 1
                })
            }, 1000)
        } catch {
            alert('Permita o acesso ao microfone para gravar.')
        }
    }

    const pararGravacao = () => {
        if (gravadorRef.current && gravadorRef.current.state !== 'inactive') {
            gravadorRef.current.stop()
        }
        setGravando(false)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }

    /**
     * Toca um áudio por vez. Clicar de novo no mesmo para; clicar em outro
     * troca. Antes cada clique criava um Audio novo e as vozes se somavam.
     */
    const tocar = (id: string, src: string) => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current = null
        }
        if (tocandoId === id) { setTocandoId(null); return }

        const audio = new Audio(src)
        audioRef.current = audio
        setTocandoId(id)
        audio.onended = () => { setTocandoId(null); audioRef.current = null }
        audio.play().catch(() => { setTocandoId(null); audioRef.current = null })
    }

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className="fixed inset-0 bg-black/50 z-[90] lg:hidden backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Desktop / Mobile Panel */}
            <div
                className={`fixed top-0 right-0 h-screen w-[400px] max-w-[100vw] z-[100] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out`}
                style={{ backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border-default)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[14px]" style={{ color: 'var(--text-primary)' }}>
                                Simulador · {nomeAssistente}
                            </h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {config
                                    ? 'Teste suas configurações (não salvas)'
                                    : 'Responde igual ao WhatsApp, com o que está salvo'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    {simHistory.map((msg, i) => {
                        const isUser = msg.role === 'user'
                        return (
                            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 ${isUser
                                    ? 'bg-[#0F4C61] text-white rounded-br-sm'
                                    : 'rounded-bl-sm'
                                    }`} style={!isUser ? { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' } : undefined}>
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                                        {isUser ? <User size={12} /> : <Bot size={12} />}
                                        <span className="text-[10px] font-medium uppercase tracking-wider">
                                            {isUser ? 'Você (Cliente)' : nomeAssistente}
                                        </span>
                                    </div>
                                    {/* Mensagem de voz — a que a pessoa gravou ou a que a
                                        IARA respondeu. Vira bolha de áudio, como no WhatsApp,
                                        com o texto abaixo em cinza servindo de transcrição. */}
                                    {(() => {
                                        const src = msg.audioUrl
                                            || (msg.audioBase64 ? `data:audio/mp3;base64,${msg.audioBase64}` : null)
                                        if (!src) {
                                            return (
                                                <p className="text-[13px] whitespace-pre-wrap" style={!isUser ? { color: 'var(--text-primary)' } : undefined}>
                                                    {msg.content}
                                                </p>
                                            )
                                        }
                                        const id = `msg-${i}`
                                        const ativo = tocandoId === id
                                        return (
                                            <>
                                                <button
                                                    onClick={() => tocar(id, src)}
                                                    className="flex items-center gap-2.5 w-full text-left"
                                                >
                                                    <span
                                                        className="flex items-center justify-center rounded-full flex-shrink-0"
                                                        style={{
                                                            width: 34, height: 34,
                                                            background: isUser ? 'rgba(255,255,255,0.22)' : '#D99773',
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        {ativo ? <Square size={12} /> : <Volume2 size={15} />}
                                                    </span>
                                                    <span className="flex items-end gap-[3px] h-5 flex-1">
                                                        {[9, 15, 7, 18, 11, 20, 8, 14, 6, 16, 10, 13, 7, 17, 9].map((h, k) => (
                                                            <span key={k} style={{
                                                                width: 2.5, height: h, borderRadius: 2,
                                                                background: isUser ? 'rgba(255,255,255,0.55)' : 'rgba(217,151,115,0.55)',
                                                            }} />
                                                        ))}
                                                    </span>
                                                    <span className="text-[10px] opacity-60 flex-shrink-0">
                                                        {ativo ? 'tocando' : 'ouvir'}
                                                    </span>
                                                </button>
                                                <p className="text-[11.5px] mt-2 whitespace-pre-wrap opacity-60" style={!isUser ? { color: 'var(--text-muted)' } : undefined}>
                                                    {msg.content}
                                                </p>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>
                        )
                    })}
                    {simLoading && (
                        <div className="flex justify-start">
                            <div className="rounded-2xl rounded-bl-sm p-3 w-16 flex justify-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-[#D99773] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-[#D99773] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-[#D99773] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={simEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-card)' }}>
                    {/* Só um botão de ação além de enviar: o microfone. O de
                        alto-falante saiu junto com o toggle — agora quem decide
                        se a resposta vem em voz é o canal da pergunta. */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={simInput}
                                onChange={e => setSimInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        sendSimulation()
                                    }
                                }}
                                placeholder="Digite como se fosse uma cliente..."
                                className="w-full rounded-2xl px-4 py-3 pr-12 text-[13px] outline-none resize-none min-h-[48px] max-h-[120px]"
                                style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-subtle)' }}
                            />
                            <button
                                onClick={() => sendSimulation()}
                                disabled={!simInput.trim() || simLoading}
                                className="absolute right-2 bottom-2 p-2 rounded-xl bg-[#0F4C61] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0d4052] transition-colors"
                            >
                                {simLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>

                        {/* Gravar e mandar áudio, como a paciente faz */}
                        <button
                            onClick={gravando ? pararGravacao : iniciarGravacao}
                            disabled={simLoading || transcrevendo}
                            title={gravando ? 'Parar e enviar' : 'Gravar um áudio'}
                            className="flex-shrink-0 flex items-center gap-2 rounded-full transition-all disabled:opacity-50"
                            style={{
                                padding: gravando ? '12px 16px' : '13px',
                                background: gravando ? '#EF4444' : '#D99773',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {transcrevendo
                                ? <Loader2 size={18} className="animate-spin" />
                                : gravando
                                    ? <><Square size={14} /><span className="text-[12px] font-semibold tabular-nums">{segundos}s</span></>
                                    : <Mic size={18} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                        {transcrevendo ? 'Entendendo o que você falou...'
                            : gravando ? 'Gravando — clique no quadrado para enviar'
                                : 'Igual ao WhatsApp: mandou áudio, ela responde em áudio. Digitou, ela responde em texto.'}
                    </p>
                </div>
            </div>
        </>
    )
}
