'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Search, Filter, ArrowUpDown, Clock, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react'

type ConversaResumo = {
    id: string
    clinicaNome: string
    telefoneCliente: string
    nomeCliente: string | null
    totalMensagens: number
    ultimaMensagem: string | null
    ultimaData: string | null
    status: string
}

export default function AdminConversasPage() {
    const [conversas, setConversas] = useState<ConversaResumo[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')

    useEffect(() => {
        fetchConversas()
    }, [])

    const fetchConversas = async () => {
        try {
            const res = await fetch('/api/admin/conversas')
            if (res.ok) {
                const data = await res.json()
                setConversas(data.conversas || [])
            }
        } catch (e) {
            console.error('Erro ao carregar conversas:', e)
        } finally {
            setLoading(false)
        }
    }

    const conversasFiltradas = conversas.filter(c =>
        (c.nomeCliente || '').toLowerCase().includes(busca.toLowerCase()) ||
        c.telefoneCliente.includes(busca) ||
        c.clinicaNome.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <MessageSquare className="text-violet-400" size={24} />
                    Conversas
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Visão geral de todas as conversas do sistema
                </p>
            </div>

            {/* Busca */}
            <div className="mb-6">
                <div className="relative w-full max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou clínica..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                </div>
            ) : conversas.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/50 rounded-xl border border-gray-800">
                    <MessageSquare size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">Nenhuma conversa encontrada</p>
                    <p className="text-gray-600 text-sm mt-1">As conversas aparecerão aqui quando clientes interagirem com a IARA</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {conversasFiltradas.map(c => (
                        <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-violet-500/30 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                                        <User size={16} className="text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{c.nomeCliente || c.telefoneCliente}</p>
                                        <p className="text-gray-500 text-xs">{c.clinicaNome} · {c.totalMensagens} msgs</p>
                                    </div>
                                </div>
                                {c.ultimaData && (
                                    <div className="text-right">
                                        <p className="text-gray-500 text-xs flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(c.ultimaData).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {c.ultimaMensagem && (
                                <p className="text-gray-400 text-xs mt-2 truncate pl-13">{c.ultimaMensagem}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
