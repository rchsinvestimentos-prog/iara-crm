'use client'

import { useEffect, useState } from 'react'
import { 
    Stethoscope, Plus, ClipboardList, Eye, Trash2, Edit2, 
    ShieldCheck, X, Save, Send, Copy, Check, MessageSquare, Download
} from 'lucide-react'

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
    selfiePng?: string | null
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
    const [modelos, setModelos] = useState<ModeloAnamnese[]>([])
    const [fichas, setFichas] = useState<FichaPreenchida[]>([])
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)

    const [modalOpen, setModalOpen] = useState(false)
    const [editingModel, setEditingModel] = useState<ModeloAnamnese | null>(null)
    const [titulo, setTitulo] = useState('')
    const [perguntas, setPerguntas] = useState<Pergunta[]>([])
    const [selectedProcs, setSelectedProcs] = useState<number[]>([])
    const [mensagemEnvio, setMensagemEnvio] = useState('')
    const [horasAntecedencia, setHorasAntecedencia] = useState(24)

    const [viewFicha, setViewFicha] = useState<FichaPreenchida | null>(null)

    // Envio manual de Ficha
    const [sendModalOpen, setSendModalOpen] = useState(false)
    const [sendModel, setSendModel] = useState<ModeloAnamnese | null>(null)
    const [sendPhone, setSendPhone] = useState('')
    const [sendName, setSendName] = useState('')
    const [sendCustomMsg, setSendCustomMsg] = useState('')
    const [sendLoading, setSendLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [selectedDdi, setSelectedDdi] = useState('+55')
    
    // CRM Search State
    const [crmSearch, setCrmSearch] = useState('')
    const [crmContatos, setCrmContatos] = useState<any[]>([])
    const [selectedContatoId, setSelectedContatoId] = useState<number | null>(null)
    const [searchingContatos, setSearchingContatos] = useState(false)

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

    useEffect(() => { loadData() }, [])

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
                const errData = await res.json().catch(() => null)
                const detailStr = errData?.details || errData?.error || 'Erro desconhecido.'
                alert(`Erro ao salvar ficha: ${detailStr}`)
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

    // CRM Search Debounce Hook
    useEffect(() => {
        if (!crmSearch.trim()) {
            setCrmContatos([])
            return
        }
        const delayDebounceFn = setTimeout(async () => {
            setSearchingContatos(true)
            try {
                const res = await fetch(`/api/contatos?busca=${encodeURIComponent(crmSearch)}`)
                const data = await res.json()
                if (data.contatos) {
                    setCrmContatos(data.contatos)
                }
            } catch (err) {
                console.error('Erro ao buscar contatos:', err)
            } finally {
                setSearchingContatos(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [crmSearch])

    const handleSelectContato = (c: any) => {
        setSelectedContatoId(c.id)
        setSendName(c.nome || '')
        
        // Tratar telefone do CRM (separar DDI se possível)
        let phone = c.telefone || ''
        if (phone.startsWith('55') && phone.length >= 11) {
            setSelectedDdi('+55')
            phone = phone.substring(2)
        } else if (phone.startsWith('351') && phone.length >= 11) {
            setSelectedDdi('+351')
            phone = phone.substring(3)
        } else if (phone.startsWith('1') && phone.length >= 10) {
            setSelectedDdi('+1')
            phone = phone.substring(1)
        } else if (phone.startsWith('34') && phone.length >= 11) {
            setSelectedDdi('+34')
            phone = phone.substring(2)
        } else {
            setSelectedDdi('+55')
            if (phone.startsWith('55')) {
                phone = phone.substring(2)
            }
        }
        
        setSendPhone(phone)
        setCrmSearch('')
        setCrmContatos([])
    }

    const handleOpenSend = (modelo: ModeloAnamnese) => {
        setSendModel(modelo)
        setSendPhone('')
        setSendName('')
        setSelectedContatoId(null)
        setCrmSearch('')
        setSelectedDdi('+55')
        setSendCustomMsg(modelo.mensagemEnvio || 'Olá, {nome_cliente}! Falta pouco para o seu atendimento. Por favor, preencha sua Ficha de Anamnese pelo link seguro: {link_anamnese}')
        setSendModalOpen(true)
    }

    const handleSendAction = async (method: 'whatsapp_web' | 'iara' | 'copy_link') => {
        if (!sendPhone.trim()) return alert('Insira um número de WhatsApp de destino.')
        
        setSendLoading(true)
        try {
            const ddiNumber = selectedDdi.replace(/\D/g, '')
            let phoneToSubmit = sendPhone.replace(/\D/g, '')
            
            // Se o telefone digitado não começar com o DDI correspondente, concatenamos
            if (!phoneToSubmit.startsWith(ddiNumber)) {
                phoneToSubmit = `${ddiNumber}${phoneToSubmit}`
            }

            const body = {
                modeloId: sendModel?.id,
                contatoId: selectedContatoId,
                nome: sendName,
                telefone: phoneToSubmit,
                mensagemCustomizada: sendCustomMsg
            }

            const res = await fetch('/api/anamnese/enviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao preparar link de anamnese.')
            }

            if (method === 'copy_link') {
                const link = data.linkAnamnese
                const fallbackCopyText = (text: string) => {
                    try {
                        const textArea = document.createElement("textarea")
                        textArea.value = text
                        textArea.style.position = "fixed"
                        textArea.style.left = "-9999px"
                        textArea.style.top = "0"
                        document.body.appendChild(textArea)
                        textArea.focus()
                        textArea.select()
                        const successful = document.execCommand('copy')
                        document.body.removeChild(textArea)
                        if (successful) {
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                            alert('Link copiado com sucesso!')
                        } else {
                            window.prompt('Não foi possível copiar automaticamente. Copie o link abaixo:', text)
                        }
                    } catch (err) {
                        console.error('Erro no fallback de cópia:', err)
                        window.prompt('Não foi possível copiar automaticamente. Copie o link abaixo:', text)
                    }
                }

                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(link)
                        .then(() => {
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                            alert('Link copiado com sucesso!')
                        })
                        .catch((err) => {
                            console.error('Erro ao copiar com clipboard API, usando fallback:', err)
                            fallbackCopyText(link)
                        })
                } else {
                    fallbackCopyText(link)
                }
            } else if (method === 'whatsapp_web') {
                const text = encodeURIComponent(data.mensagemFormatada)
                const phone = sendPhone.replace(/\D/g, '')
                const whatsNumber = phone.startsWith('55') ? phone : `55${phone}`
                window.open(`https://api.whatsapp.com/send?phone=${whatsNumber}&text=${text}`, '_blank')
            } else if (method === 'iara') {
                if (data.enviadoIA) {
                    alert('Ficha enviada com sucesso através do WhatsApp conectado da IARA!')
                    setSendModalOpen(false)
                } else {
                    alert(`Falha ao disparar automático: ${data.erroIA || 'Erro desconhecido.'}\n\nVocê ainda pode clicar em "Enviar via WhatsApp Web" para enviar manualmente.`)
                }
            }
        } catch (err: any) {
            alert(err.message || 'Erro de conexão.')
        } finally {
            setSendLoading(false)
        }
    }

    const handleProcToggle = (procId: number) => {
        setSelectedProcs(prev =>
            prev.includes(procId) ? prev.filter(id => id !== procId) : [...prev, procId]
        )
    }

    const handleExportCSV = () => {
        if (fichas.length === 0) return alert('Nenhuma ficha disponível para exportação.')
        
        const headers = ['Paciente', 'Telefone', 'Documento/Ficha', 'Data Assinatura', 'IP Origem', 'Dispositivo', 'Hash SHA-256', 'Respostas']
        const rows = fichas.map(f => {
            const respostasFormatadas = Object.entries(f.respostas || {})
                .map(([q, r]) => `${q}: ${Array.isArray(r) ? r.join(', ') : r}`)
                .join(' | ')
            return [
                `"${f.contato.nome.replace(/"/g, '""')}"`,
                `"${f.contato.telefone.replace(/"/g, '""')}"`,
                `"${f.titulo.replace(/"/g, '""')}"`,
                `"${new Date(f.dataAssinatura).toLocaleString('pt-BR')}"`,
                `"${f.ipOrigem.replace(/"/g, '""')}"`,
                `"${f.userAgent.replace(/"/g, '""')}"`,
                `"${f.hashIntegridade.replace(/"/g, '""')}"`,
                `"${respostasFormatadas.replace(/"/g, '""')}"`
            ]
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `backup_anamneses_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
            {/* Background orbs — mesmo padrão do dashboard */}
            <div className="fixed top-20 -left-40 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--orb-1)' }} />
            <div className="fixed bottom-20 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--orb-2)' }} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Stethoscope style={{ color: '#D99773' }} />
                        Fichas de Anamnese 🩺
                    </h1>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Crie prontuários dinâmicos, vincule aos seus procedimentos e audite assinaturas com validade legal.
                    </p>
                </div>
                <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
                    <Plus size={16} /> Nova Ficha de Anamnese
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(217,151,115,0.3)', borderTopColor: 'transparent' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Carregando fichas e histórico...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna principal */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Modelos */}
                        <div className="flex items-center gap-2">
                            <ClipboardList size={16} style={{ color: '#D99773' }} />
                            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                Modelos Ativos de Fichas ({modelos.length})
                            </h2>
                        </div>

                        {modelos.length === 0 ? (
                            <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Você ainda não tem nenhum modelo de ficha cadastrado.</p>
                                <button onClick={handleOpenCreate} className="btn-secondary text-[11px] mt-4">
                                    Criar minha primeira ficha
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {modelos.map(m => (
                                    <div
                                        key={m.id}
                                        className="group relative rounded-2xl p-5 flex flex-col justify-between h-48 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                                        style={{
                                            backgroundColor: 'var(--bg-card)',
                                            border: '1px solid var(--border-default)',
                                            boxShadow: 'var(--shadow-card)'
                                        }}
                                    >
                                        {/* Glow line on hover */}
                                        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                            style={{ background: 'linear-gradient(90deg, transparent, #D99773, transparent)' }} />

                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-sm truncate max-w-[75%]" style={{ color: 'var(--text-primary)' }}>
                                                    {m.titulo}
                                                </h3>
                                                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                                                    style={{ backgroundColor: 'rgba(6,214,160,0.1)', color: '#06D6A0' }}>
                                                    Ativo
                                                </span>
                                            </div>
                                            <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                                                {m.perguntas.length} perguntas formuladas
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                                                {m.procedimentoIds.length === 0 ? (
                                                    <span className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>
                                                        Sem procedimentos vinculados
                                                    </span>
                                                ) : (
                                                    m.procedimentoIds.map(pid => {
                                                        const p = procedimentos.find(pr => pr.id === pid)
                                                        return p ? (
                                                            <span key={pid}
                                                                className="px-2 py-0.5 rounded-lg text-[9px] font-semibold"
                                                                style={{ backgroundColor: 'rgba(217,151,115,0.12)', color: '#D99773' }}>
                                                                {p.nome}
                                                            </span>
                                                        ) : null
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            <button
                                                onClick={() => handleOpenSend(m)}
                                                className="p-2 rounded-lg transition-all cursor-pointer hover:opacity-85"
                                                style={{ backgroundColor: 'rgba(217,151,115,0.12)', color: '#D99773' }}
                                                title="Enviar Ficha de Anamnese"
                                            >
                                                <Send size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleOpenEdit(m)}
                                                className="p-2 rounded-lg transition-all cursor-pointer hover:opacity-85"
                                                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                                                title="Editar"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteModel(m.id)}
                                                className="p-2 rounded-lg transition-all cursor-pointer hover:opacity-85"
                                                style={{ backgroundColor: 'rgba(239,68,68,0.07)', color: '#EF4444' }}
                                                title="Excluir"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Fichas respondidas */}
                        <div className="pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-green-500" />
                                    <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                        Auditoria Jurídica: Assinaturas Recebidas ({fichas.length})
                                    </h2>
                                </div>
                                {fichas.length > 0 && (
                                    <button
                                        onClick={handleExportCSV}
                                        className="py-1.5 px-3 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-all hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer border dark:border-white/10"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <Download size={12} /> Exportar Backup (CSV)
                                    </button>
                                )}
                            </div>

                            {fichas.length === 0 ? (
                                <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma paciente respondeu ou assinou prontuários ainda.</p>
                                </div>
                            ) : (
                                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[11px] text-left">
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                                                    <th className="p-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Paciente</th>
                                                    <th className="p-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Procedimento/Ficha</th>
                                                    <th className="p-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Data</th>
                                                    <th className="p-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                                                    <th className="p-3 font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fichas.map((f, i) => (
                                                    <tr
                                                        key={f.id}
                                                        className="transition-colors"
                                                        style={{ borderBottom: i < fichas.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                    >
                                                        <td className="p-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{f.contato.nome}</span>
                                                                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{f.contato.telefone}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{f.titulo}</td>
                                                        <td className="p-3" style={{ color: 'var(--text-muted)' }}>{new Date(f.dataAssinatura).toLocaleDateString('pt-BR')}</td>
                                                        <td className="p-3">
                                                            <span className="text-[9px] font-semibold px-2.5 py-1 rounded-lg"
                                                                style={{ backgroundColor: 'rgba(6,214,160,0.1)', color: '#06D6A0' }}>
                                                                Assinado ✓
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <button
                                                                onClick={() => setViewFicha(f)}
                                                                className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium inline-flex items-center gap-1 transition-all"
                                                                style={{ backgroundColor: 'rgba(217,151,115,0.1)', color: '#D99773' }}
                                                            >
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

                    {/* Sidebar informativa */}
                    <div className="space-y-4">
                        <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                            {/* Glow top line */}
                            <div className="absolute top-0 left-0 right-0 h-[2px]"
                                style={{ background: 'linear-gradient(90deg, transparent, #D99773, #8B5CF6, transparent)' }} />

                            <div className="p-6">
                                <h3 className="font-bold text-sm flex items-center gap-1.5 mb-3" style={{ color: 'var(--text-primary)' }}>
                                    <ShieldCheck size={16} style={{ color: '#D99773' }} /> Validado Juridicamente
                                </h3>
                                <p className="text-[11px] leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
                                    Cada formulário respondido e assinado digitalmente gera uma trilha criptográfica inalterável. Armazenamos IP de preenchimento, User-Agent, carimbo UTC e geramos hash <strong>SHA-256</strong> individual.
                                </p>
                                <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-hover)' }}>
                                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Dica de Envio:</p>
                                    <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                        Vincule fichas aos procedimentos e a IARA dispara o link automaticamente 24h antes do atendimento.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mini stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                <p className="text-2xl font-bold" style={{ color: '#D99773' }}>{modelos.length}</p>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Modelos</p>
                            </div>
                            <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                <p className="text-2xl font-bold" style={{ color: '#06D6A0' }}>{fichas.length}</p>
                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Assinadas</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL CRIAR/EDITAR ====== */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-hover)' }}>
                        {/* Header modal */}
                        <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <ClipboardList size={16} style={{ color: '#D99773' }} />
                                {editingModel ? 'Editar Modelo de Anamnese' : 'Novo Modelo de Anamnese'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content scrollável */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-[11px]">
                            {/* Título */}
                            <div>
                                <label className="block font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                    Título da Ficha de Anamnese:
                                </label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Ex: Ficha de Anamnese - Botox e Preenchedores"
                                    className="input-field py-2"
                                />
                            </div>

                            {/* Procedimentos */}
                            <div>
                                <label className="block font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                    Vincular a Procedimentos:
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-3 rounded-xl"
                                    style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                                    {procedimentos.length === 0 ? (
                                        <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>Nenhum procedimento cadastrado.</p>
                                    ) : (
                                        procedimentos.map(p => {
                                            const isSelected = selectedProcs.includes(p.id)
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleProcToggle(p.id)}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-all"
                                                    style={isSelected ? {
                                                        backgroundColor: '#D99773',
                                                        borderColor: '#D99773',
                                                        color: '#fff'
                                                    } : {
                                                        backgroundColor: 'var(--bg-input)',
                                                        borderColor: 'var(--border-default)',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {p.nome}
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Horas antes */}
                            <div className="flex items-center gap-3">
                                <label className="font-bold" style={{ color: 'var(--text-primary)' }}>Enviar quanto tempo antes?</label>
                                <input
                                    type="number"
                                    value={horasAntecedencia}
                                    onChange={(e) => setHorasAntecedencia(Number(e.target.value))}
                                    className="input-field w-20 py-2 text-center"
                                />
                                <span style={{ color: 'var(--text-muted)' }}>horas antes do agendamento</span>
                            </div>

                            {/* Mensagem WhatsApp */}
                            <div>
                                <label className="block font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                    Corpo da mensagem do WhatsApp:
                                </label>
                                <textarea
                                    value={mensagemEnvio}
                                    onChange={(e) => setMensagemEnvio(e.target.value)}
                                    rows={3}
                                    className="input-field text-[11px]"
                                    placeholder="Ex: Olá {nome_cliente}! Por favor preencha sua ficha pelo link: {link_anamnese}"
                                />
                                <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                    Use <strong>{'{nome_cliente}'}</strong> e <strong>{'{link_anamnese}'}</strong> para injeção automática de dados.
                                </p>
                            </div>

                            {/* Perguntas */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                        Perguntas da Ficha ({perguntas.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddQuestion}
                                        className="text-[10px] font-semibold flex items-center gap-1 transition-all"
                                        style={{ color: '#D99773' }}
                                    >
                                        <Plus size={12} /> Adicionar Pergunta
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                    {perguntas.map((q, idx) => (
                                        <div key={q.id} className="p-3 rounded-xl relative"
                                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQuestion(q.id)}
                                                className="absolute top-2 right-2 p-1 rounded transition-all"
                                                style={{ color: '#EF4444' }}
                                            >
                                                <X size={12} />
                                            </button>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="sm:col-span-2">
                                                    <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>Pergunta {idx + 1}:</label>
                                                    <input
                                                        type="text"
                                                        value={q.label}
                                                        onChange={(e) => handleQuestionChange(q.id, 'label', e.target.value)}
                                                        placeholder="Ex: Sofre de alguma doença crônica?"
                                                        className="input-field py-1 text-[10px]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>Tipo:</label>
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

                                            {q.tipo === 'multipla_escolha' && (
                                                <div className="mt-3">
                                                    <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>Opções (separadas por vírgula):</label>
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
                                                    className="w-3.5 h-3.5 rounded"
                                                />
                                                <label htmlFor={`req-${q.id}`} className="font-semibold cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                                                    Resposta obrigatória
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer modal */}
                        <div className="flex justify-end gap-2 p-6" style={{ borderTop: '1px solid var(--border-default)' }}>
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

            {/* ====== MODAL VISUALIZAÇÃO DE FICHA PREENCHIDA ====== */}
            {viewFicha && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-hover)' }}>
                        {/* Header */}
                        <div className="flex justify-between items-center p-6" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <div>
                                <h2 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                    <ShieldCheck size={16} className="text-green-500" />
                                    Auditoria de Prontuário Assinado
                                </h2>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    Paciente: {viewFicha.contato.nome} ({viewFicha.contato.telefone})
                                </p>
                            </div>
                            <button onClick={() => setViewFicha(null)} className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-muted)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[11px]">
                            {/* Respostas */}
                            <div>
                                <h3 className="font-bold mb-2 pb-1" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                                    Perguntas & Respostas
                                </h3>
                                <div className="space-y-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                                    {Object.entries(viewFicha.respostas).map(([label, valor]) => (
                                        <div key={label} className="pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <p className="font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                                                {String(valor) || <span className="italic" style={{ color: 'var(--text-muted)' }}>Sem resposta</span>}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Selfie & Assinatura */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-bold mb-2 pb-1" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        Foto do Paciente (Selfie)
                                    </h3>
                                    <div className="flex items-center justify-center p-4 rounded-2xl bg-white h-32" style={{ border: '1px solid var(--border-default)' }}>
                                        {viewFicha.selfiePng ? (
                                            <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200">
                                                <img src={viewFicha.selfiePng} alt="Selfie de Validação" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <span className="italic" style={{ color: 'var(--text-muted)' }}>Selfie indisponível</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold mb-2 pb-1" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                                        Assinatura do Paciente
                                    </h3>
                                    <div className="flex items-center justify-center p-4 rounded-2xl bg-white h-32" style={{ border: '1px solid var(--border-default)' }}>
                                        {viewFicha.assinaturaPng ? (
                                            <img src={viewFicha.assinaturaPng} alt="Assinatura Digital" className="max-h-24 object-contain" />
                                        ) : (
                                            <span className="italic" style={{ color: 'var(--text-muted)' }}>Assinatura indisponível</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Trilha jurídica */}
                            <div>
                                <h3 className="font-bold mb-2 pb-1" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
                                    Evidências Legais de Integridade
                                </h3>
                                <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-hover)' }}>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <p style={{ color: 'var(--text-muted)' }}>Endereço IP de origem:</p>
                                        <p className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{viewFicha.ipOrigem}</p>

                                        <p style={{ color: 'var(--text-muted)' }}>Data e Hora (Brasília):</p>
                                        <p className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                                            {new Date(viewFicha.dataAssinatura).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                        </p>

                                        <p style={{ color: 'var(--text-muted)' }}>Auditoria Criptográfica (UTC):</p>
                                        <p className="font-semibold text-right font-mono text-[9px]" style={{ color: 'var(--text-primary)' }}>
                                            {new Date(viewFicha.dataAssinatura).toUTCString()}
                                        </p>

                                        <p style={{ color: 'var(--text-muted)' }}>Navegador e Dispositivo (UA):</p>
                                        <p className="font-semibold text-right truncate max-w-[180px] self-end" style={{ color: 'var(--text-primary)' }}>{viewFicha.userAgent}</p>
                                    </div>
                                    <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                        <p className="mb-1" style={{ color: 'var(--text-muted)' }}>Hash de Integridade Criptográfica (SHA-256):</p>
                                        <p className="font-mono text-[9px] break-all p-2 rounded-xl" style={{ color: '#D99773', backgroundColor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(217,151,115,0.2)' }}>
                                            {viewFicha.hashIntegridade}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end p-6" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <button onClick={() => setViewFicha(null)} className="btn-secondary py-2 px-4 text-[11px]">
                                Fechar Auditoria
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== MODAL DE ENVIO DE FICHA ====== */}
            {sendModalOpen && sendModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-hover)' }}>
                        {/* Header */}
                        <div className="flex justify-between items-center p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
                            <h2 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                                <MessageSquare size={16} style={{ color: '#D99773' }} />
                                Enviar Ficha de Anamnese
                            </h2>
                            <button onClick={() => setSendModalOpen(false)} className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-muted)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4 text-[11px] overflow-y-auto max-h-[70vh]">
                            {/* Buscar do CRM */}
                            <div>
                                <label className="block font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    Buscar Paciente no CRM (Opcional):
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={crmSearch}
                                        onChange={(e) => setCrmSearch(e.target.value)}
                                        placeholder="Digite nome ou telefone para buscar..."
                                        className="input-field py-1.5 text-[10px]"
                                    />
                                    {searchingContatos && (
                                        <div className="absolute right-2 top-2">
                                            <div className="w-3.5 h-3.5 border-2 border-t-transparent border-[#D99773] rounded-full animate-spin" />
                                        </div>
                                    )}
                                    
                                    {crmContatos.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 max-h-36 overflow-y-auto rounded-xl shadow-lg z-20 border border-slate-200 dark:border-white/10"
                                            style={{ backgroundColor: 'var(--bg-card)' }}>
                                            {crmContatos.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => handleSelectContato(c)}
                                                    className="w-full text-left p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 border-b last:border-0 dark:border-white/5 text-[10px] block transition-colors cursor-pointer"
                                                >
                                                    <span className="font-bold block" style={{ color: 'var(--text-primary)' }}>{c.nome}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{c.telefone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 my-2 uppercase font-bold tracking-wider">
                                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                                Dados de Envio
                                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                            </div>

                            {/* Nome do paciente */}
                            <div>
                                <label className="block font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    Nome do Paciente:
                                </label>
                                <input
                                    type="text"
                                    value={sendName}
                                    onChange={(e) => setSendName(e.target.value)}
                                    placeholder="Ex: Maria da Silva"
                                    className="input-field py-1.5 text-[10px]"
                                />
                            </div>

                            {/* WhatsApp de destino */}
                            <div>
                                <label className="block font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    WhatsApp de Destino:
                                </label>
                                <div className="flex gap-1.5">
                                    {/* Dropdown DDI */}
                                    <select
                                        value={selectedDdi}
                                        onChange={(e) => setSelectedDdi(e.target.value)}
                                        className="py-1.5 px-2.5 text-[10px] rounded-xl border focus:outline-none focus:border-[#D99773] cursor-pointer"
                                        style={{ 
                                            width: '88px',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)',
                                            borderColor: 'var(--border-default)'
                                        }}
                                    >
                                        <option value="+55">🇧🇷 +55</option>
                                        <option value="+351">🇵🇹 +351</option>
                                        <option value="+1">🇺🇸 +1</option>
                                        <option value="+34">🇪🇸 +34</option>
                                        <option value="+54">🇦🇷 +54</option>
                                        <option value="+39">🇮🇹 +39</option>
                                        <option value="+44">🇬🇧 +44</option>
                                    </select>
                                    
                                    {/* Input Telefone */}
                                    <input
                                        type="text"
                                        value={sendPhone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            setSendPhone(val)
                                        }}
                                        placeholder="Ex: 41999999999"
                                        className="input-field flex-1 py-1.5 text-[10px]"
                                    />
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1 block">Digite apenas o DDD e o número (ex: 41991981913).</span>
                            </div>

                            {/* Corpo da mensagem */}
                            <div>
                                <label className="block font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    Mensagem do WhatsApp (Editável):
                                </label>
                                <textarea
                                    value={sendCustomMsg}
                                    onChange={(e) => setSendCustomMsg(e.target.value)}
                                    rows={4}
                                    className="input-field text-[10px] p-2.5 font-sans"
                                    placeholder="Mensagem de envio..."
                                />
                                <p className="text-[9px] mt-1 text-slate-400">
                                    Mantenha as tags <strong>{'{nome_cliente}'}</strong> e <strong>{'{link_anamnese}'}</strong> para injeção automática de dados.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col gap-2.5 p-5" style={{ borderTop: '1px solid var(--border-default)', backgroundColor: 'var(--bg-subtle)' }}>
                            {/* Botão de Disparo Automático (Principal) */}
                            <button
                                onClick={() => handleSendAction('iara')}
                                disabled={sendLoading}
                                className="btn-primary w-full py-2.5 px-4 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-95"
                            >
                                <MessageSquare size={12} /> Disparar Automático com a Iara (Recomendado)
                            </button>

                            {/* Botão de Envio Manual via Link (Secundário) */}
                            <button
                                onClick={() => handleSendAction('whatsapp_web')}
                                disabled={sendLoading}
                                className="btn-primary w-full py-2.5 px-4 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff' }}
                            >
                                <Send size={12} /> Enviar via WhatsApp Web (Manual com Link)
                            </button>

                            {/* Disclaimer Explicativo */}
                            <p 
                                className="text-[9px] leading-relaxed text-center px-3 py-2 rounded-lg border"
                                style={{ 
                                    color: 'var(--text-secondary)', 
                                    backgroundColor: 'var(--bg-subtle)', 
                                    borderColor: 'var(--border-default)' 
                                }}
                            >
                                💡 <strong>Como funciona?</strong> O disparo automático envia direto em segundo plano pelo WhatsApp da clínica. Se a Iara estiver desconectada ou se preferir enviar de outro celular, use a opção manual (WhatsApp Web).
                            </p>

                            {/* Ações de Apoio */}
                            <div className="flex justify-between gap-2 pt-1.5">
                                <button
                                    onClick={() => setSendModalOpen(false)}
                                    className="btn-secondary py-2 px-3 text-[10px] cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                
                                <button
                                    onClick={() => handleSendAction('copy_link')}
                                    disabled={sendLoading}
                                    className="btn-secondary py-2 px-3 text-[10px] flex items-center gap-1 hover:bg-[#D99773]/10 cursor-pointer"
                                >
                                    <Copy size={12} /> Copiar Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
