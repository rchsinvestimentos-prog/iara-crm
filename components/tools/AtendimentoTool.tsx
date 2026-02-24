'use client'

import { useState } from 'react'
import { MessageCircle, Plus, Trash2, Save, Sparkles, Shield, ToggleLeft, ToggleRight } from 'lucide-react'

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
    const [funcionalidades, setFuncionalidades] = useState(funcionalidadesDefault)
    const [nomeIA, setNomeIA] = useState('Sofia')
    const [humor, setHumor] = useState('amigavel')
    const [tom, setTom] = useState('informal')
    const [emojis, setEmojis] = useState('moderado')
    const [fraseFavorita, setFraseFavorita] = useState('Qualquer coisa me chama! 💜')

    // Feedbacks
    const [feedbacks, setFeedbacks] = useState([
        'Nunca diga que o procedimento vai ficar "perfeito"',
        'Não prometa resultados em menos de 3 sessões',
        'Sempre falar "investimento" ao invés de "preço"',
    ])
    const [novoFeedback, setNovoFeedback] = useState('')

    const toggleFunc = (id: string) => {
        setFuncionalidades(prev =>
            prev.map(f => f.id === id ? { ...f, ativo: !f.ativo } : f)
        )
    }

    return (
        <div className="space-y-6">
            {/* Personalização da IARA */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-terracota" />
                    Personalidade da IARA
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Nome da Assistente</label>
                        <input className="input-field" value={nomeIA} onChange={(e) => setNomeIA(e.target.value)} placeholder="Ex: Sofia, Luna, Bella..." />
                        <p className="text-xs text-acinzentado mt-1">As clientes vão conhecer a IARA pelo nome: <strong>{nomeIA}</strong></p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Humor / Personalidade</label>
                        <select className="input-field" value={humor} onChange={(e) => setHumor(e.target.value)}>
                            <option value="amigavel">🎀 Melhor Amiga (BFF) — alegre, próxima</option>
                            <option value="profissional">💼 Profissional — direta e objetiva</option>
                            <option value="luxo">💎 Elegante — sofisticada e premium</option>
                            <option value="acolhedora">🤗 Acolhedora — carinhosa e empática</option>
                            <option value="energetica">⚡ Energética — entusiasmada e motivada</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Tom de Conversa</label>
                        <select className="input-field" value={tom} onChange={(e) => setTom(e.target.value)}>
                            <option value="informal">💬 Informal — tipo WhatsApp com amiga</option>
                            <option value="semi_formal">📋 Semi-formal — simpática mas profissional</option>
                            <option value="formal">🏥 Formal — linguagem técnica e séria</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Uso de Emojis</label>
                        <select className="input-field" value={emojis} onChange={(e) => setEmojis(e.target.value)}>
                            <option value="nenhum">🚫 Nenhum emoji</option>
                            <option value="moderado">😊 Moderado (1 por mensagem)</option>
                            <option value="bastante">😍🎉 Bastante (2-3 por mensagem)</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Frase de Despedida</label>
                        <input className="input-field" value={fraseFavorita} onChange={(e) => setFraseFavorita(e.target.value)} placeholder="Ex: Qualquer coisa me chama! 💜" />
                    </div>
                </div>
            </div>

            {/* Funcionalidades (toggles) */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-2 flex items-center gap-2">
                    <Shield size={16} className="text-terracota" />
                    O que a IARA pode fazer
                </h3>
                <p className="text-xs text-acinzentado mb-4">
                    Ative ou desative funcionalidades da IARA conforme sua necessidade. Alterações aplicam imediatamente.
                </p>
                <div className="space-y-2">
                    {funcionalidades.map((f) => (
                        <div
                            key={f.id}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-colors ${f.ativo ? 'bg-verde-agua/50' : 'bg-gray-50'
                                }`}
                        >
                            <div className="flex-1 mr-4">
                                <p className={`text-sm font-medium ${f.ativo ? 'text-petroleo' : 'text-gray-400'}`}>
                                    {f.label}
                                </p>
                                <p className="text-xs text-acinzentado">{f.desc}</p>
                            </div>
                            <button
                                onClick={() => toggleFunc(f.id)}
                                className="flex-shrink-0"
                            >
                                {f.ativo ? (
                                    <ToggleRight size={32} className="text-green-500" />
                                ) : (
                                    <ToggleLeft size={32} className="text-gray-300" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Feedbacks para a IARA */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-2 flex items-center gap-2">
                    <MessageCircle size={16} className="text-terracota" />
                    Feedbacks para a IARA
                </h3>
                <p className="text-xs text-acinzentado mb-4">
                    Ensine a IARA! Diga o que ela NÃO deve fazer ou como deve se comportar. Ela vai aprender e nunca mais repetir.
                </p>
                <div className="space-y-2 mb-4">
                    {feedbacks.map((fb, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-glacial rounded-xl">
                            <p className="text-sm text-petroleo flex-1">"{fb}"</p>
                            <button
                                onClick={() => setFeedbacks(feedbacks.filter((_, j) => j !== i))}
                                className="text-red-400 hover:text-red-500 p-1 flex-shrink-0 ml-3"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        className="input-field flex-1"
                        value={novoFeedback}
                        onChange={(e) => setNovoFeedback(e.target.value)}
                        placeholder='Ex: "Não fale sobre concorrentes", "Sempre chame de senhora"...'
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
                        className="btn-primary py-2 px-4"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Salvar */}
            <button className="btn-primary flex items-center gap-2 w-full justify-center">
                <Save size={18} /> Salvar Alterações
            </button>
        </div>
    )
}
