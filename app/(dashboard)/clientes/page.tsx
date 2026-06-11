'use client'

import { useEffect, useState, useRef } from 'react'
import { 
    Users, Search, Filter, ClipboardList, Stethoscope, 
    MessageSquare, Clock, ShieldCheck, User, Calendar, Plus, 
    Trash2, Edit, Save, X, ArrowRight, Loader2, Play, Pause,
    Activity, FileText, Send, CheckCircle2, ChevronRight, MessageCircle, AlertCircle, Image as ImageIcon,
    ToggleLeft, ToggleRight, Sliders, Upload, Layers, History, FileCheck, Heart, Download
} from 'lucide-react'
import ImageAnnotator from '@/components/ImageAnnotator'
import CertificadoAssinatura from '@/components/CertificadoAssinatura'

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
    emTriagem?: boolean
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
    audioUrl?: string | null
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
    const [fichas, setFichas] = useState<any[]>([])
    const [midias, setMidias] = useState<any[]>([])
    const [detailLoading, setDetailLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'prontuario' | 'galeria' | 'documentos' | 'chat' | 'financeiro'>('prontuario')

    // Modals
    const [showImageAnnotator, setShowImageAnnotator] = useState(false)
    const [selectedFicha, setSelectedFicha] = useState<any>(null)

    // Mapeamento Estético (Face/Body Map)
    const [selectedMarcacao, setSelectedMarcacao] = useState<any>(null)
    const [isNewMarcacao, setIsNewMarcacao] = useState(false)
    const [newMarcacaoPontos, setNewMarcacaoPontos] = useState<any[]>([])
    const [newMarcacaoModelo, setNewMarcacaoModelo] = useState<'face' | 'corpo_frente' | 'corpo_verso'>('face')
    const [newMarcacaoTitulo, setNewMarcacaoTitulo] = useState('')
    const [activePin, setActivePin] = useState<number | null>(null)
    
    // Pin editor temp fields
    const [pinTipo, setPinTipo] = useState<'toxina' | 'preenchedor' | 'fio' | 'outro'>('toxina')
    const [pinQuantidade, setPinQuantidade] = useState('4 U')
    const [pinNotas, setPinNotas] = useState('')

    // Saved markings list loaded from contact details
    const [marcacoes, setMarcacoes] = useState<any[]>([])
    const [savingMarcacao, setSavingMarcacao] = useState(false)

    // Galeria & Comparador
    const [antesFoto, setAntesFoto] = useState<string>('')
    const [depoisFoto, setDepoisFoto] = useState<string>('')
    const [showComparador, setShowComparador] = useState(false)

    // Documentos & Termos manual upload
    const [comprovanteTitulo, setComprovanteTitulo] = useState('')
    const [uploadingComprovante, setUploadingComprovante] = useState(false)

    // Financeiro & Controle de Pacotes
    const [pacotes, setPacotes] = useState<any[]>([])
    const [novoPacoteNome, setNovoPacoteNome] = useState('')
    const [novoPacoteSessoes, setNovoPacoteSessoes] = useState(5)
    const [novoPacoteValor, setNovoPacoteValor] = useState('')
    const [showAddPacote, setShowAddPacote] = useState(false)
    const [savingPacote, setSavingPacote] = useState(false)

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
    const fileInputDirectRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Schedule message state
    const [showScheduler, setShowScheduler] = useState(false)
    const [schedDate, setSchedDate] = useState('')
    const [schedMsg, setSchedMsg] = useState('')
    const [scheduling, setScheduling] = useState(false)

    // AI Memory edit state
    const [editingNotes, setEditingNotes] = useState(false)
    const [tempNotes, setTempNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)

    // Triage state
    const [triageInput, setTriageInput] = useState('')
    const [triageLoading, setTriageLoading] = useState(false)

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
    const loadContatoDetails = async (c: Contato, initialTab?: 'prontuario' | 'galeria' | 'documentos' | 'chat' | 'financeiro') => {
        setActiveContato(c)
        setDetailLoading(true)
        setActiveTab(initialTab || 'prontuario')
        setShowAddProc(false)
        setShowScheduler(false)
        try {
            const res = await fetch(`/api/contatos/${c.id}/detalhes`)
            const data = await res.json()
            if (data.timeline) setTimeline(data.timeline)
            if (data.fichas) setFichas(data.fichas)
            if (data.midias) setMidias(data.midias)
            if (data.marcacoes) setMarcacoes(data.marcacoes)
            else setMarcacoes([])
            
            if (data.contato) {
                const fetchedContato = {
                    ...data.contato,
                    emTriagem: data.emTriagem
                }
                setActiveContato(fetchedContato)
                setPacotes(Array.isArray(fetchedContato.pacotes) ? fetchedContato.pacotes : [])
            } else {
                setPacotes([])
            }

            // Reset Sub-states
            setSelectedMarcacao(null)
            setIsNewMarcacao(false)
            setNewMarcacaoPontos([])
            setActivePin(null)
            setAntesFoto('')
            setDepoisFoto('')
            setShowComparador(false)
            setComprovanteTitulo('')
            setShowAddPacote(false)
        } catch (err) {
            console.error('Erro ao carregar detalhes do paciente:', err)
        } finally {
            setDetailLoading(false)
        }
    }

    const handleSvgClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isNewMarcacao || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        
        const novoPonto = {
            x: Number(x.toFixed(2)),
            y: Number(y.toFixed(2)),
            tipo: pinTipo,
            quantidade: pinQuantidade,
            notas: ''
        }
        
        setNewMarcacaoPontos(prev => {
            const next = [...prev, novoPonto]
            setActivePin(next.length - 1)
            return next
        })
    }

    const handleSaveMarcacao = async () => {
        if (!activeContato) return
        if (newMarcacaoPontos.length === 0) return alert('Por favor, marque pelo menos um ponto de aplicação.')
        
        setSavingMarcacao(true)
        try {
            const res = await fetch(`/api/contatos/${activeContato.id}/marcacoes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    titulo: newMarcacaoTitulo || `Mapeamento - ${new Date().toLocaleDateString('pt-BR')}`,
                    pontos: newMarcacaoPontos,
                    modelo: newMarcacaoModelo
                })
            })
            if (res.ok) {
                alert('Mapeamento estético salvo com sucesso!')
                await loadContatoDetails(activeContato, 'prontuario')
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao salvar mapeamento.')
            }
        } catch {
            alert('Erro de conexão ao salvar mapeamento.')
        } finally {
            setSavingMarcacao(false)
        }
    }

    const handleSavePacotes = async (updatedPacotes: any[]) => {
        if (!activeContato) return
        try {
            const res = await fetch('/api/contatos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: activeContato.nome,
                    telefone: activeContato.telefone,
                    pacotes: updatedPacotes
                })
            })
            if (res.ok) {
                setPacotes(updatedPacotes)
                setActiveContato(prev => prev ? { ...prev, pacotes: updatedPacotes } : null)
                setContatos(prev => prev.map(c => c.id === activeContato.id ? { ...c, pacotes: updatedPacotes } : c))
            } else {
                alert('Erro ao atualizar pacotes no banco de dados.')
            }
        } catch {
            alert('Erro de conexão ao salvar pacotes.')
        }
    }

    const handleAddPacote = async () => {
        if (!novoPacoteNome.trim()) return alert('Digite o nome do pacote.')
        if (novoPacoteSessoes <= 0) return alert('O número de sessões deve ser maior que zero.')
        
        setSavingPacote(true)
        const novo = {
            id: Date.now().toString(),
            nome: novoPacoteNome,
            totalSessoes: Number(novoPacoteSessoes),
            sessoesConcluidas: 0,
            valor: Number(novoPacoteValor) || 0,
            dataCompra: new Date().toISOString(),
            status: 'ativo'
        }
        
        const updated = [...pacotes, novo]
        await handleSavePacotes(updated)
        
        setNovoPacoteNome('')
        setNovoPacoteSessoes(5)
        setNovoPacoteValor('')
        setShowAddPacote(false)
        setSavingPacote(false)
    }

    const handleDarBaixaSessao = async (pacoteId: string) => {
        const updated = pacotes.map(p => {
            if (p.id === pacoteId) {
                const sessoesConcluidas = p.sessoesConcluidas + 1
                const status = sessoesConcluidas >= p.totalSessoes ? 'concluido' : p.status
                return { ...p, sessoesConcluidas, status }
            }
            return p
        })
        await handleSavePacotes(updated)
    }

    const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeContato) return
        
        const reader = new FileReader()
        reader.onload = async (event) => {
            const base64 = event.target?.result as string
            try {
                const res = await fetch(`/api/contatos/${activeContato.id}/midia`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: base64,
                        tipo: 'imagem',
                        titulo: file.name.split('.')[0] || 'Foto do Paciente',
                        anotacoes: 'Foto enviada diretamente para a galeria evolutiva.'
                    })
                })
                if (res.ok) {
                    const data = await res.json()
                    setMidias(prev => [data.midia, ...prev])
                    alert('Foto adicionada com sucesso!')
                } else {
                    alert('Erro ao fazer upload da foto.')
                }
            } catch {
                alert('Erro de conexão ao enviar foto.')
            }
        }
        reader.readAsDataURL(file)
    }

    const handleUploadDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeContato) return
        
        setUploadingComprovante(true)
        const reader = new FileReader()
        reader.onload = async (event) => {
            const base64 = event.target?.result as string
            try {
                const res = await fetch(`/api/contatos/${activeContato.id}/midia`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: base64,
                        tipo: 'comprovante',
                        titulo: comprovanteTitulo || file.name.split('.')[0],
                        anotacoes: 'Documento/comprovante anexado manualmente pelo profissional.'
                    })
                })
                if (res.ok) {
                    const data = await res.json()
                    setMidias(prev => [data.midia, ...prev])
                    setComprovanteTitulo('')
                    alert('Documento anexado com sucesso!')
                } else {
                    alert('Erro ao anexar documento.')
                }
            } catch (err) {
                console.error(err)
                alert('Erro de conexão ao anexar.')
            } finally {
                setUploadingComprovante(false)
            }
        }
        reader.readAsDataURL(file)
    }

    // Auto-open contact from URL params (triage link)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const contatoIdParam = params.get('contatoId')
        const triageParam = params.get('triage')
        if (contatoIdParam) {
            const cId = Number(contatoIdParam)
            loadContatoDetails({ id: cId } as Contato, triageParam === 'true' ? 'chat' : 'prontuario')
        }
    }, [])

    // Handler for triage actions
    const handleTriageAction = async (action: 'responder' | 'lembrar' | 'assumir', minutos?: number) => {
        if (!activeContato) return
        if (action === 'responder' && !triageInput.trim()) return alert('Digite a instrução para a IARA responder.')

        setTriageLoading(true)
        try {
            const res = await fetch(`/api/contatos/${activeContato.id}/triagem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    mensagem: triageInput,
                    minutos
                })
            })
            if (res.ok) {
                if (action === 'responder') {
                    setTriageInput('')
                    alert('Resposta enviada com sucesso!')
                    loadChatHistory(activeContato.telefone)
                    loadContatoDetails(activeContato, 'chat')
                } else if (action === 'lembrar') {
                    alert('Lembrete agendado! A triagem foi adiada.')
                    setActiveContato(null)
                } else if (action === 'assumir') {
                    alert('Você assumiu o atendimento. O robô foi pausado por 3 horas.')
                    setActiveContato(prev => prev ? { ...prev, emTriagem: false, iaPausada: true } : null)
                    loadContatoDetails(activeContato, 'chat')
                }
            } else {
                const err = await res.json()
                alert(err.error || 'Erro ao realizar ação de triagem.')
            }
        } catch {
            alert('Erro de conexão ao realizar ação.')
        } finally {
            setTriageLoading(false)
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

    const handleGenerateAnamneseLink = (modeloId: string) => {
        if (!activeContato) return
        const link = `${window.location.origin}/anamnese/${modeloId}?contatoId=${activeContato.id}`
        navigator.clipboard.writeText(link)
        alert('Link da Ficha copiado para a Área de Transferência! Compartilhe pelo WhatsApp com a paciente.')
    }

    const handleSaveMedia = async (base64Image: string, mediaTitle?: string, mediaNotes?: string) => {
        if (!activeContato) return
        try {
            const res = await fetch(`/api/contatos/${activeContato.id}/midia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: base64Image,
                    tipo: 'imagem',
                    titulo: mediaTitle,
                    anotacoes: mediaNotes
                })
            })
            if (res.ok) {
                const data = await res.json()
                setMidias(prev => [data.midia, ...prev])
                setShowImageAnnotator(false)
            } else {
                alert('Erro ao salvar mídia no prontuário.')
            }
        } catch (err) {
            console.error(err)
            alert('Erro de conexão ao salvar mídia.')
        }
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
             {/* ====== CENTRAL DO CLIENTE PREMIUM (CENTRAL MODAL) ====== */}
            {activeContato && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 md:p-6 animate-fade-in text-[11px]">
                    {/* Backdrop closer */}
                    <div className="absolute inset-0 cursor-default" onClick={() => setActiveContato(null)} />

                    {/* Modal container */}
                    <div 
                        className="relative w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden border animate-scale-in"
                        style={{ 
                            backgroundColor: 'var(--bg-primary)', 
                            borderColor: 'var(--border-default)' 
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5" style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center flex-shrink-0 shadow-md">
                                    <span className="text-sm font-bold text-white">{(activeContato.nome || 'P').slice(0, 1).toUpperCase()}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-sm text-petroleo dark:text-white">{activeContato.nome || 'Paciente'}</h2>
                                        <span className="badge bg-petroleo/10 text-petroleo dark:text-terracota dark:bg-[#D99773]/10 text-[9px] py-0.5 uppercase font-bold">
                                            {activeContato.etapa || 'novo'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{activeContato.telefone}</p>
                                </div>
                            </div>
                            
                            {/* Actions Right Side */}
                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                
                                {/* IA Paused Glowing Toggle */}
                                <div 
                                    onClick={handleToggleIAPause}
                                    className={`px-3 py-1.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                                        activeContato.iaPausada 
                                            ? 'bg-amber-500/10 border-amber-500/30' 
                                            : 'bg-green-500/10 border-green-500/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full animate-ping ${activeContato.iaPausada ? 'bg-amber-500' : 'bg-green-500'}`} />
                                        <div className="text-left">
                                            <p className="font-bold text-[9px] uppercase tracking-wider" style={{ color: activeContato.iaPausada ? '#F59E0B' : '#10B981' }}>
                                                {activeContato.iaPausada ? 'Humano Ativo' : 'IARA Ativa'}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="focus:outline-none cursor-pointer">
                                        {activeContato.iaPausada ? (
                                            <ToggleRight size={22} className="text-amber-500" />
                                        ) : (
                                            <ToggleLeft size={22} className="text-green-500" />
                                        )}
                                    </button>
                                </div>

                                <button onClick={() => setActiveContato(null)} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-all cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs Navigation (Horizontal) */}
                        <div className="px-5 py-2.5 border-b bg-white/5 dark:bg-black/10 flex gap-2 overflow-x-auto" style={{ borderColor: 'var(--border-default)' }}>
                            {[
                                { id: 'prontuario', label: 'Prontuário & Mapa', icon: Stethoscope },
                                { id: 'galeria', label: 'Galeria Evolutiva', icon: ImageIcon },
                                { id: 'documentos', label: 'Documentos & Termos', icon: FileText },
                                { id: 'chat', label: 'Chat WhatsApp', icon: MessageCircle },
                                { id: 'financeiro', label: 'Financeiro & Pacotes', icon: ClipboardList }
                            ].map(tab => {
                                const Icon = tab.icon
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[10px] cursor-pointer transition-all whitespace-nowrap ${
                                            isActive
                                                ? 'bg-petroleo text-white dark:bg-[#D99773] dark:text-[#0b0f19] shadow-md scale-[1.02]'
                                                : 'text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10'
                                        }`}
                                    >
                                        <Icon size={12} />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-hidden p-5 flex flex-col justify-between">
                            {detailLoading ? (
                                <div className="flex flex-col items-center justify-center h-full my-auto">
                                    <div className="w-8 h-8 border-3 border-[#D99773] border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-[10px] text-acinzentado font-mono">Carregando prontuário...</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto h-full">
                                    {/* TABA: PRONTUÁRIO & MAPA */}
                                    {activeTab === 'prontuario' && (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[50vh] animate-fade-in">
                                            {/* Left Column - SVGs & Mapeamentos List */}
                                            <div className="lg:col-span-7 flex flex-col space-y-4">
                                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border dark:border-white/10">
                                                    <span className="font-bold text-petroleo dark:text-gray-200">Mapeamento Clínico Interativo</span>
                                                    {!isNewMarcacao ? (
                                                        <button
                                                            onClick={() => {
                                                                setIsNewMarcacao(true)
                                                                setSelectedMarcacao(null)
                                                                setNewMarcacaoPontos([])
                                                                setNewMarcacaoModelo('face')
                                                                setNewMarcacaoTitulo(`Mapeamento Estético - ${new Date().toLocaleDateString('pt-BR')}`)
                                                                setActivePin(null)
                                                            }}
                                                            className="px-2.5 py-1 rounded-xl bg-terracota hover:bg-terracota-dark text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                                        >
                                                            <Plus size={11} /> Novo Mapeamento
                                                        </button>
                                                    ) : (
                                                        <span className="badge bg-amber-500/10 text-amber-500 text-[9px] uppercase font-bold py-0.5 animate-pulse">Modo Edição Ativo</span>
                                                    )}
                                                </div>

                                                {/* SVG Interactive Canvas */}
                                                {(isNewMarcacao || selectedMarcacao) ? (
                                                    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#0B0F19]/60 rounded-3xl border dark:border-white/10 relative min-h-[360px]">
                                                        
                                                        {/* SVG Template Container */}
                                                        <div 
                                                            ref={containerRef}
                                                            onClick={handleSvgClick}
                                                            className={`relative cursor-crosshair select-none bg-white dark:bg-black/10 rounded-2xl shadow border dark:border-white/5 p-2 ${
                                                                (isNewMarcacao ? newMarcacaoModelo : selectedMarcacao.modelo) === 'face' 
                                                                    ? 'w-full max-w-[300px] aspect-[4/5]' 
                                                                    : 'w-full max-w-[260px] aspect-[2/3]'
                                                            }`}
                                                        >
                                                            {renderSvgTemplate(isNewMarcacao ? newMarcacaoModelo : selectedMarcacao.modelo)}

                                                            {/* Render Pins */}
                                                            {(isNewMarcacao ? newMarcacaoPontos : (selectedMarcacao?.pontos || [])).map((p: any, idx: number) => {
                                                                let pinColor = 'bg-[#D99773]'
                                                                if (p.tipo === 'preenchedor') pinColor = 'bg-[#0F4C61]'
                                                                if (p.tipo === 'fio') pinColor = 'bg-[#8B5CF6]'
                                                                if (p.tipo === 'outro') pinColor = 'bg-gray-500'
                                                                
                                                                const isActive = activePin === idx
                                                                
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setActivePin(idx)
                                                                            if (isNewMarcacao) {
                                                                                setPinTipo(p.tipo)
                                                                                setPinQuantidade(p.quantidade)
                                                                                setPinNotas(p.notes || p.notas || '')
                                                                            }
                                                                        }}
                                                                        className={`absolute w-5 h-5 rounded-full ${pinColor} text-white font-bold text-[9px] flex items-center justify-center -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-md transition-all ${
                                                                            isActive ? 'scale-125 ring-2 ring-amber-500 z-30 shadow-lg' : 'hover:scale-110 z-20'
                                                                        }`}
                                                                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                                                                    >
                                                                        {idx + 1}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>

                                                        <p className="text-[9px] text-gray-400 mt-2 text-center">
                                                            {isNewMarcacao ? 'Clique no template para adicionar um ponto de aplicação.' : 'Clique nos pontos numerados para ver detalhes.'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    /* Saved Markings History List */
                                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border dark:border-white/10 space-y-3">
                                                        <h4 className="font-bold text-xs text-petroleo dark:text-gray-300 flex items-center gap-1.5 uppercase">
                                                            <History size={12} className="text-terracota" /> Histórico de Marcações
                                                        </h4>
                                                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                            {marcacoes.length === 0 ? (
                                                                <p className="text-gray-400 italic py-4 text-center">Nenhum mapeamento estético registrado ainda para este paciente.</p>
                                                            ) : (
                                                                marcacoes.map(m => (
                                                                    <div 
                                                                        key={m.id} 
                                                                        onClick={() => {
                                                                            setSelectedMarcacao(m)
                                                                            setIsNewMarcacao(false)
                                                                            setActivePin(null)
                                                                        }}
                                                                        className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 hover:border-[#D99773] transition-all cursor-pointer flex justify-between items-center"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="p-2 bg-gradient-to-br from-[#D99773] to-[#0F4C61] rounded-xl text-white">
                                                                                <Heart size={14} />
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-petroleo dark:text-gray-200">{m.titulo || 'Mapeamento Estético'}</p>
                                                                                <p className="text-[9px] text-gray-500 mt-0.5 text-left">
                                                                                    Modelo: <span className="uppercase">{m.modelo}</span> | Salvo em {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <ChevronRight size={14} className="text-gray-400" />
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column - Evolução & Pin Details & Forms */}
                                            <div className="lg:col-span-5 flex flex-col space-y-4">
                                                
                                                {/* If plotting a new marking */}
                                                {isNewMarcacao && (
                                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border dark:border-white/10 space-y-4 animate-fade-in">
                                                        <h3 className="font-bold text-xs text-petroleo dark:text-white uppercase text-left">Novo Mapeamento</h3>
                                                        
                                                        <div className="space-y-3 text-left">
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Título da Sessão:</label>
                                                                <input 
                                                                    type="text"
                                                                    value={newMarcacaoTitulo}
                                                                    onChange={e => setNewMarcacaoTitulo(e.target.value)}
                                                                    className="input-field py-1.5 text-[10px]"
                                                                    placeholder="Ex: Aplicação Toxina Glabela"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Anatomia do Template:</label>
                                                                <select 
                                                                    value={newMarcacaoModelo}
                                                                    onChange={e => {
                                                                        setNewMarcacaoModelo(e.target.value as any)
                                                                        setNewMarcacaoPontos([])
                                                                        setActivePin(null)
                                                                    }}
                                                                    className="input-field py-1.5 text-[10px] bg-white dark:bg-white/5 cursor-pointer"
                                                                >
                                                                    <option value="face">Rosto (Face)</option>
                                                                    <option value="corpo_frente">Corpo (Frente)</option>
                                                                    <option value="corpo_verso">Corpo (Costas)</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Active Pin Info / Customizer */}
                                                        {activePin !== null && newMarcacaoPontos[activePin] ? (
                                                            <div className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 space-y-3 animate-fade-in text-left">
                                                                <div className="flex justify-between items-center border-b dark:border-white/10 pb-1.5">
                                                                    <span className="font-bold text-petroleo dark:text-gray-200">Configurar Ponto #{activePin + 1}</span>
                                                                    <button 
                                                                        onClick={() => {
                                                                            const updated = [...newMarcacaoPontos]
                                                                            updated.splice(activePin, 1)
                                                                            setNewMarcacaoPontos(updated)
                                                                            setActivePin(null)
                                                                        }}
                                                                        className="text-[9px] font-bold text-red-500 hover:underline flex items-center gap-0.5"
                                                                    >
                                                                        <Trash2 size={10} /> Excluir Ponto
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <div>
                                                                        <label className="block text-gray-500 mb-1">Tipo de Aplicação:</label>
                                                                        <div className="grid grid-cols-2 gap-1.5">
                                                                            {(['toxina', 'preenchedor', 'fio', 'outro'] as const).map(t => (
                                                                                <button
                                                                                    key={t}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setPinTipo(t)
                                                                                        const updated = [...newMarcacaoPontos]
                                                                                        updated[activePin].tipo = t
                                                                                        setNewMarcacaoPontos(updated)
                                                                                    }}
                                                                                    className={`py-1 rounded-lg font-bold text-[9px] border transition-all ${
                                                                                        pinTipo === t 
                                                                                            ? 'bg-petroleo text-white border-petroleo' 
                                                                                            : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10'
                                                                                    }`}
                                                                                >
                                                                                    {t === 'toxina' ? 'Toxina' : t === 'preenchedor' ? 'Preenchimento' : t === 'fio' ? 'Fios' : 'Outro'}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-gray-500 mb-1">Quantidade / Dose:</label>
                                                                        <input 
                                                                            type="text"
                                                                            value={pinQuantidade}
                                                                            onChange={e => {
                                                                                setPinQuantidade(e.target.value)
                                                                                const updated = [...newMarcacaoPontos]
                                                                                updated[activePin].quantidade = e.target.value
                                                                                setNewMarcacaoPontos(updated)
                                                                            }}
                                                                            className="input-field py-1 text-[10px]"
                                                                            placeholder="Ex: 4 U, 1 ml, 4 fios"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-gray-500 mb-1">Observação do Ponto:</label>
                                                                        <textarea 
                                                                            value={pinNotas}
                                                                            onChange={e => {
                                                                                setPinNotas(e.target.value)
                                                                                const updated = [...newMarcacaoPontos]
                                                                                updated[activePin].notas = e.target.value
                                                                                setNewMarcacaoPontos(updated)
                                                                            }}
                                                                            rows={2}
                                                                            className="input-field text-[10px] resize-none"
                                                                            placeholder="Região da testa, rugas..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 text-center bg-white/5 rounded-2xl border border-dashed dark:border-white/10 text-gray-400">
                                                                Clique em qualquer lugar no template do mapa ao lado para colocar o seu primeiro ponto e configurar o procedimento.
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2 justify-end pt-2 border-t dark:border-white/10">
                                                            <button 
                                                                onClick={() => {
                                                                    setIsNewMarcacao(false)
                                                                    setNewMarcacaoPontos([])
                                                                    setActivePin(null)
                                                                }}
                                                                className="btn-secondary py-1 px-3 text-[10px]"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button 
                                                                onClick={handleSaveMarcacao}
                                                                disabled={savingMarcacao || newMarcacaoPontos.length === 0}
                                                                className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1"
                                                            >
                                                                {savingMarcacao ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Salvar Mapeamento
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* If viewing a saved marking */}
                                                {selectedMarcacao && (
                                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border dark:border-white/10 space-y-4 animate-fade-in text-left">
                                                        <div className="flex justify-between items-center">
                                                            <h3 className="font-bold text-xs text-petroleo dark:text-white uppercase truncate max-w-[70%]">{selectedMarcacao.titulo}</h3>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedMarcacao(null)
                                                                    setActivePin(null)
                                                                }}
                                                                className="text-[9px] font-bold text-terracota hover:underline"
                                                            >
                                                                Voltar
                                                            </button>
                                                        </div>

                                                        <div className="text-[10px] text-gray-500 font-mono">
                                                            Data: {new Date(selectedMarcacao.createdAt).toLocaleDateString('pt-BR')} {new Date(selectedMarcacao.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>

                                                        {activePin !== null && selectedMarcacao.pontos[activePin] ? (
                                                            <div className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 space-y-2 animate-fade-in">
                                                                <p className="font-bold text-petroleo dark:text-gray-200">Detalhe do Ponto #{activePin + 1}</p>
                                                                <div className="space-y-1.5 text-[10px]">
                                                                    <p>
                                                                        <span className="font-semibold text-gray-400">Tipo de Aplicação:</span>{' '}
                                                                        <span className="badge bg-petroleo/10 text-petroleo dark:text-terracota dark:bg-[#D99773]/10 uppercase font-bold text-[9px] ml-1">
                                                                            {selectedMarcacao.pontos[activePin].tipo === 'toxina' ? 'Toxina' : selectedMarcacao.pontos[activePin].tipo === 'preenchedor' ? 'Preenchimento' : selectedMarcacao.pontos[activePin].tipo === 'fio' ? 'Fios' : 'Outro'}
                                                                        </span>
                                                                    </p>
                                                                    <p><span className="font-semibold text-gray-400">Dosagem:</span> <span className="font-bold">{selectedMarcacao.pontos[activePin].quantidade}</span></p>
                                                                    <p><span className="font-semibold text-gray-400">Anotações Clínicas:</span></p>
                                                                    <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-black/20 p-2 rounded-lg leading-relaxed italic border dark:border-white/5">
                                                                        {selectedMarcacao.pontos[activePin].notes || selectedMarcacao.pontos[activePin].notas || 'Sem observações adicionais.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <p className="font-bold text-[10px] uppercase text-gray-500">Resumo dos Pontos da Sessão</p>
                                                                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                                                    {selectedMarcacao.pontos.map((p: any, idx: number) => (
                                                                        <div 
                                                                            key={idx}
                                                                            onClick={() => setActivePin(idx)}
                                                                            className="p-1.5 rounded-lg border border-white/5 hover:border-gray-300 dark:hover:border-white/15 bg-white/5 flex justify-between items-center cursor-pointer text-[9px]"
                                                                        >
                                                                            <span className="font-bold text-left">Ponto #{idx + 1} - {p.tipo.toUpperCase()}</span>
                                                                            <span className="font-semibold text-terracota">{p.quantidade}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* If neither (shows patient notes and anamnese builder) */}
                                                {!isNewMarcacao && !selectedMarcacao && (
                                                    <div className="space-y-4">
                                                        {/* Clinical summary */}
                                                        <div className="p-4 rounded-3xl bg-petroleo/5 dark:bg-[#D99773]/5 border border-dashed" style={{ borderColor: 'var(--border-hover)' }}>
                                                            <h4 className="font-bold text-petroleo dark:text-terracota flex items-center gap-1.5 mb-2 text-[10px] uppercase tracking-wider">
                                                                <Activity size={12} className="text-terracota" /> Resumo Clínico Inteligente IARA
                                                            </h4>
                                                            <p className="text-[10px] text-acinzentado leading-relaxed italic text-left">
                                                                {activeContato.resumoClinico || activeContato.memoriaIA || '"Paciente em triagem inicial. Ainda sem histórico de procedimentos mapeado pela IA."'}
                                                            </p>
                                                        </div>

                                                        {/* Evolução clínica text */}
                                                        <div className="space-y-2 text-left">
                                                            <div className="flex justify-between items-center">
                                                                <h3 className="font-bold text-petroleo dark:text-white text-xs">Evolução Clínica & Anotações</h3>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (editingNotes) handleSaveProfileNotes()
                                                                        else {
                                                                            setTempNotes(activeContato.notas || '')
                                                                            setEditingNotes(true)
                                                                        }
                                                                    }}
                                                                    disabled={savingNotes}
                                                                    className="text-[9px] font-bold text-terracota hover:underline cursor-pointer flex items-center gap-0.5"
                                                                >
                                                                    {savingNotes ? <Loader2 size={8} className="animate-spin" /> : editingNotes ? <Save size={8} /> : <Edit size={8} />}
                                                                    {editingNotes ? 'Salvar' : 'Editar'}
                                                                </button>
                                                            </div>

                                                            {editingNotes ? (
                                                                <textarea
                                                                    value={tempNotes}
                                                                    onChange={(e) => setTempNotes(e.target.value)}
                                                                    rows={4}
                                                                    className="input-field text-[10px]"
                                                                    placeholder="Digite anotações ou observações médicas sobre esta cliente..."
                                                                />
                                                            ) : (
                                                                <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border" style={{ borderColor: 'var(--border-default)' }}>
                                                                    <p className="text-acinzentado whitespace-pre-wrap leading-relaxed text-left">
                                                                        {activeContato.notas || 'Nenhuma anotação médica registrada ainda. Clique em Editar para inserir.'}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Generate Link */}
                                                        <div className="space-y-2 text-left">
                                                            <h3 className="font-bold text-petroleo dark:text-white text-xs">Compartilhar Ficha de Anamnese</h3>
                                                            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border space-y-2" style={{ borderColor: 'var(--border-default)' }}>
                                                                {modelos.length === 0 ? (
                                                                    <p className="text-acinzentado italic">Sem modelos de fichas cadastrados.</p>
                                                                ) : (
                                                                    modelos.map(m => (
                                                                        <div key={m.id} className="flex items-center justify-between gap-3 pb-2 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border-subtle)' }}>
                                                                            <span className="font-semibold text-petroleo dark:text-gray-300 truncate max-w-[60%]">{m.titulo}</span>
                                                                            <button
                                                                                onClick={() => handleGenerateAnamneseLink(m.id)}
                                                                                className="px-2 py-0.5 rounded bg-[#D99773]/10 hover:bg-[#D99773]/20 text-[#D99773] font-bold text-[8px] flex items-center gap-0.5 transition-all"
                                                                            >
                                                                                Copiar Link <ChevronRight size={8} />
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TABA: GALERIA EVOLUTIVA */}
                                    {activeTab === 'galeria' && (
                                        <div className="space-y-6 animate-fade-in h-full overflow-y-auto pr-1 text-[11px]">
                                            {/* Antes / Depois Comparer Trigger Panel */}
                                            {midias.filter(m => m.tipo === 'imagem').length >= 2 && (
                                                <div className="bg-white/5 p-4 rounded-3xl border dark:border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center">
                                                    <div className="text-left">
                                                        <h4 className="font-bold text-xs text-petroleo dark:text-white">Comparador de Evolução Antes & Depois 📸</h4>
                                                        <p className="text-[10px] text-gray-500 mt-1">Selecione duas fotos da paciente para visualizar a transição e comparar o resultado clínico.</p>
                                                    </div>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <select 
                                                            value={antesFoto}
                                                            onChange={e => setAntesFoto(e.target.value)}
                                                            className="input-field py-1.5 text-[10px] bg-white dark:bg-white/5 cursor-pointer max-w-[150px]"
                                                        >
                                                            <option value="">Antes...</option>
                                                            {midias.filter(m => m.tipo === 'imagem').map(p => (
                                                                <option key={p.id} value={p.url}>{p.titulo || new Date(p.createdAt).toLocaleDateString('pt-BR')}</option>
                                                            ))}
                                                        </select>
                                                        <select 
                                                            value={depoisFoto}
                                                            onChange={e => setDepoisFoto(e.target.value)}
                                                            className="input-field py-1.5 text-[10px] bg-white dark:bg-white/5 cursor-pointer max-w-[150px]"
                                                        >
                                                            <option value="">Depois...</option>
                                                            {midias.filter(m => m.tipo === 'imagem').map(p => (
                                                                <option key={p.id} value={p.url}>{p.titulo || new Date(p.createdAt).toLocaleDateString('pt-BR')}</option>
                                                            ))}
                                                        </select>
                                                        <button 
                                                            onClick={() => {
                                                                if (!antesFoto || !depoisFoto) return alert('Por favor, selecione as fotos do Antes e Depois.')
                                                                setShowComparador(true)
                                                            }}
                                                            className="px-3 py-1.5 rounded-xl bg-[#D99773] hover:bg-[#C07A55] text-white font-bold text-[10px] flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                                                            disabled={!antesFoto || !depoisFoto}
                                                        >
                                                            <Sliders size={12} /> Comparar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Upload Buttons */}
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-bold text-petroleo dark:text-white text-xs">Galeria de Mídias e Fotos</h3>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        ref={fileInputDirectRef} 
                                                        onChange={handleDirectPhotoUpload} 
                                                    />
                                                    <button
                                                        onClick={() => fileInputDirectRef.current?.click()}
                                                        className="px-2.5 py-1.5 rounded-xl bg-white/5 border hover:bg-white/10 text-gray-300 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Upload size={11} /> Upload Foto Direto
                                                    </button>
                                                    <button
                                                        onClick={() => setShowImageAnnotator(true)}
                                                        className="px-2.5 py-1.5 rounded-xl bg-petroleo hover:bg-petroleo-light text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <ImageIcon size={11} /> Nova Foto c/ Anotação
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Media List grouped by Session Date */}
                                            {midias.filter(m => m.tipo === 'imagem').length === 0 ? (
                                                <div className="p-12 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border">
                                                    <ImageIcon size={32} className="mx-auto text-gray-400 mb-2 opacity-40" />
                                                    <p className="text-gray-400">Nenhuma foto ou anotação registrada ainda para este paciente.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {Object.entries(
                                                        midias.filter(m => m.tipo === 'imagem').reduce((acc: Record<string, any[]>, midia) => {
                                                            const dateStr = new Date(midia.createdAt).toLocaleDateString('pt-BR')
                                                            if (!acc[dateStr]) acc[dateStr] = []
                                                            acc[dateStr].push(midia)
                                                            return acc
                                                        }, {})
                                                    ).map(([dateStr, sessionMidias]: any) => (
                                                        <div key={dateStr} className="space-y-2 text-left">
                                                            <h4 className="font-bold text-[10px] uppercase text-gray-400 border-b dark:border-white/5 pb-1">Sessão: {dateStr}</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                {sessionMidias.map((midia: any) => (
                                                                    <div key={midia.id} className="relative group rounded-2xl overflow-hidden border dark:border-white/10 aspect-square bg-gray-100 dark:bg-[#0B0F19]">
                                                                        <img 
                                                                            src={midia.url} 
                                                                            alt={midia.titulo || 'Mídia do paciente'} 
                                                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                        />
                                                                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end text-left">
                                                                            <p className="text-white font-bold text-[9px] truncate">{midia.titulo || 'Sem título'}</p>
                                                                            {midia.anotacoes && (
                                                                                <p className="text-white/60 text-[7px] truncate italic mt-0.5">{midia.anotacoes}</p>
                                                                            )}
                                                                            <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button 
                                                                                    onClick={() => setAntesFoto(midia.url)}
                                                                                    className="text-[8px] bg-white text-black font-bold px-1.5 py-0.5 rounded hover:bg-gray-200"
                                                                                >
                                                                                    Antes
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => setDepoisFoto(midia.url)}
                                                                                    className="text-[8px] bg-[#D99773] text-white font-bold px-1.5 py-0.5 rounded hover:bg-[#C07A55]"
                                                                                >
                                                                                    Depois
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* TABA: DOCUMENTOS & TERMOS */}
                                    {activeTab === 'documentos' && (
                                        <div className="space-y-6 animate-fade-in h-full overflow-y-auto pr-1 text-[11px]">
                                            {/* Upload manual receipts form */}
                                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border dark:border-white/10 space-y-4">
                                                <h4 className="font-bold text-xs text-petroleo dark:text-white uppercase text-left">Anexar Comprovante ou Documento Manual</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end text-left">
                                                    <div>
                                                        <label className="block text-gray-500 mb-1">Título do Documento:</label>
                                                        <input 
                                                            type="text"
                                                            value={comprovanteTitulo}
                                                            onChange={e => setComprovanteTitulo(e.target.value)}
                                                            placeholder="Ex: Comprovante Pix Procedimento X"
                                                            className="input-field py-1.5 text-[10px]"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <label className="flex-1">
                                                            <input 
                                                                type="file" 
                                                                accept=".pdf,image/*" 
                                                                className="hidden" 
                                                                onChange={handleUploadDocumento}
                                                            />
                                                            <div className="w-full btn-secondary py-2 text-[10px] text-center flex items-center justify-center gap-1.5 cursor-pointer">
                                                                <Upload size={12} /> {uploadingComprovante ? 'Processando...' : 'Selecionar e Enviar'}
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fichas de Anamnese Assinadas (Digital Terms) */}
                                            <div className="space-y-3">
                                                <h3 className="font-bold text-petroleo dark:text-white text-xs flex items-center gap-1 text-left">
                                                    <FileCheck size={14} className="text-green-500" /> Fichas e Termos Jurídicos Assinados Digitalmente
                                                </h3>
                                                
                                                {fichas.length === 0 ? (
                                                    <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border">
                                                        <FileText size={24} className="mx-auto text-gray-400 mb-2 opacity-40" />
                                                        <p className="text-gray-400">Nenhum termo de consentimento assinado digitalmente.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {fichas.map(ficha => (
                                                            <div 
                                                                key={ficha.id} 
                                                                className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 flex items-center justify-between hover:border-[#D99773] transition-all cursor-pointer"
                                                                onClick={() => setSelectedFicha(ficha)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-green-500/10 rounded-xl text-green-500">
                                                                        <ShieldCheck size={16} />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <h4 className="font-bold text-petroleo dark:text-gray-200 text-xs">{ficha.titulo}</h4>
                                                                        <p className="text-[9px] text-gray-500 mt-0.5 font-mono">Assinado em {new Date(ficha.dataAssinatura).toLocaleDateString('pt-BR')}</p>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight size={14} className="text-gray-400" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Comprovantes e Documentos Manuais */}
                                            <div className="space-y-3 pt-4 border-t dark:border-white/5">
                                                <h3 className="font-bold text-petroleo dark:text-white text-xs flex items-center gap-1 text-left">
                                                    <FileText size={14} className="text-terracota" /> Comprovantes de Pagamento e Documentos Manuais
                                                </h3>
                                                
                                                {midias.filter(m => m.tipo === 'comprovante' || m.tipo === 'documento').length === 0 ? (
                                                    <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border">
                                                        <FileText size={24} className="mx-auto text-gray-400 mb-2 opacity-40" />
                                                        <p className="text-gray-400">Nenhum comprovante ou documento anexado manualmente.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {midias.filter(m => m.tipo === 'comprovante' || m.tipo === 'documento').map(midia => (
                                                            <div 
                                                                key={midia.id} 
                                                                className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 flex items-center justify-between hover:border-[#D99773] transition-all cursor-pointer"
                                                                onClick={() => window.open(midia.url, '_blank')}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-[#D99773]/10 rounded-xl text-terracota">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <h4 className="font-bold text-petroleo dark:text-gray-200 text-xs truncate max-w-[180px]">{midia.titulo || 'Comprovante/Anexo'}</h4>
                                                                        <p className="text-[9px] text-gray-500 mt-0.5">Enviado em {new Date(midia.createdAt).toLocaleDateString('pt-BR')}</p>
                                                                    </div>
                                                                </div>
                                                                <Download size={14} className="text-gray-400 hover:text-[#D99773]" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* TABA: CHAT WHATSAPP */}
                                    {activeTab === 'chat' && (
                                        <div className="space-y-4 animate-fade-in flex flex-col h-[60vh] overflow-hidden text-[11px]">
                                            {/* Triage card */}
                                            {activeContato?.emTriagem && (
                                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 flex-shrink-0 text-left">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                                                            <AlertCircle size={12} /> Aguardando Ação da Dona (Triagem de Mídia)
                                                        </h4>
                                                    </div>
                                                    
                                                    {midias[0] && (
                                                        <div className="flex gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                                                            {(midias[0].tipo === 'imagem' || midias[0].tipo === 'imagem') ? (
                                                                <img 
                                                                    src={midias[0].url} 
                                                                    alt="Foto para triagem" 
                                                                    className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                                    onClick={() => window.open(midias[0].url, '_blank')}
                                                                />
                                                            ) : (
                                                                <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center text-gray-400">
                                                                    <FileText size={20} />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-petroleo dark:text-white truncate">
                                                                    {midias[0].titulo || 'Mídia recebida'}
                                                                </p>
                                                                <p className="text-[9px] text-gray-400 mt-0.5">
                                                                    Enviada em {new Date(midias[0].createdAt).toLocaleString('pt-BR')}
                                                                </p>
                                                                <a 
                                                                    href={midias[0].url} 
                                                                    download
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[9px] text-terracota hover:underline font-bold mt-1 inline-block"
                                                                >
                                                                    Visualizar / Baixar mídia
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={triageInput}
                                                            onChange={(e) => setTriageInput(e.target.value)}
                                                            placeholder="Escreva a resposta ou instrução (ex: 'Diz que tá ótimo e que pode agendar o retorno'). A IARA vai formatar de forma carinhosa no tom da clínica."
                                                            className="input-field text-[11px] h-12"
                                                        />
                                                        
                                                        <div className="flex flex-wrap gap-2 justify-between items-center">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleTriageAction('lembrar', 30)}
                                                                    disabled={triageLoading}
                                                                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                                                                >
                                                                    <Clock size={10} /> Me lembre em 30 min
                                                                </button>
                                                                <button
                                                                    onClick={() => handleTriageAction('assumir')}
                                                                    disabled={triageLoading}
                                                                    className="px-2 py-1 rounded-lg bg-[#0F4C61]/10 hover:bg-[#0F4C61]/20 border border-[#0F4C61]/30 text-petroleo dark:text-[#0F4C61] font-bold text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                                                                >
                                                                    <User size={10} /> Deixa que eu assumo
                                                                </button>
                                                            </div>
                                                            
                                                            <button
                                                                onClick={() => handleTriageAction('responder')}
                                                                disabled={triageLoading || !triageInput.trim()}
                                                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                                            >
                                                                {triageLoading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />} Enviar via IARA
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Chat messaging window */}
                                            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-[#0B0F19]/50 rounded-2xl border space-y-3 flex flex-col min-h-[200px]">
                                                {chatLoading ? (
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <Loader2 size={16} className="animate-spin text-[#D99773] mb-2" />
                                                        <p className="text-[9px] text-gray-500 font-mono">Buscando histórico...</p>
                                                    </div>
                                                ) : chatMessages.length === 0 ? (
                                                    <div className="text-center py-12 flex-1 flex flex-col justify-center">
                                                        <MessageCircle size={20} className="text-gray-400 mx-auto mb-2 opacity-50" />
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
                                                                        : 'bg-[#D99773] text-white self-end font-medium shadow-sm'
                                                                }`}
                                                            >
                                                                {m.content && <p className="text-left">{m.content}</p>}
                                                                {m.audioUrl && (
                                                                    <audio controls src={m.audioUrl} className="mt-2 max-w-full h-8 outline-none" />
                                                                )}
                                                                <p className="text-[8px] text-right mt-1 opacity-70 font-mono">
                                                                    {new Date(m.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </p>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                                <div ref={messagesEndRef} />
                                            </div>

                                            {/* Chat send box */}
                                            <div className="space-y-2 flex-shrink-0 text-left">
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

                                    {/* TABA: FINANCEIRO & PACÔTES */}
                                    {activeTab === 'financeiro' && (
                                        <div className="space-y-6 animate-fade-in h-full overflow-y-auto pr-1 text-[11px]">
                                            {/* Pacotes Tracker Section */}
                                            <div className="p-4 bg-[#D99773]/5 rounded-3xl border border-[#D99773]/20 space-y-4 text-left">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-petroleo dark:text-[#D99773] text-xs flex items-center gap-1.5 uppercase tracking-wider">
                                                        <Layers size={14} className="text-terracota" /> Controle de Pacotes (Sessões)
                                                    </h3>
                                                    <button
                                                        onClick={() => setShowAddPacote(!showAddPacote)}
                                                        className="px-2.5 py-1 rounded-xl bg-[#D99773]/10 hover:bg-[#D99773]/20 text-[#D99773] font-bold text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Plus size={10} /> {showAddPacote ? 'Fechar Form' : 'Contratar Pacote'}
                                                    </button>
                                                </div>

                                                {showAddPacote && (
                                                    <div className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 space-y-3 animate-fade-in text-left">
                                                        <h4 className="font-bold text-[9px] uppercase text-gray-500">Adicionar Pacote Contratado</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Nome do Pacote:</label>
                                                                <input 
                                                                    type="text"
                                                                    value={novoPacoteNome}
                                                                    onChange={e => setNovoPacoteNome(e.target.value)}
                                                                    placeholder="Ex: Pacote de Micropigmentação 5x"
                                                                    className="input-field py-1 text-[10px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Total de Sessões:</label>
                                                                <input 
                                                                    type="number"
                                                                    value={novoPacoteSessoes}
                                                                    onChange={e => setNovoPacoteSessoes(Number(e.target.value))}
                                                                    className="input-field py-1 text-[10px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Valor do Pacote (R$):</label>
                                                                <input 
                                                                    type="number"
                                                                    value={novoPacoteValor}
                                                                    onChange={e => setNovoPacoteValor(e.target.value)}
                                                                    placeholder="Ex: 1500.00"
                                                                    className="input-field py-1 text-[10px]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setShowAddPacote(false)} className="btn-secondary py-1 px-3 text-[10px]">
                                                                Cancelar
                                                            </button>
                                                            <button 
                                                                onClick={handleAddPacote}
                                                                disabled={savingPacote || !novoPacoteNome.trim()}
                                                                className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1"
                                                            >
                                                                {savingPacote ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Adicionar Pacote
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* List active packages */}
                                                {pacotes.length === 0 ? (
                                                    <p className="text-gray-400 italic text-center py-2">Nenhum pacote contratado no momento.</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {pacotes.map((p: any) => {
                                                            const progressPercent = Math.min((p.sessoesConcluidas / p.totalSessoes) * 100, 100)
                                                            const isConcluido = p.status === 'concluido' || p.sessoesConcluidas >= p.totalSessoes
                                                            
                                                            return (
                                                                <div 
                                                                    key={p.id} 
                                                                    className="p-3 bg-white dark:bg-white/5 rounded-2xl border dark:border-white/10 flex flex-col justify-between space-y-3"
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="text-left">
                                                                            <h4 className="font-bold text-petroleo dark:text-gray-200 text-xs">{p.nome}</h4>
                                                                            <p className="text-[9px] text-gray-500 mt-0.5">Adquirido em {new Date(p.dataCompra).toLocaleDateString('pt-BR')} por R$ {Number(p.valor || 0).toFixed(2)}</p>
                                                                        </div>
                                                                        <span className={`badge text-[8px] px-1.5 py-0.5 uppercase font-bold ${
                                                                            isConcluido 
                                                                                ? 'bg-green-500/10 text-green-500' 
                                                                                : 'bg-[#D99773]/10 text-[#D99773]'
                                                                        }`}>
                                                                            {isConcluido ? 'Concluído' : 'Ativo'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="space-y-1 text-left">
                                                                        <div className="flex justify-between text-[9px] font-semibold text-gray-500">
                                                                            <span>Progresso: {p.sessoesConcluidas} de {p.totalSessoes} sessões</span>
                                                                            <span>{Math.round(progressPercent)}%</span>
                                                                        </div>
                                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className="h-full bg-gradient-to-r from-[#D99773] to-[#C07A55] rounded-full transition-all duration-300"
                                                                                style={{ width: `${progressPercent}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {!isConcluido && (
                                                                        <button
                                                                            onClick={() => handleDarBaixaSessao(p.id)}
                                                                            className="w-full py-1.5 rounded-xl bg-[#D99773] hover:bg-[#C07A55] text-white font-bold text-[9px] flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                                                                        >
                                                                            <CheckCircle2 size={11} /> Realizar Baixa em 1 Sessão
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Procedures Histórico and Manual Logging */}
                                            <div className="space-y-4 pt-2 text-left">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-petroleo dark:text-white text-xs">Procedimentos e Pagamentos Mapeados</h3>
                                                    <button
                                                        onClick={() => setShowAddProc(!showAddProc)}
                                                        className="px-2.5 py-1 rounded-xl bg-petroleo hover:bg-petroleo-light text-white font-bold text-[9px] flex items-center gap-1 transition-all cursor-pointer"
                                                    >
                                                        <Plus size={10} /> Registrar Procedimento Concluído
                                                    </button>
                                                </div>

                                                {showAddProc && (
                                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border space-y-3 animate-fade-in" style={{ borderColor: 'var(--border-default)' }}>
                                                        <h4 className="font-bold text-petroleo dark:text-white text-[10px] uppercase">Lançar Tratamento no Prontuário</h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-gray-500 mb-1">Procedimento:</label>
                                                                <input 
                                                                    type="text"
                                                                    value={procNome}
                                                                    onChange={(e) => setProcNome(e.target.value)}
                                                                    placeholder="Ex: Micropigmentação"
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

                                                {/* Render Timeline Procedures */}
                                                {timeline.filter(e => e.tipo === 'procedimento').length === 0 ? (
                                                    <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border">
                                                        <p className="text-gray-400">Esta cliente não tem nenhum evento ou prontuário registrado.</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative pl-6 space-y-6 max-h-[300px] overflow-y-auto pr-1">
                                                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-white/10" />

                                                        {timeline.filter(e => e.tipo === 'procedimento').map(event => {
                                                            const dateFormatted = new Date(event.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            
                                                            return (
                                                                <div key={event.id} className="relative space-y-1 text-left">
                                                                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center border shadow bg-petroleo border-petroleo text-white text-[9px]">
                                                                        <Calendar size={10} />
                                                                    </div>

                                                                    <div className="flex justify-between items-start">
                                                                        <h4 className="font-bold text-petroleo dark:text-white text-xs">{event.titulo}</h4>
                                                                        <span className="text-[9px] text-gray-400 font-mono">{dateFormatted}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-acinzentado leading-relaxed">{event.detalhes}</p>
                                                                    {event.valor && (
                                                                        <p className="text-[10px] font-bold text-terracota">Valor investido: R$ {event.valor.toFixed(2)}</p>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showComparador && (
                <PhotoComparer 
                    antes={antesFoto}
                    depois={depoisFoto}
                    onClose={() => {
                        setShowComparador(false)
                        setAntesFoto('')
                        setDepoisFoto('')
                    }}
                />
            )}

            {/* MODALS */}
            {showImageAnnotator && (
                <ImageAnnotator 
                    onClose={() => setShowImageAnnotator(false)}
                    onSave={handleSaveMedia}
                />
            )}

            {selectedFicha && (
                <CertificadoAssinatura 
                    ficha={selectedFicha}
                    onClose={() => setSelectedFicha(null)}
                />
            )}
        </div>
    )
}

function PhotoComparer({ antes, depois, onClose }: { antes: string; depois: string; onClose: () => void }) {
    const [sliderPos, setSliderPos] = useState(50)
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-[11px]">
            <div className="relative w-full max-w-4xl bg-gray-950 rounded-3xl overflow-hidden border border-white/10 flex flex-col shadow-2xl animate-scale-in">
                <div className="p-4 border-b border-white/10 flex justify-between items-center text-white">
                    <h3 className="font-bold text-sm">Comparador Antes & Depois 📸</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer">
                        <X size={18} />
                    </button>
                </div>
                
                {/* Drag / Slide Area */}
                <div className="relative flex-1 aspect-video md:aspect-[16/10] bg-black select-none overflow-hidden max-h-[70vh]">
                    {/* Before Image (Left / Base) */}
                    <img 
                        src={antes} 
                        alt="Antes" 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                    <div className="absolute top-4 left-4 bg-black/60 text-white font-bold px-2 py-1 rounded-lg z-20 text-[9px] uppercase tracking-wider">
                        Antes
                    </div>

                    {/* After Image (Right / Sliding overlay) */}
                    <div 
                        className="absolute inset-y-0 right-0 left-0 pointer-events-none overflow-hidden"
                        style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
                    >
                        <img 
                            src={depois} 
                            alt="Depois" 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                    <div className="absolute top-4 right-4 bg-[#D99773]/90 text-white font-bold px-2 py-1 rounded-lg z-20 text-[9px] uppercase tracking-wider">
                        Depois
                    </div>

                    {/* Drag Line / Bar */}
                    <div 
                        className="absolute inset-y-0 w-0.5 bg-white cursor-ew-resize z-30 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        style={{ left: `${sliderPos}%` }}
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg border border-gray-300 font-bold text-xs select-none">
                            ↔
                        </div>
                    </div>

                    {/* Invisible Input Range Slider covering the image for easy drag logic */}
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={sliderPos}
                        onChange={(e) => setSliderPos(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                    />
                </div>
                
                <div className="p-3 bg-white/5 text-center text-gray-400 text-[10px]">
                    Arraste a barra central para comparar o resultado do procedimento.
                </div>
            </div>
        </div>
    )
}

function renderSvgTemplate(modelo: 'face' | 'corpo_frente' | 'corpo_verso') {
    switch (modelo) {
        case 'face':
            return (
                <svg viewBox="0 0 400 500" className="w-full h-full text-slate-400 dark:text-slate-600 stroke-current fill-slate-100 dark:fill-slate-900/20 stroke-[1.5]" xmlns="http://www.w3.org/2000/svg">
                    <path d="M200 50 C290 50 330 140 330 250 C330 360 280 430 200 450 C120 430 70 360 70 250 C70 140 110 50 200 50 Z" />
                    <path d="M110 95 C140 90 200 100 200 100 C200 100 260 90 290 95" />
                    <path d="M125 180 Q150 160 175 180" />
                    <path d="M135 195 Q150 185 165 195 Q150 200 135 195 Z" fill="currentColor" fillOpacity="0.1" />
                    <circle cx="150" cy="195" r="3" fill="currentColor" />
                    <path d="M225 180 Q250 160 275 180" />
                    <path d="M235 195 Q250 185 265 195 Q250 200 235 195 Z" fill="currentColor" fill-opacity="0.1" />
                    <circle cx="250" cy="195" r="3" fill="currentColor" />
                    <path d="M200 180 L200 270 Q200 280 210 280 M190 280 Q200 280 200 270" />
                    <path d="M160 330 Q200 320 240 330 Q200 350 160 330 Z" fill="currentColor" fillOpacity="0.1" />
                    <path d="M160 330 Q200 315 240 330" />
                    <path d="M175 342 Q200 355 225 342" />
                    <path d="M90 260 C90 310 120 380 200 410 C280 380 310 310 310 260" strokeDasharray="4,4" />
                    <path d="M70 200 C55 200 55 260 70 270" />
                    <path d="M330 200 C345 200 345 260 330 270" />
                </svg>
            )
        case 'corpo_frente':
            return (
                <svg viewBox="0 0 400 600" className="w-full h-full text-slate-400 dark:text-slate-600 stroke-current fill-slate-100 dark:fill-slate-900/20 stroke-[1.5]" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="50" r="25" />
                    <path d="M190 75 L190 100 M210 75 L210 100" />
                    <path d="M140 105 C160 100 240 100 260 105 C290 110 300 130 290 180 C285 210 270 280 275 330 C270 330 250 330 250 330 C250 330 245 260 200 260 C155 260 150 330 150 330 H125 C130 280 115 210 110 180 C100 130 110 110 140 105 Z" fill="currentColor" fillOpacity="0.05" />
                    <path d="M165 170 C175 185 195 185 200 170 C205 185 225 185 235 170" />
                    <circle cx="200" cy="225" r="2" fill="currentColor" />
                    <path d="M120 110 L90 230 C85 250 90 260 95 260 C100 260 105 250 110 230 L125 150" />
                    <path d="M280 110 L310 230 C315 250 310 260 305 260 C300 260 295 250 290 230 L275 150" />
                    <path d="M150 330 C155 420 160 520 165 580 C165 590 175 590 175 580 C180 520 190 410 198 340" />
                    <path d="M250 330 C245 420 240 520 235 580 C235 590 225 590 225 580 C220 520 210 410 202 340" />
                </svg>
            )
        case 'corpo_verso':
            return (
                <svg viewBox="0 0 400 600" className="w-full h-full text-slate-400 dark:text-slate-600 stroke-current fill-slate-100 dark:fill-slate-900/20 stroke-[1.5]" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="50" r="25" />
                    <path d="M190 75 L190 100 M210 75 L210 100" />
                    <path d="M140 105 C160 100 240 100 260 105 C290 110 300 130 290 180 C285 210 270 280 275 330 C270 330 250 330 250 330 C250 330 245 260 200 260 C155 260 150 330 150 330 H125 C130 280 115 210 110 180 C100 130 110 110 140 105 Z" fill="currentColor" fillOpacity="0.05" />
                    <path d="M200 100 L200 310" strokeDasharray="3,3" />
                    <path d="M150 130 C160 140 170 140 175 130" />
                    <path d="M250 130 C240 140 230 140 225 130" />
                    <path d="M165 330 Q200 350 200 330 Q200 350 235 330" />
                    <path d="M120 110 L90 230 C85 250 90 260 95 260 C100 260 105 250 110 230 L125 150" />
                    <path d="M280 110 L310 230 C315 250 310 260 305 260 C300 260 295 250 290 230 L275 150" />
                    <path d="M150 330 C155 420 160 520 165 580 C165 590 175 590 175 580 C180 520 190 410 198 340" />
                    <path d="M250 330 C245 420 240 520 235 580 C235 590 225 590 225 580 C220 520 210 410 202 340" />
                </svg>
            )
    }
}
