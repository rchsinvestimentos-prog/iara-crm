'use client'

import { useState } from 'react'
import { AlertTriangle, Search, Filter, RefreshCw, Clock, XCircle, AlertCircle, CheckCircle } from 'lucide-react'

interface LogEntry {
    id: number
    timestamp: string
    tipo: 'ERROR' | 'WARNING' | 'INFO' | 'SUCCESS'
    flow: string
    clinica: string
    mensagem: string
    detalhes: string
}

const logs: LogEntry[] = [
    { id: 1, timestamp: '2026-02-24 17:23:01', tipo: 'ERROR', flow: 'F8 — Mensageiro', clinica: 'Dra. Beatriz', mensagem: 'Falha ao enviar mensagem WhatsApp', detalhes: 'Evolution API retornou 503 — instância desconectada' },
    { id: 2, timestamp: '2026-02-24 17:15:44', tipo: 'WARNING', flow: 'F4 — Transcrição', clinica: 'Dra. Ana', mensagem: 'Timeout no download do áudio', detalhes: 'Áudio de 45s excedeu timeout de 30s. Retentativa 2/3 bem-sucedida.' },
    { id: 3, timestamp: '2026-02-24 16:58:12', tipo: 'SUCCESS', flow: 'F5 — IA Texto', clinica: 'Dra. Diana', mensagem: 'Agendamento realizado com sucesso', detalhes: 'Lead Maria Santos agendou para 25/02 às 14h — Google Calendar atualizado' },
    { id: 4, timestamp: '2026-02-24 16:45:33', tipo: 'WARNING', flow: 'F5 — IA Texto', clinica: 'Dra. Diana', mensagem: 'Rate limit OpenAI atingido', detalhes: 'Aguardou 2s e fez retry. Resposta gerada em 3.2s total.' },
    { id: 5, timestamp: '2026-02-24 16:30:00', tipo: 'INFO', flow: 'F10 — Segurança', clinica: 'Sistema', mensagem: 'Bloqueio de spam detectado', detalhes: 'Número 5511999990000 bloqueado por enviar 15 msgs em 60s.' },
    { id: 6, timestamp: '2026-02-24 16:12:18', tipo: 'ERROR', flow: 'F6 — Calendar', clinica: 'Dra. Carla', mensagem: 'Token Google Calendar expirado', detalhes: 'Refresh token falhou (401 Unauthorized). Cliente precisa reconectar.' },
    { id: 7, timestamp: '2026-02-24 15:55:09', tipo: 'SUCCESS', flow: 'F7 — Follow-up', clinica: 'Dra. Elena', mensagem: 'Follow-up enviado com sucesso', detalhes: 'Lead recuperado: Fernanda respondeu ao follow-up de 24h.' },
    { id: 8, timestamp: '2026-02-24 15:30:44', tipo: 'INFO', flow: 'F1 — Receptor', clinica: 'Dra. Ana', mensagem: 'Nova conversa iniciada', detalhes: 'Lead Julia Mendes — primeira mensagem recebida.' },
    { id: 9, timestamp: '2026-02-24 15:10:22', tipo: 'WARNING', flow: 'F4 — Transcrição', clinica: 'Dra. Beatriz', mensagem: 'Áudio com baixa qualidade', detalhes: 'Transcrição pode ter imprecisões. Whisper confidence: 72%.' },
    { id: 10, timestamp: '2026-02-24 14:45:11', tipo: 'ERROR', flow: 'F8 — Mensageiro', clinica: 'Dra. Gabriela', mensagem: 'Instância WhatsApp não encontrada', detalhes: 'Clínica inadimplente — instância removida em 20/02.' },
]

const tipoConfig = {
    ERROR: { icon: XCircle, cor: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500' },
    WARNING: { icon: AlertCircle, cor: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-l-amber-500' },
    INFO: { icon: AlertTriangle, cor: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-l-blue-500' },
    SUCCESS: { icon: CheckCircle, cor: 'text-green-400', bg: 'bg-green-500/10', border: 'border-l-green-500' },
}

export default function AdminLogs() {
    const [filtroTipo, setFiltroTipo] = useState('todos')
    const [busca, setBusca] = useState('')
    const [expandido, setExpandido] = useState<number | null>(null)

    const filtrados = logs.filter(l => {
        const matchTipo = filtroTipo === 'todos' || l.tipo === filtroTipo
        const matchBusca = busca === '' || l.mensagem.toLowerCase().includes(busca.toLowerCase()) || l.clinica.toLowerCase().includes(busca.toLowerCase()) || l.flow.toLowerCase().includes(busca.toLowerCase())
        return matchTipo && matchBusca
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Logs & Erros</h1>
                    <p className="text-gray-500 text-sm mt-1">Monitoramento em tempo real dos fluxos N8N</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/20 text-violet-300 rounded-xl text-sm font-medium hover:bg-violet-500/30 transition-colors">
                    <RefreshCw size={14} /> Atualizar
                </button>
            </div>

            {/* Contadores rápidos */}
            <div className="grid grid-cols-4 gap-3">
                {(['ERROR', 'WARNING', 'INFO', 'SUCCESS'] as const).map((tipo) => {
                    const config = tipoConfig[tipo]
                    const count = logs.filter(l => l.tipo === tipo).length
                    return (
                        <button
                            key={tipo}
                            onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
                            className={`p-3 rounded-xl border transition-all ${filtroTipo === tipo ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/5 bg-white/5 hover:bg-white/8'
                                }`}
                        >
                            <config.icon size={18} className={config.cor} />
                            <p className="text-xl font-bold text-white mt-1">{count}</p>
                            <p className="text-xs text-gray-500">{tipo}</p>
                        </button>
                    )
                })}
            </div>

            {/* Busca */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por mensagem, clínica ou flow..."
                />
            </div>

            {/* Lista de logs */}
            <div className="space-y-2">
                {filtrados.map((log) => {
                    const config = tipoConfig[log.tipo]
                    const isOpen = expandido === log.id
                    return (
                        <div
                            key={log.id}
                            className={`bg-white/5 border border-white/5 rounded-xl overflow-hidden border-l-4 ${config.border} cursor-pointer transition-all hover:bg-white/8`}
                            onClick={() => setExpandido(isOpen ? null : log.id)}
                        >
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <config.icon size={16} className={config.cor} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{log.mensagem}</p>
                                        <p className="text-gray-500 text-xs mt-0.5">
                                            {log.flow} • {log.clinica}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.cor}`}>
                                        {log.tipo}
                                    </span>
                                    <span className="text-gray-600 text-xs flex items-center gap-1">
                                        <Clock size={10} />
                                        {log.timestamp.split(' ')[1]}
                                    </span>
                                </div>
                            </div>
                            {isOpen && (
                                <div className="px-4 pb-4 border-t border-white/5 pt-3">
                                    <p className="text-gray-400 text-sm">{log.detalhes}</p>
                                    <p className="text-gray-600 text-xs mt-2">{log.timestamp}</p>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
