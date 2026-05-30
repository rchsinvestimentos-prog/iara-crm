'use client'

import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Loader2, Sparkles, Zap, MessageCircle, Smartphone, Monitor } from 'lucide-react'

interface Message {
    id: string
    role: 'dra' | 'iara'
    content: string
    canal: 'whatsapp' | 'painel'
    metadata: Record<string, any>
    createdAt: string
}

export default function IaraChat() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(true)
    const [error, setError] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Carregar histórico
    useEffect(() => {
        loadHistory()
    }, [])

    // Scroll para o final quando novas mensagens
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function loadHistory() {
        try {
            const res = await fetch('/api/agent/history')
            const data = await res.json()
            if (data.ok && data.messages) {
                setMessages(data.messages)
            }
        } catch {
            console.error('Erro ao carregar histórico')
        } finally {
            setLoadingHistory(false)
        }
    }

    async function sendMessage() {
        if (!input.trim() || loading) return

        const userMessage: Message = {
            id: `temp-${Date.now()}`,
            role: 'dra',
            content: input.trim(),
            canal: 'painel',
            metadata: {},
            createdAt: new Date().toISOString(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem: userMessage.content }),
            })

            const data = await res.json()

            if (data.upgrade) {
                setError('Esse recurso é exclusivo do plano Estrategista. Faça upgrade! 🚀')
                setMessages(prev => prev.filter(m => m.id !== userMessage.id))
                return
            }

            if (data.ok) {
                const iaraMessage: Message = {
                    id: `iara-${Date.now()}`,
                    role: 'iara',
                    content: data.resposta,
                    canal: 'painel',
                    metadata: { tools: data.toolsExecuted, intent: data.intent },
                    createdAt: new Date().toISOString(),
                }
                setMessages(prev => [...prev, iaraMessage])
            } else {
                setError(data.error || 'Erro ao processar mensagem')
            }
        } catch {
            setError('Erro de conexão. Tente novamente.')
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    function formatTime(dateStr: string) {
        try {
            return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        } catch {
            return ''
        }
    }

    function formatDate(dateStr: string) {
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
        } catch {
            return ''
        }
    }

    // Agrupar mensagens por dia
    function getDateGroup(dateStr: string) {
        try {
            const d = new Date(dateStr)
            const hoje = new Date()
            if (d.toDateString() === hoje.toDateString()) return 'Hoje'
            const ontem = new Date(hoje)
            ontem.setDate(ontem.getDate() - 1)
            if (d.toDateString() === ontem.toDateString()) return 'Ontem'
            return formatDate(dateStr)
        } catch {
            return ''
        }
    }

    return (
        <div className="iara-chat-container">
            {/* Header */}
            <div className="iara-chat-header">
                <div className="iara-chat-header-avatar">
                    <Bot size={24} />
                </div>
                <div className="iara-chat-header-info">
                    <h2>Conversa com a IARA</h2>
                    <span className="iara-chat-status">
                        <Sparkles size={12} />
                        Consultora de Marketing & Gestão
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="iara-chat-messages">
                {loadingHistory ? (
                    <div className="iara-chat-loading">
                        <Loader2 size={24} className="spin" />
                        <span>Carregando histórico...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="iara-chat-empty">
                        <div className="iara-chat-empty-icon">
                            <Bot size={48} />
                        </div>
                        <h3>Olá, Dra! 👋</h3>
                        <p>Sou sua consultora de marketing e gestão. Me conte o que precisa!</p>
                        <div className="iara-chat-suggestions">
                            <button onClick={() => setInput('Iara, me dá um resumo da clínica')}>
                                <Zap size={14} /> Resumo da clínica
                            </button>
                            <button onClick={() => setInput('Iara, quero criar uma campanha de promoção')}>
                                <Sparkles size={14} /> Criar campanha
                            </button>
                            <button onClick={() => setInput('Iara, quais leads estão frios?')}>
                                <MessageCircle size={14} /> Leads frios
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => {
                            const showDate = idx === 0 || getDateGroup(msg.createdAt) !== getDateGroup(messages[idx - 1].createdAt)
                            return (
                                <div key={msg.id}>
                                    {showDate && (
                                        <div className="iara-chat-date-divider">
                                            <span>{getDateGroup(msg.createdAt)}</span>
                                        </div>
                                    )}
                                    <div className={`iara-chat-message ${msg.role === 'dra' ? 'dra' : 'iara'}`}>
                                        {msg.role === 'iara' && (
                                            <div className="iara-chat-msg-avatar">
                                                <Bot size={16} />
                                            </div>
                                        )}
                                        <div className="iara-chat-msg-bubble">
                                            <div className="iara-chat-msg-content"
                                                dangerouslySetInnerHTML={{
                                                    __html: msg.content
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                        .replace(/\n/g, '<br/>')
                                                }}
                                            />
                                            <div className="iara-chat-msg-meta">
                                                {msg.canal === 'whatsapp' ? (
                                                    <Smartphone size={10} />
                                                ) : (
                                                    <Monitor size={10} />
                                                )}
                                                <span>{formatTime(msg.createdAt)}</span>
                                                {msg.metadata?.tools && msg.metadata.tools.length > 0 && (
                                                    <span className="iara-chat-msg-tools">
                                                        <Zap size={10} /> {msg.metadata.tools.length} ação(ões)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {loading && (
                            <div className="iara-chat-message iara">
                                <div className="iara-chat-msg-avatar">
                                    <Bot size={16} />
                                </div>
                                <div className="iara-chat-msg-bubble typing">
                                    <div className="iara-typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
                <div className="iara-chat-error">
                    {error}
                </div>
            )}

            {/* Input */}
            <div className="iara-chat-input-area">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Fale com a IARA... (Ex: 'Iara, quero criar uma campanha de aniversário')"
                    rows={1}
                    disabled={loading}
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="iara-chat-send"
                >
                    {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
            </div>

            <style jsx>{`
                .iara-chat-container {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 80px);
                    max-height: 900px;
                    background: var(--card-bg, #1a1a2e);
                    border-radius: 16px;
                    overflow: hidden;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
                }

                .iara-chat-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(217, 70, 239, 0.1));
                    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
                }

                .iara-chat-header-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #8b5cf6, #d946ef);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .iara-chat-header-info h2 {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                    margin: 0;
                }

                .iara-chat-status {
                    font-size: 12px;
                    color: var(--text-secondary, #a0a0b0);
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .iara-chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .iara-chat-loading,
                .iara-chat-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                    gap: 12px;
                    color: var(--text-secondary, #a0a0b0);
                }

                .iara-chat-empty-icon {
                    width: 80px;
                    height: 80px;
                    border-radius: 20px;
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(217, 70, 239, 0.15));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #8b5cf6;
                }

                .iara-chat-empty h3 {
                    font-size: 20px;
                    color: var(--text-primary, #fff);
                    margin: 0;
                }

                .iara-chat-empty p {
                    color: var(--text-secondary, #a0a0b0);
                    text-align: center;
                    max-width: 300px;
                    margin: 0;
                }

                .iara-chat-suggestions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    justify-content: center;
                    margin-top: 8px;
                }

                .iara-chat-suggestions button {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: 20px;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.15));
                    background: rgba(139, 92, 246, 0.1);
                    color: var(--text-primary, #e0e0e8);
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .iara-chat-suggestions button:hover {
                    background: rgba(139, 92, 246, 0.25);
                    border-color: #8b5cf6;
                }

                .iara-chat-date-divider {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 12px 0;
                }

                .iara-chat-date-divider span {
                    font-size: 11px;
                    color: var(--text-secondary, #a0a0b0);
                    background: var(--card-bg, #1a1a2e);
                    padding: 4px 12px;
                    border-radius: 10px;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                }

                .iara-chat-message {
                    display: flex;
                    gap: 8px;
                    max-width: 85%;
                    animation: fadeIn 0.2s ease;
                }

                .iara-chat-message.dra {
                    align-self: flex-end;
                    flex-direction: row-reverse;
                }

                .iara-chat-message.iara {
                    align-self: flex-start;
                }

                .iara-chat-msg-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #8b5cf6, #d946ef);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                    margin-top: 4px;
                }

                .iara-chat-msg-bubble {
                    padding: 10px 14px;
                    border-radius: 14px;
                    line-height: 1.5;
                    font-size: 14px;
                }

                .iara-chat-message.dra .iara-chat-msg-bubble {
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .iara-chat-message.iara .iara-chat-msg-bubble {
                    background: var(--input-bg, rgba(255,255,255,0.06));
                    color: var(--text-primary, #e0e0e8);
                    border-bottom-left-radius: 4px;
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                }

                .iara-chat-msg-content {
                    word-break: break-word;
                }

                .iara-chat-msg-meta {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 6px;
                    font-size: 10px;
                    opacity: 0.6;
                }

                .iara-chat-msg-tools {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    color: #a78bfa;
                    font-weight: 500;
                    margin-left: 4px;
                }

                .iara-chat-msg-bubble.typing {
                    padding: 16px 20px;
                }

                .iara-typing-dots {
                    display: flex;
                    gap: 4px;
                }

                .iara-typing-dots span {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #8b5cf6;
                    animation: typingBounce 1.4s infinite;
                }

                .iara-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
                .iara-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

                .iara-chat-error {
                    padding: 10px 20px;
                    background: rgba(239, 68, 68, 0.15);
                    color: #f87171;
                    font-size: 13px;
                    text-align: center;
                    border-top: 1px solid rgba(239, 68, 68, 0.2);
                }

                .iara-chat-input-area {
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                    padding: 12px 16px;
                    border-top: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    background: rgba(0,0,0,0.2);
                }

                .iara-chat-input-area textarea {
                    flex: 1;
                    background: var(--input-bg, rgba(255,255,255,0.06));
                    border: 1px solid var(--border-color, rgba(255,255,255,0.12));
                    border-radius: 12px;
                    padding: 10px 14px;
                    color: var(--text-primary, #e0e0e8);
                    font-size: 14px;
                    resize: none;
                    outline: none;
                    max-height: 120px;
                    font-family: inherit;
                    line-height: 1.5;
                }

                .iara-chat-input-area textarea:focus {
                    border-color: #8b5cf6;
                }

                .iara-chat-input-area textarea::placeholder {
                    color: var(--text-secondary, #a0a0b0);
                }

                .iara-chat-send {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, #8b5cf6, #d946ef);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .iara-chat-send:hover:not(:disabled) {
                    transform: scale(1.05);
                    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
                }

                .iara-chat-send:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes typingBounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30% { transform: translateY(-6px); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
