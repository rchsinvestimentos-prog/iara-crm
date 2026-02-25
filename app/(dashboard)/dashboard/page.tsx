'use client'

import { MessageSquare, Users, Calendar, TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

const kpis = [
    { label: 'Mensagens', valor: '847', sub: 'este mês', change: '+12%', icon: MessageSquare, color: '#D99773' },
    { label: 'Leads', valor: '34', sub: 'novos', change: '+8', icon: Users, color: '#8B5CF6' },
    { label: 'Agendamentos', valor: '18', sub: 'confirmados', change: '+5', icon: Calendar, color: '#06D6A0' },
    { label: 'Conversão', valor: '62%', sub: 'lead → agendamento', change: '+4%', icon: TrendingUp, color: '#3B82F6' },
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
            <div className="fixed top-20 -left-40 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--orb-1)' }} />
            <div className="fixed bottom-20 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--orb-2)' }} />
            <div className="fixed top-1/2 left-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'var(--orb-3)' }} />

            {/* Header */}
            <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Bom dia, Dra. Ana</h1>
                    <span className="text-2xl">👋</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aqui está o resumo da sua clínica</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                {kpis.map((k, i) => (
                    <div
                        key={i}
                        className="group relative backdrop-blur-xl rounded-2xl p-5 transition-all duration-500 hover:-translate-y-1 overflow-hidden"
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-default)',
                        }}
                    >
                        {/* Glow line top */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${k.color}15` }}>
                                    <k.icon size={18} style={{ color: k.color }} strokeWidth={1.8} />
                                </div>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: 'var(--badge-text-green)', background: 'var(--badge-bg-green)' }}>
                                    {k.change}
                                </span>
                            </div>
                            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{k.valor}</p>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{k.label} • {k.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-5 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {/* Agenda do dia */}
                <div className="col-span-3 backdrop-blur-xl rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Calendar size={15} className="text-[#D99773]" strokeWidth={1.8} />
                            Agenda de Hoje
                        </h3>
                        <Link href="/habilidades/agendamento" className="text-[11px] hover:text-[#D99773] transition-colors flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            Ver agenda <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div>
                        {proximosAgendamentos.map((a, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-4 transition-all duration-300" style={{ borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
                                <div className="flex items-center gap-4">
                                    <div className="text-center min-w-[48px]">
                                        <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{a.hora}</p>
                                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.dia || 'Hoje'}</p>
                                    </div>
                                    <div className="w-px h-8 bg-gradient-to-b from-[#D99773]/30 to-transparent" />
                                    <div>
                                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{a.nome}</p>
                                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.proc}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${a.status === 'confirmado' ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'
                                    }`}>
                                    {a.status || '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversas recentes */}
                <div className="col-span-2 backdrop-blur-xl rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <MessageSquare size={15} className="text-[#D99773]" strokeWidth={1.8} />
                            Conversas
                        </h3>
                        <Link href="/conversas" className="text-[11px] hover:text-[#D99773] transition-colors flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            Ver todas <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div>
                        {conversasRecentes.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-4 transition-all duration-300 cursor-pointer" style={{ borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none' }}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!c.lida ? 'bg-[#D99773]/15 border border-[#D99773]/20' : ''
                                    }`} style={{ backgroundColor: c.lida ? 'var(--bg-subtle)' : undefined }}>
                                    <span className={`text-[10px] font-bold ${!c.lida ? 'text-[#D99773]' : ''}`} style={{ color: c.lida ? 'var(--text-muted)' : undefined }}>
                                        {c.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-[12px] truncate ${!c.lida ? 'font-semibold' : ''}`} style={{ color: !c.lida ? 'var(--text-primary)' : 'var(--text-muted)' }}>{c.nome}</p>
                                        <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{c.tempo}</span>
                                    </div>
                                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{c.msg}</p>
                                </div>
                                {!c.lida && <div className="w-2 h-2 rounded-full bg-[#D99773] flex-shrink-0 shadow-[0_0_8px_rgba(217,151,115,0.5)]" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status IARA */}
            <div className="relative rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-[#0F4C61] via-[#0F4C61]/90 to-[#0F4C61] animate-gradient" />
                <div className="absolute right-0 top-0 w-48 h-48 bg-[#D99773]/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
                <div className="absolute left-1/4 bottom-0 w-32 h-32 bg-[#8B5CF6]/10 rounded-full translate-y-1/2 blur-2xl" />

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
