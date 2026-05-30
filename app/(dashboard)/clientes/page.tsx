'use client'

import { useEffect, useState, useRef } from 'react'
import { 
    Users, Search, Filter, ClipboardList, Stethoscope, 
    MessageSquare, Clock, ShieldCheck, User, Calendar, Plus, 
    Trash2, Edit, Save, X, ArrowRight, Loader2, Play, Pause,
    Activity, FileText, Send, CheckCircle2, ChevronRight, MessageCircle, AlertCircle
} from 'lucide-react'

interface Contato {
    id: number
    nome: string | null
    telefone: string
    cpf: string | null
    email: string | null
    dataNascimento: string | null
    memoriaIA: string | null
    origem: string | null
    etapa: string | null
    tags: string[]
    notas: string | null
    ultimoContato: string | null
    retornoData: string | null
    retornoMensagem: string | null
    retornoEnviado: boolean | null
    iaPausada: boolean
    resumoClinico: string | null
}

interface TimelineEvent {
    id: string
    tipo: 'procedimento' | 'documento'
    titulo: string
    data: string
    valor: number | null
    status: string
    detalhes: string
    icone: string
    documento?: any
}

interface ModeloAnamnese {
    id: string
    titulo: string
}

interface ChatMessage {
    id: number
    role: 'user' | 'assistant'
    content: string
    pushName: string | null
    data: string
}

const ETAPAS = ['novo', 'agendado', 'realizado', 'cancelado', 'reagendado', 'noshow']

export default function ClientesPage() {
    const [contatos, setContatos] = useState<Contato[]>([])
    const [modelos, setModelos] = useState<ModeloAnamnese[]>([])
    const [busca, setBusca] = useState('')
    const [etapaFiltro, setEtapaFiltro] = useState('')
    const [loading, setLoading] = useState(true)

    // CRM details drawer/modal
    const [activeContato, setActiveContato] = useState<Contato | null>(null)
    const [timeline, setTimeline] = useState<TimelineEvent[]>([])
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'prontuario' | 'timeline' | 'chat'>('prontuario')

    // Add manual procedure form
    const [showAddProc, setShowAddProc] = useState(false)
    const [procNome, setProcNome] = useState('')
    const [procValor, setProcValor] = useState('')
    const [procData, setProcData] = useState(new Date().toISOString().split('T')[0])
    const [procObs, setProcObs] = useState('')
    const [addingProc, setAddingProc] = useState(false)

    // Chat box state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const [sendingMsg, setSendingMsg] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Schedule message state
    const [showScheduler, setShowScheduler] = useState(false)
    const [schedDate, setSchedDate] = useState('')
    const [schedMsg, setSchedMsg] = useState('')
    const [scheduling, setScheduling] = useState(false)

    // AI Memory edit state
    const [editingNotes, setEditingNotes] = useState(false)
    const [tempNotes, setTempNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)

    // Load list
    const loadContatos = async () => {
        setLoading(true)
        try {
            let url = `/api/contatos`
            const params = []
            if (busca) params.push(`busca=${encodeURIComponent(busca)}`)
            if (etapaFiltro) params.push(`etapa=${encodeURIComponent(etapaFiltro)}`)
            if (params.length > 0) url += `?${params.join('&')}`

            const res = await fetch(url)
            const data = await res.json()
            if (data.contatos) setContatos(data.contatos)
        } catch (err) {
            console.error('Erro ao carregar contatos:', err)
        } finally {
            setLoading(false)
        }
    }

    // Load templates of anamnese
    useEffect(() => {
        loadContatos()
        fetch('/api/anamnese')
            .then(r => r.json())
            .then(data => {
                if (data.modelos) setModelos(data.modelos)
            })
            .catch(() => { })
    }, [etapaFiltro])

    // Delay busca search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadContatos()
        }, 300)
        return () => clearTimeout(timer)
    }, [busca])

    // Load single contact timeline & history details
    const loadContatoDetails = async (c: Contato) => {
        setDetailLoading(true)
        setActiveTab('prontuario')
        setShowAddProc(false)
        setShowScheduler(false)
        try {
            const res = await fetch(`/api/contatos/${c.id}/details`)
            const data = await res.json()
            if (data.timeline) setTimeline(data.timeline)
            if (data.contato) setActiveContato(data.contato)
        } catch (err) {
            console.error('Erro ao carregar detalhes do paciente:', err)
        } finally {
            setDetailLoading(false)
        }
    }

    // Load real-time chat history
    const loadChatHistory = async (telefone: string) => {
        setChatLoading(true)
        try {
            const res = await fetch(`/api/conversas?telefone=${telefone}`)
            const data = await res.json()
            if (data.mensagens) setChatMessages(data.mensagens)
        } catch (err) {
            console.error('Erro ao carregar histórico de chat:', err)
        } finally {
            setChatLoading(false)
            // Scroll to bottom
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
        }
    }

    useEffect(() => {
        if (activeContato && activeTab === 'chat') {
            loadChatHistory(activeContato.telefone)
        }
    }, [activeContato, activeTab])

    // Toggle AI Paused
    const handleToggleIAPause = async () => {
        if (!activeContato) return
        const newVal = !activeContato.iaPausada
        try {
            const res = await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: activeContato.nome,
                    telefone: activeContato.telefone,
                    iaPausada: newVal
                })
            })
            if (res.ok) {
                setActiveContato(prev => prev ? { ...prev, iaPausada: newVal } : null)
                // Atualizar lista principal síncronamente
                setContatos(prev => prev.map(c => c.id === activeContato.id ? { ...c, iaPausada: newVal } : c))
            }
        } catch (err) {
            console.error('Erro ao alternar status da IA:', err)
        }
    }

    // Add manual procedure done
    const handleAddProcedure = async () => {
        if (!activeContato) return
        if (!procNome.trim()) return alert('Insira o nome do procedimento.')

        setAddingProc(true)
        try {
            const res = await fetch(`/api/contatos/${activeContato.id}/procedimentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    procedimento: procNome,
                    valor: Number(procValor) || 0,
                    data: procData,
                    observacao: procObs
                })
            })
            if (res.ok) {
                setShowAddProc(false)
                setProcNome('')
                setProcValor('')
                setProcObs('')
                // Recarregar prontuário
                loadContatoDetails(activeContato)
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao registrar procedimento.')
            }
        } catch {
            alert('Erro de conexão ao salvar.')
        } finally {
            setAddingProc(false)
        }
    }

    // Send immediate WhatsApp
    const handleSendImmediateMessage = async () => {
        if (!activeContato || !chatInput.trim()) return
        setSendingMsg(true)
        try {
            const res = await fetch(`/api/contatos/${activeContato.id}/enviar-mensagem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem: chatInput })
            })
            if (res.ok) {
                setChatInput('')
                // Recarregar chat
                loadChatHistory(activeContato.telefone)
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao disparar mensagem.')
            }
        } catch {
            alert('Erro de conexão ao disparar.')
        } finally {
            setSendingMsg(false)
        }
    }

    // Schedule message
    const handleScheduleMessage = async () => {
        if (!activeContato || !schedMsg.trim() || !schedDate) return
        setScheduling(true)
        try {
            const res = await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: activeContato.nome,
                    telefone: activeContato.telefone,
                    retornoData: new Date(schedDate).toISOString(),
                    retornoMensagem: schedMsg,
                    retornoEnviado: false
                })
            })
            if (res.ok) {
                setShowScheduler(false)
                setSchedMsg('')
                setSchedDate('')
                alert('Mensagem programada com sucesso!')
                // Recarregar detalhes
                loadContatoDetails(activeContato)
            }
        } catch {
            alert('Erro de conexão ao programar.')
        } finally {
            setScheduling(false)
        }
    }

    // Save notes/tags modifications
    const handleSaveProfileNotes = async () => {
        if (!activeContato) return
        setSavingNotes(true)
        try {
            const res = await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: activeContato.nome,
                    telefone: activeContato.telefone,
                    notas: tempNotes
                })
            })
            if (res.ok) {
                setActiveContato(prev => prev ? { ...prev, notas: tempNotes } : null)
                setEditingNotes(false)
            }
        } catch {
            alert('Erro de conexão ao salvar.')
        } finally {
            setSavingNotes(false)
        }
    }

    // Generate anamnese link
    const handleGenerateAnamneseLink = (modeloId: string) => {
        if (!activeContato) return
        const link = `${window.location.origin}/anamnese/${modeloId}?contatoId=${activeContato.id}`
        navigator.clipboard.writeText(link)
        alert('Link da Ficha copiado para a Área de Transferência! Compartilhe pelo WhatsApp com a paciente.')
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-in text-[11px] relative">
            
            {/* Main CRM Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-petroleo dark:text-white flex items-center gap-2">
                    <Users className="text-terracota" />
                    Central de Clientes & CRM 👥
                </h1>
                <p className="text-xs text-acinzentado mt-1">
                    Visualize fichas médicas, acompanhe linhas do tempo de procedimentos, assuma chats e gerencie a inteligência da IARA.
                </p>
            </div>

            {/* List and search bar */}
            <div className="glass-card p-5 space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search box */}
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3.5 top-3 text-gray-400" />
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar paciente por nome, e-mail ou WhatsApp..."
                            className="input-field pl-9 py-2 text-[11px]"
                        />
                    </div>

                    {/* Filter by stage */}
                    <div className="flex gap-2">
                        <div className="relative flex items-center">
                            <Filter size={13} className="absolute left-3.5 text-gray-400" />
                            <select
                                value={etapaFiltro}
                                onChange={(e) => setEtapaFiltro(e.target.value)}
                                className="input-field pl-9 pr-6 py-2 text-[11px] bg-white dark:bg-white/5 cursor-pointer w-40"
                            >
                                <option value="">Todos as Etapas</option>
                                {ETAPAS.map(et => (
                                    <option key={et} value={et}>{et.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Contacts grid list */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-10 h-10 border-4 border-[#D99773] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs text-acinzentado">Carregando carteira de clientes...</p>
                    </div>
                ) : contatos.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle size={24} className="text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-acinzentado">Nenhum paciente encontrado com os filtros atuais.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {contatos.map(c => (
                            <div 
                                key={c.id} 
                                onClick={() => loadContatoDetails(c)}
                                className="glass-card p-4 transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between h-36"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 max-w-[70%]">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center flex-shrink-0">
                                                <span className="text-[10px] font-bold text-white">{(c.nome || 'P').slice(0, 1).toUpperCase()}</span>
                                            </div>
                                            <div className="truncate">
                                                <h3 className="font-bold text-petroleo dark:text-white truncate">{c.nome || 'Paciente'}</h3>
                                                <p className="text-[9px] text-gray-500 font-mono">{c.telefone}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Status badge */}
                                        <span className="badge bg-petroleo/10 text-petroleo dark:text-terracota dark:bg-[#D99773]/10 text-[9px] py-0.5 uppercase font-bold">
                                            {c.etapa || 'novo'}
                                        </span>
                                    </div>

                                    {/* AI paused badge */}
                                    {c.iaPausada && (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold">
                                            <Pause size={8} /> IA Pausada
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t text-[10px]" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <span className="text-gray-400">Último contato:</span>
                                    <span className="font-semibold text-petroleo dark:text-gray-300">
                                        {c.ultimoContato ? new Date(c.ultimoContato).toLocaleDateString('pt-BR') : 'Sem dados'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ====== PAINEL DA CLIENTE (SLIDE-OVER DRAWER) ====== */}
            {activeContato && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
                    {/* Backdrop closer */}
                    <div className="absolute inset-0" onClick={() => setActiveContato(null)} />

                    {/* Drawer sheet container */}
                    <div 
                        className="relative w-full max-w-xl h-full flex flex-col shadow-2xl border-l animate-slide-in"
                        style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            borderColor: 'var(--border-default)' 
                        }}
                    >
                        {/* Drawer Header */}
                        <div className="p-5 border-b space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center flex-shrink-0 shadow-md">
                                        <span className="text-[12px] font-bold text-white">{(activeContato.nome || 'P').slice(0, 1).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-sm text-petroleo dark:text-white">{activeContato.nome || 'Paciente'}</h2>
                                        <p className="text-[10px] text-gray-500 font-mono">{activeContato.telefone}</p>
                                    </div>
                                </div>
                                
                                <button onClick={() => setActiveContato(null)} className="p-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-all">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* IA Paused Glowing Toggle */}
                            <div 
                                onClick={handleToggleIAPause}
                                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                    activeContato.iaPausada 
                                        ? 'bg-amber-500/10 border-amber-500/30' 
                                        : 'bg-green-500/10 border-green-500/30'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full animate-ping ${activeContato.iaPausada ? 'bg-amber-500' : 'bg-green-500'}`} />
                                    <div>
                                        <p className="font-bold text-[11px]" style={{ color: activeContato.iaPausada ? '#F59E0B' : '#10B981' }}>
                                            {activeContato.iaPausada ? 'Atendimento Humano Ativo' : 'IARA está Respondendo Ativamente'}
                                        </p>
                                        <p className="text-[9px] text-gray-500 mt-0.2">
                                            {activeContato.iaPausada ? 'A Inteligência Artificial está pausada para este contato' : 'A IA gerencia o atendimento deste cliente'}
                                        </p>
                                    </div>
                                </div>
                                <button className="focus:outline-none">
                                    {activeContato.iaPausada ? (
                                        <ToggleRight size={32} className="text-amber-500" />
                                    ) : (
                                        <ToggleLeft size={32} className="text-green-500" />
                                    )}
                                </button>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                                {(['prontuario', 'timeline', 'chat'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] cursor-pointer transition-all ${
                                            activeTab === tab
                                                ? 'bg-white dark:bg-white/10 text-petroleo dark:text-[#D99773] shadow-sm'
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        {tab === 'prontuario' ? 'Ficha Médica' : tab === 'timeline' ? 'Linha do Tempo' : 'Chat WhatsApp'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-8 h-8 border-3 border-[#D99773] border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-[10px] text-acinzentado">Carregando prontuário...</p>
                                </div>
                            ) : (
                                <>
                                    {/* TABA: PRONTUÁRIO */}
                                    {activeTab === 'prontuario' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* AI summary */}
                                            <div className="p-4 rounded-2xl bg-petroleo/5 dark:bg-[#D99773]/5 border border-dashed" style={{ borderColor: 'var(--border-hover)' }}>
                                                <h4 className="font-bold text-petroleo dark:text-terracota flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider">
                                                    <Activity size={13} className="text-terracota" /> Resumo Clínico Inteligente da IA
                                                </h4>
                                                <p className="text-[11px] text-acinzentado leading-relaxed italic">
                                                    {activeContato.resumoClinico || activeContato.memoriaIA || '"Paciente em triagem inicial. Ainda sem histórico de procedimentos mapeado pela IA."'}
                                                </p>
                                            </div>

                                            {/* Paciente Dados Gerais */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-petroleo dark:text-white">Anotações do Profissional</h3>
                                                    <button 
                                                        onClick={() => {
                                                            if (editingNotes) handleSaveProfileNotes()
                                                            else {
                                                                setTempNotes(activeContato.notas || '')
                                                                setEditingNotes(true)
                                                            }
                                                        }}
                                                        disabled={savingNotes}
                                                        className="text-[10px] font-bold text-terracota hover:underline cursor-pointer flex items-center gap-1"
                                                    >
                                                        {savingNotes ? <Loader2 size={10} className="animate-spin" /> : editingNotes ? <Save size={10} /> : <Edit size={10} />}
                                                        {editingNotes ? 'Salvar' : 'Editar'}
                                                    </button>
                                                </div>

                                                {editingNotes ? (
                                                    <textarea
                                                        value={tempNotes}
                                                        onChange={(e) => setTempNotes(e.target.value)}
                                                        rows={4}
                                                        className="input-field text-[11px]"
                                                        placeholder="Digite anotações ou observações médicas sobre esta cliente..."
                                                    />
                                                ) : (
                                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border" style={{ borderColor: 'var(--border-default)' }}>
                                                        <p className="text-acinzentado whitespace-pre-wrap leading-relaxed">
                                                            {activeContato.notas || 'Nenhuma anotação médica registrada ainda. Clique em Editar para inserir.'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fichas de Anamnese Disponíveis */}
                                            <div className="space-y-3.5">
                                                <h3 className="font-bold text-petroleo dark:text-white">Gerar Link de Anamnese</h3>
                                                <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border space-y-2.5" style={{ borderColor: 'var(--border-default)' }}>
                                                    {modelos.length === 0 ? (
                                                        <p className="text-acinzentado italic">Sem modelos de fichas cadastrados.</p>
                                                    ) : (
                                                        modelos.map(m => (
                                                            <div key={m.id} className="flex items-center justify-between gap-3 pb-2 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border-subtle)' }}>
                                                                <span className="font-semibold text-petroleo dark:text-gray-300 truncate max-w-[65%]">{m.titulo}</span>
                                                                <button
                                                                    onClick={() => handleGenerateAnamneseLink(m.id)}
                                                                    className="px-2.5 py-1 rounded bg-[#D99773]/10 hover:bg-[#D99773]/20 text-[#D99773] font-bold text-[9px] flex items-center gap-1 transition-all"
                                                                >
                                                                    Copiar Link <ChevronRight size={10} />
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* TABA: LINHA DO TEMPO */}
                                    {activeTab === 'timeline' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Button to show procedure logging */}
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-petroleo dark:text-white">Histórico e Procedimentos</h3>
                                                <button
                                                    onClick={() => setShowAddProc(!showAddProc)}
                                                    className="px-2.5 py-1 rounded-xl bg-petroleo hover:bg-petroleo-light text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                                >
                                                    <Plus size={11} /> Registrar Procedimento Concluído
                                                </button>
                                            </div>

                                            {/* Manual log form */}
                                            {showAddProc && (
                                                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border space-y-3" style={{ borderColor: 'var(--border-default)' }}>
                                                    <h4 className="font-bold text-petroleo dark:text-white text-[10px] uppercase">Lançar Tratamento no Prontuário</h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-gray-500 mb-1">Procedimento:</label>
                                                            <input 
                                                                type="text"
                                                                value={procNome}
                                                                onChange={(e) => setProcNome(e.target.value)}
                                                                placeholder="Ex: Microblanding"
                                                                className="input-field py-1 text-[10px]"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-gray-500 mb-1">Valor (R$):</label>
                                                            <input 
                                                                type="number"
                                                                value={procValor}
                                                                onChange={(e) => setProcValor(e.target.value)}
                                                                placeholder="450.00"
                                                                className="input-field py-1 text-[10px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-gray-500 mb-1">Data:</label>
                                                            <input 
                                                                type="date"
                                                                value={procData}
                                                                onChange={(e) => setProcData(e.target.value)}
                                                                className="input-field py-1 text-[10px]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-500 mb-1">Observações Médicas:</label>
                                                        <textarea 
                                                            value={procObs}
                                                            onChange={(e) => setProcObs(e.target.value)}
                                                            rows={2}
                                                            className="input-field text-[10px]"
                                                            placeholder="Anotações de cicatrização, pigmento usado..."
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-2">
                                                        <button onClick={() => setShowAddProc(false)} className="btn-secondary py-1 px-3 text-[10px]">
                                                            Cancelar
                                                        </button>
                                                        <button 
                                                            onClick={handleAddProcedure}
                                                            disabled={addingProc}
                                                            className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1"
                                                        >
                                                            {addingProc ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Gravar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Render timeline */}
                                            {timeline.length === 0 ? (
                                                <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border">
                                                    <p className="text-gray-400">Esta cliente não tem nenhum evento ou prontuário registrado.</p>
                                                </div>
                                            ) : (
                                                <div className="relative pl-6 space-y-6">
                                                    {/* Central timeline line */}
                                                    <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-white/10" />

                                                    {timeline.map(event => {
                                                        const isProc = event.tipo === 'procedimento'
                                                        const dateFormatted = new Date(event.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        
                                                        return (
                                                            <div key={event.id} className="relative space-y-1">
                                                                {/* Timeline dot */}
                                                                <div 
                                                                    className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border shadow ${
                                                                        isProc ? 'bg-petroleo border-petroleo text-white' : 'bg-green-500 border-green-500 text-white'
                                                                    }`}
                                                                >
                                                                    {isProc ? <Calendar size={10} /> : <ShieldCheck size={10} />}
                                                                </div>

                                                                <div className="flex justify-between items-start">
                                                                    <h4 className="font-bold text-petroleo dark:text-white text-xs">{event.titulo}</h4>
                                                                    <span className="text-[9px] text-gray-400">{dateFormatted}</span>
                                                                </div>
                                                                <p className="text-[11px] text-acinzentado leading-relaxed">{event.detalhes}</p>
                                                                {event.valor && (
                                                                    <p className="text-[10px] font-bold text-terracota">Valor investido: R$ {event.valor.toFixed(2)}</p>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TABA: CHAT WHATSAPP */}
                                    {activeTab === 'chat' && (
                                        <div className="space-y-4 animate-fade-in flex flex-col h-[55vh] overflow-hidden">
                                            {/* Chat messaging window */}
                                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#0B0F19]/50 rounded-2xl border space-y-3 flex flex-col">
                                                {chatLoading ? (
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <Loader2 size={16} className="animate-spin text-[#D99773] mb-2" />
                                                        <p className="text-[9px] text-gray-500">Buscando histórico...</p>
                                                    </div>
                                                ) : chatMessages.length === 0 ? (
                                                    <div className="text-center py-20 flex-1 flex flex-col justify-center">
                                                        <MessageCircle size={20} className="text-gray-400 mx-auto mb-2" />
                                                        <p className="text-[10px] text-gray-400">Nenhuma conversa registrada com esta cliente ainda.</p>
                                                    </div>
                                                ) : (
                                                    chatMessages.map(m => {
                                                        const isUser = m.role === 'user'
                                                        return (
                                                            <div 
                                                                key={m.id}
                                                                className={`max-w-[80%] p-3 rounded-2xl text-[11px] leading-relaxed ${
                                                                    isUser
                                                                        ? 'bg-white dark:bg-white/5 text-petroleo dark:text-white border self-start'
                                                                        : 'bg-[#D99773] text-white self-end font-medium'
                                                                }`}
                                                            >
                                                                <p>{m.content}</p>
                                                                <p className="text-[8px] text-right mt-1 opacity-70">
                                                                    {new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                                <div ref={messagesEndRef} />
                                            </div>

                                            {/* Chat send box */}
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={chatInput}
                                                        onChange={(e) => setChatInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSendImmediateMessage()}
                                                        placeholder="Digite uma mensagem para disparar agora no WhatsApp..."
                                                        className="input-field flex-1 py-2 text-[11px]"
                                                    />
                                                    <button 
                                                        onClick={handleSendImmediateMessage}
                                                        disabled={sendingMsg}
                                                        className="p-2.5 rounded-xl bg-petroleo hover:bg-petroleo-light text-white transition-all disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                                    </button>
                                                </div>

                                                {/* Button to show scheduler */}
                                                <button 
                                                    onClick={() => setShowScheduler(!showScheduler)}
                                                    className="text-[10px] text-terracota hover:underline font-bold flex items-center gap-1"
                                                >
                                                    <Clock size={11} /> Programar Mensagem Futura
                                                </button>

                                                {showScheduler && (
                                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border space-y-3 animate-fade-in" style={{ borderColor: 'var(--border-default)' }}>
                                                        <h4 className="font-bold text-[10px] text-petroleo dark:text-white uppercase">Programar Lembrete / Mensagem</h4>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Data e Hora de Disparo:</label>
                                                                <input 
                                                                    type="datetime-local" 
                                                                    value={schedDate}
                                                                    onChange={(e) => setSchedDate(e.target.value)}
                                                                    className="input-field py-1 text-[10px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Mensagem WhatsApp:</label>
                                                                <textarea 
                                                                    value={schedMsg}
                                                                    onChange={(e) => setSchedMsg(e.target.value)}
                                                                    rows={2}
                                                                    className="input-field text-[10px]"
                                                                    placeholder="Mensagem agendada..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setShowScheduler(false)} className="btn-secondary py-1 px-3 text-[10px]">
                                                                Cancelar
                                                            </button>
                                                            <button 
                                                                onClick={handleScheduleMessage}
                                                                disabled={scheduling}
                                                                className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1"
                                                            >
                                                                {scheduling ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Programar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
