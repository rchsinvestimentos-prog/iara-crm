'use client'

import { MessageSquare, Users, Calendar, TrendingUp, Zap, ArrowUpRight, Activity, Sparkles } from 'lucide-react'
import Link from 'next/link'

const kpis = [
    { label: 'Mensagens', valor: '847', sub: 'este mês', change: '+12%', icon: MessageSquare, color: '#D99773', gradient: 'from-[#D99773]/20 to-[#D99773]/5' },
    { label: 'Leads', valor: '34', sub: 'novos', change: '+8', icon: Users, color: '#8B5CF6', gradient: 'from-[#8B5CF6]/20 to-[#8B5CF6]/5' },
    { label: 'Agendamentos', valor: '18', sub: 'confirmados', change: '+5', icon: Calendar, color: '#06D6A0', gradient: 'from-[#06D6A0]/20 to-[#06D6A0]/5' },
    { label: 'Conversão', valor: '62%', sub: 'lead → agendamento', change: '+4%', icon: TrendingUp, color: '#3B82F6', gradient: 'from-[#3B82F6]/20 to-[#3B82F6]/5' },
]

const proximosAgendamentos = [
    { nome: 'Maria Santos', proc: 'Micro Fio a Fio', hora: '14:00', status: 'confirmado' },
    { nome: 'Ana Costa', proc: 'Sombreado', hora: '16:30', status: 'pendente' },
    { nome: 'Julia Mendes', proc: 'Lábios', hora: '09:00', dia: 'Amanhã' },
]

const conversasRecentes = [
    { nome: 'Fernanda Rocha', msg: 'Qual o valor da micropigmentação?', tempo: '2 min', lida: false },
    { nome: 'Carla Lima', msg: 'Pode ser na quinta às 10h?', tempo: '15 min', lida: false },
    { nome: 'Patrícia Souza', msg: 'Obrigada! Vou sim 💜', tempo: '1h', lida: true },
]

export default function Dashboard() {
    return (
        <div className="max-w-6xl space-y-6 relative">
            {/* Background orbs */}
            <div className="fixed top-20 -left-40 w-80 h-80 bg-[#D99773]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-20 right-0 w-96 h-96 bg-[#0F4C61]/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-[#8B5CF6]/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Bom dia, Dra. Ana</h1>
                    <span className="text-2xl">👋</span>
                </div>
                <p className="text-sm text-gray-500">Aqui está o resumo da sua clínica</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {kpis.map((k, i) => (
                    <div
                        key={i}
                        className="group relative bg-white/[0.03] backdrop-blur-xl rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                    >
                        {/* Glow line top */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />

                        {/* Background gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${k.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15` }}>
                                    <k.icon size={18} style={{ color: k.color }} strokeWidth={1.8} />
                                </div>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: '#06D6A0', background: 'rgba(6, 214, 160, 0.1)' }}>
                                    {k.change}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-white tracking-tight">{k.valor}</p>
                            <p className="text-[11px] text-gray-500 mt-1">{k.label} • {k.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-5 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {/* Agenda do dia */}
                <div className="col-span-3 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                        <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                            <Calendar size={15} className="text-[#D99773]" strokeWidth={1.8} />
                            Agenda de Hoje
                        </h3>
                        <Link href="/habilidades/agendamento" className="text-[11px] text-gray-500 hover:text-[#D99773] transition-colors flex items-center gap-1">
                            Ver agenda <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                        {proximosAgendamentos.map((a, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="text-center min-w-[48px]">
                                        <p className="text-lg font-bold text-white leading-none">{a.hora}</p>
                                        <p className="text-[10px] text-gray-600 mt-0.5">{a.dia || 'Hoje'}</p>
                                    </div>
                                    <div className="w-px h-8 bg-gradient-to-b from-[#D99773]/30 to-transparent" />
                                    <div>
                                        <p className="text-[13px] font-medium text-gray-200">{a.nome}</p>
                                        <p className="text-[11px] text-gray-500">{a.proc}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${a.status === 'confirmado'
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                    {a.status || '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversas recentes */}
                <div className="col-span-2 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
                        <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                            <MessageSquare size={15} className="text-[#D99773]" strokeWidth={1.8} />
                            Conversas
                        </h3>
                        <Link href="/conversas" className="text-[11px] text-gray-500 hover:text-[#D99773] transition-colors flex items-center gap-1">
                            Ver todas <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div className="divide-y divide-white/[0.03]">
                        {conversasRecentes.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-all duration-300 cursor-pointer">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!c.lida ? 'bg-[#D99773]/15 border border-[#D99773]/20' : 'bg-white/[0.04]'
                                    }`}>
                                    <span className={`text-[10px] font-bold ${!c.lida ? 'text-[#D99773]' : 'text-gray-500'}`}>
                                        {c.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-[12px] truncate ${!c.lida ? 'font-semibold text-white' : 'text-gray-400'}`}>{c.nome}</p>
                                        <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">{c.tempo}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 truncate">{c.msg}</p>
                                </div>
                                {!c.lida && <div className="w-2 h-2 rounded-full bg-[#D99773] flex-shrink-0 shadow-[0_0_8px_rgba(217,151,115,0.5)]" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status IARA */}
            <div className="relative rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F4C61] via-[#0F4C61]/90 to-[#0F4C61] animate-gradient" />

                {/* Decorative elements */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-[#D99773]/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
                <div className="absolute left-1/4 bottom-0 w-32 h-32 bg-[#8B5CF6]/10 rounded-full translate-y-1/2 blur-2xl" />
                <div className="absolute right-1/3 top-0 w-24 h-24 bg-[#06D6A0]/8 rounded-full -translate-y-1/2 blur-xl" />

                <div className="relative p-6 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[#D99773]/20 flex items-center justify-center">
                                <Sparkles size={16} className="text-[#D99773]" />
                            </div>
                            <h3 className="text-[14px] font-semibold text-white">IARA está ativa</h3>
                            <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
                            </div>
                        </div>
                        <p className="text-[12px] text-white/50 ml-[42px]">Respondendo automaticamente • Tempo médio: 0.9s</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-xl font-bold text-white">24/7</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Online</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                            <p className="text-xl font-bold text-white">847</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Msgs este mês</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                            <p className="text-xl font-bold text-[#06D6A0]">98%</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Satisfação</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
