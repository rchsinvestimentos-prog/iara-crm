'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Users, ArrowUpRight, ArrowDownRight, CreditCard, BarChart3 } from 'lucide-react'

const meses = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev']
const mrrData = [4850, 6230, 8470, 11200, 14700, 18300]
const clientesData = [50, 64, 87, 115, 151, 188]

const movimentacoes = [
    { data: '24/02', clinica: 'Espaço Bella', tipo: 'upgrade', de: 'Secretária', para: 'Estrategista', valor: 100 },
    { data: '23/02', clinica: 'Studio Ana Silva', tipo: 'novo', de: null, para: 'Secretária', valor: 97 },
    { data: '22/02', clinica: 'Dra. Camila Santos', tipo: 'upgrade', de: 'Designer', para: 'Audiovisual', valor: 200 },
    { data: '21/02', clinica: 'Clínica Vida', tipo: 'churn', de: 'Secretária', para: null, valor: -97 },
    { data: '20/02', clinica: 'Studio Beauty', tipo: 'novo', de: null, para: 'Designer', valor: 297 },
    { data: '19/02', clinica: 'Espaço Zen', tipo: 'downgrade', de: 'Estrategista', para: 'Secretária', valor: -100 },
    { data: '18/02', clinica: 'Dra. Marina Costa', tipo: 'novo', de: null, para: 'Estrategista', valor: 197 },
]

const tipoConfig: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
    novo: { label: 'Novo', color: 'text-green-400 bg-green-500/10', icon: ArrowUpRight },
    upgrade: { label: 'Upgrade', color: 'text-blue-400 bg-blue-500/10', icon: TrendingUp },
    downgrade: { label: 'Downgrade', color: 'text-yellow-400 bg-yellow-500/10', icon: TrendingDown },
    churn: { label: 'Churn', color: 'text-red-400 bg-red-500/10', icon: ArrowDownRight },
}

const planosPorNivel = [
    { nome: 'Secretária', clientes: 92, mrr: 8924, cor: '#06D6A0' },
    { nome: 'Estrategista', clientes: 54, mrr: 10638, cor: '#8B5CF6' },
    { nome: 'Designer', clientes: 28, mrr: 8316, cor: '#D99773' },
    { nome: 'Audiovisual', clientes: 14, mrr: 6958, cor: '#0F4C61' },
]

export default function FinanceiroPage() {
    const mrr = 18300
    const mrrAnterior = 14700
    const crescimento = ((mrr - mrrAnterior) / mrrAnterior * 100).toFixed(1)
    const churnRate = 2.3
    const ltv = 1470
    const ticketMedio = 97.34
    const maxMrr = Math.max(...mrrData)

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Financeiro</h1>
                <p className="text-sm text-gray-400 mt-1">MRR, churn, upgrades e movimentações</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'MRR', value: `R$ ${(mrr / 1000).toFixed(1)}k`, change: `+${crescimento}%`, up: true, icon: DollarSign, color: '#10B981' },
                    { label: 'Clientes Ativos', value: '188', change: '+24%', up: true, icon: Users, color: '#8B5CF6' },
                    { label: 'Churn Rate', value: `${churnRate}%`, change: '-0.5%', up: false, icon: TrendingDown, color: '#EF4444' },
                    { label: 'Ticket Médio', value: `R$ ${ticketMedio}`, change: '+R$8', up: true, icon: CreditCard, color: '#F59E0B' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <kpi.icon size={16} style={{ color: kpi.color }} />
                            <span className={`text-[11px] font-medium flex items-center gap-0.5 ${kpi.up ? 'text-green-400' : 'text-red-400'}`}>
                                {kpi.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                {kpi.change}
                            </span>
                        </div>
                        <p className="text-xl font-bold text-white">{kpi.value}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-5 gap-4">
                {/* MRR Chart */}
                <div className="col-span-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                            <BarChart3 size={15} className="text-green-400" />
                            Evolução MRR (6 meses)
                        </h3>
                        <span className="text-[11px] text-gray-500">LTV: R$ {ltv}</span>
                    </div>
                    <div className="flex items-end gap-2 h-32">
                        {mrrData.map((v, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[9px] text-gray-500">{(v / 1000).toFixed(1)}k</span>
                                <div
                                    className="w-full rounded-t-md bg-gradient-to-t from-green-500/30 to-green-400/60"
                                    style={{ height: `${(v / maxMrr) * 100}%` }}
                                />
                                <span className="text-[10px] text-gray-500">{meses[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Distribuição por plano */}
                <div className="col-span-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
                    <h3 className="text-[13px] font-semibold text-white mb-4">Distribuição por Plano</h3>
                    <div className="space-y-3">
                        {planosPorNivel.map(p => {
                            const pct = (p.clientes / 188 * 100).toFixed(0)
                            return (
                                <div key={p.nome}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[12px] text-gray-300">{p.nome}</span>
                                        <span className="text-[11px] text-gray-500">{p.clientes} ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.cor }} />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5">R$ {(p.mrr / 1000).toFixed(1)}k/mês</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Movimentações */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                    <h3 className="text-[13px] font-semibold text-white">Movimentações Recentes</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {movimentacoes.map((m, i) => {
                        const config = tipoConfig[m.tipo]
                        return (
                            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-gray-500 w-12">{m.data}</span>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                                    <span className="text-[12px] text-gray-300">{m.clinica}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {m.de && m.para && (
                                        <span className="text-[11px] text-gray-500">{m.de} → {m.para}</span>
                                    )}
                                    {!m.de && m.para && (
                                        <span className="text-[11px] text-gray-500">→ {m.para}</span>
                                    )}
                                    {m.de && !m.para && (
                                        <span className="text-[11px] text-gray-500">{m.de} →</span>
                                    )}
                                    <span className={`text-[12px] font-semibold ${m.valor >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {m.valor >= 0 ? '+' : ''}R$ {Math.abs(m.valor)}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
