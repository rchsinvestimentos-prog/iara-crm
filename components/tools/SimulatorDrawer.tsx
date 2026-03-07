import { useState, useRef, useEffect } from 'react'
import { Send, Volume2, MicOff, X, Sparkles, Loader2, Bot, User } from 'lucide-react'

type SimMsg = {
    role: 'user' | 'assistant'
    content: string
    audioBase64?: string
}

interface SimulatorDrawerProps {
    isOpen: boolean
    onClose: () => void
    // Unsaved configuration to test
    config: {
        nomeIA: string
        humor: string
        tom: string
        emojis: string
        fraseFavorita: string
        feedbacks: string[]
        funcionalidades: Record<string, boolean>
    }
}

export default function SimulatorDrawer({ isOpen, onClose, config }: SimulatorDrawerProps) {
    const [simInput, setSimInput] = useState('')
    const [simHistory, setSimHistory] = useState<SimMsg[]>([])
    const [simLoading, setSimLoading] = useState(false)
    const [simAudio, setSimAudio] = useState(false)
    const simEndRef = useRef<HTMLDivElement>(null)

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
                content: `Olá! Eu sou a ${config.nomeIA || 'IARA'}. Faça um teste simulando uma cliente me chamando no WhatsApp.`
            }])
        }
    }, [isOpen, config.nomeIA])

    if (!isOpen) return null

    const sendSimulation = async () => {
        if (!simInput.trim() || simLoading) return

        const userMsg: SimMsg = { role: 'user', content: simInput.trim() }
        const newHistory = [...simHistory, userMsg]
        setSimHistory(newHistory)
        setSimInput('')
        setSimLoading(true)

        try {
            const res = await fetch('/api/iara/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    leadName: 'Cliente Teste',
                    history: newHistory.slice(-10),
                    withAudio: simAudio,
                    overrides: {
                        nomeAssistente: config.nomeIA,
                        humor: config.humor,
                        tomAtendimento: config.tom,
                        emojis: config.emojis,
                        fraseDespedida: config.fraseFavorita,
                        feedbacks: config.feedbacks,
                        funcionalidades: JSON.stringify(config.funcionalidades)
                    }
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

    const playAudio = (base64: string) => {
        try {
            const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
            audio.play()
        } catch (e) {
            console.error('Erro ao tocar áudio', e)
        }
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
                                Simulador IARA
                            </h3>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Teste suas configurações (não salvas)
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
                                        : 'bg-white dark:bg-zinc-800 rounded-bl-sm border border-zinc-100 dark:border-zinc-700'
                                    }`}>
                                    <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                                        {isUser ? <User size={12} /> : <Bot size={12} />}
                                        <span className="text-[10px] font-medium uppercase tracking-wider">
                                            {isUser ? 'Você (Cliente)' : config.nomeIA || 'IARA'}
                                        </span>
                                    </div>
                                    <p className={`text-[13px] whitespace-pre-wrap ${!isUser && 'text-zinc-800 dark:text-zinc-200'}`}>
                                        {msg.content}
                                    </p>

                                    {msg.audioBase64 && (
                                        <button
                                            onClick={() => playAudio(msg.audioBase64!)}
                                            className="mt-3 flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-full bg-[#D99773]/10 text-[#D99773] hover:bg-[#D99773]/20 transition-colors"
                                        >
                                            <Volume2 size={14} /> Reproduzir Áudio
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                    {simLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl rounded-bl-sm p-3 w-16 flex justify-center">
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
                <div className="p-4 bg-white dark:bg-zinc-900 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={() => setSimAudio(!simAudio)}
                            title={simAudio ? 'Desativar áudio com ElevenLabs/OpenAI' : 'Ativar áudio com ElevenLabs/OpenAI'}
                            className={`p-3 rounded-full flex-shrink-0 transition-colors ${simAudio ? 'bg-[#D99773] text-white hover:bg-[#c48766]' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                }`}
                        >
                            {simAudio ? <Volume2 size={18} /> : <MicOff size={18} />}
                        </button>

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
                                className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 pr-12 text-[13px] outline-none resize-none min-h-[48px] max-h-[120px]"
                                style={{ color: 'var(--text-primary)' }}
                            />
                            <button
                                onClick={sendSimulation}
                                disabled={!simInput.trim() || simLoading}
                                className="absolute right-2 bottom-2 p-2 rounded-xl bg-[#0F4C61] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0d4052] transition-colors"
                            >
                                {simLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-center mt-3 text-zinc-500">
                        {simAudio ? 'O áudio será gerado consumindo créditos da API.' : 'O áudio está desativado na simulação.'}
                    </p>
                </div>
            </div>
        </>
    )
}
