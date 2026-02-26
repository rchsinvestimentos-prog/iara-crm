'use client'

import { useEffect, useState } from 'react'
import { Users, MessageSquare, CreditCard, Activity, AlertTriangle, TrendingUp, Loader2, Shield, Search } from 'lucide-react'

interface ClinicaAdmin {
    id: string
    nome_clinica: string
    email: string
    nomeIA: string
    plano: number
    status: string
    whatsapp_pessoal: string
    whatsapp_status: string
    creditos_restantes: number
    creditos_total: number
    pct_credito: number
    total_conversas: number
    total_agendamentos: number
    total_procedimentos: number
    criado_em: string
}

const planoNomes: Record<number, string> = { 1: 'Secretária', 2: 'Estrategista', 3: 'Designer', 4: 'Audiovisual' }
const planoCores: Record<number, string> = { 1: '#06D6A0', 2: '#F59E0B', 3: '#D99773', 4: '#0F4C61' }

export default function AdminDashboard() {
    const [clinicas, setClinicas] = useState<ClinicaAdmin[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        fetch('/api/admin/clinicas')
            .then(r => { if (!r.ok) throw new Error(r.status === 403 ? 'Acesso negado' : 'Erro'); return r.json() })
            .then(data => setClinicas(data.clinicas || []))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    const filtradas = clinicas.filter(c =>
        c.nome_clinica?.toLowerCase().includes(busca.toLowerCase()) ||
        c.email?.toLowerCase().includes(busca.toLowerCase())
    )

    const totalConversas = clinicas.reduce((a, c) => a + (c.total_conversas || 0), 0)
    const criticas = clinicas.filter(c => c.pct_credito <= 20).length
    const planoCount: Record<number, number> = {}
    clinicas.forEach(c => { planoCount[c.plano] = (planoCount[c.plano] || 0) + 1 })

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Shield size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{error}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Apenas administradores podem acessar esta página.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>🛡️ Dashboard Admin</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Visão geral do sistema IARA • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Clínicas', valor: clinicas.length, icon: Users, color: '#D99773' },
                    { label: 'Conversas Total', valor: totalConversas, icon: MessageSquare, color: '#8B5CF6' },
                    { label: 'Crédito Crítico', valor: criticas, icon: AlertTriangle, color: criticas > 0 ? '#EF4444' : '#06D6A0' },
                    { label: 'Ativas', valor: clinicas.filter(c => c.status === 'ativo').length, icon: Activity, color: '#06D6A0' },
                ].map((k, i) => (
                    <div key={i} className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15` }}>
                                <k.icon size={17} style={{ color: k.color }} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{loading ? '—' : k.valor}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Tabela de clínicas */}
                <div className="lg:col-span-2 backdrop-blur-xl rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Clínicas ({filtradas.length})</h2>
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                            <input
                                value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                                className="text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', width: 180 }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-[#D99773]" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0" style={{ backgroundColor: 'var(--bg-card)' }}>
                                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        {['Clínica', 'Plano', 'Status', 'Créditos', 'Conversas'].map(h => (
                                            <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtradas.map(c => (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.nome_clinica}</p>
                                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.email}</p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${planoCores[c.plano] || '#999'}15`, color: planoCores[c.plano] || '#999' }}>
                                                    {planoNomes[c.plano] || `P${c.plano}`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.status === 'ativo' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-400'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                                        <div className="h-full rounded-full" style={{ width: `${c.pct_credito}%`, backgroundColor: c.pct_credito <= 20 ? '#EF4444' : c.pct_credito > 50 ? '#06D6A0' : '#F59E0B' }} />
                                                    </div>
                                                    <span className="text-[11px]" style={{ color: c.pct_credito <= 20 ? '#EF4444' : 'var(--text-muted)' }}>{c.pct_credito}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span style={{ color: 'var(--text-primary)' }}>{c.total_conversas}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Distribuição de planos */}
                <div className="backdrop-blur-xl rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <TrendingUp size={16} className="text-[#D99773]" /> Distribuição de Planos
                    </h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(p => {
                            const count = planoCount[p] || 0
                            const pct = clinicas.length > 0 ? Math.round((count / clinicas.length) * 100) : 0
                            return (
                                <div key={p}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{planoNomes[p]}</span>
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} clínicas</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: planoCores[p] }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Total</span>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{clinicas.length} clínicas</span>
                    </div>

                    {/* MRR estimado */}
                    <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard size={14} className="text-[#D99773]" />
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>MRR Estimado</span>
                        </div>
                        <p className="text-lg font-bold text-[#D99773]">
                            R$ {((planoCount[1] || 0) * 97 + (planoCount[2] || 0) * 197 + (planoCount[3] || 0) * 297 + (planoCount[4] || 0) * 497).toLocaleString('pt-BR')}
                            <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mês</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
