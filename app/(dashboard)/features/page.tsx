'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2, ChevronDown, ChevronUp, Save, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Feature {
    id: string
    nome: string
    descricao: string
    emoji: string
    habilitado: boolean
    config: Record<string, any>
}

const FEATURES_DEFAULT: Feature[] = [
    {
        id: 'horario_atendimento',
        nome: 'Horário de Atendimento',
        descricao: 'A IARA só responde dentro do horário configurado. Fora dele, envia uma mensagem automática.',
        emoji: '⏰',
        habilitado: true,
        config: { horarioInicio: '08:00', horarioFim: '20:00', diasAtendimento: [1, 2, 3, 4, 5], mensagemForaHorario: '' },
    },
    {
        id: 'blacklist',
        nome: 'Números Bloqueados',
        descricao: 'A IARA ignora completamente mensagens desses números.',
        emoji: '🚫',
        habilitado: false,
        config: { numeros: '' },
    },
    {
        id: 'aniversario',
        nome: 'Mensagem de Aniversário',
        descricao: 'Envia parabéns automaticamente para clientes do CRM. Use tags "aniv_DD/MM" nos contatos.',
        emoji: '🎂',
        habilitado: true,
        config: { mensagemAniversario: '' },
    },
    {
        id: 'lembrete_consulta',
        nome: 'Lembrete Pré-Consulta',
        descricao: 'Envia WhatsApp 24h antes do agendamento confirmado.',
        emoji: '📅',
        habilitado: true,
        config: {},
    },
    {
        id: 'nps',
        nome: 'Avaliação Pós-Atendimento (NPS)',
        descricao: 'Pede avaliação de 0-10 e link do Google Review após cada atendimento.',
        emoji: '⭐',
        habilitado: true,
        config: {},
    },
    {
        id: 'relatorio_mensal',
        nome: 'Relatório Mensal',
        descricao: 'Envia resumo do mês via WhatsApp todo dia 1: mensagens, agendamentos, ROI.',
        emoji: '📊',
        habilitado: true,
        config: {},
    },
    {
        id: 'multilingue',
        nome: 'Modo Multilíngue',
        descricao: 'A IARA detecta automaticamente o idioma da cliente (EN, ES, FR, IT) e responde no mesmo idioma.',
        emoji: '🌍',
        habilitado: true,
        config: {},
    },
    {
        id: 'indicacoes',
        nome: 'Programa de Indicação',
        descricao: 'Clientes ganham 10% de comissão por indicações ativas. Saque via Pix.',
        emoji: '🎁',
        habilitado: true,
        config: {},
    },
    {
        id: 'modo_ferias',
        nome: 'Modo Férias',
        descricao: 'Pausa a IARA até uma data de retorno. Envia mensagem automática durante as férias.',
        emoji: '🌴',
        habilitado: true,
        config: {},
    },
    {
        id: 'funil_vendas',
        nome: 'Funil de Vendas',
        descricao: 'Visualize taxas de conversão entre etapas do CRM com barras visuais.',
        emoji: '📈',
        habilitado: true,
        config: {},
    },
    {
        id: 'historico_creditos',
        nome: 'Histórico de Créditos',
        descricao: 'Veja um histórico detalhado de todos os créditos usados e recarregados.',
        emoji: '💳',
        habilitado: true,
        config: {},
    },
    {
        id: 'templates_whatsapp',
        nome: 'Templates de Mensagem',
        descricao: 'Mensagens pré-prontas que você pode disparar com 1 clique.',
        emoji: '📝',
        habilitado: false,
        config: { templates: [] },
    },
    {
        id: 'agenda_visual',
        nome: 'Agenda Visual',
        descricao: 'Calendário visual com todos os agendamentos do mês.',
        emoji: '🗓',
        habilitado: false,
        config: {},
    },
]

export default function FeaturesPage() {
    const [features, setFeatures] = useState<Feature[]>(FEATURES_DEFAULT)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const loadFeatures = useCallback(async () => {
        try {
            const res = await fetch('/api/features')
            if (res.ok) {
                const data = await res.json()
                if (data.features) {
                    // Merge saved features com defaults
                    setFeatures(FEATURES_DEFAULT.map(def => {
                        const saved = data.features.find((f: any) => f.id === def.id)
                        if (saved) return { ...def, habilitado: saved.habilitado, config: { ...def.config, ...saved.config } }
                        return def
                    }))
                }
            }
        } catch { /* use defaults */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { loadFeatures() }, [loadFeatures])

    const toggleFeature = (id: string) => {
        setFeatures(prev => prev.map(f => f.id === id ? { ...f, habilitado: !f.habilitado } : f))
    }

    const updateConfig = (id: string, key: string, value: any) => {
        setFeatures(prev => prev.map(f => f.id === id ? { ...f, config: { ...f.config, [key]: value } } : f))
    }

    const salvar = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features: features.map(f => ({ id: f.id, habilitado: f.habilitado, config: f.config })) }),
            })
            if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
        } catch { /* */ }
        finally { setSaving(false) }
    }

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }
    const inputClass = 'w-full px-3 py-2 text-[12px] rounded-xl focus:outline-none'
    const inputStyle = { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    return (
        <div className="max-w-3xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 rounded-xl transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                            Features ⚡
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            Habilite, desabilite e personalize cada funcionalidade
                        </p>
                    </div>
                </div>
                <button onClick={salvar} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: saved ? '#06D6A0' : 'linear-gradient(135deg, #D99773, #C17A50)', color: 'white' }}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <><CheckCircle2 size={14} /> Salvo!</> : <><Save size={14} /> Salvar</>}
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl p-4" style={cardStyle}>
                    <p className="text-[28px] font-bold" style={{ color: '#06D6A0' }}>{features.filter(f => f.habilitado).length}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Features ativas</p>
                </div>
                <div className="rounded-xl p-4" style={cardStyle}>
                    <p className="text-[28px] font-bold" style={{ color: 'var(--text-muted)' }}>{features.filter(f => !f.habilitado).length}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Features desativadas</p>
                </div>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3">
                {features.map(feature => (
                    <div key={feature.id} className="rounded-2xl overflow-hidden transition-all" style={cardStyle}>
                        {/* Feature header */}
                        <div className="flex items-center gap-3 px-4 py-3.5">
                            <span className="text-xl">{feature.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{feature.nome}</p>
                                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{feature.descricao}</p>
                            </div>

                            {/* Expand for config */}
                            {hasConfig(feature.id) && (
                                <button onClick={() => setExpandedId(expandedId === feature.id ? null : feature.id)}
                                    className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}>
                                    {expandedId === feature.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            )}

                            {/* Toggle */}
                            <button onClick={() => toggleFeature(feature.id)}
                                className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                                style={{ backgroundColor: feature.habilitado ? '#06D6A0' : 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm"
                                    style={{
                                        left: feature.habilitado ? '20px' : '2px',
                                        backgroundColor: feature.habilitado ? 'white' : 'var(--text-muted)',
                                    }} />
                            </button>
                        </div>

                        {/* Expanded config */}
                        {expandedId === feature.id && feature.habilitado && (
                            <div className="px-4 pb-4 pt-1 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                {renderConfig(feature, updateConfig, inputClass, inputStyle)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function hasConfig(id: string): boolean {
    return ['horario_atendimento', 'blacklist', 'aniversario', 'templates_whatsapp'].includes(id)
}

function renderConfig(feature: Feature, update: (id: string, key: string, value: any) => void, inputClass: string, inputStyle: any) {
    const { id, config } = feature
    const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    if (id === 'horario_atendimento') {
        return (
            <>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Início</label>
                        <input type="time" value={config.horarioInicio || '08:00'} onChange={e => update(id, 'horarioInicio', e.target.value)} className={inputClass} style={inputStyle} />
                    </div>
                    <div>
                        <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Fim</label>
                        <input type="time" value={config.horarioFim || '20:00'} onChange={e => update(id, 'horarioFim', e.target.value)} className={inputClass} style={inputStyle} />
                    </div>
                </div>
                <div>
                    <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Dias</label>
                    <div className="flex gap-1">
                        {DIAS.map((dia, i) => (
                            <button key={i} onClick={() => {
                                const dias = config.diasAtendimento || [1, 2, 3, 4, 5]
                                update(id, 'diasAtendimento', dias.includes(i) ? dias.filter((d: number) => d !== i) : [...dias, i])
                            }}
                                className="px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                                style={{
                                    backgroundColor: (config.diasAtendimento || [1, 2, 3, 4, 5]).includes(i) ? '#D99773' : 'var(--bg-subtle)',
                                    color: (config.diasAtendimento || [1, 2, 3, 4, 5]).includes(i) ? 'white' : 'var(--text-muted)',
                                    border: `1px solid ${(config.diasAtendimento || [1, 2, 3, 4, 5]).includes(i) ? '#D99773' : 'var(--border-default)'}`,
                                }}>
                                {dia}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Mensagem fora do horário</label>
                    <textarea value={config.mensagemForaHorario || ''} onChange={e => update(id, 'mensagemForaHorario', e.target.value)} rows={2}
                        className={`${inputClass} resize-none`} style={inputStyle}
                        placeholder="Olá! Nosso horário de atendimento é de seg-sex das 08h às 20h. Retornaremos em breve! 😊" />
                </div>
            </>
        )
    }

    if (id === 'blacklist') {
        return (
            <div>
                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>Números bloqueados (um por linha)</label>
                <textarea value={config.numeros || ''} onChange={e => update(id, 'numeros', e.target.value)} rows={3}
                    className={`${inputClass} resize-none`} style={inputStyle}
                    placeholder="5511999998888&#10;5521988887777" />
                {(config.numeros || '').trim() && (
                    <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {(config.numeros || '').split('\n').filter((n: string) => n.trim()).length} número(s) bloqueado(s)
                    </p>
                )}
            </div>
        )
    }

    if (id === 'aniversario') {
        return (
            <div>
                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Mensagem personalizada (use {'{nome}'} e {'{clinica}'})
                </label>
                <textarea value={config.mensagemAniversario || ''} onChange={e => update(id, 'mensagemAniversario', e.target.value)} rows={4}
                    className={`${inputClass} resize-none`} style={inputStyle}
                    placeholder="🎂 Parabéns, {nome}!!! 🎉 Aqui é da {clinica}. Que esse dia seja maravilhoso! 💜" />
            </div>
        )
    }

    if (id === 'templates_whatsapp') {
        const templates: string[] = config.templates || []
        return (
            <div>
                <label className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Mensagens pré-prontas (uma por linha)
                </label>
                <textarea value={templates.join('\n')} onChange={e => update(id, 'templates', e.target.value.split('\n'))} rows={5}
                    className={`${inputClass} resize-none`} style={inputStyle}
                    placeholder="Olá! Gostaria de agendar uma avaliação?&#10;Não esqueça do seu retorno! 💜&#10;Temos uma promoção especial esse mês! 🎉" />
                <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {templates.filter(t => t.trim()).length} template(s) cadastrado(s)
                </p>
            </div>
        )
    }

    return null
}
