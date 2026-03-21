'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Palmtree, Plus, Trash2, Loader2, CalendarOff } from 'lucide-react'

interface Ausencia {
    inicio: string
    fim: string
    motivo: string
}

export default function FeriasPage() {
    const { data: session } = useSession()
    const [ausencias, setAusencias] = useState<Ausencia[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Nova ausência em edição
    const [novaInicio, setNovaInicio] = useState('')
    const [novaFim, setNovaFim] = useState('')
    const [novaMotivo, setNovaMotivo] = useState('')

    useEffect(() => {
        fetch('/api/profissional/me')
            .then(r => r.json())
            .then(data => {
                if (data.ausencias && Array.isArray(data.ausencias)) {
                    setAusencias(data.ausencias)
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const adicionarAusencia = () => {
        if (!novaInicio || !novaFim) {
            alert('Preencha as datas de início e fim')
            return
        }
        if (new Date(novaFim) < new Date(novaInicio)) {
            alert('Data fim deve ser posterior à data início')
            return
        }
        const nova: Ausencia = {
            inicio: novaInicio,
            fim: novaFim,
            motivo: novaMotivo || 'Férias'
        }
        const novaLista = [...ausencias, nova]
        setAusencias(novaLista)
        salvar(novaLista)
        setNovaInicio('')
        setNovaFim('')
        setNovaMotivo('')
    }

    const removerAusencia = (index: number) => {
        const novaLista = ausencias.filter((_, i) => i !== index)
        setAusencias(novaLista)
        salvar(novaLista)
    }

    const salvar = async (lista: Ausencia[]) => {
        setSaving(true)
        try {
            await fetch('/api/profissional/ferias', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ausencias: lista })
            })
        } catch (err) {
            console.error('Erro ao salvar férias:', err)
            alert('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const hoje = new Date().toISOString().split('T')[0]
    const ausenciasFuturas = ausencias.filter(a => a.fim >= hoje)
    const ausenciasPassadas = ausencias.filter(a => a.fim < hoje)

    // Check if currently on vacation
    const emFerias = ausencias.some(a => a.inicio <= hoje && a.fim >= hoje)

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin" size={24} />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <Palmtree size={28} className="text-amber-500" />
                <div>
                    <h1 className="text-2xl font-bold">Modo Férias</h1>
                    <p className="text-sm opacity-60">Gerencie seus períodos de ausência e folgas</p>
                </div>
            </div>

            {/* Status atual */}
            {emFerias && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2">
                        <CalendarOff size={20} className="text-amber-500" />
                        <span className="font-medium text-amber-400">Você está em período de férias agora</span>
                    </div>
                    <p className="text-sm opacity-60 mt-1">
                        A IARA não agendará pacientes para você durante este período.
                    </p>
                </div>
            )}

            {/* Adicionar nova ausência */}
            <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Plus size={18} />
                    Adicionar período de ausência
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label className="text-xs opacity-60 mb-1 block">Data início</label>
                        <input
                            type="date"
                            value={novaInicio}
                            onChange={e => setNovaInicio(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg text-sm"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    </div>
                    <div>
                        <label className="text-xs opacity-60 mb-1 block">Data fim</label>
                        <input
                            type="date"
                            value={novaFim}
                            onChange={e => setNovaFim(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg text-sm"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="text-xs opacity-60 mb-1 block">Motivo (opcional)</label>
                    <input
                        type="text"
                        value={novaMotivo}
                        onChange={e => setNovaMotivo(e.target.value)}
                        placeholder="Férias, congresso, folga..."
                        className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                </div>
                <button
                    onClick={adicionarAusencia}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{ backgroundColor: '#d4a853', color: '#1a1a2e' }}
                >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                    Adicionar
                </button>
            </div>

            {/* Ausências futuras / ativas */}
            {ausenciasFuturas.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-3">
                        Próximas ausências
                    </h3>
                    <div className="space-y-2">
                        {ausenciasFuturas.map((a, i) => {
                            const originalIndex = ausencias.indexOf(a)
                            const ativa = a.inicio <= hoje && a.fim >= hoje
                            return (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg"
                                    style={{
                                        backgroundColor: ativa ? 'rgba(212,168,83,0.1)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${ativa ? 'rgba(212,168,83,0.3)' : 'rgba(255,255,255,0.06)'}`
                                    }}
                                >
                                    <div>
                                        <span className="text-sm font-medium">
                                            {new Date(a.inicio + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(a.fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                        {a.motivo && <span className="text-xs opacity-50 ml-2">({a.motivo})</span>}
                                        {ativa && <span className="text-xs text-amber-400 ml-2 font-medium">• ATIVA</span>}
                                    </div>
                                    <button
                                        onClick={() => removerAusencia(originalIndex)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Ausências passadas */}
            {ausenciasPassadas.length > 0 && (
                <div className="opacity-40">
                    <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">
                        Ausências passadas
                    </h3>
                    <div className="space-y-2">
                        {ausenciasPassadas.map((a, i) => {
                            const originalIndex = ausencias.indexOf(a)
                            return (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                                >
                                    <div>
                                        <span className="text-sm">
                                            {new Date(a.inicio + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(a.fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                                        </span>
                                        {a.motivo && <span className="text-xs opacity-50 ml-2">({a.motivo})</span>}
                                    </div>
                                    <button
                                        onClick={() => removerAusencia(originalIndex)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {ausencias.length === 0 && (
                <div className="text-center py-12 opacity-40">
                    <Palmtree size={48} className="mx-auto mb-3" />
                    <p>Nenhuma ausência cadastrada</p>
                    <p className="text-sm mt-1">Adicione períodos de férias ou folgas acima</p>
                </div>
            )}
        </div>
    )
}
