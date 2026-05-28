'use client'

import { useEffect, useState } from 'react'
import { 
    Stethoscope, Plus, ClipboardList, Eye, Trash2, Edit2, 
    Share2, Calendar, CheckCircle2, User, Clock, AlertCircle,
    X, Save, FileText, Check, ShieldCheck, Download
} from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Pergunta {
    id: string
    tipo: 'texto' | 'sim_nao' | 'multipla_escolha' | 'foto'
    label: string
    opcoes?: string[]
    obrigatorio: boolean
}

interface ModeloAnamnese {
    id: string
    titulo: string
    perguntas: Pergunta[]
    procedimentoIds: number[]
    mensagemEnvio: string | null
    horasAntecedencia: number
    ativo: boolean
}

interface FichaPreenchida {
    id: string
    titulo: string
    contatoId: number
    respostas: Record<string, any>
    assinaturaPng: string
    dataAssinatura: string
    ipOrigem: string
    userAgent: string
    hashIntegridade: string
    contato: {
        nome: string
        telefone: string
    }
}

interface Procedimento {
    id: number
    nome: string
    valor: number
}

export default function AnamnesePage() {
    const { data: session } = useSession()
    const [modelos, setModelos] = useState<ModeloAnamnese[]>([])
    const [fichas, setFichas] = useState<FichaPreenchida[]>([])
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)

    // Form modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [editingModel, setEditingModel] = useState<ModeloAnamnese | null>(null)
    const [titulo, setTitulo] = useState('')
    const [perguntas, setPerguntas] = useState<Pergunta[]>([])
    const [selectedProcs, setSelectedProcs] = useState<number[]>([])
    const [mensagemEnvio, setMensagemEnvio] = useState('')
    const [horasAntecedencia, setHorasAntecedencia] = useState(24)

    // View responses modal
    const [viewFicha, setViewFicha] = useState<FichaPreenchida | null>(null)

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const [resAnamnese, resProcs] = await Promise.all([
                fetch('/api/anamnese'),
                fetch('/api/procedimentos')
            ])
            const dataAnamnese = await resAnamnese.json()
            const dataProcs = await resProcs.json()

            if (dataAnamnese.modelos) setModelos(dataAnamnese.modelos)
            if (dataAnamnese.fichas) setFichas(dataAnamnese.fichas)
            if (Array.isArray(dataProcs)) setProcedimentos(dataProcs)
        } catch (err) {
            console.error('Erro ao carregar dados:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleOpenCreate = () => {
        setEditingModel(null)
        setTitulo('')
        setPerguntas([
            { id: '1', tipo: 'texto', label: 'Você possui alguma alergia?', obrigatorio: true }
        ])
        setSelectedProcs([])
        setMensagemEnvio('Olá, {nome_cliente}! Falta pouco para o seu atendimento. Por favor, preencha sua Ficha de Anamnese pelo link seguro: {link_anamnese}')
        setHorasAntecedencia(24)
        setModalOpen(true)
    }

    const handleOpenEdit = (modelo: ModeloAnamnese) => {
        setEditingModel(modelo)
        setTitulo(modelo.titulo)
        setPerguntas(modelo.perguntas)
        setSelectedProcs(modelo.procedimentoIds || [])
        setMensagemEnvio(modelo.mensagemEnvio || '')
        setHorasAntecedencia(modelo.horasAntecedencia || 24)
        setModalOpen(true)
    }

    const handleAddQuestion = () => {
        const id = Math.random().toString(36).substring(2, 9)
        setPerguntas(prev => [...prev, { id, tipo: 'texto', label: '', obrigatorio: false }])
    }

    const handleRemoveQuestion = (id: string) => {
        setPerguntas(prev => prev.filter(q => q.id !== id))
    }

    const handleQuestionChange = (id: string, field: keyof Pergunta, value: any) => {
        setPerguntas(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
    }

    const handleSaveModel = async () => {
        if (!titulo.trim()) return alert('Insira um título para a ficha.')
        if (perguntas.length === 0) return alert('Adicione pelo menos uma pergunta.')
        if (perguntas.some(q => !q.label.trim())) return alert('Preencha o texto de todas as perguntas.')

        try {
            const body = {
                id: editingModel?.id,
                titulo,
                perguntas,
                procedimentoIds: selectedProcs,
                mensagemEnvio,
                horasAntecedencia
            }

            const res = await fetch('/api/anamnese', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                setModalOpen(false)
                loadData()
            } else {
                alert('Erro ao salvar ficha.')
            }
        } catch {
            alert('Erro de conexão ao salvar.')
        }
    }

    const handleDeleteModel = async (id: string) => {
        if (!confirm('Deseja realmente excluir este modelo de ficha?')) return
        try {
            const res = await fetch(`/api/anamnese?id=${id}`, { method: 'DELETE' })
            if (res.ok) loadData()
        } catch {
            alert('Erro ao excluir.')
        }
    }

    const handleProcToggle = (procId: number) => {
        setSelectedProcs(prev => 
            prev.includes(procId) ? prev.filter(id => id !== procId) : [...prev, procId]
        )
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-petroleo dark:text-white flex items-center gap-2">
                        <Stethoscope className="text-terracota" />
                        Fichas de Anamnese 🩺
                    </h1>
                    <p className="text-xs text-acinzentado mt-1">
                        Crie prontuários dinâmicos, vincule aos seus procedimentos e audite assinaturas com validade legal.
                    </p>
                </div>
                <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Nova Ficha de Anamnese
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-[#D99773] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-acinzentado">Carregando fichas e histórico...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Modelos cadastrados */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <ClipboardList size={16} className="text-terracota" />
                            <h2 className="font-bold text-sm text-petroleo dark:text-white">Modelos Ativos de Fichas ({modelos.length})</h2>
                        </div>

                        {modelos.length === 0 ? (
                            <div className="glass-card p-8 text-center">
                                <p className="text-xs text-acinzentado">Você ainda não tem nenhum modelo de ficha cadastrado.</p>
                                <button onClick={handleOpenCreate} className="btn-secondary text-[11px] mt-4">
                                    Criar minha primeira ficha
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {modelos.map(m => (
                                    <div key={m.id} className="glass-card p-5 flex flex-col justify-between h-48 transition-all hover:scale-[1.01]">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-sm text-petroleo dark:text-white truncate max-w-[80%]">{m.titulo}</h3>
                                                <span className="badge badge-success text-[10px]">Ativo</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400 mb-3">{m.perguntas.length} perguntas formuladas</p>
                                            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                                {m.procedimentoIds.length === 0 ? (
                                                    <span className="text-[10px] text-acinzentado italic">Sem procedimentos vinculados</span>
                                                ) : (
                                                    m.procedimentoIds.map(pid => {
                                                        const p = procedimentos.find(pr => pr.id === pid)
                                                        return p ? (
                                                            <span key={pid} className="px-2 py-0.5 rounded bg-petroleo/10 text-petroleo dark:text-terracota dark:bg-[#D99773]/10 text-[9px] font-semibold">
                                                                {p.nome}
                                                            </span>
                                                        ) : null
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                            <button onClick={() => handleOpenEdit(m)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-all">
                                                <Edit2 size={13} />
                                            </button>
                                            <button onClick={() => handleDeleteModel(m.id)} className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Fichas já respondidas */}
                        <div className="pt-4">
                            <div className="flex items-center gap-2 mb-4">
                                <ShieldCheck size={16} className="text-green-500" />
                                <h2 className="font-bold text-sm text-petroleo dark:text-white">Auditoria Jurídica: Assinaturas Recebidas ({fichas.length})</h2>
                            </div>

                            {fichas.length === 0 ? (
                                <div className="glass-card p-8 text-center">
                                    <p className="text-xs text-acinzentado">Nenhuma paciente respondeu ou assinou prontuários ainda.</p>
                                </div>
                            ) : (
                                <div className="glass-card overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[11px] text-left">
                                            <thead>
                                                <tr className="bg-petroleo/5 dark:bg-white/5 text-petroleo dark:text-white font-bold border-b" style={{ borderColor: 'var(--border-default)' }}>
                                                    <th className="p-3">Paciente</th>
                                                    <th className="p-3">Procedimento/Ficha</th>
                                                    <th className="p-3">Data</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3 text-right">Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {fichas.map(f => (
                                                    <tr key={f.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="p-3 font-semibold text-petroleo dark:text-white">
                                                            <div className="flex flex-col">
                                                                <span>{f.contato.nome}</span>
                                                                <span className="text-[9px] text-gray-500">{f.contato.telefone}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-acinzentado">{f.titulo}</td>
                                                        <td className="p-3 text-gray-400">{new Date(f.dataAssinatura).toLocaleDateString('pt-BR')}</td>
                                                        <td className="p-3">
                                                            <span className="badge badge-success text-[9px] py-0.5">Assinado ✓</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button onClick={() => setViewFicha(f)} className="p-1.5 rounded-lg bg-petroleo/5 hover:bg-petroleo/10 text-petroleo dark:text-terracota dark:bg-[#D99773]/10 dark:hover:bg-[#D99773]/20 transition-all font-medium inline-flex items-center gap-1">
                                                                <Eye size={11} /> Ver
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resumo lateral informativa */}
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h3 className="font-bold text-sm text-petroleo dark:text-white flex items-center gap-1.5 mb-2">
                                <ShieldCheck size={16} className="text-terracota" /> Validado Juridicamente
                            </h3>
                            <p className="text-[11px] text-acinzentado leading-relaxed mb-4">
                                Cada formulário de anamnese respondido e assinado digitalmente gera uma trilha técnica criptográfica inalterável. Armazenamos logs de IP de preenchimento, navegador User-Agent, carimbo de data/hora UTC síncrono do servidor e geramos um hash **SHA-256** individual do payload para completa garantia legal.
                            </p>
                            <div className="p-3 bg-glacial dark:bg-white/5 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-default)' }}>
                                <p className="text-[9px] text-petroleo dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Dica de Envio:</p>
                                <p className="text-[10px] text-acinzentado leading-relaxed">
                                    Vincule suas fichas de anamnese aos procedimentos adequados. A IARA se encarregará de ler o agendamento da cliente e disparar a mensagem com o link correspondente exatamente 24 horas antes da consulta.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL DE FORMULÁRIO (CRIAR/EDITAR) ====== */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 border-b mb-4" style={{ borderColor: 'var(--border-default)' }}>
                            <h2 className="font-bold text-sm text-petroleo dark:text-white flex items-center gap-1.5">
                                <ClipboardList size={16} className="text-terracota" />
                                {editingModel ? 'Editar Modelo de Anamnese' : 'Novo Modelo de Anamnese'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-200">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-[11px]">
                            {/* Título */}
                            <div>
                                <label className="block font-bold text-petroleo dark:text-white mb-1.5">Título da Ficha de Anamnese:</label>
                                <input 
                                    type="text" 
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Ex: Ficha de Anamnese - Botox e Preenchedores"
                                    className="input-field py-2"
                                />
                            </div>

                            {/* Procedimentos vinculados */}
                            <div>
                                <label className="block font-bold text-petroleo dark:text-white mb-1.5">Vincular a Procedimentos (Quando agendados, dispara esta ficha):</label>
                                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-white/5 rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                                    {procedimentos.length === 0 ? (
                                        <p className="text-[10px] text-acinzentado italic">Nenhum procedimento cadastrado na clínica.</p>
                                    ) : (
                                        procedimentos.map(p => {
                                            const isSelected = selectedProcs.includes(p.id)
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleProcToggle(p.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all ${
                                                        isSelected 
                                                            ? 'bg-terracota border-terracota text-white' 
                                                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 hover:opacity-85'
                                                    }`}
                                                >
                                                    {p.nome}
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Envio configurações */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-petroleo dark:text-white mb-1.5">Enviar quanto tempo antes?</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={horasAntecedencia}
                                            onChange={(e) => setHorasAntecedencia(Number(e.target.value))}
                                            className="input-field w-20 py-2 text-center"
                                        />
                                        <span className="text-acinzentado">horas antes do agendamento</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mensagem customizada */}
                            <div>
                                <label className="block font-bold text-petroleo dark:text-white mb-1.5">Corpo da mensagem do WhatsApp:</label>
                                <textarea
                                    value={mensagemEnvio}
                                    onChange={(e) => setMensagemEnvio(e.target.value)}
                                    rows={3}
                                    className="input-field text-[11px]"
                                    placeholder="Ex: Olá {nome_cliente}! Por favor preencha sua ficha pelo link: {link_anamnese}"
                                />
                                <p className="text-[9px] text-acinzentado mt-1">Use a tag <strong>{"{nome_cliente}"}</strong> e <strong>{"{link_anamnese}"}</strong> para injeção automática de dados.</p>
                            </div>

                            {/* Perguntas Dinâmicas */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block font-bold text-petroleo dark:text-white">Perguntas da Ficha ({perguntas.length})</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddQuestion}
                                        className="text-[10px] text-terracota hover:underline flex items-center gap-1 font-semibold"
                                    >
                                        <Plus size={12} /> Adicionar Pergunta
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                    {perguntas.map((q, idx) => (
                                        <div key={q.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border relative" style={{ borderColor: 'var(--border-default)' }}>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveQuestion(q.id)}
                                                className="absolute top-2 right-2 text-red-500 hover:bg-red-500/5 p-1 rounded"
                                            >
                                                <X size={12} />
                                            </button>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-gray-500 mb-1">Pergunta {idx + 1}:</label>
                                                    <input 
                                                        type="text" 
                                                        value={q.label}
                                                        onChange={(e) => handleQuestionChange(q.id, 'label', e.target.value)}
                                                        placeholder="Ex: Sofre de alguma doença crônica ou cardíaca?"
                                                        className="input-field py-1 text-[10px]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-500 mb-1">Tipo de Resposta:</label>
                                                    <select 
                                                        value={q.tipo}
                                                        onChange={(e: any) => handleQuestionChange(q.id, 'tipo', e.target.value)}
                                                        className="input-field py-1 text-[10px]"
                                                    >
                                                        <option value="texto">Texto Livre</option>
                                                        <option value="sim_nao">Sim / Não</option>
                                                        <option value="multipla_escolha">Múltipla Escolha</option>
                                                        <option value="foto">Foto (Antes/Depois)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Se for múltipla escolha, permitir adicionar opções */}
                                            {q.tipo === 'multipla_escolha' && (
                                                <div className="mt-3">
                                                    <label className="block text-gray-500 mb-1">Opções (separadas por vírgula):</label>
                                                    <input 
                                                        type="text" 
                                                        value={q.opcoes?.join(', ') || ''}
                                                        onChange={(e) => handleQuestionChange(q.id, 'opcoes', e.target.value.split(',').map(s => s.trim()))}
                                                        placeholder="Opção A, Opção B, Opção C"
                                                        className="input-field py-1 text-[10px]"
                                                    />
                                                </div>
                                            )}

                                            <div className="mt-3 flex items-center gap-1.5">
                                                <input 
                                                    type="checkbox" 
                                                    id={`req-${q.id}`} 
                                                    checked={q.obrigatorio}
                                                    onChange={(e) => handleQuestionChange(q.id, 'obrigatorio', e.target.checked)}
                                                    className="w-3.5 h-3.5 border rounded"
                                                />
                                                <label htmlFor={`req-${q.id}`} className="text-gray-500 font-semibold cursor-pointer">Resposta obrigatória</label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 pt-4 border-t mt-4" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setModalOpen(false)} className="btn-secondary py-2 px-4 text-[11px]">
                                Cancelar
                            </button>
                            <button onClick={handleSaveModel} className="btn-primary py-2 px-4 text-[11px] flex items-center gap-1">
                                <Save size={14} /> Salvar Ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL DE VISUALIZAÇÃO DE FICHA PREENCHIDA (AUDITORIA) ====== */}
            {viewFicha && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center pb-4 border-b mb-4" style={{ borderColor: 'var(--border-default)' }}>
                            <div>
                                <h2 className="font-bold text-sm text-petroleo dark:text-white flex items-center gap-1.5">
                                    <ShieldCheck size={16} className="text-green-500" />
                                    Auditoria de Prontuário Assinado
                                </h2>
                                <p className="text-[10px] text-gray-500 mt-0.5">Paciente: {viewFicha.contato.nome} ({viewFicha.contato.telefone})</p>
                            </div>
                            <button onClick={() => setViewFicha(null)} className="text-gray-400 hover:text-gray-200">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-[11px]">
                            {/* Respostas */}
                            <div>
                                <h3 className="font-bold text-petroleo dark:text-white mb-2 pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>Perguntas & Respostas</h3>
                                <div className="space-y-3 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border" style={{ borderColor: 'var(--border-default)' }}>
                                    {Object.entries(viewFicha.respostas).map(([label, valor]) => (
                                        <div key={label} className="pb-2 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                                            <p className="text-gray-500 font-bold mb-1">{label}</p>
                                            <p className="text-petroleo dark:text-white text-xs">{String(valor) || <span className="italic text-gray-400">Sem resposta</span>}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assinatura Desenho */}
                            <div>
                                <h3 className="font-bold text-petroleo dark:text-white mb-2 pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>Assinatura do Paciente</h3>
                                <div className="flex items-center justify-center p-4 bg-white rounded-2xl border" style={{ borderColor: 'var(--border-default)' }}>
                                    {viewFicha.assinaturaPng ? (
                                        <img src={viewFicha.assinaturaPng} alt="Assinatura Digital" className="max-h-24 object-contain invert-0" />
                                    ) : (
                                        <span className="italic text-gray-400">Assinatura indisponível</span>
                                    )}
                                </div>
                            </div>

                            {/* Selo e Rastro Jurídico */}
                            <div>
                                <h3 className="font-bold text-petroleo dark:text-white mb-2 pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>Evidências Legais de Integridade</h3>
                                <div className="p-4 bg-petroleo/5 dark:bg-white/5 rounded-2xl border space-y-2 border-dashed" style={{ borderColor: 'var(--border-hover)' }}>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <p className="text-gray-400">Endereço IP de origem:</p>
                                        <p className="text-petroleo dark:text-white font-semibold text-right">{viewFicha.ipOrigem}</p>
                                        
                                        <p className="text-gray-400">Data e Hora exata UTC:</p>
                                        <p className="text-petroleo dark:text-white font-semibold text-right">{new Date(viewFicha.dataAssinatura).toUTCString()}</p>
                                        
                                        <p className="text-gray-400">Navegador e Dispositivo (UA):</p>
                                        <p className="text-petroleo dark:text-white font-semibold text-right truncate max-w-[180px] self-end">{viewFicha.userAgent}</p>
                                    </div>
                                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                        <p className="text-gray-400 mb-1">Hash de Integridade Criptográfica (SHA-256):</p>
                                        <p className="text-terracota font-mono text-[9px] break-all bg-black/10 dark:bg-black/30 p-2 rounded-xl border border-black/15">{viewFicha.hashIntegridade}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 pt-4 border-t mt-4" style={{ borderColor: 'var(--border-default)' }}>
                            <button onClick={() => setViewFicha(null)} className="btn-secondary py-2 px-4 text-[11px]">
                                Fechar Auditoria
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
