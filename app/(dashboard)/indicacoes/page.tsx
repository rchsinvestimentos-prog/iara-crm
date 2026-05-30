'use client'

import { useState, useEffect } from 'react'
import { Gift, Copy, Check, DollarSign, Users, ArrowUpRight, Loader2, Banknote, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Indicada {
    nomeClinica: string
    status: string
    plano: string
    comissao: number
    createdAt: string
}

interface DadosIndicacao {
    codigoIndicacao: string
    linkIndicacao: string
    totalIndicadas: number
    indicadasAtivas: number
    comissaoMensal: number
    saldoDisponivel: number
    totalSaques: number
    indicadas: Indicada[]
    saques: any[]
}

export default function IndicacoesPage() {
    const [dados, setDados] = useState<DadosIndicacao | null>(null)
    const [loading, setLoading] = useState(true)
    const [copiado, setCopiado] = useState(false)
    const [showSaque, setShowSaque] = useState(false)
    const [pix, setPix] = useState('')
    const [valorSaque, setValorSaque] = useState('')
    const [sacando, setSacando] = useState(false)

    useEffect(() => {
        fetch('/api/indicacoes')
            .then(r => r.json())
            .then(setDados)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    function copiarLink() {
        if (!dados) return
        navigator.clipboard.writeText(dados.linkIndicacao)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
    }

    async function solicitarSaque() {
        if (!valorSaque || !pix.trim()) return
        setSacando(true)
        try {
            const res = await fetch('/api/indicacoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acao: 'solicitar_saque',
                    valor: Number(valorSaque),
                    pix: pix.trim(),
                }),
            })
            const data = await res.json()
            if (res.ok) {
                alert(data.message)
                setShowSaque(false)
                setPix('')
                setValorSaque('')
                // Recarregar dados
                const r = await fetch('/api/indicacoes')
                setDados(await r.json())
            } else {
                alert(data.error)
            }
        } catch { alert('Erro ao solicitar saque') }
        finally { setSacando(false) }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="animate-fade-in">
                <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12px] mb-4 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <ArrowLeft size={14} /> Voltar
                </Link>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#06D6A0] to-[#059669] flex items-center justify-center shadow-lg shadow-[#06D6A0]/20">
                        <Gift size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Programa de Indicação</h1>
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            Ganhe 10% do plano de cada indicada, todo mês — enquanto ela estiver ativa
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#06D6A0]" />
                </div>
            ) : dados && (
                <>
                    {/* Cards de resumo */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
                        {[
                            { label: 'Indicadas', valor: dados.totalIndicadas, icon: Users, color: '#8B5CF6' },
                            { label: 'Ativas', valor: dados.indicadasAtivas, icon: ArrowUpRight, color: '#06D6A0' },
                            { label: 'Comissão/mês', valor: `R$ ${dados.comissaoMensal}`, icon: DollarSign, color: '#D99773' },
                            { label: 'Saldo disponível', valor: `R$ ${dados.saldoDisponivel}`, icon: Banknote, color: '#3B82F6' },
                        ].map((c, i) => (
                            <div key={i} className="glass-card p-4 text-center">
                                <c.icon size={20} className="mx-auto mb-2" style={{ color: c.color }} />
                                <p className="text-lg font-bold" style={{ color: c.color }}>{c.valor}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Link de indicação */}
                    <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Seu link de indicação</h3>
                        <div className="flex items-center gap-2">
                            <input
                                readOnly
                                value={dados.linkIndicacao}
                                className="flex-1 rounded-xl px-4 py-3 text-[12px] outline-none"
                                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                            />
                            <button
                                onClick={copiarLink}
                                className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-[12px] font-medium transition-all"
                                style={{
                                    background: copiado ? '#06D6A0' : 'linear-gradient(135deg, #06D6A0, #059669)',
                                    color: 'white',
                                }}
                            >
                                {copiado ? <Check size={14} /> : <Copy size={14} />}
                                {copiado ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                        <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                            Código: <strong>{dados.codigoIndicacao}</strong> — Compartilhe com colegas e ganhe comissão recorrente!
                        </p>
                    </div>

                    {/* Solicitar saque */}
                    {dados.saldoDisponivel >= 50 && (
                        <div className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
                            {!showSaque ? (
                                <button
                                    onClick={() => setShowSaque(true)}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all hover:scale-[1.01]"
                                    style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white' }}
                                >
                                    <Banknote size={16} /> Solicitar Saque (R$ {dados.saldoDisponivel} disponível)
                                </button>
                            ) : (
                                <div className="glass-card p-5 space-y-3">
                                    <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Solicitar Saque via Pix</h3>
                                    <input
                                        type="number"
                                        placeholder={`Valor (mín R$ 50, máx R$ ${dados.saldoDisponivel})`}
                                        value={valorSaque}
                                        onChange={e => setValorSaque(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Chave Pix (CPF, email, telefone ou chave aleatória)"
                                        value={pix}
                                        onChange={e => setPix(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowSaque(false)} className="flex-1 px-4 py-2.5 rounded-xl text-[12px]" style={{ border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={solicitarSaque}
                                            disabled={sacando || !valorSaque || !pix.trim()}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold disabled:opacity-40"
                                            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white' }}
                                        >
                                            {sacando ? <Loader2 size={13} className="animate-spin" /> : <Banknote size={13} />}
                                            {sacando ? 'Processando...' : 'Confirmar Saque'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Lista de indicadas */}
                    {dados.indicadas.length > 0 && (
                        <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Suas indicadas</h3>
                            <div className="space-y-2">
                                {dados.indicadas.map((ind, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)' }}>
                                        <div>
                                            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{ind.nomeClinica || 'Clínica'}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Plano {ind.plano} • {ind.status}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[13px] font-bold" style={{ color: ind.comissao > 0 ? '#06D6A0' : 'var(--text-muted)' }}>
                                                R$ {ind.comissao}/mês
                                            </p>
                                            <p className="text-[10px]" style={{ color: ind.status === 'ativo' ? '#06D6A0' : '#EF4444' }}>
                                                {ind.status === 'ativo' ? '● Ativa' : '○ Inativa'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Como funciona */}
                    <div className="glass-card p-5 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                        <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Como funciona</h3>
                        <div className="space-y-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                            <p>1. 📤 Compartilhe seu link com colegas da área</p>
                            <p>2. 🎯 Quando ela assinar a IARA usando seu link, vira sua indicada</p>
                            <p>3. 💰 Você ganha <strong>10% do plano dela todo mês</strong>, enquanto estiver ativa</p>
                            <p>4. 🏦 Acumulou R$ 50+? Solicite o saque via Pix — processamos em até 3 dias úteis</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
