'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Clock, Phone, Settings, CalendarDays, Link2, ExternalLink, CheckCircle2, XCircle, Plus, User, X, Filter } from 'lucide-react'

interface Profissional {
    id: string
    nome: string
    especialidade: string | null
    fotoUrl: string | null
}

interface Agendamento {
    id: string
    nomePaciente: string
    telefone: string
    procedimento: string
    data: string
    horario: string
    duracao: number
    status: string
    origem: string
    observacao: string | null
    profissional: Profissional
    profissionalId: string
}

interface AgendaConfig {
    horarioSemana: string
    almocoSemana: string
    atendeSabado: boolean
    horarioSabado: string
    almocoSabado: string
    atendeDomingo: boolean
    horarioDomingo: string
    almocoDomingo: string
    atendeFeriado: boolean
    horarioFeriado: string
    almocoFeriado: string
    intervaloAtendimento: number
    googleCalendarToken: string | null
    googleCalendarId: string | null
}

type ViewMode = 'mensal' | 'semanal' | 'diario'

const STATUS_CORES: Record<string, string> = {
    confirmado: '#06D6A0',
    pendente: '#EAB308',
    cancelado: '#EF4444',
    realizado: '#3B82F6',
    reagendado: '#A855F7',
    noshow: '#6B7280',
}

const STATUS_LABELS: Record<string, string> = {
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    realizado: 'Realizado',
    cancelado: 'Cancelado',
    reagendado: 'Reagendado',
    noshow: 'Não compareceu',
}

const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }

export default function AgendaPage() {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
    const [profissionais, setProfissionais] = useState<Profissional[]>([])
    const [loading, setLoading] = useState(true)
    const [mesAtual, setMesAtual] = useState(new Date())
    const [diaSelecionado, setDiaSelecionado] = useState(new Date())
    const [viewMode, setViewMode] = useState<ViewMode>('mensal')
    const [filtroProf, setFiltroProf] = useState<string>('todos')
    const [configAberta, setConfigAberta] = useState(false)
    const [modalAberto, setModalAberto] = useState(false)
    const [config, setConfig] = useState<AgendaConfig>({
        horarioSemana: '08:00 às 18:00',
        almocoSemana: '12:00 às 13:00',
        atendeSabado: false,
        horarioSabado: '08:00 às 12:00',
        almocoSabado: '',
        atendeDomingo: false,
        horarioDomingo: '',
        almocoDomingo: '',
        atendeFeriado: false,
        horarioFeriado: '',
        almocoFeriado: '',
        intervaloAtendimento: 15,
        googleCalendarToken: null,
        googleCalendarId: null,
    })
    const [savingConfig, setSavingConfig] = useState(false)

    // Fetch profissionais
    useEffect(() => {
        fetch('/api/profissionais')
            .then(r => r.json())
            .then(data => setProfissionais(data.profissionais || data || []))
            .catch(() => {})
    }, [])

    // Fetch agendamentos da nova API
    const fetchAgendamentos = useCallback(() => {
        const params = new URLSearchParams()
        if (filtroProf !== 'todos') params.set('profissionalId', filtroProf)

        // Busca o mês inteiro
        const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
        const fim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
        params.set('dataInicio', inicio.toISOString())
        params.set('dataFim', fim.toISOString())

        fetch(`/api/calendario?${params}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAgendamentos(data)
                } else {
                    setAgendamentos([])
                }
            })
            .catch(() => setAgendamentos([]))
            .finally(() => setLoading(false))
    }, [mesAtual, filtroProf])

    useEffect(() => {
        setLoading(true)
        fetchAgendamentos()
    }, [fetchAgendamentos])

    // Fetch clinica config
    useEffect(() => {
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                setConfig(prev => ({
                    ...prev,
                    horarioSemana: data.horarioSemana || prev.horarioSemana,
                    almocoSemana: data.almocoSemana || prev.almocoSemana,
                    atendeSabado: data.atendeSabado ?? prev.atendeSabado,
                    horarioSabado: data.horarioSabado || prev.horarioSabado,
                    almocoSabado: data.almocoSabado || prev.almocoSabado,
                    atendeDomingo: data.atendeDomingo ?? prev.atendeDomingo,
                    horarioDomingo: data.horarioDomingo || prev.horarioDomingo,
                    almocoDomingo: data.almocoDomingo || prev.almocoDomingo,
                    atendeFeriado: data.atendeFeriado ?? prev.atendeFeriado,
                    horarioFeriado: data.horarioFeriado || prev.horarioFeriado,
                    almocoFeriado: data.almocoFeriado || prev.almocoFeriado,
                    intervaloAtendimento: data.intervaloAtendimento ?? prev.intervaloAtendimento,
                    googleCalendarToken: data.googleCalendarToken || null,
                    googleCalendarId: data.googleCalendarId || null,
                }))
            })
            .catch(() => {})
    }, [])

    // Save config
    const salvarConfig = async () => {
        setSavingConfig(true)
        try {
            await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    horarioSemana: config.horarioSemana,
                    almocoSemana: config.almocoSemana,
                    atendeSabado: config.atendeSabado,
                    horarioSabado: config.horarioSabado,
                    almocoSabado: config.almocoSabado,
                    atendeDomingo: config.atendeDomingo,
                    horarioDomingo: config.horarioDomingo,
                    almocoDomingo: config.almocoDomingo,
                    atendeFeriado: config.atendeFeriado,
                    horarioFeriado: config.horarioFeriado,
                    almocoFeriado: config.almocoFeriado,
                    intervaloAtendimento: config.intervaloAtendimento,
                }),
            })
        } catch { }
        setSavingConfig(false)
    }

    // Mudar status do agendamento
    const mudarStatus = async (id: string, novoStatus: string) => {
        try {
            const res = await fetch('/api/calendario', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: novoStatus })
            })
            if (res.ok) {
                const atualizado = await res.json()
                setAgendamentos(prev => prev.map(a => a.id === id ? atualizado : a))
            }
        } catch { }
    }

    // Calendar helpers
    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const primeiroDia = new Date(ano, mes, 1).getDay()
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    const hoje = new Date()
    const isHoje = (dia: number) => hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === dia
    const isDiaSel = (dia: number) => diaSelecionado.getFullYear() === ano && diaSelecionado.getMonth() === mes && diaSelecionado.getDate() === dia

    const getAgendDia = (date: Date) => {
        return agendamentos.filter(a => {
            const d = new Date(a.data)
            return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate()
        })
    }

    const getAgendDiaNum = (dia: number) => {
        return agendamentos.filter(a => {
            const d = new Date(a.data)
            return d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia
        })
    }

    const navMes = (dir: number) => {
        setMesAtual(new Date(ano, mes + dir, 1))
    }

    const selectDay = (dia: number) => {
        setDiaSelecionado(new Date(ano, mes, dia))
    }

    const getWeekDays = () => {
        const startOfWeek = new Date(diaSelecionado)
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek)
            d.setDate(d.getDate() + i)
            return d
        })
    }

    const agendDiaSel = getAgendDia(diaSelecionado)
    const googleConectado = !!config.googleCalendarToken

    // Build calendar grid
    const cells: (number | null)[] = []
    for (let i = 0; i < primeiroDia; i++) cells.push(null)
    for (let d = 1; d <= totalDias; d++) cells.push(d)

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    return (
        <div className="max-w-5xl animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Agenda 🗓</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {agendamentos.length} agendamento{agendamentos.length !== 1 ? 's' : ''} {filtroProf !== 'todos' ? `• ${profissionais.find(p => p.id === filtroProf)?.nome}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Botão Novo Agendamento */}
                    <button
                        onClick={() => setModalAberto(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:opacity-80"
                        style={{ backgroundColor: '#D99773', color: '#FFF' }}
                    >
                        <Plus size={14} /> Novo
                    </button>

                    {/* Filtro profissional */}
                    {profissionais.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-xl" style={cardStyle}>
                            <Filter size={12} style={{ color: 'var(--text-muted)' }} />
                            <select
                                value={filtroProf}
                                onChange={e => setFiltroProf(e.target.value)}
                                className="text-[11px] font-medium bg-transparent border-none outline-none cursor-pointer"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                <option value="todos">Todos</option>
                                {profissionais.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* View mode buttons */}
                    <div className="flex rounded-xl overflow-hidden" style={cardStyle}>
                        {(['mensal', 'semanal', 'diario'] as ViewMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className="px-3 py-1.5 text-[11px] font-semibold transition-all capitalize"
                                style={{
                                    backgroundColor: viewMode === mode ? '#D99773' : 'transparent',
                                    color: viewMode === mode ? '#FFF' : 'var(--text-muted)',
                                }}
                            >
                                {mode === 'diario' ? 'Diário' : mode === 'mensal' ? 'Mensal' : 'Semanal'}
                            </button>
                        ))}
                    </div>
                    {/* Month nav */}
                    <button onClick={() => navMes(-1)} className="p-2 rounded-xl transition-all hover:opacity-70" style={cardStyle}>
                        <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <span className="text-[13px] font-semibold px-2 capitalize min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>{nomeMes}</span>
                    <button onClick={() => navMes(1)} className="p-2 rounded-xl transition-all hover:opacity-70" style={cardStyle}>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid — Mensal */}
            {viewMode === 'mensal' && (
                <div className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
                    <div className="grid grid-cols-7">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                            <div key={d} className="text-center py-2 text-[11px] font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7">
                        {cells.map((dia, i) => {
                            if (dia === null) return <div key={`empty-${i}`} className="min-h-[80px]" style={{ borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }} />
                            const agendDia = getAgendDiaNum(dia)
                            const sel = isDiaSel(dia)
                            return (
                                <div
                                    key={dia}
                                    onClick={() => selectDay(dia)}
                                    className="min-h-[80px] p-1.5 relative transition-all cursor-pointer hover:opacity-80"
                                    style={{
                                        borderBottom: '1px solid var(--border-subtle)',
                                        borderRight: '1px solid var(--border-subtle)',
                                        backgroundColor: sel ? 'rgba(217,151,115,0.12)' : isHoje(dia) ? 'rgba(217,151,115,0.04)' : 'transparent',
                                    }}
                                >
                                    <p className={`text-[11px] font-medium mb-1 ${isHoje(dia) || sel ? 'text-[#D99773] font-bold' : ''}`}
                                        style={{ color: isHoje(dia) || sel ? '#D99773' : 'var(--text-muted)' }}>
                                        {dia}
                                    </p>
                                    {agendDia.slice(0, 3).map(ag => (
                                        <div key={ag.id} className="mb-0.5 px-1.5 py-0.5 rounded text-[9px] truncate"
                                            style={{ backgroundColor: `${STATUS_CORES[ag.status] || '#D99773'}15`, color: STATUS_CORES[ag.status] || '#D99773' }}>
                                            <span className="font-medium">{ag.horario}</span> {ag.nomePaciente.split(' ')[0]}
                                        </div>
                                    ))}
                                    {agendDia.length > 3 && (
                                        <p className="text-[8px] px-1" style={{ color: 'var(--text-muted)' }}>+{agendDia.length - 3} mais</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Calendar — Semanal */}
            {viewMode === 'semanal' && (
                <div className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
                    <div className="grid grid-cols-7">
                        {getWeekDays().map(d => {
                            const dayAgend = getAgendDia(d)
                            const isSel = d.toDateString() === diaSelecionado.toDateString()
                            const isToday = d.toDateString() === hoje.toDateString()
                            return (
                                <div
                                    key={d.toISOString()}
                                    onClick={() => setDiaSelecionado(d)}
                                    className="min-h-[120px] p-2 cursor-pointer transition-all hover:opacity-80"
                                    style={{
                                        borderRight: '1px solid var(--border-subtle)',
                                        backgroundColor: isSel ? 'rgba(217,151,115,0.12)' : isToday ? 'rgba(217,151,115,0.04)' : 'transparent',
                                    }}
                                >
                                    <p className={`text-[10px] font-semibold mb-1 ${isSel || isToday ? 'text-[#D99773]' : ''}`}
                                        style={{ color: isSel || isToday ? '#D99773' : 'var(--text-muted)' }}>
                                        {d.toLocaleDateString('pt-BR', { weekday: 'short' })} {d.getDate()}
                                    </p>
                                    {dayAgend.map(ag => (
                                        <div key={ag.id} className="mb-1 px-1.5 py-1 rounded text-[10px]"
                                            style={{ backgroundColor: `${STATUS_CORES[ag.status] || '#D99773'}15`, color: STATUS_CORES[ag.status] || '#D99773' }}>
                                            <span className="font-bold">{ag.horario}</span>
                                            <br />{ag.nomePaciente.split(' ')[0]}
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* View — Diário */}
            {viewMode === 'diario' && (
                <div className="rounded-2xl p-4 mb-6" style={cardStyle}>
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setDiaSelecionado(new Date(diaSelecionado.getFullYear(), diaSelecionado.getMonth(), diaSelecionado.getDate() - 1))}
                            className="p-2 rounded-xl hover:opacity-70" style={cardStyle}>
                            <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
                        </button>
                        <h3 className="text-[15px] font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                            {diaSelecionado.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </h3>
                        <button onClick={() => setDiaSelecionado(new Date(diaSelecionado.getFullYear(), diaSelecionado.getMonth(), diaSelecionado.getDate() + 1))}
                            className="p-2 rounded-xl hover:opacity-70" style={cardStyle}>
                            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </button>
                    </div>
                    {agendDiaSel.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-2xl mb-1">☀️</p>
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Nenhum agendamento neste dia</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {agendDiaSel.map(ag => (
                                <AgendamentoCard key={ag.id} ag={ag} onStatus={mudarStatus} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Agendamentos do dia selecionado (for mensal/semanal views) */}
            {viewMode !== 'diario' && (
                <div className="mb-6">
                    <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                        📋 {diaSelecionado.toDateString() === hoje.toDateString()
                            ? 'Agendamentos de Hoje'
                            : `Agendamentos — ${diaSelecionado.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`
                        }
                    </h3>
                    <div className="space-y-2">
                        {agendDiaSel.length === 0 ? (
                            <div className="rounded-xl p-4 text-center" style={cardStyle}>
                                <p className="text-2xl mb-1">☀️</p>
                                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                    Nenhum agendamento {diaSelecionado.toDateString() === hoje.toDateString() ? 'para hoje' : 'neste dia'}
                                </p>
                            </div>
                        ) : (
                            agendDiaSel.map(ag => <AgendamentoCard key={ag.id} ag={ag} onStatus={mudarStatus} />)
                        )}
                    </div>
                </div>
            )}

            {/* Legenda de status */}
            <div className="flex flex-wrap gap-3 mb-6 px-1">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_CORES[key] }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                ))}
            </div>

            {/* Google Calendar Status */}
            <div className="rounded-2xl p-4 mb-6" style={cardStyle}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: googleConectado ? 'rgba(6,214,160,0.1)' : 'rgba(239,68,68,0.1)' }}>
                        <CalendarDays size={20} style={{ color: googleConectado ? '#06D6A0' : '#EF4444' }} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Google Calendar</p>
                        {googleConectado ? (
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-green-400" />
                                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    Vinculado • Sync ativada
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <XCircle size={12} className="text-red-400" />
                                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                    Não conectado — Agenda funciona independente
                                </span>
                            </div>
                        )}
                    </div>
                    {!googleConectado && (
                        <a href="/instancias" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:opacity-80"
                            style={{ backgroundColor: '#D99773', color: '#FFF' }}>
                            <Link2 size={12} /> Conectar
                        </a>
                    )}
                    {googleConectado && (
                        <a href="/instancias" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:opacity-80" style={cardStyle}>
                            <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ color: 'var(--text-muted)' }}>Gerenciar</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Configurações da Agenda */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                <button onClick={() => setConfigAberta(!configAberta)} className="w-full flex items-center gap-3 p-4 transition-all hover:opacity-80">
                    <Settings size={18} style={{ color: '#D99773' }} />
                    <span className="text-[13px] font-semibold flex-1 text-left" style={{ color: 'var(--text-primary)' }}>Configurações da Agenda</span>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${configAberta ? 'rotate-90' : ''}`} style={{ color: 'var(--text-muted)' }} />
                </button>

                {configAberta && (
                    <div className="p-4 pt-0 space-y-4">
                        <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Horário de atendimento (Seg-Sex)</label>
                            <input type="text" value={config.horarioSemana} onChange={e => setConfig(p => ({ ...p, horarioSemana: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[13px]" style={{ ...cardStyle, color: 'var(--text-primary)' }} placeholder="Ex: 08:00 às 18:00" />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Horário de almoço (Seg-Sex)</label>
                            <input type="text" value={config.almocoSemana} onChange={e => setConfig(p => ({ ...p, almocoSemana: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[13px]" style={{ ...cardStyle, color: 'var(--text-primary)' }} placeholder="Ex: 12:00 às 13:00" />
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Intervalo entre atendimentos (min)</label>
                            <input type="number" value={config.intervaloAtendimento} onChange={e => setConfig(p => ({ ...p, intervaloAtendimento: Number(e.target.value) }))}
                                className="w-24 px-3 py-2 rounded-xl text-[13px]" style={{ ...cardStyle, color: 'var(--text-primary)' }} min={0} max={120} />
                        </div>

                        <div className="h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={config.atendeSabado} onChange={e => setConfig(p => ({ ...p, atendeSabado: e.target.checked }))} className="rounded accent-[#D99773]" />
                                <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Atende sábado</span>
                            </label>
                        </div>
                        {config.atendeSabado && (
                            <div className="ml-6"><input type="text" value={config.horarioSabado} onChange={e => setConfig(p => ({ ...p, horarioSabado: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[12px]" style={{ ...cardStyle, color: 'var(--text-primary)' }} placeholder="Horário do sábado" /></div>
                        )}

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={config.atendeDomingo} onChange={e => setConfig(p => ({ ...p, atendeDomingo: e.target.checked }))} className="rounded accent-[#D99773]" />
                                <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Atende domingo</span>
                            </label>
                        </div>
                        {config.atendeDomingo && (
                            <div className="ml-6"><input type="text" value={config.horarioDomingo} onChange={e => setConfig(p => ({ ...p, horarioDomingo: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[12px]" style={{ ...cardStyle, color: 'var(--text-primary)' }} placeholder="Horário do domingo" /></div>
                        )}

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={config.atendeFeriado} onChange={e => setConfig(p => ({ ...p, atendeFeriado: e.target.checked }))} className="rounded accent-[#D99773]" />
                                <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Atende feriados</span>
                            </label>
                        </div>
                        {config.atendeFeriado && (
                            <div className="ml-6"><input type="text" value={config.horarioFeriado} onChange={e => setConfig(p => ({ ...p, horarioFeriado: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[12px]" style={{ ...cardStyle, color: 'var(--text-primary)' }} placeholder="Horário dos feriados" /></div>
                        )}

                        <div className="pt-2">
                            <button onClick={salvarConfig} disabled={savingConfig}
                                className="px-5 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                                style={{ backgroundColor: '#D99773', color: '#FFF' }}>
                                {savingConfig ? 'Salvando...' : 'Salvar configurações'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal — Novo Agendamento */}
            {modalAberto && (
                <NovoAgendamentoModal
                    profissionais={profissionais}
                    diaSelecionado={diaSelecionado}
                    onClose={() => setModalAberto(false)}
                    onCriado={() => { setModalAberto(false); fetchAgendamentos() }}
                />
            )}
        </div>
    )
}

// ==========================================
// Card de agendamento com botões de status
// ==========================================
function AgendamentoCard({ ag, onStatus }: { ag: Agendamento; onStatus: (id: string, status: string) => void }) {
    const [menuAberto, setMenuAberto] = useState(false)

    return (
        <div className="rounded-xl p-3 flex items-center gap-3" style={cardStyle}>
            <div className="w-1 h-12 rounded-full" style={{ backgroundColor: STATUS_CORES[ag.status] || '#D99773' }} />
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{ag.nomePaciente}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ag.procedimento || 'Consulta'}</p>
                {ag.profissional && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <User size={9} style={{ color: '#D99773' }} />
                        <span className="text-[9px] font-medium" style={{ color: '#D99773' }}>{ag.profissional.nome}</span>
                    </div>
                )}
            </div>
            <div className="text-right">
                <div className="flex items-center gap-1">
                    <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{ag.horario}</span>
                </div>
                {ag.telefone && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={9} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{ag.telefone}</span>
                    </div>
                )}
            </div>
            {/* Status badge + menu */}
            <div className="relative">
                <button
                    onClick={() => setMenuAberto(!menuAberto)}
                    className="px-2 py-0.5 rounded-full text-[9px] font-medium cursor-pointer hover:opacity-80 transition-all"
                    style={{ backgroundColor: `${STATUS_CORES[ag.status] || '#D99773'}15`, color: STATUS_CORES[ag.status] || '#D99773' }}
                >
                    {STATUS_LABELS[ag.status] || ag.status}
                </button>
                {menuAberto && (
                    <div className="absolute right-0 top-6 z-50 rounded-xl shadow-lg py-1 min-w-[140px]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        {Object.entries(STATUS_LABELS).filter(([k]) => k !== ag.status).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => { onStatus(ag.id, key); setMenuAberto(false) }}
                                className="w-full text-left px-3 py-1.5 text-[11px] hover:opacity-70 transition-all flex items-center gap-2"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CORES[key] }} />
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ==========================================
// Modal — Novo Agendamento
// ==========================================
function NovoAgendamentoModal({ profissionais, diaSelecionado, onClose, onCriado }: {
    profissionais: Profissional[]
    diaSelecionado: Date
    onClose: () => void
    onCriado: () => void
}) {
    const [form, setForm] = useState({
        profissionalId: profissionais[0]?.id || '',
        nomePaciente: '',
        telefone: '',
        procedimento: '',
        data: diaSelecionado.toISOString().split('T')[0],
        horario: '09:00',
        duracao: 30,
        observacao: '',
    })
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState('')

    const salvar = async () => {
        if (!form.nomePaciente || !form.telefone || !form.procedimento) {
            setErro('Preencha nome, telefone e procedimento')
            return
        }
        setSalvando(true)
        setErro('')
        try {
            const res = await fetch('/api/calendario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                onCriado()
            } else {
                const data = await res.json()
                setErro(data.error || 'Erro ao criar')
            }
        } catch {
            setErro('Erro de conexão')
        }
        setSalvando(false)
    }

    const inputStyle = { ...cardStyle, color: 'var(--text-primary)' }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Novo Agendamento</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
                </div>

                <div className="space-y-3">
                    {/* Profissional */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Profissional</label>
                        <select value={form.profissionalId} onChange={e => setForm(p => ({ ...p, profissionalId: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl text-[13px]" style={inputStyle}>
                            {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                    </div>

                    {/* Nome */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome da paciente *</label>
                        <input type="text" value={form.nomePaciente} onChange={e => setForm(p => ({ ...p, nomePaciente: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl text-[13px]" style={inputStyle} placeholder="Ex: Maria Silva" />
                    </div>

                    {/* Telefone */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>WhatsApp *</label>
                        <input type="tel" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl text-[13px]" style={inputStyle} placeholder="Ex: 41 99520-7443" />
                    </div>

                    {/* Procedimento */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Procedimento *</label>
                        <input type="text" value={form.procedimento} onChange={e => setForm(p => ({ ...p, procedimento: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl text-[13px]" style={inputStyle} placeholder="Ex: Botox" />
                    </div>

                    {/* Data + Horário */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Data</label>
                            <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[13px]" style={inputStyle} />
                        </div>
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Horário</label>
                            <input type="time" value={form.horario} onChange={e => setForm(p => ({ ...p, horario: e.target.value }))}
                                className="w-full px-3 py-2 rounded-xl text-[13px]" style={inputStyle} />
                        </div>
                    </div>

                    {/* Duração */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Duração (min)</label>
                        <input type="number" value={form.duracao} onChange={e => setForm(p => ({ ...p, duracao: Number(e.target.value) }))}
                            className="w-24 px-3 py-2 rounded-xl text-[13px]" style={inputStyle} min={5} max={480} />
                    </div>

                    {/* Observação */}
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Observação</label>
                        <textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl text-[13px] min-h-[60px]" style={inputStyle} placeholder="Notas internas..." />
                    </div>

                    {erro && <p className="text-[11px] text-red-400">{erro}</p>}

                    <button onClick={salvar} disabled={salvando}
                        className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                        style={{ backgroundColor: '#D99773', color: '#FFF' }}>
                        {salvando ? 'Criando...' : '✓ Criar Agendamento'}
                    </button>
                </div>
            </div>
        </div>
    )
}
