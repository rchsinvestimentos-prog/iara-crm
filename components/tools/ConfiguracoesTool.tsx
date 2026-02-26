'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Phone, Award, Save, Plus, Trash2, Edit3, QrCode, RefreshCw, Wifi, WifiOff, Loader2, Check } from 'lucide-react'

interface Procedimento {
    id: string
    nome: string
    valor: number
    desconto: number
    parcelas: string | null
    duracao: string | null
}

interface ClinicaData {
    nome: string
    nomeIA: string
    whatsappClinica: string | null
    whatsappPessoal: string | null
    diferenciais: string | null
    whatsappStatus: string
    instanceName: string | null
    procedimentos: Procedimento[]
}

export default function ConfiguracoesTool() {
    const [clinica, setClinica] = useState<ClinicaData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Form fields
    const [nomeClinica, setNomeClinica] = useState('')
    const [nomeIA, setNomeIA] = useState('')
    const [whatsappClinica, setWhatsappClinica] = useState('')
    const [whatsappPessoal, setWhatsappPessoal] = useState('')
    const [diferenciais, setDiferenciais] = useState('')

    // Procedimentos
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
    const [editando, setEditando] = useState<string | null>(null)
    const [novoProc, setNovoProc] = useState(false)
    const [formProc, setFormProc] = useState<Procedimento>({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' })
    const [savingProc, setSavingProc] = useState(false)

    // Load data
    const loadData = useCallback(async () => {
        try {
            const [clinicaRes, procRes] = await Promise.all([
                fetch('/api/clinica'),
                fetch('/api/procedimentos'),
            ])

            if (clinicaRes.ok) {
                const data = await clinicaRes.json()
                setClinica(data)
                setNomeClinica(data.nome || '')
                setNomeIA(data.nomeIA || 'IARA')
                setWhatsappClinica(data.whatsappClinica || '')
                setWhatsappPessoal(data.whatsappPessoal || '')
                setDiferenciais(data.diferenciais || '')
            }

            if (procRes.ok) {
                setProcedimentos(await procRes.json())
            }
        } catch (err) {
            console.error('Erro ao carregar configurações:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    // Salvar dados da clínica
    const salvarClinica = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const res = await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: nomeClinica,
                    nomeIA,
                    whatsappClinica: whatsappClinica || null,
                    whatsappPessoal: whatsappPessoal || null,
                    diferenciais: diferenciais || null,
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

    // Salvar procedimento (criar ou editar)
    const salvarProc = async () => {
        if (!formProc.nome.trim()) return
        setSavingProc(true)
        try {
            const method = editando ? 'PUT' : 'POST'
            const body = editando
                ? { id: editando, nome: formProc.nome, valor: formProc.valor, desconto: formProc.desconto, parcelas: formProc.parcelas || null, duracao: formProc.duracao || null }
                : { nome: formProc.nome, valor: formProc.valor, desconto: formProc.desconto, parcelas: formProc.parcelas || null, duracao: formProc.duracao || null }

            const res = await fetch('/api/procedimentos', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                // Reload procedimentos
                const procRes = await fetch('/api/procedimentos')
                if (procRes.ok) setProcedimentos(await procRes.json())
                setEditando(null)
                setNovoProc(false)
                setFormProc({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' })
            }
        } catch (err) {
            console.error('Erro ao salvar procedimento:', err)
        } finally {
            setSavingProc(false)
        }
    }

    // Excluir procedimento
    const excluirProc = async (id: string) => {
        try {
            const res = await fetch(`/api/procedimentos?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                setProcedimentos(prev => prev.filter(p => p.id !== id))
            }
        } catch (err) {
            console.error('Erro ao excluir:', err)
        }
    }

    const editarProc = (p: Procedimento) => {
        setEditando(p.id)
        setFormProc({ ...p, parcelas: p.parcelas || '', duracao: p.duracao || '' })
        setNovoProc(true)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#D99773]" />
                <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando configurações...</span>
            </div>
        )
    }

    const statusWhatsApp = clinica?.whatsappStatus || 'desconectado'

    return (
        <div className="space-y-6">
            {/* Dados da Clínica */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Building2 size={15} className="text-[#D99773]" />
                    Dados da Clínica
                </h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Nome da Clínica</label>
                            <input className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Nome da IA</label>
                            <input className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={nomeIA} onChange={(e) => setNomeIA(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>WhatsApp da Clínica</label>
                            <input className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={whatsappClinica} onChange={(e) => setWhatsappClinica(e.target.value)} placeholder="41999999999" />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>WhatsApp Pessoal (Dra)</label>
                            <input className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={whatsappPessoal} onChange={(e) => setWhatsappPessoal(e.target.value)} placeholder="41988888888" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Status WhatsApp */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
                    <Phone size={15} className="text-[#D99773]" />
                    Conexão WhatsApp
                </h3>
                <div className={`flex items-center justify-between p-4 rounded-xl ${statusWhatsApp === 'conectado' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="flex items-center gap-3">
                        {statusWhatsApp === 'conectado' ? (
                            <Wifi size={18} className="text-green-500" />
                        ) : (
                            <WifiOff size={18} className="text-red-500" />
                        )}
                        <div>
                            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {statusWhatsApp === 'conectado' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {statusWhatsApp === 'conectado' ? `Instância: ${clinica?.instanceName || '—'}` : 'Escaneie o QR Code para reconectar'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {statusWhatsApp === 'desconectado' && (
                            <button className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5">
                                <QrCode size={12} /> QR Code
                            </button>
                        )}
                        <button className="text-[11px] font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                            <RefreshCw size={12} /> {statusWhatsApp === 'conectado' ? 'Testar' : 'Reconectar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Diferenciais */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                    <Award size={15} className="text-[#D99773]" />
                    Diferenciais da Clínica
                </h3>
                <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>A IARA usa esses diferenciais para convencer as clientes a agendarem</p>
                <textarea
                    className="w-full px-3 py-2 text-[13px] rounded-xl focus:outline-none transition-colors resize-none h-24"
                    style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    value={diferenciais}
                    onChange={(e) => setDiferenciais(e.target.value)}
                    placeholder="Ex: 10 anos de experiência, especialização internacional, uso de tecnologia exclusiva..."
                />
            </div>

            {/* Procedimentos CRUD */}
            <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>💉 Procedimentos ({procedimentos.length})</h3>
                    <button
                        onClick={() => { setNovoProc(true); setEditando(null); setFormProc({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' }) }}
                        className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5"
                    >
                        <Plus size={12} /> Adicionar
                    </button>
                </div>

                {/* Form novo/editar */}
                {novoProc && (
                    <div className="p-4 rounded-xl mb-4 space-y-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{editando ? 'Editar' : 'Novo'} Procedimento</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Nome</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={formProc.nome} onChange={(e) => setFormProc({ ...formProc, nome: e.target.value })} placeholder="Ex: Micropigmentação Sobrancelhas" />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
                                <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={formProc.valor || ''} onChange={(e) => setFormProc({ ...formProc, valor: Number(e.target.value) })} placeholder="497" />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Duração</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={formProc.duracao || ''} onChange={(e) => setFormProc({ ...formProc, duracao: e.target.value })} placeholder="1h30" />
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Desconto máx. (%)</label>
                                <select className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={formProc.desconto} onChange={(e) => setFormProc({ ...formProc, desconto: Number(e.target.value) })}>
                                    <option value={0}>Sem desconto</option>
                                    <option value={10}>10%</option>
                                    <option value={20}>20%</option>
                                    <option value={30}>30%</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Parcelas</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} value={formProc.parcelas || ''} onChange={(e) => setFormProc({ ...formProc, parcelas: e.target.value })} placeholder="3x sem juros" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={salvarProc} disabled={savingProc} className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                                {savingProc ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                            </button>
                            <button onClick={() => { setNovoProc(false); setEditando(null) }} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista */}
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

            {/* Salvar Todas */}
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
