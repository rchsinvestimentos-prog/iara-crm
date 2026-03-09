'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users, Wifi, TrendingUp, Search, CreditCard, MessageSquare } from 'lucide-react'

interface ClinicaAdmin {
    id: number
    nome_clinica: string
    email: string
    nomeIA: string
    plano: string
    nivel: number
    status: string
    whatsapp_clinica: string
    whatsapp_status: string
    creditos_restantes: number
    creditos_total: number
    pct_credito: number
    criado_em: string
}

export default function AdminPage() {
    const [clinicas, setClinicas] = useState<ClinicaAdmin[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [filtro, setFiltro] = useState<'todos' | 'ativo' | 'pausado'>('todos')

    useEffect(() => {
        fetch('/api/admin/clinicas')
            .then(r => r.json())
            .then(data => setClinicas(data.clinicas || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const filtered = clinicas
        .filter(c => filtro === 'todos' || c.status === filtro)
        .filter(c => !busca || c.nome_clinica?.toLowerCase().includes(busca.toLowerCase()) || c.email?.toLowerCase().includes(busca.toLowerCase()))

    const totalAtivas = clinicas.filter(c => c.status === 'ativo').length
    const totalCreditos = clinicas.reduce((sum, c) => sum + (c.creditos_restantes || 0), 0)
    const onlineCount = clinicas.filter(c => c.whatsapp_status === 'conectado').length

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    return (
        <div className="max-w-6xl animate-fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Painel Admin 👑</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Visão geral de todas as clínicas</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Total Clínicas', valor: clinicas.length, icon: Users, color: '#D99773' },
                    { label: 'Ativas', valor: totalAtivas, icon: TrendingUp, color: '#06D6A0' },
                    { label: 'WhatsApp Online', valor: onlineCount, icon: Wifi, color: '#3B82F6' },
                    { label: 'Créditos em Uso', valor: totalCreditos.toLocaleString('pt-BR'), icon: CreditCard, color: '#8B5CF6' },
                ].map(kpi => (
                    <div key={kpi.label} className="rounded-xl p-3" style={cardStyle}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <kpi.icon size={13} style={{ color: kpi.color }} />
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                        </div>
                        <p className="text-[22px] font-bold" style={{ color: 'var(--text-primary)' }}>{kpi.valor}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar clínica..."
                        className="w-full pl-9 pr-4 py-2 text-[12px] rounded-xl" style={{ ...cardStyle, color: 'var(--text-primary)' }} />
                </div>
                <div className="flex gap-1">
                    {(['todos', 'ativo', 'pausado'] as const).map(f => (
                        <button key={f} onClick={() => setFiltro(f)}
                            className="px-3 py-2 rounded-lg text-[11px] font-medium transition-all"
                            style={{
                                backgroundColor: filtro === f ? '#D99773' : 'var(--bg-subtle)',
                                color: filtro === f ? 'white' : 'var(--text-muted)',
                                border: `1px solid ${filtro === f ? '#D99773' : 'var(--border-default)'}`,
                            }}>
                            {f === 'todos' ? 'Todos' : f === 'ativo' ? '🟢 Ativos' : '⏸ Pausados'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                {['Clínica', 'IA', 'Plano', 'Status', 'WhatsApp', 'Créditos', 'Desde'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:opacity-80 transition-opacity" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nome_clinica || '—'}</p>
                                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.email}</p>
                                    </td>
                                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{c.nomeIA || 'IARA'}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                            style={{ backgroundColor: c.nivel === 2 ? 'rgba(139,92,246,0.15)' : 'rgba(217,151,115,0.15)', color: c.nivel === 2 ? '#8B5CF6' : '#D99773' }}>
                                            {c.nivel === 2 ? 'Premium' : 'Essencial'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-medium ${c.status === 'ativo' ? 'text-green-400' : 'text-red-400'}`}>
                                            {c.status === 'ativo' ? '🟢 Ativo' : '⏸ Pausado'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] ${c.whatsapp_status === 'conectado' ? 'text-green-400' : 'text-red-400'}`}>
                                            {c.whatsapp_status === 'conectado' ? '🟢 Online' : '🔴 Offline'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span style={{ color: c.pct_credito > 50 ? '#06D6A0' : c.pct_credito > 20 ? '#EAB308' : '#EF4444' }}>
                                                {c.creditos_restantes.toLocaleString('pt-BR')}
                                            </span>
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ {c.creditos_total.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="mt-1 h-1 rounded-full overflow-hidden w-16" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${c.pct_credito}%`, backgroundColor: c.pct_credito > 50 ? '#06D6A0' : c.pct_credito > 20 ? '#EAB308' : '#EF4444' }} />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {c.criado_em ? new Date(c.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-4xl mb-2">🔍</p>
                        <p style={{ color: 'var(--text-muted)' }}>Nenhuma clínica encontrada</p>
                    </div>
                )}
            </div>
        </div>
    )
}
