'use client'

import { Building2, MessageSquare, AlertTriangle, TrendingUp, Users, CreditCard, Activity, Clock } from 'lucide-react'

// Mock data
const stats = [
    { label: 'Clínicas Ativas', value: '47', change: '+3', icon: Building2, color: 'violet' },
    { label: 'Mensagens Hoje', value: '2.841', change: '+18%', icon: MessageSquare, color: 'blue' },
    { label: 'Erros 24h', value: '3', change: '-2', icon: AlertTriangle, color: 'red' },
    { label: 'MRR', value: 'R$ 14.7k', change: '+12%', icon: CreditCard, color: 'green' },
    { label: 'Uptime N8N', value: '99.8%', change: '', icon: Activity, color: 'emerald' },
    { label: 'Tempo Médio IA', value: '0.9s', change: '-0.2s', icon: Clock, color: 'amber' },
]

const clinicasRecentes = [
    { nome: 'Dra. Ana Silva', plano: 'Secretária', msgs: 134, status: 'online', cidade: 'São Paulo' },
    { nome: 'Dra. Beatriz Costa', plano: 'Estrategista', msgs: 89, status: 'online', cidade: 'Rio de Janeiro' },
    { nome: 'Dra. Carla Mendes', plano: 'Designer', msgs: 67, status: 'offline', cidade: 'Belo Horizonte' },
    { nome: 'Dra. Diana Rocha', plano: 'Audiovisual', msgs: 201, status: 'online', cidade: 'Curitiba' },
    { nome: 'Dra. Elena Santos', plano: 'Secretária', msgs: 45, status: 'online', cidade: 'Brasília' },
]

const errosRecentes = [
    { tipo: 'TIMEOUT', flow: 'F4 — Transcrição', clinica: 'Dra. Ana', hora: '14:23', severity: 'warning' },
    { tipo: 'API_ERROR', flow: 'F8 — Mensageiro', clinica: 'Dra. Beatriz', hora: '13:45', severity: 'error' },
    { tipo: 'RATE_LIMIT', flow: 'F5 — IA Texto', clinica: 'Dra. Diana', hora: '12:10', severity: 'warning' },
]

const planoDistribuicao = [
    { nome: 'Secretária', qtd: 28, pct: 60, cor: '#06D6A0' },
    { nome: 'Estrategista', qtd: 12, pct: 25, cor: '#F59E0B' },
    { nome: 'Designer', qtd: 5, pct: 11, cor: '#D99773' },
    { nome: 'Audiovisual', qtd: 2, pct: 4, cor: '#8B5CF6' },
]

export default function AdminDashboard() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
                <p className="text-gray-500 text-sm mt-1">Visão geral do sistema IARA • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/8 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <s.icon size={18} className="text-violet-400" />
                            {s.change && (
                                <span className={`text-xs font-medium ${s.change.startsWith('+') ? 'text-green-400' : s.change.startsWith('-') ? (s.label === 'Erros 24h' || s.label === 'Tempo Médio IA' ? 'text-green-400' : 'text-red-400') : 'text-gray-400'
                                    }`}>
                                    {s.change}
                                </span>
                            )}
                        </div>
                        <p className="text-xl font-bold text-white">{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Clínicas mais ativas */}
                <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Building2 size={16} className="text-violet-400" />
                            Clínicas Mais Ativas Hoje
                        </h3>
                        <a href="/admin/clinicas" className="text-xs text-violet-400 hover:text-violet-300">
                            Ver todas →
                        </a>
                    </div>
                    <div className="space-y-2">
                        {clinicasRecentes.map((c, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 text-xs font-bold">
                                        {c.nome.split(' ').slice(1).map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{c.nome}</p>
                                        <p className="text-gray-500 text-xs">{c.cidade} • {c.plano}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400 text-sm">{c.msgs} msgs</span>
                                    <div className={`w-2 h-2 rounded-full ${c.status === 'online' ? 'bg-green-400' : 'bg-gray-600'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Distribuição de planos */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp size={16} className="text-violet-400" />
                        Planos
                    </h3>
                    <div className="space-y-4">
                        {planoDistribuicao.map((p) => (
                            <div key={p.nome}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm text-gray-300">{p.nome}</span>
                                    <span className="text-xs text-gray-500">{p.qtd} clínicas</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{ width: `${p.pct}%`, backgroundColor: p.cor }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Total</span>
                            <span className="text-white font-bold">47 clínicas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Erros recentes */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        Últimos Erros
                    </h3>
                    <a href="/admin/logs" className="text-xs text-violet-400 hover:text-violet-300">
                        Ver todos →
                    </a>
                </div>
                <div className="space-y-2">
                    {errosRecentes.map((e, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-8 rounded-full ${e.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                <div>
                                    <p className="text-white text-sm font-medium">{e.tipo}</p>
                                    <p className="text-gray-500 text-xs">{e.flow} • {e.clinica}</p>
                                </div>
                            </div>
                            <span className="text-gray-500 text-xs">{e.hora}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Status dos workflows */}
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity size={16} className="text-green-400" />
                    Status N8N Workflows
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {['F0 Webhook', 'F1 Receptor', 'F2 Router', 'F3 Config', 'F4 Áudio', 'F5 IA', 'F6 Cal', 'F7 Follow', 'F8 Msg', 'F9 Post', 'F10 Segurança', 'F11 Analítica'].map((f, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/3 text-center">
                            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${i < 10 ? 'bg-green-400' : i === 10 ? 'bg-amber-400' : 'bg-gray-600'}`} />
                            <p className="text-xs text-gray-300 truncate">{f}</p>
                            <p className="text-xs text-gray-600">{i < 10 ? 'Ativo' : i === 10 ? 'Warning' : 'Desativado'}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
