'use client'

import { useState, useEffect } from 'react'
import {
    Search, RefreshCw, CheckCircle, XCircle, AlertTriangle,
    Wifi, Server, MessageSquare, Calendar, CreditCard, Clock,
    Send, Zap, Activity, Loader2, Globe, Pause, Play,
    Battery, ChevronDown, Settings
} from 'lucide-react'

type Status = 'ok' | 'warning' | 'error'

interface Clinica {
    id: number
    nome_clinica: string
    status: string
    plano: number
    creditos: number
    idioma: string
    canal_principal: string
    creditos_status: string
}

interface Diagnostico {
    code: string
    problema: string
    solucao: string
    fluxo: string
}

interface TesteResultado {
    nome: string
    status: 'ok' | 'erro' | 'aviso'
    detalhe: string
    solucao?: string
}

export default function DiagnosticoPage() {
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [selected, setSelected] = useState<Clinica | null>(null)
    const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([])
    const [testes, setTestes] = useState<TesteResultado[]>([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const [executando, setExecutando] = useState<string | null>(null)
    const [resultadoAcao, setResultadoAcao] = useState<{ sucesso: boolean; mensagem: string } | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => { fetchClinicas() }, [])

    async function fetchClinicas() {
        try {
            const res = await fetch('/api/admin/diagnostico')
            if (res.ok) {
                const data = await res.json()
                setClinicas(data.clinicas || [])
            }
        } catch (err) {
            console.error('Erro:', err)
        } finally {
            setLoading(false)
        }
    }

    async function selecionarClinica(c: Clinica) {
        setSelected(c)
        setResultadoAcao(null)
        try {
            const res = await fetch(`/api/admin/diagnostico?clinicaId=${c.id}`)
            if (res.ok) {
                const data = await res.json()
                setDiagnosticos(data.diagnostico || [])
            }
        } catch (err) {
            console.error('Erro:', err)
        }
    }

    async function rodarTestes() {
        setScanning(true)
        setTestes([])
        try {
            const res = await fetch('/api/admin/diagnostico', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicaId: selected?.id }),
            })
            if (res.ok) {
                const data = await res.json()
                setTestes(data.resultados || [])
            }
        } catch (err) {
            console.error('Erro:', err)
        } finally {
            setScanning(false)
        }
    }

    async function executarAcao(acao: string, parametros?: Record<string, unknown>) {
        if (!selected) return
        setExecutando(acao)
        setResultadoAcao(null)
        try {
            const res = await fetch('/api/admin/diagnostico/acoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acao, clinicaId: selected.id, parametros }),
            })
            const data = await res.json()
            setResultadoAcao({ sucesso: data.sucesso, mensagem: data.mensagem + (data.detalhes ? ' — ' + data.detalhes : '') })
            if (data.sucesso) {
                fetchClinicas()
                selecionarClinica(selected)
            }
        } catch (err) {
            setResultadoAcao({ sucesso: false, mensagem: 'Erro de conexão' })
        } finally {
            setExecutando(null)
        }
    }

    const clinicaStatus = (c: Clinica): Status => {
        if (c.status !== 'ativo') return 'error'
        if (c.creditos_status === 'zerado') return 'error'
        if (c.creditos_status === 'baixo') return 'warning'
        return 'ok'
    }

    const statusIcon = (s: Status) => {
        if (s === 'ok') return <CheckCircle size={14} className="text-green-400" />
        if (s === 'warning') return <AlertTriangle size={14} className="text-amber-400" />
        return <XCircle size={14} className="text-red-400" />
    }

    const statusBadge = (s: Status) => {
        if (s === 'ok') return 'text-green-400 bg-green-500/10 border-green-500/20'
        if (s === 'warning') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        return 'text-red-400 bg-red-500/10 border-red-500/20'
    }

    const filtered = clinicas.filter(c => c.nome_clinica?.toLowerCase().includes(search.toLowerCase()))

    const totalOk = clinicas.filter(c => clinicaStatus(c) === 'ok').length
    const totalWarning = clinicas.filter(c => clinicaStatus(c) === 'warning').length
    const totalError = clinicas.filter(c => clinicaStatus(c) === 'error').length

    const acoes = [
        { key: 'recarregar_creditos', label: '🔋 +100 Créditos', icon: Battery, color: 'bg-green-500/10 text-green-400 hover:bg-green-500/20' },
        { key: 'reativar_clinica', label: '✅ Reativar', icon: CheckCircle, color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
        { key: 'despausar_iara', label: '▶️ Despausar', icon: Play, color: 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' },
        { key: 'enviar_teste', label: '📱 Msg Teste', icon: Send, color: 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' },
        { key: 'resetar_memoria', label: '🧹 Resetar Memória', icon: RefreshCw, color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <Activity size={22} className="text-violet-400" />
                        Diagnóstico & Suporte
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Health check + ações rápidas de 1 clique</p>
                </div>
                <button
                    onClick={rodarTestes}
                    disabled={scanning}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${scanning ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20'
                        }`}
                >
                    <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                    {scanning ? 'Testando...' : 'Testar Conexões'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: clinicas.length, icon: Activity, color: '#8B5CF6' },
                    { label: 'OK', value: totalOk, icon: CheckCircle, color: '#10B981' },
                    { label: 'Atenção', value: totalWarning, icon: AlertTriangle, color: '#F59E0B' },
                    { label: 'Problema', value: totalError, icon: XCircle, color: '#EF4444' },
                ].map((s, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <s.icon size={16} style={{ color: s.color }} />
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Test results */}
            {testes.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 space-y-2">
                    <h3 className="text-[13px] font-semibold text-white mb-2">🔌 Testes de Conexão</h3>
                    {testes.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                            {t.status === 'ok' ? <CheckCircle size={14} className="text-green-400" /> :
                                t.status === 'erro' ? <XCircle size={14} className="text-red-400" /> :
                                    <AlertTriangle size={14} className="text-amber-400" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-white">{t.nome}</p>
                                <p className="text-[11px] text-gray-500 truncate">{t.detalhe}</p>
                                {t.solucao && <p className="text-[10px] text-amber-400 mt-0.5">💡 {t.solucao}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Lista de clínicas */}
                <div className="col-span-1 lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                            <Search size={14} className="text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar clínica..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="bg-transparent text-sm text-white placeholder-gray-500 outline-none flex-1"
                            />
                        </div>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 size={18} className="animate-spin text-violet-400" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-[12px] text-gray-500">Nenhuma clínica encontrada</p>
                            </div>
                        ) : (
                            filtered.map(c => {
                                const st = clinicaStatus(c)
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => selecionarClinica(c)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${selected?.id === c.id ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {statusIcon(st)}
                                            <div>
                                                <p className="text-[13px] font-medium text-white">{c.nome_clinica}</p>
                                                <p className="text-[10px] text-gray-500">Plano {c.plano} • {c.creditos ?? 0} créditos</p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(st)}`}>
                                            {st === 'ok' ? 'OK' : st === 'warning' ? 'Atenção' : 'Problema'}
                                        </span>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Detalhes + Ações */}
                <div className="col-span-1 lg:col-span-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                    {selected ? (
                        <>
                            <div className="px-5 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-[14px] font-semibold text-white">{selected.nome_clinica}</h3>
                                    <p className="text-[11px] text-gray-500">
                                        Plano {selected.plano} • {selected.creditos} créditos • {selected.idioma || 'pt-BR'} • Status: {selected.status}
                                    </p>
                                </div>
                                <button
                                    onClick={rodarTestes}
                                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                                >
                                    <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
                                    Testar
                                </button>
                            </div>

                            {/* Diagnóstico automático */}
                            {diagnosticos.length > 0 && (
                                <div className="px-4 pt-4">
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                        <p className="text-[12px] font-semibold text-red-400 mb-2">⚠️ Problemas Detectados:</p>
                                        <div className="space-y-2">
                                            {diagnosticos.map((d, i) => (
                                                <div key={i} className="text-[11px]">
                                                    <p className="text-gray-300 font-medium">• {d.problema}</p>
                                                    <p className="text-gray-500 ml-3">💡 {d.solucao}</p>
                                                    <p className="text-gray-600 ml-3 text-[10px]">Fluxo: {d.fluxo}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {diagnosticos.length === 0 && (
                                <div className="px-4 pt-4">
                                    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3 flex items-center gap-2">
                                        <CheckCircle size={14} className="text-green-400" />
                                        <p className="text-[12px] text-green-400 font-medium">Nenhum problema detectado automaticamente ✨</p>
                                    </div>
                                </div>
                            )}

                            {/* Resultado da ação */}
                            {resultadoAcao && (
                                <div className="px-4 pt-3">
                                    <div className={`rounded-xl p-3 flex items-center gap-2 ${resultadoAcao.sucesso
                                            ? 'bg-green-500/5 border border-green-500/10'
                                            : 'bg-red-500/5 border border-red-500/10'
                                        }`}>
                                        {resultadoAcao.sucesso
                                            ? <CheckCircle size={14} className="text-green-400" />
                                            : <XCircle size={14} className="text-red-400" />
                                        }
                                        <p className={`text-[12px] font-medium ${resultadoAcao.sucesso ? 'text-green-400' : 'text-red-400'}`}>
                                            {resultadoAcao.mensagem}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Ações rápidas */}
                            <div className="p-4">
                                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">⚡ Ações Rápidas</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {acoes.map(a => (
                                        <button
                                            key={a.key}
                                            onClick={() => executarAcao(a.key)}
                                            disabled={executando !== null}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all border border-transparent disabled:opacity-30 ${a.color}`}
                                        >
                                            {executando === a.key
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <a.icon size={13} />
                                            }
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Plano e idioma */}
                            <div className="px-4 pb-4">
                                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-3">🔧 Configurações</p>
                                <div className="flex flex-wrap gap-2">
                                    {[1, 2, 3, 4].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => executarAcao('trocar_plano', { plano: p })}
                                            disabled={executando !== null}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${selected.plano === p
                                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                                    : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-white/10'
                                                }`}
                                        >
                                            Plano {p}
                                        </button>
                                    ))}
                                    <div className="w-px h-6 bg-white/10 self-center mx-1" />
                                    {['pt-BR', 'en-US', 'es'].map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => executarAcao('trocar_idioma', { idioma: lang })}
                                            disabled={executando !== null}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${(selected.idioma || 'pt-BR') === lang
                                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                                                    : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-white/10'
                                                }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <Activity size={40} className="text-gray-700 mb-3" />
                            <p className="text-[13px] text-gray-500">Selecione uma clínica para ver o diagnóstico</p>
                            <p className="text-[11px] text-gray-600 mt-1">Ou clique &quot;Testar Conexões&quot; para visão geral</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
