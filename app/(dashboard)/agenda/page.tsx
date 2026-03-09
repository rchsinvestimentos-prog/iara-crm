'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, Clock, Phone } from 'lucide-react'

interface Agendamento {
    id: string
    nome: string
    telefone: string
    procedimento: string
    data: string
    hora: string
    status: string
}

export default function AgendaPage() {
    const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
    const [loading, setLoading] = useState(true)
    const [mesAtual, setMesAtual] = useState(new Date())

    useEffect(() => {
        fetch('/api/agendamentos')
            .then(r => r.json())
            .then(data => {
                const list = (data.agendamentos || []).map((a: any) => ({
                    id: a.id || String(Math.random()),
                    nome: a.nome_paciente || a.nome || 'Cliente',
                    telefone: a.telefone || '',
                    procedimento: a.procedimento || '',
                    data: a.data_agendamento || a.data || '',
                    hora: a.horario || a.hora || '',
                    status: a.status || 'confirmado',
                }))
                setAgendamentos(list)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth()
    const primeiroDia = new Date(ano, mes, 1).getDay()
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const nomeMes = mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    const hoje = new Date()
    const isHoje = (dia: number) => hoje.getFullYear() === ano && hoje.getMonth() === mes && hoje.getDate() === dia

    const getAgendDia = (dia: number) => {
        return agendamentos.filter(a => {
            const d = new Date(a.data)
            return d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia
        })
    }

    const navMes = (dir: number) => {
        setMesAtual(new Date(ano, mes + dir, 1))
    }

    const statusCor: Record<string, string> = {
        confirmado: '#06D6A0',
        pendente: '#EAB308',
        cancelado: '#EF4444',
        realizado: '#3B82F6',
    }

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    // Build calendar grid
    const cells = []
    for (let i = 0; i < primeiroDia; i++) cells.push(null)
    for (let d = 1; d <= totalDias; d++) cells.push(d)

    return (
        <div className="max-w-5xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Agenda 🗓</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {agendamentos.length} agendamentos carregados
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navMes(-1)} className="p-2 rounded-xl transition-all hover:opacity-70" style={cardStyle}>
                        <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <span className="text-[14px] font-semibold px-4 capitalize" style={{ color: 'var(--text-primary)' }}>{nomeMes}</span>
                    <button onClick={() => navMes(1)} className="p-2 rounded-xl transition-all hover:opacity-70" style={cardStyle}>
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {/* Day headers */}
                <div className="grid grid-cols-7">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                        <div key={d} className="text-center py-2 text-[11px] font-semibold" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {cells.map((dia, i) => {
                        if (dia === null) return <div key={`empty-${i}`} className="min-h-[90px]" style={{ borderBottom: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }} />

                        const agendDia = getAgendDia(dia)
                        return (
                            <div key={dia} className="min-h-[90px] p-1.5 relative transition-colors" style={{
                                borderBottom: '1px solid var(--border-subtle)',
                                borderRight: '1px solid var(--border-subtle)',
                                backgroundColor: isHoje(dia) ? 'rgba(217,151,115,0.06)' : 'transparent',
                            }}>
                                <p className={`text-[11px] font-medium mb-1 ${isHoje(dia) ? 'text-[#D99773] font-bold' : ''}`}
                                    style={{ color: isHoje(dia) ? '#D99773' : 'var(--text-muted)' }}>
                                    {dia}
                                </p>
                                {agendDia.slice(0, 3).map(ag => (
                                    <div key={ag.id} className="mb-0.5 px-1.5 py-0.5 rounded text-[9px] truncate"
                                        style={{ backgroundColor: `${statusCor[ag.status] || '#D99773'}15`, color: statusCor[ag.status] || '#D99773' }}>
                                        <span className="font-medium">{ag.hora}</span> {ag.nome.split(' ')[0]}
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

            {/* Today's appointments detail */}
            <div className="mt-6">
                <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>📋 Agendamentos de Hoje</h3>
                <div className="space-y-2">
                    {getAgendDia(hoje.getDate()).length === 0 ? (
                        <div className="rounded-xl p-4 text-center" style={cardStyle}>
                            <p className="text-2xl mb-1">☀️</p>
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Nenhum agendamento para hoje</p>
                        </div>
                    ) : (
                        getAgendDia(hoje.getDate()).map(ag => (
                            <div key={ag.id} className="rounded-xl p-3 flex items-center gap-3" style={cardStyle}>
                                <div className="w-1 h-10 rounded-full" style={{ backgroundColor: statusCor[ag.status] || '#D99773' }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{ag.nome}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ag.procedimento || 'Consulta'}</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1">
                                        <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                                        <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{ag.hora}</span>
                                    </div>
                                    {ag.telefone && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Phone size={9} style={{ color: 'var(--text-muted)' }} />
                                            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{ag.telefone}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium"
                                    style={{ backgroundColor: `${statusCor[ag.status] || '#D99773'}15`, color: statusCor[ag.status] || '#D99773' }}>
                                    {ag.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
