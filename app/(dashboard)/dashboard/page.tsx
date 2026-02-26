'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, Users, Calendar, TrendingUp, ArrowUpRight, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const OnboardingChecklist = dynamic(() => import('@/components/OnboardingChecklist'), { ssr: false })
const PausarIARA = dynamic(() => import('@/components/PausarIARA'), { ssr: false })

interface Stats {
    mensagensHoje: number
    agendamentosHoje: number
    totalConversas: number
    creditosRestantes: number
    plano: number
    nomeClinica: string
    nomeIA: string
    conversasRecentes: { telefone: string; nome: string; ultimaMensagem: string; ultimaData: string }[]
    fonte: string
}

interface AgendamentoReal {
    id: number
    nome_paciente: string
    telefone: string
    procedimento: string
    data_agendamento: string
    horario: string
    status: string
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'agora'
    if (mins < 60) return `${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
}

function formatHora(dateStr: string, horario: string): string {
    if (horario) return horario
    try {
        return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return '—'
    }
}

function isToday(dateStr: string): boolean {
    const d = new Date(dateStr)
    const hoje = new Date()
    return d.toDateString() === hoje.toDateString()
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [agendamentos, setAgendamentos] = useState<AgendamentoReal[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, agendRes] = await Promise.all([
                    fetch('/api/stats'),
                    fetch('/api/agendamentos'),
                ])

                if (statsRes.ok) {
                    setStats(await statsRes.json())
                }
                if (agendRes.ok) {
                    const data = await agendRes.json()
                    setAgendamentos(data.agendamentos || [])
                }
            } catch (err) {
                console.error('Erro ao carregar dashboard:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const kpis = [
        { label: 'Mensagens', valor: stats?.mensagensHoje ?? 0, sub: 'hoje', icon: MessageSquare, color: '#D99773' },
        { label: 'Leads', valor: stats?.totalConversas ?? 0, sub: 'total', icon: Users, color: '#8B5CF6' },
        { label: 'Agendamentos', valor: stats?.agendamentosHoje ?? 0, sub: 'próximos', icon: Calendar, color: '#06D6A0' },
        { label: 'Créditos', valor: stats?.creditosRestantes ?? 0, sub: 'restantes', icon: TrendingUp, color: '#3B82F6' },
    ]

    const saudacao = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Bom dia'
        if (h < 18) return 'Boa tarde'
        return 'Boa noite'
    }

    return (
        <div className="max-w-6xl space-y-6 relative">
            {/* Background orbs */}
            <div className="fixed top-20 -left-40 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--orb-1)' }} />
            <div className="fixed bottom-20 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ backgroundColor: 'var(--orb-2)' }} />
            <div className="fixed top-1/2 left-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none" style={{ backgroundColor: 'var(--orb-3)' }} />

            {/* Header */}
            <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {loading ? 'Carregando...' : `${saudacao()}, ${stats?.nomeClinica || 'Dra.'}`}
                    </h1>
                    <span className="text-2xl">👋</span>
                    <div className="ml-auto">
                        <PausarIARA />
                    </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {loading ? 'Buscando dados da sua clínica...' : `Aqui está o resumo da sua ${stats?.nomeIA || 'IARA'}`}
                </p>
            </div>

            {/* Onboarding Checklist — primeiros passos */}
            <OnboardingChecklist />

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
                            </div>
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>...</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{k.valor}</p>
                                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{k.label} • {k.sub}</p>
                                </>
                            )}
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
                            Próximos Agendamentos
                        </h3>
                        <Link href="/habilidades/agendamento" className="text-[11px] hover:text-[#D99773] transition-colors flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            Ver agenda <ArrowUpRight size={11} />
                        </Link>
                    </div>
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={20} className="animate-spin text-[#D99773]" />
                            </div>
                        ) : agendamentos.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum agendamento próximo</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sua IARA agenda automaticamente 💜</p>
                            </div>
                        ) : (
                            agendamentos.slice(0, 4).map((a, i) => (
                                <div key={a.id || i} className="flex items-center justify-between px-5 py-4 transition-all duration-300" style={{ borderBottom: i < Math.min(agendamentos.length - 1, 3) ? '1px solid var(--border-subtle)' : 'none' }}>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center min-w-[48px]">
                                            <p className="text-lg font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{formatHora(a.data_agendamento, a.horario)}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{isToday(a.data_agendamento) ? 'Hoje' : new Date(a.data_agendamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gradient-to-b from-[#D99773]/30 to-transparent" />
                                        <div>
                                            <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{a.nome_paciente}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.procedimento}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${a.status === 'confirmado' ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                        {a.status || 'pendente'}
                                    </span>
                                </div>
                            ))
                        )}
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
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={20} className="animate-spin text-[#D99773]" />
                            </div>
                        ) : !stats?.conversasRecentes?.length ? (
                            <div className="text-center py-12">
                                <MessageSquare size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma conversa ainda</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Aparecerá aqui quando sua IARA começar a atender</p>
                            </div>
                        ) : (
                            stats.conversasRecentes.map((c, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-4 transition-all duration-300 cursor-pointer" style={{ borderBottom: i < stats.conversasRecentes.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#D99773]/15 border border-[#D99773]/20">
                                        <span className="text-[10px] font-bold text-[#D99773]">
                                            {c.nome.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[12px] truncate font-semibold" style={{ color: 'var(--text-primary)' }}>{c.nome}</p>
                                            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(c.ultimaData)}</span>
                                        </div>
                                        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{c.ultimaMensagem}</p>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-[#D99773] flex-shrink-0 shadow-[0_0_8px_rgba(217,151,115,0.5)]" />
                                </div>
                            ))
                        )}
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
                            <h3 className="text-[14px] font-semibold text-white">
                                {stats?.nomeIA || 'IARA'} está ativa
                            </h3>
                            <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
                            </div>
                        </div>
                        <p className="text-[12px] text-white/50 ml-[42px]">Respondendo automaticamente • Plano {stats?.plano ?? 1}</p>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-xl font-bold text-white">24/7</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Online</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                            <p className="text-xl font-bold text-white">{stats?.mensagensHoje ?? '—'}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Msgs hoje</p>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="text-center">
                            <p className="text-xl font-bold text-[#06D6A0]">{stats?.creditosRestantes ?? '—'}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">Créditos</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
