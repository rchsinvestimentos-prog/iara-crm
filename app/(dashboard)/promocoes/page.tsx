'use client'

import { useState, useEffect } from 'react'
import { Plus, Tag, Trash2, Edit3, Loader2, Calendar, Percent, DollarSign, Sparkles, ChevronDown, X, Save } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Procedimento {
    id: string
    nome: string
    valor: number
}

interface PromocaoProcedimento {
    id: string
    procedimentoId: string
    procedimentoNome: string
    precoPromocional: number | null
}

interface Promocao {
    id: string
    nome: string
    descricao: string | null
    instrucao_iara: string | null
    tipo_desconto: string
    valor_desconto: number
    data_inicio: string
    data_fim: string
    ativo: boolean
    procedimentos: PromocaoProcedimento[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function isActive(p: Promocao) {
    const now = new Date()
    const start = new Date(p.data_inicio)
    const end = new Date(p.data_fim)
    return p.ativo && now >= start && now <= end
}

function isExpired(p: Promocao) {
    return new Date() > new Date(p.data_fim)
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PromocoesPage() {
    const [promocoes, setPromocoes] = useState<Promocao[]>([])
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editando, setEditando] = useState<Promocao | null>(null)
    const [salvando, setSalvando] = useState(false)

    // Form state
    const [nome, setNome] = useState('')
    const [descricao, setDescricao] = useState('')
    const [instrucaoIara, setInstrucaoIara] = useState('')
    const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor_fixo'>('percentual')
    const [valorDesconto, setValorDesconto] = useState(0)
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [procIds, setProcIds] = useState<string[]>([])

    const carregar = () => {
        setLoading(true)
        fetch('/api/promocoes')
            .then(r => r.json())
            .then(d => {
                setPromocoes(d.promocoes || d || [])
                setProcedimentos(d.procedimentos || [])
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => { carregar() }, [])

    const resetForm = () => {
        setNome(''); setDescricao(''); setInstrucaoIara('')
        setTipoDesconto('percentual'); setValorDesconto(0)
        setDataInicio(''); setDataFim(''); setProcIds([])
        setEditando(null); setShowForm(false)
    }

    const abrirNova = () => {
        resetForm()
        setShowForm(true)
    }

    const abrirEditar = (p: Promocao) => {
        setEditando(p)
        setNome(p.nome)
        setDescricao(p.descricao || '')
        setInstrucaoIara(p.instrucao_iara || '')
        setTipoDesconto(p.tipo_desconto as any || 'percentual')
        setValorDesconto(p.valor_desconto || 0)
        setDataInicio(p.data_inicio?.slice(0, 10) || '')
        setDataFim(p.data_fim?.slice(0, 10) || '')
        setProcIds(p.procedimentos?.map(pp => pp.procedimentoId) || [])
        setShowForm(true)
    }

    const salvar = async () => {
        if (!nome || !dataInicio || !dataFim) return
        setSalvando(true)

        const body = {
            ...(editando ? { id: editando.id } : {}),
            nome, descricao, instrucaoIara,
            tipoDesconto, valorDesconto,
            dataInicio, dataFim,
            procedimentoIds: procIds,
        }

        await fetch('/api/promocoes', {
            method: editando ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        resetForm()
        carregar()
        setSalvando(false)
    }

    const deletar = async (id: string) => {
        if (!confirm('Desativar essa promoção?')) return
        await fetch(`/api/promocoes?id=${id}`, { method: 'DELETE' })
        carregar()
    }

    const toggleProc = (id: string) => {
        setProcIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    // ─── Separar ativas / expiradas ────────────────────────────────────────────

    const ativas = promocoes.filter(p => p.ativo && !isExpired(p))
    const expiradas = promocoes.filter(p => !p.ativo || isExpired(p))

    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="animate-fade-in max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        🏷️ Promoções & Combos
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        A IARA verifica automaticamente antes de informar preços
                    </p>
                </div>
                <button
                    onClick={abrirNova}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                    style={{
                        background: 'linear-gradient(135deg, #D99773, #C47F5E)',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(217,151,115,0.3)',
                    }}
                >
                    <Plus size={16} />
                    Nova Promoção
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div
                    className="backdrop-blur-xl rounded-2xl p-6 mb-6 animate-fade-in"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Tag size={18} style={{ color: '#D99773' }} />
                            {editando ? 'Editar Promoção' : 'Nova Promoção'}
                        </h2>
                        <button onClick={resetForm} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nome */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nome da Promoção *</label>
                            <input
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                placeholder="Ex: Semana da Micropigmentação"
                                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Descrição */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Descrição (visível pra cliente)</label>
                            <textarea
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                placeholder="Ex: Micro de sobrancelha com 20% de desconto"
                                rows={2}
                                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none resize-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Instrução IARA */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <Sparkles size={11} style={{ color: '#D99773' }} />
                                Instrução especial pra IARA
                            </label>
                            <textarea
                                value={instrucaoIara}
                                onChange={e => setInstrucaoIara(e.target.value)}
                                placeholder="Ex: Ofereça essa promoção sempre que a cliente perguntar por sobrancelha. Diga que é por tempo limitado."
                                rows={2}
                                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none resize-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Tipo desconto */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tipo de Desconto</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTipoDesconto('percentual')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        backgroundColor: tipoDesconto === 'percentual' ? 'rgba(217,151,115,0.15)' : 'var(--bg-subtle)',
                                        border: tipoDesconto === 'percentual' ? '1px solid rgba(217,151,115,0.4)' : '1px solid var(--border-default)',
                                        color: tipoDesconto === 'percentual' ? '#D99773' : 'var(--text-muted)',
                                    }}
                                >
                                    <Percent size={14} /> %
                                </button>
                                <button
                                    onClick={() => setTipoDesconto('valor_fixo')}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all"
                                    style={{
                                        backgroundColor: tipoDesconto === 'valor_fixo' ? 'rgba(217,151,115,0.15)' : 'var(--bg-subtle)',
                                        border: tipoDesconto === 'valor_fixo' ? '1px solid rgba(217,151,115,0.4)' : '1px solid var(--border-default)',
                                        color: tipoDesconto === 'valor_fixo' ? '#D99773' : 'var(--text-muted)',
                                    }}
                                >
                                    <DollarSign size={14} /> R$
                                </button>
                            </div>
                        </div>

                        {/* Valor desconto */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                                Valor do Desconto {tipoDesconto === 'percentual' ? '(%)' : '(R$)'}
                            </label>
                            <input
                                type="number"
                                value={valorDesconto}
                                onChange={e => setValorDesconto(Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Data início */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <Calendar size={11} /> Data Início *
                            </label>
                            <input
                                type="date"
                                value={dataInicio}
                                onChange={e => setDataInicio(e.target.value)}
                                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Data fim */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <Calendar size={11} /> Data Fim *
                            </label>
                            <input
                                type="date"
                                value={dataFim}
                                onChange={e => setDataFim(e.target.value)}
                                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Procedimentos */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                                Procedimentos inclusos ({procIds.length} selecionados)
                            </label>
                            {procedimentos.length === 0 ? (
                                <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                                    Nenhum procedimento cadastrado. Cadastre em &quot;Procedimentos&quot; primeiro.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {procedimentos.map(proc => {
                                        const sel = procIds.includes(proc.id)
                                        return (
                                            <button
                                                key={proc.id}
                                                onClick={() => toggleProc(proc.id)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                                style={{
                                                    backgroundColor: sel ? 'rgba(217,151,115,0.15)' : 'var(--bg-subtle)',
                                                    border: sel ? '1px solid rgba(217,151,115,0.4)' : '1px solid var(--border-default)',
                                                    color: sel ? '#D99773' : 'var(--text-muted)',
                                                }}
                                            >
                                                {sel ? '✓ ' : ''}{proc.nome}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium"
                            style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={salvar}
                            disabled={!nome || !dataInicio || !dataFim || salvando}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                            style={{
                                background: nome && dataInicio && dataFim ? 'linear-gradient(135deg, #D99773, #C47F5E)' : 'var(--bg-subtle)',
                                color: nome && dataInicio && dataFim ? '#fff' : 'var(--text-muted)',
                                opacity: salvando ? 0.7 : 1,
                                cursor: !nome || !dataInicio || !dataFim || salvando ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {editando ? 'Salvar' : 'Criar Promoção'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lista de Promoções */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin" style={{ color: '#D99773' }} />
                </div>
            ) : promocoes.length === 0 && !showForm ? (
                <div
                    className="backdrop-blur-xl rounded-2xl p-12 text-center"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                >
                    <span style={{ fontSize: 48, opacity: 0.3 }}>🏷️</span>
                    <p className="text-sm font-medium mt-4" style={{ color: 'var(--text-primary)' }}>
                        Nenhuma promoção cadastrada
                    </p>
                    <p className="text-xs mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Crie promoções e a IARA vai informar automaticamente os clientes quando perguntarem sobre os procedimentos inclusos.
                    </p>
                    <button
                        onClick={abrirNova}
                        className="mt-5 px-5 py-2.5 rounded-xl text-sm font-medium"
                        style={{
                            background: 'linear-gradient(135deg, #D99773, #C47F5E)',
                            color: '#fff',
                        }}
                    >
                        Criar primeira promoção
                    </button>
                </div>
            ) : (
                <>
                    {/* Ativas */}
                    {ativas.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: '#D99773' }}>
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                Ativas ({ativas.length})
                            </h3>
                            <div className="space-y-3">
                                {ativas.map(p => (
                                    <PromoCard
                                        key={p.id}
                                        promo={p}
                                        onEdit={() => abrirEditar(p)}
                                        onDelete={() => deletar(p.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiradas */}
                    {expiradas.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                Encerradas ({expiradas.length})
                            </h3>
                            <div className="space-y-3 opacity-60">
                                {expiradas.map(p => (
                                    <PromoCard
                                        key={p.id}
                                        promo={p}
                                        onEdit={() => abrirEditar(p)}
                                        onDelete={() => deletar(p.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

// ─── PromoCard ─────────────────────────────────────────────────────────────────

function PromoCard({ promo, onEdit, onDelete }: { promo: Promocao; onEdit: () => void; onDelete: () => void }) {
    const active = isActive(promo)
    const expired = isExpired(promo)

    return (
        <div
            className="backdrop-blur-xl rounded-2xl p-5 transition-all"
            style={{
                backgroundColor: 'var(--bg-card)',
                border: active ? '1px solid rgba(217,151,115,0.3)' : '1px solid var(--border-default)',
            }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{promo.nome}</h3>
                        {active && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
                                ativa
                            </span>
                        )}
                        {expired && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                encerrada
                            </span>
                        )}
                        {!active && !expired && promo.ativo && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                agendada
                            </span>
                        )}
                    </div>

                    {promo.descricao && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{promo.descricao}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2.5">
                        {promo.valor_desconto > 0 && (
                            <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: '#D99773' }}>
                                {promo.tipo_desconto === 'percentual' ? <Percent size={11} /> : <DollarSign size={11} />}
                                {promo.valor_desconto}{promo.tipo_desconto === 'percentual' ? '%' : ' R$'} de desconto
                            </span>
                        )}
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Calendar size={11} />
                            {formatDate(promo.data_inicio)} → {formatDate(promo.data_fim)}
                        </span>
                    </div>

                    {promo.procedimentos && promo.procedimentos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {promo.procedimentos.map(pp => (
                                <span
                                    key={pp.id || pp.procedimentoId}
                                    className="text-[10px] px-2 py-1 rounded-lg"
                                    style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                                >
                                    {pp.procedimentoNome || pp.procedimentoId}
                                </span>
                            ))}
                        </div>
                    )}

                    {promo.instrucao_iara && (
                        <div className="mt-3 px-3 py-2 rounded-lg text-[11px] flex items-start gap-1.5"
                            style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.15)', color: '#D99773' }}>
                            <Sparkles size={11} className="mt-0.5 flex-shrink-0" />
                            <span>{promo.instrucao_iara}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-lg transition-all hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 rounded-lg transition-all hover:opacity-70"
                        style={{ color: '#ef4444' }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}
