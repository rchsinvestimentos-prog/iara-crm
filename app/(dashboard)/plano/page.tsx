'use client'

import { useState } from 'react'
import { CreditCard, Zap, TrendingUp, ArrowUpRight, Crown, Check, Clock, Download } from 'lucide-react'

const planos = [
    { nivel: 1, nome: 'Secretária', preco: 97, cor: '#06D6A0', skills: ['Atendimento', 'Agenda', 'Follow-up'] },
    { nivel: 2, nome: 'Estrategista', preco: 197, cor: '#8B5CF6', skills: ['+ Roteiros', '+ Marketing', '+ Instagram'] },
    { nivel: 3, nome: 'Designer', preco: 297, cor: '#D99773', skills: ['+ Avatar IA', '+ Posts', '+ Marca'] },
    { nivel: 4, nome: 'Audiovisual', preco: 497, cor: '#0F4C61', skills: ['+ Vídeo Avatar', '+ Voz Clonada', '+ Editor'] },
]

const historico = [
    { data: '24/02', acao: 'Roteiro gerado', creditos: -1, tipo: 'uso' },
    { data: '23/02', acao: 'Post carrossel criado', creditos: -2, tipo: 'uso' },
    { data: '22/02', acao: 'Avatar gerado (4 fotos)', creditos: -5, tipo: 'uso' },
    { data: '20/02', acao: 'Vídeo HeyGen (1min)', creditos: -10, tipo: 'uso' },
    { data: '15/02', acao: 'Renovação mensal', creditos: 100, tipo: 'credito' },
    { data: '14/02', acao: 'Créditos extras (pacote)', creditos: 50, tipo: 'credito' },
]

export default function PlanoPage() {
    const [planoAtual] = useState(1)
    const creditosUsados = 32
    const creditosTotal = 100
    const porcentagem = (creditosUsados / creditosTotal) * 100
    const creditosRestantes = creditosTotal - creditosUsados

    // Ângulo do gauge (180° = semicírculo)
    const angulo = (porcentagem / 100) * 180

    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0F4C61] tracking-tight">Plano & Créditos 💳</h1>
                <p className="text-sm text-gray-400 mt-1">Gerencie seu plano e acompanhe o consumo</p>
            </div>

            {/* Plano atual + Gauge */}
            <div className="grid grid-cols-5 gap-4">
                {/* Plano atual */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Crown size={16} className="text-[#D99773]" />
                        <h3 className="text-[13px] font-semibold text-[#0F4C61]">Plano Atual</h3>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: planos[planoAtual - 1].cor + '10' }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: planos[planoAtual - 1].cor + '20' }}>
                            <span className="text-xl font-bold" style={{ color: planos[planoAtual - 1].cor }}>{planoAtual}</span>
                        </div>
                        <div>
                            <p className="text-[15px] font-bold text-[#0F4C61]">{planos[planoAtual - 1].nome}</p>
                            <p className="text-[12px] text-gray-400">R$ {planos[planoAtual - 1].preco}/mês</p>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="text-gray-500">Renovação</span>
                            <span className="font-medium text-[#0F4C61]">15/03/2026</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="text-gray-500">Status</span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-500">Ativo</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px]">
                            <span className="text-gray-500">Desde</span>
                            <span className="font-medium text-[#0F4C61]">15/01/2026</span>
                        </div>
                    </div>
                </div>

                {/* Gauge de créditos */}
                <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                            <Zap size={15} className="text-[#D99773]" />
                            Créditos do Mês
                        </h3>
                        <button className="text-[11px] font-medium px-3 py-1.5 bg-[#D99773] text-white rounded-lg flex items-center gap-1.5 hover:bg-[#D99773]/90 transition-colors">
                            <CreditCard size={12} /> Comprar Créditos
                        </button>
                    </div>

                    {/* Gauge visual */}
                    <div className="flex items-center gap-6">
                        <div className="relative w-40 h-24">
                            <svg viewBox="0 0 200 110" className="w-full h-full">
                                {/* Background arc */}
                                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f0f0f0" strokeWidth="16" strokeLinecap="round" />
                                {/* Value arc */}
                                <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={porcentagem > 80 ? '#EF4444' : porcentagem > 50 ? '#F59E0B' : '#06D6A0'} strokeWidth="16" strokeLinecap="round"
                                    strokeDasharray={`${(angulo / 180) * 251.2} 251.2`}
                                />
                                {/* Label */}
                                <text x="100" y="85" textAnchor="middle" className="text-2xl font-bold" fill="#0F4C61" fontSize="28">{creditosRestantes}</text>
                                <text x="100" y="105" textAnchor="middle" fill="#999" fontSize="11">restantes</text>
                            </svg>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between text-[12px]">
                                <span className="text-gray-500">Total do plano</span>
                                <span className="font-semibold text-[#0F4C61]">{creditosTotal} créditos</span>
                            </div>
                            <div className="flex items-center justify-between text-[12px]">
                                <span className="text-gray-500">Usados este mês</span>
                                <span className="font-semibold text-[#D99773]">{creditosUsados} créditos</span>
                            </div>
                            <div className="flex items-center justify-between text-[12px]">
                                <span className="text-gray-500">Restantes</span>
                                <span className="font-semibold text-green-500">{creditosRestantes} créditos</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-[#D99773]" style={{ width: `${porcentagem}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de planos */}
            <div>
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-3 flex items-center gap-2">
                    <TrendingUp size={15} className="text-[#D99773]" />
                    Planos Disponíveis
                </h3>
                <div className="grid grid-cols-4 gap-3">
                    {planos.map((p) => {
                        const isAtual = p.nivel === planoAtual
                        const isInferior = p.nivel < planoAtual
                        return (
                            <div key={p.nivel} className={`rounded-2xl border p-4 transition-all ${isAtual ? 'border-2 bg-white shadow-sm' : 'border-gray-100 bg-white'
                                }`} style={isAtual ? { borderColor: p.cor } : {}}>
                                {isAtual && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white mb-2 inline-block" style={{ backgroundColor: p.cor }}>
                                        Plano Atual
                                    </span>
                                )}
                                <p className="text-[14px] font-bold text-[#0F4C61] mt-1">{p.nome}</p>
                                <p className="text-[20px] font-bold text-[#0F4C61] mt-1">
                                    R$ {p.preco}<span className="text-[11px] text-gray-400 font-normal">/mês</span>
                                </p>
                                <div className="mt-3 space-y-1.5">
                                    {p.skills.map((s, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                            <Check size={11} style={{ color: p.cor }} />
                                            <span>{s}</span>
                                        </div>
                                    ))}
                                </div>
                                {!isAtual && !isInferior && (
                                    <button className="w-full mt-3 py-2 text-[11px] font-medium rounded-lg text-white flex items-center justify-center gap-1" style={{ backgroundColor: p.cor }}>
                                        Fazer Upgrade <ArrowUpRight size={11} />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <Clock size={15} className="text-[#D99773]" />
                        Histórico de Consumo
                    </h3>
                    <button className="text-[11px] text-gray-400 hover:text-[#D99773] flex items-center gap-1">
                        <Download size={11} /> Exportar
                    </button>
                </div>
                <div className="divide-y divide-gray-50">
                    {historico.map((h, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-400 w-12">{h.data}</span>
                                <span className="text-[12px] text-gray-600">{h.acao}</span>
                            </div>
                            <span className={`text-[12px] font-semibold ${h.tipo === 'credito' ? 'text-green-500' : 'text-[#D99773]'}`}>
                                {h.tipo === 'credito' ? '+' : ''}{h.creditos}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
