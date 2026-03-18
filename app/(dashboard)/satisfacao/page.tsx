'use client'

import { useEffect, useState } from 'react'
import { Star, TrendingUp, TrendingDown, Minus, Send, Settings2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

interface Avaliacao {
    id: string
    telefone: string
    nome: string | null
    nota: number
    comentario: string | null
    googleReviewEnviado: boolean
    createdAt: string
}

interface StatsNPS {
    avaliacoes: Avaliacao[]
    nps: number
    media: number
    total: number
    promotores: number
    detratores: number
    neutros: number
}

export default function SatisfacaoPage() {
    const [data, setData] = useState<StatsNPS | null>(null)
    const [loading, setLoading] = useState(true)
    const [periodo, setPeriodo] = useState(30)
    const [configOpen, setConfigOpen] = useState(false)
    const [config, setConfig] = useState({
        satisfacaoAtiva: true,
        horasAposAtendimento: 24,
        mensagemSatisfacao: 'Oi {nome}! 😊 Como foi seu atendimento? Avalie de 1 a 5 estrelas:\n1⭐ - Ruim\n2⭐ - Regular\n3⭐ - Bom\n4⭐ - Ótimo\n5⭐ - Excelente',
        googleReviewAtivo: true,
        linkGoogleReview: '',
        mensagemGoogleReview: '',
    })
    const [salvando, setSalvando] = useState(false)
    const [toast, setToast] = useState('')

    // Form para lançar avaliação manual
    const [formOpen, setFormOpen] = useState(false)
    const [formTelefone, setFormTelefone] = useState('')
    const [formNome, setFormNome] = useState('')
    const [formNota, setFormNota] = useState(5)
    const [formComentario, setFormComentario] = useState('')
    const [enviando, setEnviando] = useState(false)

    useEffect(() => {
        fetchData()
        fetchConfig()
    }, [periodo])

    async function fetchData() {
        setLoading(true)
        try {
            const res = await fetch(`/api/satisfacao?dias=${periodo}`)
            if (res.ok) setData(await res.json())
        } catch (err) {
            console.error('Erro:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchConfig() {
        try {
            const res = await fetch('/api/configuracoes')
            if (res.ok) {
                const d = await res.json()
                const c = d.configuracoes || {}
                setConfig(prev => ({
                    ...prev,
                    satisfacaoAtiva: c.satisfacaoAtiva !== false,
                    horasAposAtendimento: c.horasAposAtendimento || 24,
                    mensagemSatisfacao: c.mensagemSatisfacao || prev.mensagemSatisfacao,
                    googleReviewAtivo: c.googleReviewAtivo !== false,
                    linkGoogleReview: c.linkGoogleReview || '',
                    mensagemGoogleReview: c.mensagemGoogleReview || '',
                }))
            }
        } catch { /* ignore */ }
    }

    async function salvarConfig() {
        setSalvando(true)
        try {
            await fetch('/api/configuracoes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    configuracoes: {
                        satisfacaoAtiva: config.satisfacaoAtiva,
                        horasAposAtendimento: config.horasAposAtendimento,
                        mensagemSatisfacao: config.mensagemSatisfacao,
                        googleReviewAtivo: config.googleReviewAtivo,
                        linkGoogleReview: config.linkGoogleReview,
                        mensagemGoogleReview: config.mensagemGoogleReview,
                    }
                }),
            })
            showToast('Configurações salvas! ✅')
        } catch {
            showToast('Erro ao salvar')
        } finally {
            setSalvando(false)
        }
    }

    async function enviarAvaliacao() {
        if (!formTelefone) return
        setEnviando(true)
        try {
            const res = await fetch('/api/satisfacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telefone: formTelefone,
                    nome: formNome || null,
                    nota: formNota,
                    comentario: formComentario || null,
                }),
            })
            if (res.ok) {
                showToast('Avaliação registrada! ⭐')
                setFormOpen(false)
                setFormTelefone('')
                setFormNome('')
                setFormNota(5)
                setFormComentario('')
                fetchData()
            }
        } catch {
            showToast('Erro ao registrar')
        } finally {
            setEnviando(false)
        }
    }

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(''), 3000)
    }

    function getNPSColor(nps: number) {
        if (nps >= 50) return '#06D6A0'
        if (nps >= 0) return '#F59E0B'
        return '#EF4444'
    }

    function getNPSLabel(nps: number) {
        if (nps >= 75) return 'Excelente'
        if (nps >= 50) return 'Ótimo'
        if (nps >= 0) return 'Bom'
        if (nps >= -50) return 'Regular'
        return 'Crítico'
    }

    const stars = [1, 2, 3, 4, 5]

    return (
        <div className="max-w-5xl space-y-6">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-[13px] font-medium animate-fade-in"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        ⭐ Pesquisa de Satisfação
                    </h1>
                    <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Acompanhe o NPS e avaliações dos seus clientes
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filtro período */}
                    <select
                        value={periodo}
                        onChange={e => setPeriodo(Number(e.target.value))}
                        className="text-[12px] px-3 py-2 rounded-xl outline-none"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    >
                        <option value={7}>Últimos 7 dias</option>
                        <option value={30}>Últimos 30 dias</option>
                        <option value={90}>Últimos 90 dias</option>
                        <option value={365}>Último ano</option>
                    </select>

                    {/* Botão registrar avaliação */}
                    <button
                        onClick={() => setFormOpen(!formOpen)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-white transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #D99773, #BF7D5B)' }}
                    >
                        <Star size={13} /> Nova Avaliação
                    </button>
                </div>
            </div>

            {/* Form registrar avaliação inline */}
            {formOpen && (
                <div className="rounded-2xl p-5 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Star size={16} className="text-[#D99773]" /> Registrar Avaliação
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <input
                            placeholder="Telefone (obrigatório)"
                            value={formTelefone}
                            onChange={e => setFormTelefone(e.target.value)}
                            className="text-[13px] px-3 py-2.5 rounded-xl outline-none w-full"
                            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                        <input
                            placeholder="Nome (opcional)"
                            value={formNome}
                            onChange={e => setFormNome(e.target.value)}
                            className="text-[13px] px-3 py-2.5 rounded-xl outline-none w-full"
                            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Nota visual com estrelas */}
                    <div className="mb-4">
                        <label className="text-[12px] font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>Nota</label>
                        <div className="flex gap-1">
                            {stars.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFormNota(s)}
                                    className="p-1 transition-all hover:scale-110"
                                >
                                    <Star
                                        size={28}
                                        fill={s <= formNota ? '#F59E0B' : 'transparent'}
                                        className={s <= formNota ? 'text-yellow-400' : 'text-gray-600'}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea
                        placeholder="Comentário (opcional)"
                        value={formComentario}
                        onChange={e => setFormComentario(e.target.value)}
                        rows={2}
                        className="text-[13px] px-3 py-2.5 rounded-xl outline-none w-full resize-none mb-3"
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={enviarAvaliacao}
                            disabled={enviando || !formTelefone}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium text-white disabled:opacity-50 transition-all"
                            style={{ background: 'linear-gradient(135deg, #06D6A0, #059669)' }}
                        >
                            {enviando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            {enviando ? 'Salvando...' : 'Registrar'}
                        </button>
                        <button
                            onClick={() => setFormOpen(false)}
                            className="px-4 py-2 rounded-xl text-[12px]"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* NPS Gauge + Stats */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#D99773]" />
                </div>
            ) : data && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* NPS Score Grande */}
                    <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <p className="text-[11px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>NPS Score</p>
                        <div className="relative w-32 h-32 mx-auto mb-3">
                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-subtle)" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="42" fill="none"
                                    stroke={getNPSColor(data.nps)}
                                    strokeWidth="8"
                                    strokeDasharray={`${Math.max(0, (data.nps + 100) / 200 * 264)} 264`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold" style={{ color: getNPSColor(data.nps) }}>
                                    {data.nps}
                                </span>
                            </div>
                        </div>
                        <span className="text-[12px] font-medium px-3 py-1 rounded-full"
                            style={{ backgroundColor: `${getNPSColor(data.nps)}15`, color: getNPSColor(data.nps) }}>
                            {getNPSLabel(data.nps)}
                        </span>
                    </div>

                    {/* Média e Total */}
                    <div className="space-y-4">
                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                                    <Star size={18} className="text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {data.media} <span className="text-[14px] font-normal" style={{ color: 'var(--text-muted)' }}>/ 5</span>
                                    </p>
                                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Média geral</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.total}</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Avaliações no período</p>
                        </div>
                    </div>

                    {/* Distribuição */}
                    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                        <p className="text-[12px] font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>Distribuição</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <TrendingUp size={16} className="text-green-400" />
                                <div className="flex-1">
                                    <div className="flex justify-between text-[12px] mb-1">
                                        <span style={{ color: 'var(--text-secondary)' }}>Promotores (4-5⭐)</span>
                                        <span className="font-medium text-green-400">{data.promotores}</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
                                        <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: data.total > 0 ? `${(data.promotores / data.total) * 100}%` : '0%' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Minus size={16} className="text-yellow-400" />
                                <div className="flex-1">
                                    <div className="flex justify-between text-[12px] mb-1">
                                        <span style={{ color: 'var(--text-secondary)' }}>Neutros (3⭐)</span>
                                        <span className="font-medium text-yellow-400">{data.neutros}</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
                                        <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: data.total > 0 ? `${(data.neutros / data.total) * 100}%` : '0%' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <TrendingDown size={16} className="text-red-400" />
                                <div className="flex-1">
                                    <div className="flex justify-between text-[12px] mb-1">
                                        <span style={{ color: 'var(--text-secondary)' }}>Detratores (1-2⭐)</span>
                                        <span className="font-medium text-red-400">{data.detratores}</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--border-subtle)' }}>
                                        <div className="h-full rounded-full bg-red-400 transition-all" style={{ width: data.total > 0 ? `${(data.detratores / data.total) * 100}%` : '0%' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Configurações com toggle simples */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <button
                    onClick={() => setConfigOpen(!configOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Settings2 size={16} className="text-[#D99773]" />
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Configurações</span>
                    </div>
                    {configOpen ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                </button>

                {configOpen && (
                    <div className="px-5 pb-5 space-y-5 animate-fade-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        {/* Toggle Pesquisa de Satisfação */}
                        <div className="flex items-center justify-between pt-4">
                            <div>
                                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Pesquisa Automática</p>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Envia pesquisa de satisfação após cada atendimento</p>
                            </div>
                            <button
                                onClick={() => setConfig(c => ({ ...c, satisfacaoAtiva: !c.satisfacaoAtiva }))}
                                className="relative w-12 h-6 rounded-full transition-all duration-300"
                                style={{ backgroundColor: config.satisfacaoAtiva ? '#06D6A0' : 'var(--border-default)' }}
                            >
                                <div
                                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                                    style={{ left: config.satisfacaoAtiva ? '28px' : '4px' }}
                                />
                            </button>
                        </div>

                        {config.satisfacaoAtiva && (
                            <>
                                {/* Timer */}
                                <div>
                                    <label className="text-[12px] font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                                        Enviar depois de
                                    </label>
                                    <div className="flex gap-2">
                                        {[2, 12, 24, 48].map(h => (
                                            <button
                                                key={h}
                                                onClick={() => setConfig(c => ({ ...c, horasAposAtendimento: h }))}
                                                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                                                style={{
                                                    backgroundColor: config.horasAposAtendimento === h ? '#D99773' : 'var(--bg-surface)',
                                                    color: config.horasAposAtendimento === h ? 'white' : 'var(--text-secondary)',
                                                    border: `1px solid ${config.horasAposAtendimento === h ? '#D99773' : 'var(--border-default)'}`,
                                                }}
                                            >
                                                {h}h
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Mensagem */}
                                <div>
                                    <label className="text-[12px] font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                                        Mensagem da pesquisa
                                    </label>
                                    <textarea
                                        value={config.mensagemSatisfacao}
                                        onChange={e => setConfig(c => ({ ...c, mensagemSatisfacao: e.target.value }))}
                                        rows={3}
                                        className="text-[12px] px-3 py-2.5 rounded-xl outline-none w-full resize-none"
                                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                    />
                                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Use {'{nome}'} para o nome do cliente
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Divisor */}
                        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

                        {/* Toggle Google Review */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Google Reviews</p>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Convida clientes que deram nota 4 ou 5 a avaliar no Google</p>
                            </div>
                            <button
                                onClick={() => setConfig(c => ({ ...c, googleReviewAtivo: !c.googleReviewAtivo }))}
                                className="relative w-12 h-6 rounded-full transition-all duration-300"
                                style={{ backgroundColor: config.googleReviewAtivo ? '#06D6A0' : 'var(--border-default)' }}
                            >
                                <div
                                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300"
                                    style={{ left: config.googleReviewAtivo ? '28px' : '4px' }}
                                />
                            </button>
                        </div>

                        {config.googleReviewAtivo && (
                            <div>
                                <label className="text-[12px] font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    Link do Google Reviews
                                </label>
                                <input
                                    placeholder="https://g.page/r/seu-negocio/review"
                                    value={config.linkGoogleReview}
                                    onChange={e => setConfig(c => ({ ...c, linkGoogleReview: e.target.value }))}
                                    className="text-[12px] px-3 py-2.5 rounded-xl outline-none w-full"
                                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                />
                                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                    Cole o link de avaliação do seu Google Meu Negócio
                                </p>
                            </div>
                        )}

                        {/* Botão salvar */}
                        <button
                            onClick={salvarConfig}
                            disabled={salvando}
                            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white disabled:opacity-50 transition-all"
                            style={{ background: 'linear-gradient(135deg, #D99773, #BF7D5B)' }}
                        >
                            {salvando ? 'Salvando...' : 'Salvar Configurações'}
                        </button>
                    </div>
                )}
            </div>

            {/* Lista de Avaliações */}
            {data && data.avaliacoes.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Avaliações Recentes
                        </h3>
                    </div>
                    {data.avaliacoes.map((a, i) => (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-4"
                            style={{ borderBottom: i < data.avaliacoes.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: a.nota >= 4 ? 'rgba(6,214,160,0.15)' : a.nota >= 3 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }}>
                                <span className="text-[12px] font-bold"
                                    style={{ color: a.nota >= 4 ? '#06D6A0' : a.nota >= 3 ? '#F59E0B' : '#EF4444' }}>
                                    {a.nota}⭐
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {a.nome || a.telefone}
                                </p>
                                {a.comentario && (
                                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                                        &quot;{a.comentario}&quot;
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {a.googleReviewEnviado && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Google ✓</span>
                                )}
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {data && data.avaliacoes.length === 0 && !loading && (
                <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <Star size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nenhuma avaliação ainda</p>
                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        Ative a pesquisa automática nas configurações ou registre uma avaliação manualmente
                    </p>
                </div>
            )}
        </div>
    )
}
