'use client'

import { useState } from 'react'
import { CalendarDays, Wand2, ChevronLeft, ChevronRight, Plus, Instagram, Clock, TrendingUp } from 'lucide-react'

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Mock calendário de conteúdo
const conteudoMensal: Record<number, { tipo: string; titulo: string; cor: string }> = {
    3: { tipo: 'Reels', titulo: 'Dica: Cuidados pós-micro', cor: '#8B5CF6' },
    5: { tipo: 'Carrossel', titulo: 'Antes e Depois', cor: '#D99773' },
    7: { tipo: 'Stories', titulo: 'Bastidores do estúdio', cor: '#06D6A0' },
    10: { tipo: 'Reels', titulo: 'Trend do momento', cor: '#8B5CF6' },
    12: { tipo: 'Post', titulo: 'Depoimento cliente', cor: '#0F4C61' },
    14: { tipo: 'Stories', titulo: 'Dia dos Namorados ❤️', cor: '#EF4444' },
    17: { tipo: 'Carrossel', titulo: '5 mitos sobre micro', cor: '#D99773' },
    19: { tipo: 'Reels', titulo: 'Processo completo', cor: '#8B5CF6' },
    21: { tipo: 'Post', titulo: 'Promoção de março', cor: '#F59E0B' },
    24: { tipo: 'Stories', titulo: 'Q&A sobre procedimentos', cor: '#06D6A0' },
    26: { tipo: 'Reels', titulo: 'Resultado natural', cor: '#8B5CF6' },
    28: { tipo: 'Carrossel', titulo: 'Guia de cuidados', cor: '#D99773' },
}

const estrategias = [
    { titulo: '🎯 Foco do Mês', desc: 'Micropigmentação Fio a Fio — maior ticket, alta demanda em março' },
    { titulo: '📅 Frequência Ideal', desc: '3x por semana: 1 Reels + 1 Carrossel + 1 Stories' },
    { titulo: '⏰ Melhores Horários', desc: 'Ter/Qui 19h (Reels) • Seg/Qua 12h (Carrossel) • Diário 9h (Stories)' },
    { titulo: '🎨 Paleta Visual', desc: 'Tons terrosos + branco — consistência no feed' },
]

export default function MarketingTool() {
    const [gerando, setGerando] = useState(false)
    const [mes] = useState('Março 2026')

    const handleGerar = () => {
        setGerando(true)
        setTimeout(() => setGerando(false), 2000)
    }

    // Gerar grid do calendário
    const diasNoMes = 31
    const primeiroDia = 6 // sábado (0=dom)

    return (
        <div className="space-y-6">
            {/* Estratégias do mês */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <TrendingUp size={15} className="text-[#D99773]" />
                        Estratégia de {mes}
                    </h3>
                    <button
                        onClick={handleGerar}
                        disabled={gerando}
                        className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg hover:bg-[#0F4C61]/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {gerando ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Wand2 size={12} />
                        )}
                        Gerar novo plano
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {estrategias.map((e, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[12px] font-semibold text-[#0F4C61]">{e.titulo}</p>
                            <p className="text-[11px] text-gray-500 mt-1">{e.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendário de conteúdo */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <button className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <ChevronLeft size={14} className="text-gray-400" />
                        </button>
                        <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                            <CalendarDays size={15} className="text-[#D99773]" />
                            {mes}
                        </h3>
                        <button className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <ChevronRight size={14} className="text-gray-400" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                        {[
                            { label: 'Reels', cor: '#8B5CF6' },
                            { label: 'Carrossel', cor: '#D99773' },
                            { label: 'Stories', cor: '#06D6A0' },
                            { label: 'Post', cor: '#0F4C61' },
                        ].map(l => (
                            <span key={l.label} className="flex items-center gap-1 text-gray-400">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.cor }} />
                                {l.label}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="p-4">
                    {/* Header dias */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {diasSemana.map(d => (
                            <div key={d} className="text-center text-[10px] font-medium text-gray-300 uppercase py-1">
                                {d}
                            </div>
                        ))}
                    </div>
                    {/* Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Espaços vazios */}
                        {Array.from({ length: primeiroDia }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {/* Dias */}
                        {Array.from({ length: diasNoMes }).map((_, i) => {
                            const dia = i + 1
                            const conteudo = conteudoMensal[dia]
                            return (
                                <div
                                    key={dia}
                                    className={`aspect-square rounded-xl p-1.5 text-[10px] flex flex-col cursor-pointer transition-all ${conteudo ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`font-medium ${dia === 24 ? 'text-[#D99773]' : 'text-gray-500'}`}>{dia}</span>
                                    {conteudo && (
                                        <div className="flex-1 flex items-end">
                                            <div className="w-full">
                                                <div className="w-full h-1 rounded-full mb-0.5" style={{ backgroundColor: conteudo.cor }} />
                                                <p className="text-[8px] text-gray-400 truncate">{conteudo.tipo}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Lista de conteúdo */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-3">📋 Conteúdos Planejados</h3>
                <div className="space-y-2">
                    {Object.entries(conteudoMensal).map(([dia, c]) => (
                        <div key={dia} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                            <div className="w-8 text-center">
                                <p className="text-[13px] font-bold text-[#0F4C61]">{dia}</p>
                                <p className="text-[9px] text-gray-400">mar</p>
                            </div>
                            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: c.cor }} />
                            <div className="flex-1">
                                <p className="text-[12px] font-medium text-gray-700">{c.titulo}</p>
                                <p className="text-[10px] text-gray-400">{c.tipo}</p>
                            </div>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: c.cor + '15', color: c.cor }}>
                                {c.tipo}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
