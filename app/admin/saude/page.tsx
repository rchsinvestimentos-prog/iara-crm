'use client'

import { useState, useEffect } from 'react'
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Server, Database, Wifi, Clock } from 'lucide-react'

type HealthCheck = {
    service: string
    status: 'ok' | 'warn' | 'error'
    latency?: number
    details?: string
}

export default function AdminSaudePage() {
    const [checks, setChecks] = useState<HealthCheck[]>([])
    const [loading, setLoading] = useState(true)
    const [lastCheck, setLastCheck] = useState<Date | null>(null)

    const runHealthChecks = async () => {
        setLoading(true)
        try {
            // Check API health
            const apiStart = Date.now()
            const res = await fetch('/api/health')
            const apiLatency = Date.now() - apiStart

            const results: HealthCheck[] = [
                {
                    service: 'API Server',
                    status: res.ok ? 'ok' : 'error',
                    latency: apiLatency,
                    details: res.ok ? 'Respondendo normalmente' : `HTTP ${res.status}`
                },
            ]

            // Check database via admin endpoint
            try {
                const dbStart = Date.now()
                const dbRes = await fetch('/api/admin/health')
                const dbLatency = Date.now() - dbStart
                if (dbRes.ok) {
                    const dbData = await dbRes.json()
                    results.push({
                        service: 'Database (PostgreSQL)',
                        status: dbData.db === 'ok' ? 'ok' : 'warn',
                        latency: dbLatency,
                        details: dbData.db === 'ok' ? 'Conectado e respondendo' : 'Lentidão detectada'
                    })
                } else {
                    results.push({ service: 'Database', status: 'error', details: 'Sem resposta' })
                }
            } catch {
                results.push({ service: 'Database', status: 'warn', details: 'Endpoint /api/admin/health não disponível' })
            }

            // Evolution API check
            try {
                const evoRes = await fetch('/api/instancias')
                results.push({
                    service: 'Evolution API',
                    status: evoRes.ok ? 'ok' : 'warn',
                    details: evoRes.ok ? 'Disponível' : 'Indisponível'
                })
            } catch {
                results.push({ service: 'Evolution API', status: 'warn', details: 'Não acessível' })
            }

            setChecks(results)
            setLastCheck(new Date())
        } catch (e) {
            setChecks([{ service: 'Sistema', status: 'error', details: 'Falha ao verificar saúde do sistema' }])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        runHealthChecks()
    }, [])

    const statusIcon = (s: string) => {
        if (s === 'ok') return <CheckCircle2 size={16} className="text-green-400" />
        if (s === 'warn') return <AlertTriangle size={16} className="text-yellow-400" />
        return <XCircle size={16} className="text-red-400" />
    }

    const statusColor = (s: string) => {
        if (s === 'ok') return 'border-green-500/20 bg-green-500/5'
        if (s === 'warn') return 'border-yellow-500/20 bg-yellow-500/5'
        return 'border-red-500/20 bg-red-500/5'
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Activity className="text-green-400" size={24} />
                        Saúde do Sistema
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Status dos serviços e integrações
                    </p>
                </div>
                <button
                    onClick={runHealthChecks}
                    disabled={loading}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Verificar
                </button>
            </div>

            {lastCheck && (
                <p className="text-gray-600 text-xs mb-4 flex items-center gap-1">
                    <Clock size={12} />
                    Última verificação: {lastCheck.toLocaleString('pt-BR')}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading && checks.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse">
                            <div className="h-4 bg-gray-800 rounded w-2/3 mb-3" />
                            <div className="h-3 bg-gray-800 rounded w-1/2" />
                        </div>
                    ))
                ) : (
                    checks.map(c => (
                        <div key={c.service} className={`rounded-xl border p-5 transition-all ${statusColor(c.status)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-medium text-sm">{c.service}</span>
                                {statusIcon(c.status)}
                            </div>
                            {c.details && <p className="text-gray-400 text-xs">{c.details}</p>}
                            {c.latency !== undefined && (
                                <p className="text-gray-500 text-xs mt-1">{c.latency}ms</p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
