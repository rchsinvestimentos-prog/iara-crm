'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Plus, Trash2, Save, Sparkles, Shield, ToggleLeft, ToggleRight, Loader2, Check, Bot, Clock, Ban, Cake, MessageSquareText, Pencil, X } from 'lucide-react'
import SimulatorDrawer from './SimulatorDrawer'
import VozTool from './VozTool'

// Funcionalidades que a IARA pode fazer — a Dra liga/desliga
// hidden = true → sempre ativo mas não aparece para o cliente
const funcionalidadesDefault = [
    { id: 'responder_texto', label: 'Responder mensagens de texto', desc: 'IARA responde automaticamente mensagens de texto das clientes', ativo: true },
    { id: 'responder_audio', label: 'Responder com áudio', desc: 'IARA gera áudio de resposta além do texto', ativo: true },
    { id: 'transcrever_audio', label: 'Transcrever áudios recebidos', desc: 'IARA transcreve áudios das clientes e responde', ativo: true, hidden: true },
    { id: 'vendas_7_passos', label: 'Vendas com 7 passos', desc: 'IARA usa a técnica de vendas de 7 etapas (sondagem, solução, fechamento...)', ativo: true, hidden: true },
    { id: 'dar_desconto', label: 'Oferecer descontos', desc: 'IARA pode oferecer desconto quando a cliente resiste ao preço', ativo: true },
    { id: 'google_calendar', label: 'Agendamento via Google Calendar', desc: 'IARA consulta e agenda automaticamente no Google Calendar', ativo: true },
    { id: 'lembrete_24h', label: 'Lembrete 24h antes', desc: 'IARA envia lembrete automático 24 horas antes do agendamento', ativo: true },
    { id: 'lembrete_2h', label: 'Lembrete 2h antes', desc: 'IARA envia lembrete 2 horas antes do agendamento', ativo: true },
    { id: 'followup_abandono', label: 'Recuperar leads abandonados', desc: 'IARA manda mensagem para clientes que pararam de responder há 24h', ativo: true },
    { id: 'horario_ponto', label: '"Batendo ponto" (entrada/saída)', desc: 'IARA manda mensagem humanizada de chegada e saída do trabalho', ativo: false },
    { id: 'enviar_endereco', label: 'Enviar endereço da clínica', desc: 'IARA envia localização quando confirma agendamento', ativo: true },
    { id: 'parcelamento', label: 'Oferecer parcelamento', desc: 'IARA menciona opções de parcelamento ao falar de preço', ativo: true },
    { id: 'encaminhar_foto', label: 'Encaminhar fotos para a Dra', desc: 'Quando cliente envia foto, IARA avisa e encaminha para o WhatsApp pessoal da Dra', ativo: true, hidden: true },
]

export default function AtendimentoTool() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [savingBloco, setSavingBloco] = useState<string | null>(null)
    const [savedBloco, setSavedBloco] = useState<string | null>(null)

    // UI states
    const [simOpen, setSimOpen] = useState(false)

    // Tipo de usuário (clinica ou profissional)
    const [userType, setUserType] = useState<'clinica' | 'profissional'>('clinica')

    // Personalidade
    const [nomeIA, setNomeIA] = useState('')
    const [humor, setHumor] = useState('amigavel')
    const [tom, setTom] = useState('informal')
    const [emojis, setEmojis] = useState('moderado')
    const [fraseFavorita, setFraseFavorita] = useState('')
    const [funcionalidades, setFuncionalidades] = useState(funcionalidadesDefault)

    // Modo IA
    const [modoIA, setModoIA] = useState<'secretaria' | 'ia_pura'>('secretaria')

    // Horário de operação da IARA
    const [sempreLigada, setSempreLigada] = useState(true)
    const [horarioInicio, setHorarioInicio] = useState('08:00')
    const [horarioFim, setHorarioFim] = useState('20:00')
    const [diasAtendimento, setDiasAtendimento] = useState<number[]>([1, 2, 3, 4, 5])
    const [mensagemForaHorario, setMensagemForaHorario] = useState('')

    // Blacklist
    const [blacklist, setBlacklist] = useState('')

    // Aniversário
    const [mensagemAniversario, setMensagemAniversario] = useState('')

    // Boas-vindas
    const [mensagemBoasVindas, setMensagemBoasVindas] = useState('')

    // Feedbacks
    const [feedbacks, setFeedbacks] = useState<string[]>([])
    const [novoFeedback, setNovoFeedback] = useState('')

    // Carregar dados do banco
    const loadData = useCallback(async () => {
        try {
            const res = await fetch('/api/clinica')
            if (res.ok) {
                const data = await res.json()
                setNomeIA(data.nomeAssistente || data.nomeIA || 'IARA')
                if (data.userType) setUserType(data.userType)
                setHumor(data.humor || 'amigavel')
                setTom(data.tomAtendimento || 'informal')
                setEmojis(data.emojis || 'moderado')
                setFraseFavorita(data.fraseDespedida || 'Qualquer coisa me chama! 💜')

                // Modo IA
                if (data.modoIA) setModoIA(data.modoIA)

                // Horário de operação IARA
                if (data.sempreLigada !== undefined && data.sempreLigada !== null) {
                    setSempreLigada(data.sempreLigada)
                }
                if (data.horarioInicio) setHorarioInicio(data.horarioInicio)
                if (data.horarioFim) setHorarioFim(data.horarioFim)
                if (data.diasAtendimento) {
                    try {
                        const dias = typeof data.diasAtendimento === 'string'
                            ? JSON.parse(data.diasAtendimento) : data.diasAtendimento
                        if (Array.isArray(dias)) setDiasAtendimento(dias)
                    } catch { /* default */ }
                }
                if (data.mensagemForaHorario) setMensagemForaHorario(data.mensagemForaHorario)

                // Blacklist, Aniversário, Boas-vindas
                if (data.blacklist) setBlacklist(data.blacklist)
                if (data.mensagemAniversario) setMensagemAniversario(data.mensagemAniversario)
                if (data.mensagemBoasVindas) setMensagemBoasVindas(data.mensagemBoasVindas)

                // Funcionalidades
                if (data.funcionalidades) {
                    try {
                        const saved = typeof data.funcionalidades === 'string'
                            ? JSON.parse(data.funcionalidades)
                            : data.funcionalidades
                        setFuncionalidades(funcionalidadesDefault.map(f => ({
                            ...f,
                            ativo: saved[f.id] !== undefined ? saved[f.id] : f.ativo,
                        })))
                    } catch { /* usar defaults */ }
                }

                // Feedbacks
                if (data.feedbacks) {
                    try {
                        const fb = typeof data.feedbacks === 'string'
                            ? JSON.parse(data.feedbacks) : data.feedbacks
                        if (Array.isArray(fb)) setFeedbacks(fb)
                    } catch { /* usar vazio */ }
                }
            }
        } catch (err) {
            console.error('Erro ao carregar atendimento:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    // Salvar tudo no banco
    const salvar = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const funcsObj: Record<string, boolean> = {}
            funcionalidades.forEach(f => { funcsObj[f.id] = f.ativo })

            const res = await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nomeAssistente: nomeIA,
                    humor,
                    tomAtendimento: tom,
                    emojis,
                    fraseDespedida: fraseFavorita,
                    funcionalidades: JSON.stringify(funcsObj),
                    feedbacks: JSON.stringify(feedbacks),
                    modoIA,
                    sempreLigada,
                    horarioInicio,
                    horarioFim,
                    diasAtendimento: JSON.stringify(diasAtendimento),
                    mensagemForaHorario,
                    blacklist,
                    mensagemAniversario,
                    mensagemBoasVindas,
                }),
            })

            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            } else {
                console.error('Erro ao salvar:', await res.text())
            }
        } catch (err) {
            console.error('Erro ao salvar:', err)
        } finally {
            setSaving(false)
        }
    }

    const toggleFunc = (id: string) => {
        setFuncionalidades(prev =>
            prev.map(f => f.id === id ? { ...f, ativo: !f.ativo } : f)
        )
    }

    // Salvar apenas um bloco específico
    const salvarBloco = async (blocoId: string, dados: Record<string, unknown>) => {
        setSavingBloco(blocoId)
        setSavedBloco(null)
        try {
            const res = await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados),
            })
            if (res.ok) {
                setSavedBloco(blocoId)
                setTimeout(() => setSavedBloco(null), 3000)
            } else {
                console.error('Erro ao salvar bloco:', await res.text())
            }
        } catch (err) {
            console.error('Erro ao salvar bloco:', err)
        } finally {
            setSavingBloco(null)
        }
    }

    // Componente de botão salvar por bloco
    const BotaoSalvarBloco = ({ blocoId, dados, label }: { blocoId: string; dados: Record<string, unknown>; label?: string }) => (
        <button
            onClick={() => salvarBloco(blocoId, dados)}
            disabled={savingBloco === blocoId}
            className="mt-4 w-full py-2.5 rounded-xl text-[12px] font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'rgba(15,76,97,0.1)', color: '#0F4C61', border: '1px solid rgba(15,76,97,0.2)' }}
        >
            {savingBloco === blocoId ? (
                <><Loader2 size={14} className="animate-spin" /> Salvando...</>
            ) : savedBloco === blocoId ? (
                <><Check size={14} /> Salvo! ✅</>
            ) : (
                <><Save size={14} /> {label || 'Salvar'}</>
            )}
        </button>
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#D99773]" />
                <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando configurações da secretária...</span>
            </div>
        )
    }

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }
    const inputStyle = { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }
    const inputClass = "w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors"

    return (
        <div className="space-y-6">

            {/* ============ MODO DA IA ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    🤖 Modo de Atendimento
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Escolha como a IA se comporta no WhatsApp da sua clínica.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => setModoIA('secretaria')}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                            backgroundColor: modoIA === 'secretaria' ? 'rgba(217,151,115,0.12)' : 'var(--bg-subtle)',
                            border: `2px solid ${modoIA === 'secretaria' ? '#D99773' : 'var(--border-default)'}`,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">💬</span>
                            <span className="text-[13px] font-bold" style={{ color: modoIA === 'secretaria' ? '#D99773' : 'var(--text-primary)' }}>
                                Modo Secretária
                            </span>
                            {modoIA === 'secretaria' && <Check size={14} className="text-[#D99773] ml-auto" />}
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            A IA se apresenta como <strong>{nomeIA || 'IARA'}</strong>, com personalidade, nome, tom de voz e emojis. As clientes sabem que falam com uma secretária virtual.
                        </p>
                    </button>

                    <button
                        onClick={() => setModoIA('ia_pura')}
                        className="p-4 rounded-xl text-left transition-all"
                        style={{
                            backgroundColor: modoIA === 'ia_pura' ? 'rgba(139,92,246,0.12)' : 'var(--bg-subtle)',
                            border: `2px solid ${modoIA === 'ia_pura' ? '#8B5CF6' : 'var(--border-default)'}`,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">🤖</span>
                            <span className="text-[13px] font-bold" style={{ color: modoIA === 'ia_pura' ? '#8B5CF6' : 'var(--text-primary)' }}>
                                Modo IA
                            </span>
                            {modoIA === 'ia_pura' && <Check size={14} className="text-[#8B5CF6] ml-auto" />}
                        </div>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            A IA responde de forma direta, sem se identificar como secretária e sem personalidade. Ideal para quem tem atendentes humanas e quer a IA como suporte.
                        </p>
                    </button>
                </div>
                <BotaoSalvarBloco blocoId="modo" dados={{ modoIA }} label="Salvar Modo" />
            </div>

            {/* ============ HORÁRIO DE OPERAÇÃO DA IARA ============ */}
            {/* Somente a dona da clínica pode ativar/desativar a IARA */}
            {userType !== 'profissional' && (
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Clock size={15} className="text-[#D99773]" />
                    Horário de Operação da {nomeIA || 'IARA'}
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Defina quando a {nomeIA || 'IARA'} responde automaticamente. Fora do horário, pode enviar uma mensagem automática.
                </p>

                {/* Toggle Sempre Ligada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={() => setSempreLigada(true)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                            backgroundColor: sempreLigada ? 'rgba(6,214,160,0.1)' : 'var(--bg-subtle)',
                            border: `2px solid ${sempreLigada ? '#06D6A0' : 'var(--border-default)'}`,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <span className="text-[12px] font-bold" style={{ color: sempreLigada ? '#06D6A0' : 'var(--text-primary)' }}>
                                Sempre Ligada (24/7)
                            </span>
                            {sempreLigada && <Check size={14} className="text-green-400 ml-auto" />}
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            A {nomeIA || 'IARA'} responde a qualquer hora, todos os dias.
                        </p>
                    </button>

                    <button
                        onClick={() => setSempreLigada(false)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={{
                            backgroundColor: !sempreLigada ? 'rgba(217,151,115,0.1)' : 'var(--bg-subtle)',
                            border: `2px solid ${!sempreLigada ? '#D99773' : 'var(--border-default)'}`,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🕐</span>
                            <span className="text-[12px] font-bold" style={{ color: !sempreLigada ? '#D99773' : 'var(--text-primary)' }}>
                                Horários Específicos
                            </span>
                            {!sempreLigada && <Check size={14} className="text-[#D99773] ml-auto" />}
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            A {nomeIA || 'IARA'} atende somente nos horários e dias definidos.
                        </p>
                    </button>
                </div>

                {/* Campos de horário (só aparece se não for sempre ligada) */}
                {!sempreLigada && (
                    <div className="space-y-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Início</label>
                                <input type="time" value={horarioInicio} onChange={e => setHorarioInicio(e.target.value)} className={inputClass} style={inputStyle} />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Fim</label>
                                <input type="time" value={horarioFim} onChange={e => setHorarioFim(e.target.value)} className={inputClass} style={inputStyle} />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Dias que a {nomeIA || 'IARA'} atende</label>
                            <div className="flex gap-1">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, i) => (
                                    <button key={i} onClick={() => setDiasAtendimento(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                                        className="px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                                        style={{
                                            backgroundColor: diasAtendimento.includes(i) ? '#D99773' : 'var(--bg-card)',
                                            color: diasAtendimento.includes(i) ? 'white' : 'var(--text-muted)',
                                            border: `1px solid ${diasAtendimento.includes(i) ? '#D99773' : 'var(--border-default)'}`,
                                        }}>
                                        {dia}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>💬 Mensagem fora do horário (opcional)</label>
                            <textarea value={mensagemForaHorario} onChange={e => setMensagemForaHorario(e.target.value)} rows={2}
                                className={`w-full ${inputClass} resize-none`} style={inputStyle}
                                placeholder="Olá! Nosso horário de atendimento é de seg-sex das 08h às 20h. Retornaremos em breve! 😊" />
                        </div>
                    </div>
                )}
                <BotaoSalvarBloco blocoId="horario" dados={{ sempreLigada, horarioInicio, horarioFim, diasAtendimento: JSON.stringify(diasAtendimento), mensagemForaHorario }} label="Salvar Horário" />
            </div>
            )}

            {/* ============ PERSONALIDADE ============ */}
            {modoIA === 'secretaria' && (
                <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                    <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                        <Sparkles size={15} className="text-[#D99773]" />
                        Personalidade da {nomeIA || 'IARA'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Nome da Assistente</label>
                            <input
                                className={inputClass}
                                style={inputStyle}
                                value={nomeIA} onChange={(e) => setNomeIA(e.target.value)}
                                placeholder="Ex: Sofia, Luna, Bella..."
                            />
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>As clientes vão conhecer a IA pelo nome: <strong>{nomeIA}</strong></p>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Humor / Personalidade</label>
                            <select className={inputClass} style={inputStyle} value={humor} onChange={(e) => setHumor(e.target.value)}>
                                <option value="amigavel">🎀 Melhor Amiga (BFF) — alegre, próxima</option>
                                <option value="profissional">💼 Profissional — direta e objetiva</option>
                                <option value="luxo">💎 Elegante — sofisticada e premium</option>
                                <option value="acolhedora">🤗 Acolhedora — carinhosa e empática</option>
                                <option value="energetica">⚡ Energética — entusiasmada e motivada</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Tom de Conversa</label>
                            <select className={inputClass} style={inputStyle} value={tom} onChange={(e) => setTom(e.target.value)}>
                                <option value="informal">💬 Informal — tipo WhatsApp com amiga</option>
                                <option value="semi_formal">📋 Semi-formal — simpática mas profissional</option>
                                <option value="formal">🏥 Formal — linguagem técnica e séria</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Uso de Emojis</label>
                            <select className={inputClass} style={inputStyle} value={emojis} onChange={(e) => setEmojis(e.target.value)}>
                                <option value="nenhum">🚫 Nenhum emoji</option>
                                <option value="moderado">😊 Moderado (1 por mensagem)</option>
                                <option value="bastante">😍🎉 Bastante (2-3 por mensagem)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Frase de Despedida</label>
                            <input
                                className={inputClass}
                                style={inputStyle}
                                value={fraseFavorita} onChange={(e) => setFraseFavorita(e.target.value)}
                                placeholder="Ex: Qualquer coisa me chama! 💜"
                            />
                        </div>
                    </div>
                    <BotaoSalvarBloco blocoId="personalidade" dados={{ nomeAssistente: nomeIA, humor, tomAtendimento: tom, emojis, fraseDespedida: fraseFavorita }} label="Salvar Personalidade" />
                </div>
            )}

            {/* ============ MENSAGEM DE BOAS-VINDAS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <MessageSquareText size={15} className="text-[#D99773]" />
                    Mensagem de Boas-Vindas
                </h3>
                <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
                    Enviada automaticamente quando uma nova cliente conversa pela primeira vez. Deixe vazio para usar o padrão.
                </p>
                <textarea value={mensagemBoasVindas} onChange={e => setMensagemBoasVindas(e.target.value)} rows={3}
                    className={`w-full ${inputClass} resize-none`} style={inputStyle}
                    placeholder="Olá! 👋 Seja bem-vinda! Sou a IARA, assistente virtual da clínica..." />
                <BotaoSalvarBloco blocoId="boasvindas" dados={{ mensagemBoasVindas }} label="Salvar Mensagem" />
            </div>

            {/* ============ FUNCIONALIDADES (toggles) ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Shield size={15} className="text-[#D99773]" />
                    O que a {nomeIA || 'IARA'} pode fazer
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Ative ou desative funcionalidades. Alterações são salvas ao clicar em &quot;Salvar&quot;.
                </p>
                <div className="space-y-1">
                    {funcionalidades.filter(f => !f.hidden).map((f) => (
                        <div
                            key={f.id}
                            className="flex items-center justify-between p-3 rounded-xl transition-colors"
                            style={{ backgroundColor: f.ativo ? 'rgba(34,197,94,0.08)' : 'var(--bg-subtle)' }}
                        >
                            <div className="flex-1 mr-4">
                                <p className="text-[12px] font-medium" style={{ color: f.ativo ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {f.label}
                                </p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                            </div>
                            <button onClick={() => toggleFunc(f.id)} className="flex-shrink-0">
                                {f.ativo ? (
                                    <ToggleRight size={28} className="text-green-500" />
                                ) : (
                                    <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
                <BotaoSalvarBloco blocoId="funcionalidades" dados={{ funcionalidades: JSON.stringify(funcionalidades.reduce((acc: Record<string, boolean>, f) => ({ ...acc, [f.id]: f.ativo }), {})) }} label="Salvar Funcionalidades" />
            </div>

            {/* ============ BLACKLIST ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Ban size={15} className="text-red-400" />
                    Números Bloqueados
                </h3>
                <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>A {nomeIA || 'IARA'} ignora esses números completamente.</p>

                {/* Input para adicionar novo número */}
                <div className="flex gap-2 mb-3">
                    <div className="flex-1 flex items-center rounded-xl overflow-hidden" style={{ ...inputStyle, padding: 0 }}>
                        <span className="px-3 py-2 text-[12px] font-semibold shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>+55</span>
                        <input
                            id="blacklist-input"
                            type="tel"
                            className={`flex-1 bg-transparent border-none outline-none px-3 py-2 text-[12px]`}
                            style={{ color: 'var(--text-primary)' }}
                            placeholder="11999998888"
                            maxLength={11}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const inp = e.currentTarget
                                    const raw = inp.value.replace(/\D/g, '')
                                    if (raw.length < 10) return
                                    const full = '55' + raw
                                    const nums = blacklist.split('\n').filter(n => n.trim())
                                    if (!nums.includes(full)) {
                                        setBlacklist([...nums, full].join('\n'))
                                    }
                                    inp.value = ''
                                }
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        className="px-3 rounded-xl text-[11px] font-medium transition-all hover:scale-105"
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        onClick={() => {
                            const inp = document.getElementById('blacklist-input') as HTMLInputElement
                            if (!inp) return
                            const raw = inp.value.replace(/\D/g, '')
                            if (raw.length < 10) return
                            const full = '55' + raw
                            const nums = blacklist.split('\n').filter(n => n.trim())
                            if (!nums.includes(full)) {
                                setBlacklist([...nums, full].join('\n'))
                            }
                            inp.value = ''
                            inp.focus()
                        }}
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* Lista de números bloqueados */}
                {blacklist.trim() && (
                    <div className="space-y-1.5">
                        {blacklist.split('\n').filter(n => n.trim()).map((num, idx) => {
                            const formatted = num.length >= 12
                                ? `+${num.slice(0,2)} (${num.slice(2,4)}) ${num.slice(4,9)}-${num.slice(9)}`
                                : num
                            return (
                                <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
                                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}>
                                    <span className="text-[12px] font-mono tracking-wide" style={{ color: 'var(--text-primary)' }}>
                                        {formatted}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            className="p-1 rounded-lg transition-colors hover:bg-red-500/20"
                                            title="Editar"
                                            onClick={() => {
                                                const nums = blacklist.split('\n').filter(n => n.trim())
                                                const raw = nums[idx].startsWith('55') ? nums[idx].slice(2) : nums[idx]
                                                const inp = document.getElementById('blacklist-input') as HTMLInputElement
                                                if (inp) { inp.value = raw; inp.focus() }
                                                nums.splice(idx, 1)
                                                setBlacklist(nums.join('\n'))
                                            }}
                                        >
                                            <Pencil size={12} className="text-amber-400" />
                                        </button>
                                        <button
                                            type="button"
                                            className="p-1 rounded-lg transition-colors hover:bg-red-500/20"
                                            title="Excluir"
                                            onClick={() => {
                                                const nums = blacklist.split('\n').filter(n => n.trim())
                                                nums.splice(idx, 1)
                                                setBlacklist(nums.join('\n'))
                                            }}
                                        >
                                            <X size={12} className="text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                        <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            {blacklist.split('\n').filter(n => n.trim()).length} número(s) bloqueado(s)
                        </p>
                    </div>
                )}
                <BotaoSalvarBloco blocoId="blacklist" dados={{ blacklist }} label="Salvar Blacklist" />
            </div>

            {/* Aniversário movido para /contatos */}

            {/* ============ FEEDBACKS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <MessageCircle size={15} className="text-[#D99773]" />
                    Instruções para a {nomeIA || 'IARA'}
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Ensine a {nomeIA || 'IARA'} como se comportar! Escreva suas próprias regras abaixo.
                </p>

                {/* Lista de feedbacks existentes */}
                <div className="space-y-2 mb-4">
                    {feedbacks.length > 0 && feedbacks.map((fb, i) => (
                        <div key={i} className="flex items-start justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            <p className="text-[12px] flex-1 leading-relaxed" style={{ color: 'var(--text-primary)' }}>&ldquo;{fb}&rdquo;</p>
                            <button
                                onClick={() => setFeedbacks(feedbacks.filter((_, j) => j !== i))}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0 ml-3"
                            >
                                <Trash2 size={13} className="text-red-400" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Input para feedback customizado */}
                <div className="flex gap-2">
                    <input
                        className={`flex-1 ${inputClass}`}
                        style={inputStyle}
                        value={novoFeedback}
                        onChange={(e) => setNovoFeedback(e.target.value)}
                        placeholder='Ex: Nunca falar preço, sempre puxar para avaliação...'
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && novoFeedback.trim()) {
                                setFeedbacks([...feedbacks, novoFeedback.trim()])
                                setNovoFeedback('')
                            }
                        }}
                    />
                    <button
                        onClick={() => {
                            if (novoFeedback.trim()) {
                                setFeedbacks([...feedbacks, novoFeedback.trim()])
                                setNovoFeedback('')
                            }
                        }}
                        className="text-[11px] font-medium px-3 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                <BotaoSalvarBloco blocoId="feedbacks" dados={{ feedbacks: JSON.stringify(feedbacks) }} label="Salvar Instruções" />
            </div>

            {/* Salvar Tudo */}
            <button
                onClick={salvar}
                disabled={saving}
                className="w-full py-3 bg-[#0F4C61] text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#0F4C61]/90 transition-colors disabled:opacity-50"
            >
                {saving ? (
                    <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                ) : saved ? (
                    <><Check size={16} /> Salvo com sucesso! ✅</>
                ) : (
                    <><Save size={16} /> Salvar Configurações da Secretária</>
                )}
            </button>

            {/* Separator / Início VozTool */}
            <div className="pt-8 pb-4">
                <div className="h-px w-full" style={{ backgroundColor: 'var(--border-default)' }} />
            </div>

            <VozTool />

            {/* Testar IARA Floating Button */}
            <button
                onClick={() => setSimOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-white font-semibold shadow-2xl hover:-translate-y-1 transition-all"
                style={{ background: 'linear-gradient(135deg, #0F4C61, #1a6e8b)' }}
            >
                <Bot size={18} />
                <span className="hidden sm:inline">Testar {nomeIA || 'IARA'}</span>
            </button>

            {/* Drawer do Simulador */}
            <SimulatorDrawer
                isOpen={simOpen}
                onClose={() => setSimOpen(false)}
                config={{
                    nomeIA,
                    humor,
                    tom,
                    emojis,
                    fraseFavorita,
                    feedbacks,
                    funcionalidades: funcionalidades.reduce((acc, f) => ({ ...acc, [f.id]: f.ativo }), {})
                }}
            />
        </div>
    )
}
