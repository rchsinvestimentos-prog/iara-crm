'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Plus, Trash2, Save, Sparkles, Shield, ToggleLeft, ToggleRight, Loader2, Check } from 'lucide-react'

// Funcionalidades que a IARA pode fazer — a Dra liga/desliga
const funcionalidadesDefault = [
    { id: 'responder_texto', label: 'Responder mensagens de texto', desc: 'IARA responde automaticamente mensagens de texto das clientes', ativo: true },
    { id: 'responder_audio', label: 'Responder com áudio', desc: 'IARA gera áudio de resposta além do texto', ativo: true },
    { id: 'transcrever_audio', label: 'Transcrever áudios recebidos', desc: 'IARA transcreve áudios das clientes e responde', ativo: true },
    { id: 'vendas_7_passos', label: 'Vendas com 7 passos', desc: 'IARA usa a técnica de vendas de 7 etapas (sondagem, solução, fechamento...)', ativo: true },
    { id: 'dar_desconto', label: 'Oferecer descontos', desc: 'IARA pode oferecer desconto quando a cliente resiste ao preço', ativo: true },
    { id: 'google_calendar', label: 'Agendamento via Google Calendar', desc: 'IARA consulta e agenda automaticamente no Google Calendar', ativo: true },
    { id: 'lembrete_24h', label: 'Lembrete 24h antes', desc: 'IARA envia lembrete automático 24 horas antes do agendamento', ativo: true },
    { id: 'lembrete_2h', label: 'Lembrete 2h antes', desc: 'IARA envia lembrete 2 horas antes do agendamento', ativo: true },
    { id: 'followup_abandono', label: 'Recuperar leads abandonados', desc: 'IARA manda mensagem para clientes que pararam de responder há 24h', ativo: true },
    { id: 'horario_ponto', label: '"Batendo ponto" (entrada/saída)', desc: 'IARA manda mensagem humanizada de chegada e saída do trabalho', ativo: false },
    { id: 'enviar_endereco', label: 'Enviar endereço da clínica', desc: 'IARA envia localização quando confirma agendamento', ativo: true },
    { id: 'parcelamento', label: 'Oferecer parcelamento', desc: 'IARA menciona opções de parcelamento ao falar de preço', ativo: true },
    { id: 'encaminhar_foto', label: 'Encaminhar fotos para a Dra', desc: 'Quando cliente envia foto, IARA avisa e encaminha para o WhatsApp pessoal da Dra', ativo: true },
]

export default function AtendimentoTool() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Campos sincronizados com o banco
    const [nomeIA, setNomeIA] = useState('')
    const [humor, setHumor] = useState('amigavel')
    const [tom, setTom] = useState('informal')
    const [emojis, setEmojis] = useState('moderado')
    const [fraseFavorita, setFraseFavorita] = useState('')
    const [funcionalidades, setFuncionalidades] = useState(funcionalidadesDefault)

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
                setHumor(data.humor || 'amigavel')
                setTom(data.tomAtendimento || 'informal')
                setEmojis(data.emojis || 'moderado')
                setFraseFavorita(data.fraseDespedida || 'Qualquer coisa me chama! 💜')

                // Carregar funcionalidades salvas (se existirem no JSON)
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

                // Carregar feedbacks
                if (data.feedbacks) {
                    try {
                        const fb = typeof data.feedbacks === 'string'
                            ? JSON.parse(data.feedbacks)
                            : data.feedbacks
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
            // Montar objeto de funcionalidades como Record<string, boolean>
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#D99773]" />
                <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando configurações...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Personalização da IARA */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Sparkles size={15} className="text-[#D99773]" />
                    Personalidade da IARA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Nome da Assistente</label>
                        <input
                            className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            value={nomeIA} onChange={(e) => setNomeIA(e.target.value)}
                            placeholder="Ex: Sofia, Luna, Bella..."
                        />
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>As clientes vão conhecer a IARA pelo nome: <strong>{nomeIA}</strong></p>
                    </div>
                    <div>
                        <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Humor / Personalidade</label>
                        <select className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={humor} onChange={(e) => setHumor(e.target.value)}>
                            <option value="amigavel">🎀 Melhor Amiga (BFF) — alegre, próxima</option>
                            <option value="profissional">💼 Profissional — direta e objetiva</option>
                            <option value="luxo">💎 Elegante — sofisticada e premium</option>
                            <option value="acolhedora">🤗 Acolhedora — carinhosa e empática</option>
                            <option value="energetica">⚡ Energética — entusiasmada e motivada</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Tom de Conversa</label>
                        <select className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={tom} onChange={(e) => setTom(e.target.value)}>
                            <option value="informal">💬 Informal — tipo WhatsApp com amiga</option>
                            <option value="semi_formal">📋 Semi-formal — simpática mas profissional</option>
                            <option value="formal">🏥 Formal — linguagem técnica e séria</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Uso de Emojis</label>
                        <select className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={emojis} onChange={(e) => setEmojis(e.target.value)}>
                            <option value="nenhum">🚫 Nenhum emoji</option>
                            <option value="moderado">😊 Moderado (1 por mensagem)</option>
                            <option value="bastante">😍🎉 Bastante (2-3 por mensagem)</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Frase de Despedida</label>
                        <input
                            className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            value={fraseFavorita} onChange={(e) => setFraseFavorita(e.target.value)}
                            placeholder="Ex: Qualquer coisa me chama! 💜"
                        />
                    </div>
                </div>
            </div>

            {/* Funcionalidades (toggles) */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Shield size={15} className="text-[#D99773]" />
                    O que a IARA pode fazer
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Ative ou desative funcionalidades. Alterações são salvas ao clicar em &quot;Salvar&quot;.
                </p>
                <div className="space-y-1">
                    {funcionalidades.map((f) => (
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
            </div>

            {/* Feedbacks para a IARA */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <MessageCircle size={15} className="text-[#D99773]" />
                    Feedbacks para a IARA
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                    Ensine a IARA! Diga o que ela NÃO deve fazer ou como deve se comportar.
                </p>
                <div className="space-y-2 mb-4">
                    {feedbacks.length === 0 && (
                        <p className="text-center py-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>Nenhum feedback cadastrado</p>
                    )}
                    {feedbacks.map((fb, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            <p className="text-[12px] flex-1" style={{ color: 'var(--text-primary)' }}>&ldquo;{fb}&rdquo;</p>
                            <button
                                onClick={() => setFeedbacks(feedbacks.filter((_, j) => j !== i))}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0 ml-3"
                            >
                                <Trash2 size={13} className="text-red-400" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        className="flex-1 px-3 py-2 text-[12px] rounded-xl focus:outline-none"
                        style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        value={novoFeedback}
                        onChange={(e) => setNovoFeedback(e.target.value)}
                        placeholder='Ex: "Não fale sobre concorrentes"...'
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
                    <><Save size={16} /> Salvar Alterações</>
                )}
            </button>
        </div>
    )
}
