'use client'

import { MessageSquare, Users, Calendar, TrendingUp, Clock, Zap, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

// Mock data
const kpis = [
    { label: 'Mensagens', valor: '847', sub: 'este mês', change: '+12%', icon: MessageSquare },
    { label: 'Leads', valor: '34', sub: 'novos', change: '+8', icon: Users },
    { label: 'Agendamentos', valor: '18', sub: 'confirmados', change: '+5', icon: Calendar },
    { label: 'Taxa de Conversão', valor: '62%', sub: 'lead → agendamento', change: '+4%', icon: TrendingUp },
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
        <div className="max-w-6xl space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#0F4C61] tracking-tight">Bom dia, Dra. Ana 👋</h1>
                <p className="text-sm text-gray-400 mt-1">Aqui está o resumo da sua clínica</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
                {kpis.map((k, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-all hover:shadow-sm group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-[#D99773]/10 transition-colors">
                                <k.icon size={17} className="text-gray-400 group-hover:text-[#D99773] transition-colors" strokeWidth={1.8} />
                            </div>
                            <span className="text-[11px] font-semibold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                                {k.change}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-[#0F4C61] tracking-tight">{k.valor}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{k.label} • {k.sub}</p>
                    </div>
                ))}
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-5 gap-4">
                {/* Agenda do dia */}
                <div className="col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                            <Calendar size={15} className="text-[#D99773]" strokeWidth={1.8} />
                            Agenda de Hoje
                        </h3>
                        <Link href="/habilidades/agendamento" className="text-[11px] text-gray-400 hover:text-[#D99773] transition-colors flex items-center gap-1">
                            Ver agenda <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {proximosAgendamentos.map((a, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="text-center min-w-[44px]">
                                        <p className="text-lg font-bold text-[#0F4C61] leading-none">{a.hora}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{a.dia || 'Hoje'}</p>
                                    </div>
                                    <div className="w-px h-8 bg-gradient-to-b from-[#D99773]/40 to-transparent" />
                                    <div>
                                        <p className="text-[13px] font-medium text-gray-700">{a.nome}</p>
                                        <p className="text-[11px] text-gray-400">{a.proc}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${a.status === 'confirmado' ? 'bg-green-50 text-green-500' : 'bg-amber-50 text-amber-500'
                                    }`}>
                                    {a.status || '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversas recentes */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                            <MessageSquare size={15} className="text-[#D99773]" strokeWidth={1.8} />
                            Conversas
                        </h3>
                        <Link href="/conversas" className="text-[11px] text-gray-400 hover:text-[#D99773] transition-colors flex items-center gap-1">
                            Ver todas <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {conversasRecentes.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!c.lida ? 'bg-[#D99773]/15' : 'bg-gray-100'
                                    }`}>
                                    <span className={`text-[10px] font-bold ${!c.lida ? 'text-[#D99773]' : 'text-gray-400'}`}>
                                        {c.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-[12px] truncate ${!c.lida ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{c.nome}</p>
                                        <span className="text-[10px] text-gray-300 flex-shrink-0 ml-2">{c.tempo}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 truncate">{c.msg}</p>
                                </div>
                                {!c.lida && <div className="w-1.5 h-1.5 rounded-full bg-[#D99773] flex-shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status IARA */}
            <div className="bg-gradient-to-r from-[#0F4C61] to-[#0F4C61]/90 rounded-2xl p-6 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute right-20 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-[#D99773]" />
                            <h3 className="text-[13px] font-semibold">IARA está ativa</h3>
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        </div>
                        <p className="text-[12px] text-white/60">Respondendo mensagens automaticamente • Tempo médio: 0.9s</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-xl font-bold">24/7</p>
                            <p className="text-[10px] text-white/50">Online</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold">847</p>
                            <p className="text-[10px] text-white/50">Msgs este mês</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
