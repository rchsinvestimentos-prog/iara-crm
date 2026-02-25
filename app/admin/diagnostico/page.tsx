'use client'

import { useState } from 'react'
import { Search, RefreshCw, CheckCircle, XCircle, AlertTriangle, Wifi, Server, MessageSquare, Calendar, CreditCard, Clock, ChevronDown, Send, Zap, Activity } from 'lucide-react'

type Status = 'ok' | 'warning' | 'error'

interface ClinicaDiag {
    id: string
    nome: string
    plano: string
    checks: {
        whatsapp: { status: Status; detail: string; lastPing: string }
        n8n: { status: Status; detail: string; fluxosAtivos: number }
        banco: { status: Status; detail: string }
        ultimaMsg: { status: Status; detail: string; tempo: string }
        creditos: { status: Status; detail: string; restantes: number; total: number }
        agendamentos: { status: Status; detail: string; hoje: number }
    }
}

const clinicas: ClinicaDiag[] = [
    {
        id: '1', nome: 'Studio Ana Silva', plano: 'Secretária',
        checks: {
            whatsapp: { status: 'ok', detail: 'Instância conectada (Evolution API)', lastPing: '2s atrás' },
            n8n: { status: 'ok', detail: '3 fluxos ativos — Receptor, IA Texto, Mensageiro', fluxosAtivos: 3 },
            banco: { status: 'ok', detail: 'PostgreSQL respondendo (12ms)' },
            ultimaMsg: { status: 'ok', detail: 'Última mensagem processada', tempo: '3 min atrás' },
            creditos: { status: 'ok', detail: 'Créditos suficientes', restantes: 78, total: 100 },
            agendamentos: { status: 'ok', detail: 'Sistema funcionando', hoje: 4 },
        }
    },
    {
        id: '2', nome: 'Espaço Bella', plano: 'Estrategista',
        checks: {
            whatsapp: { status: 'error', detail: 'Instância desconectada — QR Code expirado', lastPing: '2h atrás' },
            n8n: { status: 'warning', detail: '2 de 5 fluxos com erro — F4 Transcrição, F6 Vídeo', fluxosAtivos: 3 },
            banco: { status: 'ok', detail: 'PostgreSQL respondendo (8ms)' },
            ultimaMsg: { status: 'error', detail: 'Sem mensagens há 2h (WhatsApp off)', tempo: '2h atrás' },
            creditos: { status: 'warning', detail: 'Poucos créditos restantes', restantes: 8, total: 200 },
            agendamentos: { status: 'ok', detail: 'Sistema funcionando', hoje: 2 },
        }
    },
    {
        id: '3', nome: 'Dra. Camila Santos', plano: 'Audiovisual',
        checks: {
            whatsapp: { status: 'ok', detail: 'Instância conectada (Evolution API)', lastPing: '1s atrás' },
            n8n: { status: 'ok', detail: '7 fluxos ativos — todos operacionais', fluxosAtivos: 7 },
            banco: { status: 'ok', detail: 'PostgreSQL respondendo (5ms)' },
            ultimaMsg: { status: 'ok', detail: 'Última mensagem processada', tempo: '45s atrás' },
            creditos: { status: 'ok', detail: 'Créditos suficientes', restantes: 340, total: 500 },
            agendamentos: { status: 'ok', detail: 'Sistema funcionando', hoje: 7 },
        }
    },
    {
        id: '4', nome: 'Clínica Renascer', plano: 'Secretária',
        checks: {
            whatsapp: { status: 'ok', detail: 'Instância conectada (Evolution API)', lastPing: '5s atrás' },
            n8n: { status: 'warning', detail: '1 fluxo com timeout — F5 IA Texto (OpenAI lento)', fluxosAtivos: 2 },
            banco: { status: 'ok', detail: 'PostgreSQL respondendo (15ms)' },
            ultimaMsg: { status: 'warning', detail: 'Última resposta demorou 12s (normal: <3s)', tempo: '8 min atrás' },
            creditos: { status: 'ok', detail: 'Créditos suficientes', restantes: 45, total: 100 },
            agendamentos: { status: 'ok', detail: 'Sistema funcionando', hoje: 1 },
        }
    },
]

const statusIcon = (s: Status) => {
    if (s === 'ok') return <CheckCircle size={14} className="text-green-400" />
    if (s === 'warning') return <AlertTriangle size={14} className="text-amber-400" />
    return <XCircle size={14} className="text-red-400" />
}

const statusColor = (s: Status) => {
    if (s === 'ok') return 'text-green-400 bg-green-500/10 border-green-500/20'
    if (s === 'warning') return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    return 'text-red-400 bg-red-500/10 border-red-500/20'
}

const overallStatus = (c: ClinicaDiag): Status => {
    const statuses = Object.values(c.checks).map(ch => ch.status)
    if (statuses.includes('error')) return 'error'
    if (statuses.includes('warning')) return 'warning'
    return 'ok'
}

const overallLabel = (s: Status) => {
    if (s === 'ok') return 'Tudo OK'
    if (s === 'warning') return 'Atenção'
    return 'Problema'
}

export default function DiagnosticoPage() {
    const [selected, setSelected] = useState<string | null>(null)
    const [scanning, setScanning] = useState(false)
    const [search, setSearch] = useState('')

    const filtered = clinicas.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))
    const selectedClinica = clinicas.find(c => c.id === selected)

    const totalOk = clinicas.filter(c => overallStatus(c) === 'ok').length
    const totalWarning = clinicas.filter(c => overallStatus(c) === 'warning').length
    const totalError = clinicas.filter(c => overallStatus(c) === 'error').length

    const handleScan = () => {
        setScanning(true)
        setTimeout(() => setScanning(false), 2000)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Diagnóstico</h1>
                    <p className="text-sm text-gray-400 mt-1">Health check automático de cada clínica</p>
                </div>
                <button
                    onClick={handleScan}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${scanning
                            ? 'bg-violet-500/20 text-violet-300'
                            : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20'
                        }`}
                >
                    <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                    {scanning ? 'Escaneando...' : 'Escanear Todas'}
                </button>
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <Activity size={16} className="text-violet-400" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{clinicas.length}</p>
                    <p className="text-[10px] text-gray-500">clínicas monitoradas</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">OK</span>
                    </div>
                    <p className="text-2xl font-bold text-green-400">{totalOk}</p>
                    <p className="text-[10px] text-gray-500">funcionando 100%</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Atenção</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{totalWarning}</p>
                    <p className="text-[10px] text-gray-500">com alertas</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <XCircle size={16} className="text-red-400" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Crítico</span>
                    </div>
                    <p className="text-2xl font-bold text-red-400">{totalError}</p>
                    <p className="text-[10px] text-gray-500">com problemas</p>
                </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
                {/* Lista de clínicas */}
                <div className="col-span-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
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
                        {filtered.map(c => {
                            const status = overallStatus(c)
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => setSelected(c.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all ${selected === c.id ? 'bg-violet-500/10' : 'hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {statusIcon(status)}
                                        <div>
                                            <p className="text-[13px] font-medium text-white">{c.nome}</p>
                                            <p className="text-[10px] text-gray-500">{c.plano}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(status)}`}>
                                        {overallLabel(status)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Detalhes do diagnóstico */}
                <div className="col-span-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                    {selectedClinica ? (
                        <>
                            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[14px] font-semibold text-white">{selectedClinica.nome}</h3>
                                    <p className="text-[11px] text-gray-500">Plano {selectedClinica.plano} • Diagnóstico detalhado</p>
                                </div>
                                <button
                                    onClick={handleScan}
                                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                                >
                                    <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
                                    Re-escanear
                                </button>
                            </div>

                            <div className="p-4 space-y-2">
                                {/* WhatsApp */}
                                <CheckRow
                                    icon={<Wifi size={15} />}
                                    label="WhatsApp (Evolution API)"
                                    status={selectedClinica.checks.whatsapp.status}
                                    detail={selectedClinica.checks.whatsapp.detail}
                                    extra={`Último ping: ${selectedClinica.checks.whatsapp.lastPing}`}
                                />

                                {/* N8N */}
                                <CheckRow
                                    icon={<Server size={15} />}
                                    label="N8N — Fluxos"
                                    status={selectedClinica.checks.n8n.status}
                                    detail={selectedClinica.checks.n8n.detail}
                                    extra={`${selectedClinica.checks.n8n.fluxosAtivos} fluxos ativos`}
                                />

                                {/* Banco */}
                                <CheckRow
                                    icon={<Zap size={15} />}
                                    label="Banco de Dados"
                                    status={selectedClinica.checks.banco.status}
                                    detail={selectedClinica.checks.banco.detail}
                                />

                                {/* Última mensagem */}
                                <CheckRow
                                    icon={<MessageSquare size={15} />}
                                    label="Última Mensagem"
                                    status={selectedClinica.checks.ultimaMsg.status}
                                    detail={selectedClinica.checks.ultimaMsg.detail}
                                    extra={selectedClinica.checks.ultimaMsg.tempo}
                                />

                                {/* Créditos */}
                                <CheckRow
                                    icon={<CreditCard size={15} />}
                                    label="Créditos"
                                    status={selectedClinica.checks.creditos.status}
                                    detail={selectedClinica.checks.creditos.detail}
                                    extra={`${selectedClinica.checks.creditos.restantes}/${selectedClinica.checks.creditos.total} restantes`}
                                    progress={selectedClinica.checks.creditos.restantes / selectedClinica.checks.creditos.total}
                                />

                                {/* Agendamentos */}
                                <CheckRow
                                    icon={<Calendar size={15} />}
                                    label="Agendamentos"
                                    status={selectedClinica.checks.agendamentos.status}
                                    detail={selectedClinica.checks.agendamentos.detail}
                                    extra={`${selectedClinica.checks.agendamentos.hoje} hoje`}
                                />
                            </div>

                            {/* Ações rápidas */}
                            {overallStatus(selectedClinica) !== 'ok' && (
                                <div className="px-4 pb-4">
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                        <p className="text-[12px] font-semibold text-red-400 mb-2">⚡ Ações Sugeridas:</p>
                                        <div className="space-y-1.5">
                                            {selectedClinica.checks.whatsapp.status !== 'ok' && (
                                                <p className="text-[11px] text-gray-400">• Reconectar WhatsApp → Enviar novo QR Code</p>
                                            )}
                                            {selectedClinica.checks.n8n.status !== 'ok' && (
                                                <p className="text-[11px] text-gray-400">• Verificar fluxos N8N → Reiniciar fluxos com erro</p>
                                            )}
                                            {selectedClinica.checks.creditos.status !== 'ok' && (
                                                <p className="text-[11px] text-gray-400">• Créditos baixos → Notificar cliente sobre upgrade</p>
                                            )}
                                            {selectedClinica.checks.ultimaMsg.status !== 'ok' && (
                                                <p className="text-[11px] text-gray-400">• Sem mensagens → Verificar se WhatsApp está ativo</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                            <Activity size={40} className="text-gray-700 mb-3" />
                            <p className="text-[13px] text-gray-500">Selecione uma clínica para ver o diagnóstico</p>
                            <p className="text-[11px] text-gray-600 mt-1">Ou clique "Escanear Todas" para visão geral</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function CheckRow({ icon, label, status, detail, extra, progress }: {
    icon: React.ReactNode
    label: string
    status: Status
    detail: string
    extra?: string
    progress?: number
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
            <div className="text-gray-500">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[12px] font-medium text-white">{label}</p>
                    {statusIcon(status)}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{detail}</p>
                {progress !== undefined && (
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${progress > 0.3 ? 'bg-green-400' : progress > 0.1 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                )}
            </div>
            {extra && (
                <span className="text-[10px] text-gray-500 flex-shrink-0">{extra}</span>
            )}
        </div>
    )
}
