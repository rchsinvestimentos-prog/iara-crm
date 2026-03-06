'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Phone, Award, Save, Plus, Trash2, Edit3, QrCode, RefreshCw, Wifi, WifiOff, Loader2, Check, Clock, GraduationCap, Calendar, Tag, Package, MapPin, CreditCard, MessageSquare, Instagram, HelpCircle, ShieldCheck, Heart } from 'lucide-react'

// ==================== Interfaces ====================

interface Procedimento {
    id: string
    nome: string
    valor: number
    desconto: number
    parcelas: string | null
    duracao: string | null
}

interface Curso {
    id: string
    nome: string
    modalidade: string
    valor: number
    duracao: string | null
    vagas: number | null
    desconto: number
    parcelas: string | null
    descricao: string | null
}

interface PromocaoProcedimento {
    procedimentoId: string
}

interface Promocao {
    id: string
    nome: string
    descricao: string | null
    instrucaoIara: string | null
    tipoDesconto: string
    valorDesconto: number
    dataInicio: string
    dataFim: string
    procedimentos: PromocaoProcedimento[]
}

interface ComboProcedimento {
    procedimentoId: string
}

interface Combo {
    id: string
    nome: string
    descricao: string | null
    valorOriginal: number
    valorCombo: number
    procedimentos: ComboProcedimento[]
}

interface FaqItem {
    pergunta: string
    resposta: string
}

interface FormasPagamento {
    pix: boolean
    chavePix: string
    cartao: boolean
    dinheiro: boolean
    observacoes: string
}

interface RedesSociais {
    instagram: string
    tiktok: string
    facebook: string
    site: string
}

interface ClinicaData {
    nome: string
    nomeClinica: string | null
    nomeAssistente: string | null
    whatsappClinica: string | null
    whatsappDoutora: string | null
    diferenciais: string | null
    whatsappStatus: string
    instanceName: string | null
    endereco: string | null
    // Horários
    horarioSemana: string | null
    almocoSemana: string | null
    atendeSabado: boolean | null
    horarioSabado: string | null
    almocoSabado: string | null
    atendeDomingo: boolean | null
    horarioDomingo: string | null
    almocoDomingo: string | null
    atendeFeriado: boolean | null
    horarioFeriado: string | null
    almocoFeriado: string | null
    intervaloAtendimento: number | null
    antecedenciaMinima: string | null
    daCursos: boolean | null
    // Google Calendar
    googleCalendarId: string | null
    googleCalendarToken: string | null
    // VIP
    faqPersonalizado: FaqItem[] | null
    cuidadosPos: string | null
    politicaCancelamento: string | null
    formasPagamento: FormasPagamento | null
    linkMaps: string | null
    redesSociais: RedesSociais | null
    mensagemBoasVindas: string | null
}

// ==================== Componente ====================

export default function ConfiguracoesTool() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [clinica, setClinica] = useState<ClinicaData | null>(null)

    // ---- Dados da Clínica ----
    const [nomeClinica, setNomeClinica] = useState('')
    const [nomeIA, setNomeIA] = useState('')
    const [whatsappClinica, setWhatsappClinica] = useState('')
    const [whatsappPessoal, setWhatsappPessoal] = useState('')
    const [diferenciais, setDiferenciais] = useState('')

    // ---- Horários ----
    const [horarioSemana, setHorarioSemana] = useState('')
    const [almocoSemana, setAlmocoSemana] = useState('')
    const [atendeSabado, setAtendeSabado] = useState(false)
    const [horarioSabado, setHorarioSabado] = useState('')
    const [almocoSabado, setAlmocoSabado] = useState('')
    const [atendeDomingo, setAtendeDomingo] = useState(false)
    const [horarioDomingo, setHorarioDomingo] = useState('')
    const [almocoDomingo, setAlmocoDomingo] = useState('')
    const [atendeFeriado, setAtendeFeriado] = useState(false)
    const [horarioFeriado, setHorarioFeriado] = useState('')
    const [almocoFeriado, setAlmocoFeriado] = useState('')
    const [intervaloAtendimento, setIntervaloAtendimento] = useState(15)
    const [antecedenciaMinima, setAntecedenciaMinima] = useState('')

    // ---- Procedimentos ----
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
    const [editandoProc, setEditandoProc] = useState<string | null>(null)
    const [novoProc, setNovoProc] = useState(false)
    const [formProc, setFormProc] = useState<Procedimento>({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' })
    const [savingProc, setSavingProc] = useState(false)

    // ---- Cursos ----
    const [daCursos, setDaCursos] = useState(false)
    const [cursos, setCursos] = useState<Curso[]>([])
    const [editandoCurso, setEditandoCurso] = useState<string | null>(null)
    const [novoCurso, setNovoCurso] = useState(false)
    const [formCurso, setFormCurso] = useState<Curso>({ id: '', nome: '', modalidade: 'presencial', valor: 0, duracao: '', vagas: null, desconto: 0, parcelas: '', descricao: '' })
    const [savingCurso, setSavingCurso] = useState(false)

    // ---- Promoções ----
    const [promocoes, setPromocoes] = useState<Promocao[]>([])
    const [novaPromo, setNovaPromo] = useState(false)
    const [editandoPromo, setEditandoPromo] = useState<string | null>(null)
    const [formPromo, setFormPromo] = useState<{ nome: string; descricao: string; instrucaoIara: string; tipoDesconto: string; valorDesconto: number; dataInicio: string; dataFim: string; procedimentoIds: string[] }>({ nome: '', descricao: '', instrucaoIara: '', tipoDesconto: 'percentual', valorDesconto: 0, dataInicio: '', dataFim: '', procedimentoIds: [] })
    const [savingPromo, setSavingPromo] = useState(false)

    // ---- Combos ----
    const [combos, setCombos] = useState<Combo[]>([])
    const [novoCombo, setNovoCombo] = useState(false)
    const [editandoCombo, setEditandoCombo] = useState<string | null>(null)
    const [formCombo, setFormCombo] = useState<{ nome: string; descricao: string; valorCombo: number; procedimentoIds: string[] }>({ nome: '', descricao: '', valorCombo: 0, procedimentoIds: [] })
    const [savingCombo, setSavingCombo] = useState(false)

    // ---- VIP Personalization ----
    const [cep, setCep] = useState('')
    const [enderecoRua, setEnderecoRua] = useState('')
    const [enderecoNumero, setEnderecoNumero] = useState('')
    const [enderecoComplemento, setEnderecoComplemento] = useState('')
    const [endereco, setEndereco] = useState('')
    const [linkMaps, setLinkMaps] = useState('')
    const [cuidadosPos, setCuidadosPos] = useState('')
    const [politicaCancelamento, setPoliticaCancelamento] = useState('')
    const [mensagemBoasVindas, setMensagemBoasVindas] = useState('')
    const [faq, setFaq] = useState<FaqItem[]>([])
    const [formasPagamento, setFormasPagamento] = useState<FormasPagamento>({ pix: false, chavePix: '', cartao: false, dinheiro: false, observacoes: '' })
    const [redesSociais, setRedesSociais] = useState<RedesSociais>({ instagram: '', tiktok: '', facebook: '', site: '' })

    // ---- WhatsApp QR ----
    const [showQR, setShowQR] = useState(false)
    const [qrCode, setQrCode] = useState('')
    const [pairingCode, setPairingCode] = useState('')
    const [qrLoading, setQrLoading] = useState(false)
    const [whatsStatus, setWhatsStatus] = useState('')

    // ==================== Load Data ====================

    const loadData = useCallback(async () => {
        try {
            const [clinicaRes, procRes, cursoRes, promoRes, comboRes] = await Promise.all([
                fetch('/api/clinica'),
                fetch('/api/procedimentos'),
                fetch('/api/cursos'),
                fetch('/api/promocoes'),
                fetch('/api/combos'),
            ])

            if (clinicaRes.ok) {
                const data = await clinicaRes.json()
                setClinica(data)
                setNomeClinica(data.nomeClinica || data.nome || '')
                setNomeIA(data.nomeAssistente || 'IARA')
                setWhatsappClinica(data.whatsappClinica || '')
                setWhatsappPessoal(data.whatsappDoutora || '')
                setDiferenciais(data.diferenciais || '')
                setEndereco(data.endereco || '')
                // Tentar parsear endereço existente nos campos separados
                if (data.endereco) {
                    const parts = data.endereco.split(',')
                    if (parts.length >= 2) {
                        setEnderecoRua(parts[0].trim())
                        const resto = parts.slice(1).join(',').trim()
                        const numMatch = resto.match(/^(\d+)/)
                        if (numMatch) {
                            setEnderecoNumero(numMatch[1])
                            setEnderecoComplemento(resto.replace(/^\d+\s*-?\s*/, '').trim())
                        } else {
                            setEnderecoComplemento(resto)
                        }
                    } else {
                        setEnderecoRua(data.endereco)
                    }
                }
                // Horários
                setHorarioSemana(data.horarioSemana || '')
                setAlmocoSemana(data.almocoSemana || '')
                setAtendeSabado(data.atendeSabado || false)
                setHorarioSabado(data.horarioSabado || '')
                setAlmocoSabado(data.almocoSabado || '')
                setAtendeDomingo(data.atendeDomingo || false)
                setHorarioDomingo(data.horarioDomingo || '')
                setAlmocoDomingo(data.almocoDomingo || '')
                setAtendeFeriado(data.atendeFeriado || false)
                setHorarioFeriado(data.horarioFeriado || '')
                setAlmocoFeriado(data.almocoFeriado || '')
                setIntervaloAtendimento(data.intervaloAtendimento ?? 15)
                setAntecedenciaMinima(data.antecedenciaMinima || '')
                setDaCursos(data.daCursos || false)
                // VIP
                setLinkMaps(data.linkMaps || '')
                setCuidadosPos(data.cuidadosPos || '')
                setPoliticaCancelamento(data.politicaCancelamento || '')
                setMensagemBoasVindas(data.mensagemBoasVindas || '')
                setFaq(data.faqPersonalizado || [])
                setFormasPagamento(data.formasPagamento || { pix: false, chavePix: '', cartao: false, dinheiro: false, observacoes: '' })
                setRedesSociais(data.redesSociais || { instagram: '', tiktok: '', facebook: '', site: '' })

                // Verificar status real do WhatsApp via Evolution API
                if (data.evolutionInstance) {
                    try {
                        const whatsRes = await fetch('/api/whatsapp/connect')
                        const whatsData = await whatsRes.json()
                        setWhatsStatus(whatsData.connected ? 'conectado' : 'desconectado')
                    } catch {
                        setWhatsStatus('desconectado')
                    }
                }
            }

            if (procRes.ok) setProcedimentos(await procRes.json())
            if (cursoRes.ok) setCursos(await cursoRes.json())
            if (promoRes.ok) setPromocoes(await promoRes.json())
            if (comboRes.ok) setCombos(await comboRes.json())
        } catch (err) {
            console.error('Erro ao carregar configurações:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    // ==================== Salvar Clínica ====================

    const salvarClinica = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const res = await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nomeClinica,
                    nomeAssistente: nomeIA,
                    whatsappClinica: whatsappClinica || null,
                    whatsappDoutora: whatsappPessoal || null,
                    diferenciais: diferenciais || null,
                    endereco: endereco || null,
                    horarioSemana: horarioSemana || null,
                    almocoSemana: almocoSemana || null,
                    atendeSabado,
                    horarioSabado: horarioSabado || null,
                    almocoSabado: almocoSabado || null,
                    atendeDomingo,
                    horarioDomingo: horarioDomingo || null,
                    almocoDomingo: almocoDomingo || null,
                    atendeFeriado,
                    horarioFeriado: horarioFeriado || null,
                    almocoFeriado: almocoFeriado || null,
                    intervaloAtendimento,
                    antecedenciaMinima: antecedenciaMinima || null,
                    daCursos,
                    linkMaps: linkMaps || null,
                    cuidadosPos: cuidadosPos || null,
                    politicaCancelamento: politicaCancelamento || null,
                    mensagemBoasVindas: mensagemBoasVindas || null,
                    faqPersonalizado: faq,
                    formasPagamento,
                    redesSociais,
                }),
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (err) {
            console.error('Erro ao salvar:', err)
        } finally {
            setSaving(false)
        }
    }

    // ==================== CRUD Procedimentos ====================

    const salvarProc = async () => {
        if (!formProc.nome.trim()) return
        setSavingProc(true)
        try {
            const method = editandoProc ? 'PUT' : 'POST'
            const body = editandoProc
                ? { id: editandoProc, nome: formProc.nome, valor: formProc.valor, desconto: formProc.desconto, parcelas: formProc.parcelas || null, duracao: formProc.duracao || null }
                : { nome: formProc.nome, valor: formProc.valor, desconto: formProc.desconto, parcelas: formProc.parcelas || null, duracao: formProc.duracao || null }

            const res = await fetch('/api/procedimentos', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                const procRes = await fetch('/api/procedimentos')
                if (procRes.ok) setProcedimentos(await procRes.json())
                setEditandoProc(null)
                setNovoProc(false)
                setFormProc({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' })
            }
        } catch (err) {
            console.error('Erro ao salvar procedimento:', err)
        } finally {
            setSavingProc(false)
        }
    }

    const excluirProc = async (id: string) => {
        try {
            const res = await fetch(`/api/procedimentos?id=${id}`, { method: 'DELETE' })
            if (res.ok) setProcedimentos(prev => prev.filter(p => p.id !== id))
        } catch (err) {
            console.error('Erro ao excluir:', err)
        }
    }

    const editarProc = (p: Procedimento) => {
        setEditandoProc(p.id)
        setFormProc({ ...p, parcelas: p.parcelas || '', duracao: p.duracao || '' })
        setNovoProc(true)
    }

    // ==================== CRUD Cursos ====================

    const salvarCurso = async () => {
        if (!formCurso.nome.trim()) return
        setSavingCurso(true)
        try {
            const method = editandoCurso ? 'PUT' : 'POST'
            const body = editandoCurso
                ? { id: editandoCurso, nome: formCurso.nome, modalidade: formCurso.modalidade, valor: formCurso.valor, duracao: formCurso.duracao || null, vagas: formCurso.vagas, desconto: formCurso.desconto, parcelas: formCurso.parcelas || null, descricao: formCurso.descricao || null }
                : { nome: formCurso.nome, modalidade: formCurso.modalidade, valor: formCurso.valor, duracao: formCurso.duracao || null, vagas: formCurso.vagas, desconto: formCurso.desconto, parcelas: formCurso.parcelas || null, descricao: formCurso.descricao || null }

            const res = await fetch('/api/cursos', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                const cursoRes = await fetch('/api/cursos')
                if (cursoRes.ok) setCursos(await cursoRes.json())
                setEditandoCurso(null)
                setNovoCurso(false)
                setFormCurso({ id: '', nome: '', modalidade: 'presencial', valor: 0, duracao: '', vagas: null, desconto: 0, parcelas: '', descricao: '' })
            }
        } catch (err) {
            console.error('Erro ao salvar curso:', err)
        } finally {
            setSavingCurso(false)
        }
    }

    const excluirCurso = async (id: string) => {
        try {
            const res = await fetch(`/api/cursos?id=${id}`, { method: 'DELETE' })
            if (res.ok) setCursos(prev => prev.filter(c => c.id !== id))
        } catch (err) {
            console.error('Erro ao excluir curso:', err)
        }
    }

    const editarCurso = (c: Curso) => {
        setEditandoCurso(c.id)
        setFormCurso({ ...c, duracao: c.duracao || '', parcelas: c.parcelas || '', descricao: c.descricao || '' })
        setNovoCurso(true)
    }

    // ==================== Helpers ====================

    // ==================== CRUD Promoções ====================

    const salvarPromo = async () => {
        if (!formPromo.nome.trim()) return
        setSavingPromo(true)
        try {
            const method = editandoPromo ? 'PUT' : 'POST'
            const body = editandoPromo ? { id: editandoPromo, ...formPromo } : formPromo
            const res = await fetch('/api/promocoes', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) {
                const r = await fetch('/api/promocoes'); if (r.ok) setPromocoes(await r.json())
                setEditandoPromo(null); setNovaPromo(false)
                setFormPromo({ nome: '', descricao: '', instrucaoIara: '', tipoDesconto: 'percentual', valorDesconto: 0, dataInicio: '', dataFim: '', procedimentoIds: [] })
            }
        } catch (err) { console.error('Erro ao salvar promoção:', err) }
        finally { setSavingPromo(false) }
    }

    const excluirPromo = async (id: string) => {
        try {
            const res = await fetch(`/api/promocoes?id=${id}`, { method: 'DELETE' })
            if (res.ok) setPromocoes(prev => prev.filter(p => p.id !== id))
        } catch (err) { console.error('Erro:', err) }
    }

    // ==================== CRUD Combos ====================

    const salvarCombo = async () => {
        if (!formCombo.nome.trim() || formCombo.procedimentoIds.length === 0) return
        setSavingCombo(true)
        try {
            const valorOriginal = procedimentos.filter(p => formCombo.procedimentoIds.includes(p.id)).reduce((s, p) => s + p.valor, 0)
            const method = editandoCombo ? 'PUT' : 'POST'
            const body = editandoCombo ? { id: editandoCombo, ...formCombo, valorOriginal } : { ...formCombo, valorOriginal }
            const res = await fetch('/api/combos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) {
                const r = await fetch('/api/combos'); if (r.ok) setCombos(await r.json())
                setEditandoCombo(null); setNovoCombo(false)
                setFormCombo({ nome: '', descricao: '', valorCombo: 0, procedimentoIds: [] })
            }
        } catch (err) { console.error('Erro ao salvar combo:', err) }
        finally { setSavingCombo(false) }
    }

    const excluirCombo = async (id: string) => {
        try {
            const res = await fetch(`/api/combos?id=${id}`, { method: 'DELETE' })
            if (res.ok) setCombos(prev => prev.filter(c => c.id !== id))
        } catch (err) { console.error('Erro:', err) }
    }

    // ==================== FAQ Helpers ====================

    const addFaq = () => setFaq([...faq, { pergunta: '', resposta: '' }])
    const removeFaq = (i: number) => setFaq(faq.filter((_, idx) => idx !== i))
    const updateFaq = (i: number, field: 'pergunta' | 'resposta', val: string) => {
        const updated = [...faq]; updated[i] = { ...updated[i], [field]: val }; setFaq(updated)
    }

    // ==================== Helpers ====================

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }
    const inputStyle = { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }
    const labelClass = "text-[12px] font-medium block mb-1"
    const inputClass = "w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors"
    const innerInputStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#D99773]" />
                <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando configurações...</span>
            </div>
        )
    }

    const statusWhatsApp = whatsStatus || clinica?.whatsappStatus || 'desconectado'
    const calendarConnected = !!clinica?.googleCalendarToken

    // ==================== RENDER ====================

    return (
        <div className="space-y-6">

            {/* ============ 1. DADOS DA CLÍNICA ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Building2 size={15} className="text-[#D99773]" />
                    Sua Clínica
                </h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Nome da Clínica</label>
                            <input className={inputClass} style={inputStyle} value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} placeholder="Studio Maria Helena" />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Nome da IA</label>
                            <input className={inputClass} style={inputStyle} value={nomeIA} onChange={(e) => setNomeIA(e.target.value)} placeholder="IARA" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>WhatsApp da Clínica</label>
                            <div className="flex gap-1">
                                <select className="px-1 py-2 text-[11px] rounded-xl focus:outline-none w-[75px] shrink-0" style={inputStyle}
                                    value={whatsappClinica.match(/^\d{1,3}(?=\d{8,})/)?.[0] || '55'}
                                    onChange={(e) => {
                                        const num = whatsappClinica.replace(/^\d{1,3}(?=\d{8,})/, '')
                                        setWhatsappClinica(e.target.value + num)
                                    }}>
                                    <option value="55">🇧🇷+55</option>
                                    <option value="351">🇵🇹+351</option>
                                    <option value="1">🇺🇸+1</option>
                                    <option value="54">🇦🇷+54</option>
                                    <option value="595">🇵🇾+595</option>
                                    <option value="598">🇺🇾+598</option>
                                    <option value="34">🇪🇸+34</option>
                                    <option value="39">🇮🇹+39</option>
                                    <option value="44">🇬🇧+44</option>
                                </select>
                                <input className={`${inputClass} flex-1`} style={inputStyle} value={whatsappClinica} onChange={(e) => setWhatsappClinica(e.target.value)} placeholder="5541999999999" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>WhatsApp Pessoal (Dra)</label>
                            <div className="flex gap-1">
                                <select className="px-1 py-2 text-[11px] rounded-xl focus:outline-none w-[75px] shrink-0" style={inputStyle}
                                    value={whatsappPessoal.match(/^\d{1,3}(?=\d{8,})/)?.[0] || '55'}
                                    onChange={(e) => {
                                        const num = whatsappPessoal.replace(/^\d{1,3}(?=\d{8,})/, '')
                                        setWhatsappPessoal(e.target.value + num)
                                    }}>
                                    <option value="55">🇧🇷+55</option>
                                    <option value="351">🇵🇹+351</option>
                                    <option value="1">🇺🇸+1</option>
                                    <option value="54">🇦🇷+54</option>
                                    <option value="595">🇵🇾+595</option>
                                    <option value="598">🇺🇾+598</option>
                                    <option value="34">🇪🇸+34</option>
                                    <option value="39">🇮🇹+39</option>
                                    <option value="44">🇬🇧+44</option>
                                </select>
                                <input className={`${inputClass} flex-1`} style={inputStyle} value={whatsappPessoal} onChange={(e) => setWhatsappPessoal(e.target.value)} placeholder="5541988888888" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>CEP</label>
                        <div className="flex gap-2">
                            <input className={`${inputClass} max-w-[140px]`} style={inputStyle}
                                value={cep}
                                onChange={async (e) => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    if (raw.length <= 8) {
                                        const fmt = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw
                                        setCep(fmt)
                                        if (raw.length === 8) {
                                            try {
                                                const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
                                                const data = await res.json()
                                                if (!data.erro) {
                                                    const rua = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
                                                    setEnderecoRua(rua)
                                                    const full = enderecoNumero ? `${rua}, ${enderecoNumero}${enderecoComplemento ? ' - ' + enderecoComplemento : ''}` : rua
                                                    setEndereco(full)
                                                    setLinkMaps(`https://maps.google.com/maps?q=${encodeURIComponent(full)}`)
                                                }
                                            } catch { }
                                        }
                                    }
                                }}
                                placeholder="80250-104"
                                maxLength={9}
                            />
                            <p className="text-[9px] self-center" style={{ color: 'var(--text-muted)' }}>Digite o CEP para preencher automaticamente</p>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Endereço (rua, bairro, cidade)</label>
                        <input className={inputClass} style={inputStyle} value={enderecoRua} onChange={(e) => {
                            setEnderecoRua(e.target.value)
                            const full = enderecoNumero ? `${e.target.value}, ${enderecoNumero}${enderecoComplemento ? ' - ' + enderecoComplemento : ''}` : e.target.value
                            setEndereco(full)
                            if (full) setLinkMaps(`https://maps.google.com/maps?q=${encodeURIComponent(full)}`)
                        }} placeholder="Rua das Flores, Batel - Curitiba/PR" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Número *</label>
                            <input className={inputClass} style={inputStyle} value={enderecoNumero} onChange={(e) => {
                                setEnderecoNumero(e.target.value)
                                const full = enderecoRua ? `${enderecoRua}, ${e.target.value}${enderecoComplemento ? ' - ' + enderecoComplemento : ''}` : e.target.value
                                setEndereco(full)
                                if (full) setLinkMaps(`https://maps.google.com/maps?q=${encodeURIComponent(full)}`)
                            }} placeholder="123" />
                        </div>
                        <div>
                            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Complemento</label>
                            <input className={inputClass} style={inputStyle} value={enderecoComplemento} onChange={(e) => {
                                setEnderecoComplemento(e.target.value)
                                const full = enderecoRua ? `${enderecoRua}, ${enderecoNumero}${e.target.value ? ' - ' + e.target.value : ''}` : ''
                                setEndereco(full)
                                if (full) setLinkMaps(`https://maps.google.com/maps?q=${encodeURIComponent(full)}`)
                            }} placeholder="Sala 4, Bloco B" />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Link do Google Maps <span className="text-[9px] font-normal">(gerado automaticamente)</span></label>
                        <input className={inputClass} style={inputStyle} value={linkMaps} onChange={(e) => setLinkMaps(e.target.value)} placeholder="https://maps.google.com/..." />
                        {linkMaps && <a href={linkMaps} target="_blank" rel="noopener noreferrer" className="text-[9px] mt-1 inline-block hover:underline" style={{ color: '#0F4C61' }}>🔗 Testar link no Maps</a>}
                    </div>
                </div>
            </div>

            {/* ============ 2. DIFERENCIAIS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Award size={15} className="text-[#D99773]" />
                    Diferenciais da Clínica
                </h3>
                <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>A IARA usa esses diferenciais para convencer as clientes a agendarem</p>
                <textarea
                    className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors resize-none h-24"
                    style={inputStyle}
                    value={diferenciais}
                    onChange={(e) => setDiferenciais(e.target.value)}
                    placeholder="Ex: 10 anos de experiência, especialização internacional, uso de tecnologia exclusiva, prêmios, atendimento humanizado..."
                />
            </div>

            {/* ============ 3. CONEXÃO WHATSAPP ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Phone size={15} className="text-[#D99773]" />
                    Conexão WhatsApp
                </h3>
                <div className={`flex items-center justify-between p-4 rounded-xl ${statusWhatsApp === 'conectado' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="flex items-center gap-3">
                        {statusWhatsApp === 'conectado' ? <Wifi size={18} className="text-green-500" /> : <WifiOff size={18} className="text-red-500" />}
                        <div>
                            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {statusWhatsApp === 'conectado' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {statusWhatsApp === 'conectado' ? `Instância: ${clinica?.instanceName || '—'}` : 'Escaneie o QR Code para conectar'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {statusWhatsApp !== 'conectado' && (
                            <button
                                disabled={qrLoading}
                                onClick={async () => {
                                    setQrLoading(true)
                                    setPairingCode('')
                                    try {
                                        const res = await fetch('/api/whatsapp/connect', { method: 'POST' })
                                        const data = await res.json()
                                        if (data.qrcode) {
                                            setQrCode(data.qrcode)
                                            setShowQR(true)
                                            // Polling conexão a cada 3s
                                            const pollInterval = setInterval(async () => {
                                                try {
                                                    const sr = await fetch('/api/whatsapp/connect')
                                                    const sd = await sr.json()
                                                    if (sd.connected) {
                                                        clearInterval(pollInterval)
                                                        clearInterval(refreshInterval)
                                                        setShowQR(false)
                                                        setWhatsStatus('conectado')
                                                        setQrCode('')
                                                        loadData()
                                                    }
                                                } catch { }
                                            }, 3000)
                                            // Auto-refresh QR a cada 25s
                                            const refreshInterval = setInterval(async () => {
                                                try {
                                                    const rr = await fetch('/api/whatsapp/connect', { method: 'POST' })
                                                    const rd = await rr.json()
                                                    if (rd.qrcode) setQrCode(rd.qrcode)
                                                } catch { }
                                            }, 25000)
                                            // Limpar tudo após 2 min
                                            setTimeout(() => {
                                                clearInterval(pollInterval)
                                                clearInterval(refreshInterval)
                                            }, 120000)
                                        } else if (data.status === 'open') {
                                            setWhatsStatus('conectado')
                                            loadData()
                                        } else {
                                            alert(data.error || 'Não foi possível gerar QR Code. Tente novamente.')
                                        }
                                    } catch (err: any) {
                                        alert('Erro: ' + err.message)
                                    } finally {
                                        setQrLoading(false)
                                    }
                                }}
                                className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {qrLoading ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />} QR Code
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/whatsapp/connect')
                                    const data = await res.json()
                                    if (data.connected) {
                                        setWhatsStatus('conectado')
                                        loadData()
                                        alert('\u2705 WhatsApp conectado!')
                                    } else {
                                        setWhatsStatus('desconectado')
                                        alert(`Status: ${data.status || 'desconectado'}`)
                                    }
                                } catch (err: any) {
                                    alert('Erro: ' + err.message)
                                }
                            }}
                            className="text-[11px] font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
                        >
                            <RefreshCw size={12} /> {statusWhatsApp === 'conectado' ? 'Verificar' : 'Verificar Status'}
                        </button>
                        {statusWhatsApp === 'conectado' && (
                            <button
                                onClick={async () => {
                                    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return
                                    try {
                                        const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' })
                                        const data = await res.json()
                                        if (data.success) {
                                            setWhatsStatus('desconectado')
                                            alert('WhatsApp desconectado com sucesso.')
                                        } else {
                                            alert(data.error || 'Erro ao desconectar.')
                                        }
                                    } catch (err: any) {
                                        alert('Erro: ' + err.message)
                                    }
                                }}
                                className="text-[11px] font-medium px-3 py-1.5 bg-red-500/15 text-red-400 rounded-lg flex items-center gap-1.5 hover:bg-red-500/25 transition-colors"
                            >
                                <WifiOff size={12} /> Desconectar
                            </button>
                        )}
                    </div>
                </div>

                {/* QR Code Modal - renderizado via Portal fora do container */}
                {showQR && qrCode && typeof document !== 'undefined' && createPortal(
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]" style={{ margin: 0, padding: '16px' }} onClick={() => setShowQR(false)}>
                        <div className="bg-white rounded-2xl p-5 w-[340px] text-center shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <h3 className="text-[16px] font-bold text-gray-800 mb-3">📱 Conectar WhatsApp</h3>

                            <div className="bg-white border-2 border-gray-100 rounded-xl p-2 inline-block mb-3">
                                <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-[200px] h-[200px]" />
                            </div>

                            {/* Método 1: QR Code */}
                            <div className="bg-gray-50 rounded-xl p-3 text-left mb-2">
                                <p className="text-[11px] font-semibold text-gray-700 mb-1.5">📋 Como conectar:</p>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-gray-600"><span className="font-bold text-[#0F4C61]">1.</span> Abra o <strong>WhatsApp</strong> no celular</p>
                                    <p className="text-[10px] text-gray-600"><span className="font-bold text-[#0F4C61]">2.</span> <strong>⋮</strong> (Android) ou <strong>Configurações</strong> (iPhone)</p>
                                    <p className="text-[10px] text-gray-600"><span className="font-bold text-[#0F4C61]">3.</span> <strong>Dispositivos Conectados</strong> → <strong>Conectar Dispositivo</strong></p>
                                    <p className="text-[10px] text-gray-600"><span className="font-bold text-[#0F4C61]">4.</span> Aponte a câmera para o QR acima</p>
                                </div>
                            </div>
                            {/* Dica: acessar de outro dispositivo */}
                            <div className="bg-amber-50 rounded-xl p-3 text-left mb-3">
                                <p className="text-[11px] font-semibold text-amber-700 mb-1.5">💡 Está no celular?</p>
                                <p className="text-[10px] text-gray-600">Abra este painel no <strong>computador</strong> ou <strong>tablet</strong> e escaneie o QR Code com o celular do WhatsApp da clínica.</p>
                            </div>

                            <p className="text-[10px] text-green-600 mb-3 animate-pulse">⏳ Aguardando conexão... (QR atualiza automaticamente)</p>
                            <button onClick={() => setShowQR(false)} className="text-[12px] font-medium px-5 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Fechar</button>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* ============ 4. CONEXÃO GOOGLE CALENDAR ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={15} className="text-[#D99773]" />
                    Conexão Agenda
                </h3>
                <div className={`flex items-center justify-between p-4 rounded-xl ${calendarConnected ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${calendarConnected ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                            <Calendar size={16} className={calendarConnected ? 'text-green-500' : 'text-amber-500'} />
                        </div>
                        <div>
                            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {calendarConnected ? 'Google Calendar Conectado' : 'Agenda não conectada'}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {calendarConnected
                                    ? `Agenda: ${clinica?.googleCalendarId || 'primary'}`
                                    : 'Conecte para a IARA agendar automaticamente'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            // TODO: Implementar OAuth Google Calendar
                            window.open('/api/auth/google-calendar', '_blank')
                        }}
                        className="text-[11px] font-medium px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
                        style={calendarConnected
                            ? { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
                            : { backgroundColor: '#0F4C61', color: 'white' }
                        }
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                        {calendarConnected ? 'Reconectar' : 'Conectar Google Calendar'}
                    </button>
                </div>
            </div>

            {/* ============ 5. PROCEDIMENTOS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>💉 Procedimentos ({procedimentos.length})</h3>
                    <button
                        onClick={() => { setNovoProc(true); setEditandoProc(null); setFormProc({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' }) }}
                        className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5"
                    >
                        <Plus size={12} /> Adicionar
                    </button>
                </div>

                {/* Form novo/editar procedimento */}
                {novoProc && (
                    <div className="p-4 rounded-xl mb-4 space-y-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{editandoProc ? 'Editar' : 'Novo'} Procedimento</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Nome</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formProc.nome} onChange={(e) => setFormProc({ ...formProc, nome: e.target.value })} placeholder="Ex: Micropigmentação Sobrancelhas" />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
                                <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formProc.valor || ''} onChange={(e) => setFormProc({ ...formProc, valor: Number(e.target.value) })} placeholder="497" />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Duração</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formProc.duracao || ''} onChange={(e) => setFormProc({ ...formProc, duracao: e.target.value })} placeholder="1h30" />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Desconto máx. (%)</label>
                                <select className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formProc.desconto} onChange={(e) => setFormProc({ ...formProc, desconto: Number(e.target.value) })}>
                                    <option value={0}>Sem desconto</option>
                                    <option value={10}>10%</option>
                                    <option value={20}>20%</option>
                                    <option value={30}>30%</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Parcelas</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formProc.parcelas || ''} onChange={(e) => setFormProc({ ...formProc, parcelas: e.target.value })} placeholder="3x sem juros" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={salvarProc} disabled={savingProc} className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                                {savingProc ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                            </button>
                            <button onClick={() => { setNovoProc(false); setEditandoProc(null) }} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                        </div>
                    </div>
                )}

                {/* Lista procedimentos */}
                <div className="space-y-2">
                    {procedimentos.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum procedimento cadastrado</p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Clique em &quot;Adicionar&quot; para começar</p>
                        </div>
                    ) : (
                        procedimentos.map((p) => (
                            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.nome}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[11px] font-semibold" style={{ color: '#0F4C61' }}>R$ {p.valor}</span>
                                        {p.duracao && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>⏱ {p.duracao}</span>}
                                        {p.desconto > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">-{p.desconto}%</span>}
                                        {p.parcelas && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>💳 {p.parcelas}</span>}
                                    </div>
                                </div>
                                <button onClick={() => editarProc(p)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    <Edit3 size={13} />
                                </button>
                                <button onClick={() => excluirProc(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ============ 6. CURSOS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <GraduationCap size={15} className="text-[#D99773]" />
                        Cursos
                    </h3>
                    <button
                        onClick={() => setDaCursos(!daCursos)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${daCursos ? 'bg-[#0F4C61]' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${daCursos ? 'translate-x-5' : ''}`} />
                    </button>
                </div>

                {daCursos && (
                    <>
                        <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Cadastre seus cursos para a IARA divulgar e vender para suas clientes</p>

                        {!novoCurso && (
                            <button
                                onClick={() => { setNovoCurso(true); setEditandoCurso(null); setFormCurso({ id: '', nome: '', modalidade: 'presencial', valor: 0, duracao: '', vagas: null, desconto: 0, parcelas: '', descricao: '' }) }}
                                className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 mb-4"
                            >
                                <Plus size={12} /> Adicionar Curso
                            </button>
                        )}

                        {/* Form novo/editar curso */}
                        {novoCurso && (
                            <div className="p-4 rounded-xl mb-4 space-y-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{editandoCurso ? 'Editar' : 'Novo'} Curso</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Nome do Curso</label>
                                        <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCurso.nome} onChange={(e) => setFormCurso({ ...formCurso, nome: e.target.value })} placeholder="Ex: Curso de Micropigmentação Labial" />
                                    </div>

                                    {/* Modalidade pills */}
                                    <div>
                                        <label className="text-[11px] block mb-2" style={{ color: 'var(--text-muted)' }}>Modalidade</label>
                                        <div className="flex gap-2">
                                            {['presencial', 'online', 'hibrido'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setFormCurso({ ...formCurso, modalidade: m })}
                                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all ${formCurso.modalidade === m
                                                        ? 'bg-[#D99773]/20 text-[#D99773] border border-[#D99773]/30'
                                                        : 'border border-white/10 hover:bg-white/5'
                                                        }`}
                                                    style={formCurso.modalidade !== m ? { color: 'var(--text-muted)', borderColor: 'var(--border-default)' } : {}}
                                                >
                                                    {m === 'hibrido' ? 'Híbrido' : m.charAt(0).toUpperCase() + m.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
                                            <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCurso.valor || ''} onChange={(e) => setFormCurso({ ...formCurso, valor: Number(e.target.value) })} placeholder="2.497" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Duração</label>
                                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCurso.duracao || ''} onChange={(e) => setFormCurso({ ...formCurso, duracao: e.target.value })} placeholder="3 dias" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Vagas</label>
                                            <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCurso.vagas ?? ''} onChange={(e) => setFormCurso({ ...formCurso, vagas: e.target.value ? Number(e.target.value) : null })} placeholder="10" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Desconto máx. (%)</label>
                                            <select className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCurso.desconto} onChange={(e) => setFormCurso({ ...formCurso, desconto: Number(e.target.value) })}>
                                                <option value={0}>Sem desconto</option>
                                                <option value={10}>10%</option>
                                                <option value={20}>20%</option>
                                                <option value={30}>30%</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Parcelas</label>
                                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCurso.parcelas || ''} onChange={(e) => setFormCurso({ ...formCurso, parcelas: e.target.value })} placeholder="10x sem juros" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Descrição detalhada</label>
                                        <p className="text-[9px] mb-1" style={{ color: 'var(--text-muted)' }}>Quanto mais detalhes, melhor a IARA explica o curso para as clientes</p>
                                        <textarea
                                            className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-28"
                                            style={innerInputStyle}
                                            value={formCurso.descricao || ''}
                                            onChange={(e) => setFormCurso({ ...formCurso, descricao: e.target.value })}
                                            placeholder="Ex: Curso intensivo de 3 dias com prática em modelo real. Inclui kit completo de pigmentos, certificado internacional, e acesso ao grupo VIP de suporte por 6 meses. Aprenda as técnicas de shadow, fio a fio e aquarela..."
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={salvarCurso} disabled={savingCurso} className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                                        {savingCurso ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                                    </button>
                                    <button onClick={() => { setNovoCurso(false); setEditandoCurso(null) }} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                                </div>
                            </div>
                        )}

                        {/* Lista cursos */}
                        <div className="space-y-2">
                            {cursos.length === 0 && !novoCurso ? (
                                <div className="text-center py-6">
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum curso cadastrado</p>
                                </div>
                            ) : (
                                cursos.map((c) => (
                                    <div key={c.id} className="p-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.nome}</p>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium capitalize ${c.modalidade === 'presencial' ? 'bg-blue-500/10 text-blue-600'
                                                        : c.modalidade === 'online' ? 'bg-purple-500/10 text-purple-600'
                                                            : 'bg-amber-500/10 text-amber-600'
                                                        }`}>
                                                        {c.modalidade === 'hibrido' ? 'Híbrido' : c.modalidade}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[11px] font-semibold" style={{ color: '#0F4C61' }}>R$ {c.valor}</span>
                                                    {c.duracao && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>⏱ {c.duracao}</span>}
                                                    {c.vagas && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>👥 {c.vagas} vagas</span>}
                                                    {c.desconto > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">-{c.desconto}%</span>}
                                                </div>
                                                {c.descricao && <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{c.descricao}</p>}
                                            </div>
                                            <div className="flex gap-1 ml-2">
                                                <button onClick={() => editarCurso(c)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                                                    <Edit3 size={13} />
                                                </button>
                                                <button onClick={() => excluirCurso(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: 'var(--text-muted)' }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ============ 7. HORÁRIOS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Clock size={15} className="text-[#D99773]" />
                    Horários de Funcionamento
                </h3>

                <div className="space-y-4">
                    {/* Seg-Sex */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Segunda a Sexta</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Horário</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={horarioSemana} onChange={(e) => setHorarioSemana(e.target.value)} placeholder="08:00 às 18:00" />
                            </div>
                            <div>
                                <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Almoço</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={almocoSemana} onChange={(e) => setAlmocoSemana(e.target.value)} placeholder="12:00 às 13:00" />
                            </div>
                        </div>
                    </div>

                    {/* Sábado */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sábado</p>
                            <button onClick={() => setAtendeSabado(!atendeSabado)} className={`relative w-9 h-5 rounded-full transition-colors ${atendeSabado ? 'bg-[#0F4C61]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${atendeSabado ? 'translate-x-4' : ''}`} />
                            </button>
                        </div>
                        {atendeSabado && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Horário</label>
                                    <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={horarioSabado} onChange={(e) => setHorarioSabado(e.target.value)} placeholder="08:00 às 12:00" />
                                </div>
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Almoço</label>
                                    <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={almocoSabado} onChange={(e) => setAlmocoSabado(e.target.value)} placeholder="Sem almoço" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Domingo */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Domingo</p>
                            <button onClick={() => setAtendeDomingo(!atendeDomingo)} className={`relative w-9 h-5 rounded-full transition-colors ${atendeDomingo ? 'bg-[#0F4C61]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${atendeDomingo ? 'translate-x-4' : ''}`} />
                            </button>
                        </div>
                        {atendeDomingo && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Horário</label>
                                    <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={horarioDomingo} onChange={(e) => setHorarioDomingo(e.target.value)} placeholder="08:00 às 12:00" />
                                </div>
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Almoço</label>
                                    <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={almocoDomingo} onChange={(e) => setAlmocoDomingo(e.target.value)} placeholder="Sem almoço" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Feriado */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Feriados</p>
                            <button onClick={() => setAtendeFeriado(!atendeFeriado)} className={`relative w-9 h-5 rounded-full transition-colors ${atendeFeriado ? 'bg-[#0F4C61]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${atendeFeriado ? 'translate-x-4' : ''}`} />
                            </button>
                        </div>
                        {atendeFeriado && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Horário</label>
                                    <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={horarioFeriado} onChange={(e) => setHorarioFeriado(e.target.value)} placeholder="08:00 às 12:00" />
                                </div>
                                <div>
                                    <label className="text-[10px] block mb-1" style={{ color: 'var(--text-muted)' }}>Almoço</label>
                                    <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={almocoFeriado} onChange={(e) => setAlmocoFeriado(e.target.value)} placeholder="Sem almoço" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Intervalo entre atendimentos */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Intervalo entre atendimentos</p>
                        <div className="flex gap-2 flex-wrap">
                            {[0, 5, 10, 15, 30, 60].map(min => (
                                <button
                                    key={min}
                                    onClick={() => setIntervaloAtendimento(min)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${intervaloAtendimento === min
                                        ? 'bg-[#D99773]/20 text-[#D99773] border border-[#D99773]/30'
                                        : 'border hover:opacity-80'
                                        }`}
                                    style={intervaloAtendimento !== min ? { color: 'var(--text-muted)', borderColor: 'var(--border-default)' } : {}}
                                >
                                    {min === 0 ? 'Sem intervalo' : `${min} min`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Antecedência mínima */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Antecedência mínima para agendar</p>
                        <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={antecedenciaMinima} onChange={(e) => setAntecedenciaMinima(e.target.value)} placeholder="Ex: Pelo menos 2 horas antes, ou só para o dia seguinte" />
                    </div>
                </div>
            </div>

            {/* ============ 8. PROMOÇÕES ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Tag size={15} className="text-[#D99773]" />
                        Promoções
                    </h3>
                    {!novaPromo && (
                        <button onClick={() => { setNovaPromo(true); setEditandoPromo(null); setFormPromo({ nome: '', descricao: '', instrucaoIara: '', tipoDesconto: 'percentual', valorDesconto: 0, dataInicio: '', dataFim: '', procedimentoIds: [] }) }} className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5">
                            <Plus size={12} /> Nova Promoção
                        </button>
                    )}
                </div>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Cadastre promoções com período e a IARA divulga automaticamente durante a vigência</p>

                {novaPromo && (
                    <div className="p-4 rounded-xl mb-4 space-y-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{editandoPromo ? 'Editar' : 'Nova'} Promoção</p>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Nome da Promoção</label>
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formPromo.nome} onChange={e => setFormPromo({ ...formPromo, nome: e.target.value })} placeholder="Ex: Abril da Micropigmentação" />
                        </div>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Procedimentos na promoção</label>
                            <div className="flex flex-wrap gap-2">
                                {procedimentos.map(p => (
                                    <button key={p.id} onClick={() => {
                                        const ids = formPromo.procedimentoIds.includes(p.id) ? formPromo.procedimentoIds.filter(id => id !== p.id) : [...formPromo.procedimentoIds, p.id]
                                        setFormPromo({ ...formPromo, procedimentoIds: ids })
                                    }} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${formPromo.procedimentoIds.includes(p.id) ? 'bg-[#D99773]/20 text-[#D99773] border border-[#D99773]/30' : 'border hover:opacity-80'}`} style={!formPromo.procedimentoIds.includes(p.id) ? { color: 'var(--text-muted)', borderColor: 'var(--border-default)' } : {}}>
                                        {p.nome} — R$ {p.valor}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Tipo</label>
                                <select className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formPromo.tipoDesconto} onChange={e => setFormPromo({ ...formPromo, tipoDesconto: e.target.value })}>
                                    <option value="percentual">Desconto %</option>
                                    <option value="valor_fixo">Valor fixo (R$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>{formPromo.tipoDesconto === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
                                <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formPromo.valorDesconto || ''} onChange={e => setFormPromo({ ...formPromo, valorDesconto: Number(e.target.value) })} placeholder="20" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Início</label>
                                <input type="date" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formPromo.dataInicio} onChange={e => setFormPromo({ ...formPromo, dataInicio: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Fim</label>
                                <input type="date" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formPromo.dataFim} onChange={e => setFormPromo({ ...formPromo, dataFim: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Descrição da promoção</label>
                            <textarea className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-16" style={innerInputStyle} value={formPromo.descricao} onChange={e => setFormPromo({ ...formPromo, descricao: e.target.value })} placeholder="Ex: Mês da Micropigmentação! 20% de desconto em todos os procedimentos de micro..." />
                        </div>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Como a IARA deve agir</label>
                            <textarea className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-16" style={innerInputStyle} value={formPromo.instrucaoIara} onChange={e => setFormPromo({ ...formPromo, instrucaoIara: e.target.value })} placeholder="Ex: Quando a cliente perguntar sobre micro, falar que estamos com promoção especial. Criar urgência mencionando que são poucas vagas..." />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={salvarPromo} disabled={savingPromo} className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                                {savingPromo ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                            </button>
                            <button onClick={() => { setNovaPromo(false); setEditandoPromo(null) }} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {promocoes.length === 0 && !novaPromo ? (
                        <div className="text-center py-6"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma promoção ativa</p></div>
                    ) : (
                        promocoes.map(p => {
                            const hoje = new Date().toISOString().split('T')[0]
                            const ativa = p.dataInicio <= hoje && p.dataFim >= hoje
                            const procsNomes = procedimentos.filter(pr => p.procedimentos.some(pp => pp.procedimentoId === pr.id)).map(pr => pr.nome)
                            return (
                                <div key={p.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.nome}</p>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${ativa ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'}`}>
                                                    {ativa ? '🟢 Ativa' : '⏳ Agendada'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                {p.tipoDesconto === 'percentual' ? `${p.valorDesconto}% off` : `R$ ${p.valorDesconto} off`} • {new Date(p.dataInicio).toLocaleDateString('pt-BR')} a {new Date(p.dataFim).toLocaleDateString('pt-BR')}
                                            </p>
                                            {procsNomes.length > 0 && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>📋 {procsNomes.join(', ')}</p>}
                                        </div>
                                        <button onClick={() => excluirPromo(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ============ 9. COMBOS ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Package size={15} className="text-[#D99773]" />
                        Combos / Pacotes
                    </h3>
                    {!novoCombo && (
                        <button onClick={() => { setNovoCombo(true); setEditandoCombo(null); setFormCombo({ nome: '', descricao: '', valorCombo: 0, procedimentoIds: [] }) }} className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5">
                            <Plus size={12} /> Novo Combo
                        </button>
                    )}
                </div>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Monte pacotes com vários procedimentos e a IARA oferece para as clientes</p>

                {novoCombo && (
                    <div className="p-4 rounded-xl mb-4 space-y-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{editandoCombo ? 'Editar' : 'Novo'} Combo</p>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Nome do Combo</label>
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCombo.nome} onChange={e => setFormCombo({ ...formCombo, nome: e.target.value })} placeholder="Ex: Pacote Noiva Completa" />
                        </div>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Selecione os procedimentos</label>
                            <div className="flex flex-wrap gap-2">
                                {procedimentos.map(p => (
                                    <button key={p.id} onClick={() => {
                                        const ids = formCombo.procedimentoIds.includes(p.id) ? formCombo.procedimentoIds.filter(id => id !== p.id) : [...formCombo.procedimentoIds, p.id]
                                        setFormCombo({ ...formCombo, procedimentoIds: ids })
                                    }} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${formCombo.procedimentoIds.includes(p.id) ? 'bg-[#D99773]/20 text-[#D99773] border border-[#D99773]/30' : 'border hover:opacity-80'}`} style={!formCombo.procedimentoIds.includes(p.id) ? { color: 'var(--text-muted)', borderColor: 'var(--border-default)' } : {}}>
                                        {p.nome} — R$ {p.valor}
                                    </button>
                                ))}
                            </div>
                            {formCombo.procedimentoIds.length > 0 && (
                                <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                                    💰 Valor individual: R$ {procedimentos.filter(p => formCombo.procedimentoIds.includes(p.id)).reduce((s, p) => s + p.valor, 0).toFixed(2)}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Valor do Combo (R$)</label>
                                <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formCombo.valorCombo || ''} onChange={e => setFormCombo({ ...formCombo, valorCombo: Number(e.target.value) })} placeholder="1.200" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Descrição do combo</label>
                            <textarea className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-16" style={innerInputStyle} value={formCombo.descricao} onChange={e => setFormCombo({ ...formCombo, descricao: e.target.value })} placeholder="Ex: Pacote completo para noivas com limpeza de pele, design de sobrancelhas e micropigmentação labial..." />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={salvarCombo} disabled={savingCombo} className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                                {savingCombo ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                            </button>
                            <button onClick={() => { setNovoCombo(false); setEditandoCombo(null) }} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {combos.length === 0 && !novoCombo ? (
                        <div className="text-center py-6"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum combo cadastrado</p></div>
                    ) : (
                        combos.map(c => {
                            const procsNomes = procedimentos.filter(p => c.procedimentos.some(cp => cp.procedimentoId === p.id)).map(p => p.nome)
                            const economia = c.valorOriginal - c.valorCombo
                            return (
                                <div key={c.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.nome}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] line-through" style={{ color: 'var(--text-muted)' }}>R$ {c.valorOriginal}</span>
                                                <span className="text-[11px] font-semibold" style={{ color: '#0F4C61' }}>R$ {c.valorCombo}</span>
                                                {economia > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">Economia R$ {economia.toFixed(0)}</span>}
                                            </div>
                                            {procsNomes.length > 0 && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>📋 {procsNomes.join(' + ')}</p>}
                                        </div>
                                        <button onClick={() => excluirCombo(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ============ 10. PERSONALIZAÇÃO VIP ============ */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Heart size={15} className="text-[#D99773]" />
                    Personalização VIP
                </h3>
                <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Quanto mais detalhes, mais inteligente e personalizada a IARA fica para sua clínica</p>

                <div className="space-y-4">
                    {/* Mensagem de boas-vindas */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare size={13} className="text-[#D99773]" />
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Mensagem de Boas-Vindas</p>
                        </div>
                        <textarea className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-16" style={innerInputStyle} value={mensagemBoasVindas} onChange={e => setMensagemBoasVindas(e.target.value)} placeholder="Ex: Oi! 😊 Que bom te ver por aqui! Sou a IARA, assistente da [clínica]. Como posso te ajudar hoje?" />
                    </div>

                    {/* Localização — link Maps (endereço já está na seção Clínica) */}

                    {/* Formas de pagamento */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard size={13} className="text-[#D99773]" />
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Formas de Pagamento</p>
                        </div>
                        <div className="flex flex-wrap gap-3 mb-2">
                            {(['pix', 'cartao', 'dinheiro'] as const).map(forma => (
                                <label key={forma} className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={formasPagamento[forma]} onChange={e => setFormasPagamento({ ...formasPagamento, [forma]: e.target.checked })} className="rounded" />
                                    <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>
                                        {forma === 'pix' ? '💠 PIX' : forma === 'cartao' ? '💳 Cartão' : '💵 Dinheiro'}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {formasPagamento.pix && (
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none mb-2" style={innerInputStyle} value={formasPagamento.chavePix} onChange={e => setFormasPagamento({ ...formasPagamento, chavePix: e.target.value })} placeholder="Chave PIX (CPF, CNPJ, email ou telefone)" />
                        )}
                        <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={formasPagamento.observacoes} onChange={e => setFormasPagamento({ ...formasPagamento, observacoes: e.target.value })} placeholder="Observações: Ex: aceitamos cartão em até 6x sem juros" />
                    </div>

                    {/* Redes sociais */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Instagram size={13} className="text-[#D99773]" />
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Redes Sociais</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={redesSociais.instagram} onChange={e => setRedesSociais({ ...redesSociais, instagram: e.target.value })} placeholder="@instagram" />
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={redesSociais.tiktok} onChange={e => setRedesSociais({ ...redesSociais, tiktok: e.target.value })} placeholder="@tiktok" />
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={redesSociais.facebook} onChange={e => setRedesSociais({ ...redesSociais, facebook: e.target.value })} placeholder="Facebook" />
                            <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={innerInputStyle} value={redesSociais.site} onChange={e => setRedesSociais({ ...redesSociais, site: e.target.value })} placeholder="www.seusite.com.br" />
                        </div>
                    </div>

                    {/* Política de cancelamento */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck size={13} className="text-[#D99773]" />
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Política de Cancelamento</p>
                        </div>
                        <textarea className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-20" style={innerInputStyle} value={politicaCancelamento} onChange={e => setPoliticaCancelamento(e.target.value)} placeholder="Ex: Cancelamentos devem ser feitos com 24h de antecedência. Reagendamentos sem custo. No-show será cobrado 50% do valor..." />
                    </div>

                    {/* Orientações pós-procedimento */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Heart size={13} className="text-[#D99773]" />
                            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Orientações Pós-Procedimento</p>
                        </div>
                        <div className="p-2 rounded-lg mb-2 bg-amber-500/10">
                            <p className="text-[9px] font-medium text-amber-600">⚠️ A IARA NÃO faz diagnósticos e NÃO receita nada. Se a cliente perguntar sobre cuidados pós, a IARA encaminha para a Dra responder diretamente.</p>
                        </div>
                        <textarea className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none resize-none h-20" style={innerInputStyle} value={cuidadosPos} onChange={e => setCuidadosPos(e.target.value)} placeholder="Ex: Orientações gerais que a Dra autoriza a IARA compartilhar (como 'evitar sol nas primeiras 24h'). Para dúvidas clínicas, a IARA sempre consulta a Dra." />
                    </div>

                    {/* FAQ Personalizado */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <HelpCircle size={13} className="text-[#D99773]" />
                                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>FAQ — Perguntas Frequentes ({faq.length})</p>
                            </div>
                            <button onClick={addFaq} className="text-[10px] px-2 py-1 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1"><Plus size={10} /> Adicionar</button>
                        </div>
                        <p className="text-[9px] mb-2" style={{ color: 'var(--text-muted)' }}>Cadastre perguntas que suas clientes sempre fazem e a IARA responde automaticamente</p>
                        <div className="space-y-2">
                            {faq.map((item, i) => (
                                <div key={i} className="p-2 rounded-lg space-y-1" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 space-y-1">
                                            <input className="w-full px-2 py-1.5 text-[11px] rounded-lg focus:outline-none" style={innerInputStyle} value={item.pergunta} onChange={e => updateFaq(i, 'pergunta', e.target.value)} placeholder="Ex: Quanto tempo dura a micropigmentação?" />
                                            <input className="w-full px-2 py-1.5 text-[11px] rounded-lg focus:outline-none" style={innerInputStyle} value={item.resposta} onChange={e => updateFaq(i, 'resposta', e.target.value)} placeholder="Ex: Em média de 1 a 2 anos, dependendo do tipo de pele e cuidados..." />
                                        </div>
                                        <button onClick={() => removeFaq(i)} className="p-1 rounded hover:bg-red-500/10" style={{ color: 'var(--text-muted)' }}><Trash2 size={11} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ BOTÃO SALVAR TUDO ============ */}
            <button
                onClick={salvarClinica}
                disabled={saving}
                className="w-full py-3 bg-[#0F4C61] text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#0F4C61]/90 transition-colors disabled:opacity-50"
            >
                {saving ? (
                    <><Loader2 size={16} className="animate-spin" /> Salvando...</>
                ) : saved ? (
                    <><Check size={16} /> Salvo com sucesso!</>
                ) : (
                    <><Save size={16} /> Salvar Todas as Configurações</>
                )}
            </button>
        </div>
    )
}
