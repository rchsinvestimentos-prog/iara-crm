'use client'

import { useState } from 'react'
import { Mic, Upload, Play, Pause, Check, RefreshCw, Volume2, AlertCircle } from 'lucide-react'

const etapas = [
    { num: 1, titulo: 'Enviar Áudio', desc: 'Grave 30s falando naturalmente' },
    { num: 2, titulo: 'Treinar Modelo', desc: 'IA aprende sua voz (~5 min)' },
    { num: 3, titulo: 'Pronto!', desc: 'Voz clonada ativa no WhatsApp' },
]

export default function VozTool() {
    const [etapaAtual, setEtapaAtual] = useState(3) // Simula voz já treinada
    const [tocando, setTocando] = useState<'original' | 'clone' | null>(null)

    return (
        <div className="space-y-6">
            {/* Status do clone */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <Mic size={15} className="text-[#D99773]" />
                        Status da Voz Clonada
                    </h3>
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-500 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Ativa
                    </span>
                </div>

                {/* Progresso */}
                <div className="flex items-center gap-0 mb-6">
                    {etapas.map((e, i) => (
                        <div key={e.num} className="flex items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${etapaAtual >= e.num ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                                }`}>
                                {etapaAtual >= e.num ? <Check size={14} /> : <span className="text-[11px] font-bold">{e.num}</span>}
                            </div>
                            {i < etapas.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 ${etapaAtual > e.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between">
                    {etapas.map((e) => (
                        <div key={e.num} className="text-center flex-1">
                            <p className={`text-[11px] font-medium ${etapaAtual >= e.num ? 'text-[#0F4C61]' : 'text-gray-400'}`}>{e.titulo}</p>
                            <p className="text-[9px] text-gray-400">{e.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Comparação antes/depois */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-4">🎧 Comparar: Original vs Clone</h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Original */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Áudio Original</p>
                        <button
                            onClick={() => setTocando(tocando === 'original' ? null : 'original')}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-lg"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#0F4C61] flex items-center justify-center flex-shrink-0">
                                {tocando === 'original' ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex gap-0.5 items-end h-6">
                                    {Array.from({ length: 25 }).map((_, i) => (
                                        <div key={i} className="w-1 bg-[#0F4C61]/30 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                                    ))}
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400">0:30</span>
                        </button>
                    </div>

                    {/* Clone */}
                    <div className="p-4 bg-[#D99773]/5 rounded-xl">
                        <p className="text-[10px] uppercase tracking-wider text-[#D99773] mb-3">Voz Clonada (IA)</p>
                        <button
                            onClick={() => setTocando(tocando === 'clone' ? null : 'clone')}
                            className="w-full flex items-center gap-3 p-3 bg-white rounded-lg"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#D99773] flex items-center justify-center flex-shrink-0">
                                {tocando === 'clone' ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex gap-0.5 items-end h-6">
                                    {Array.from({ length: 25 }).map((_, i) => (
                                        <div key={i} className="w-1 bg-[#D99773]/40 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                                    ))}
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-400">0:30</span>
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                    <Volume2 size={11} />
                    <span>Similaridade: <strong className="text-green-500">94%</strong></span>
                </div>
            </div>

            {/* Config */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-4">⚙️ Configurações da Voz</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                            <p className="text-[12px] font-medium text-gray-700">Usar voz clonada no WhatsApp</p>
                            <p className="text-[10px] text-gray-400">Áudios de resposta usam sua voz ao invés de texto</p>
                        </div>
                        <div className="w-10 h-6 rounded-full bg-green-500 flex items-center justify-end px-0.5 cursor-pointer">
                            <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                            <p className="text-[12px] font-medium text-gray-700">Velocidade da fala</p>
                            <p className="text-[10px] text-gray-400">Ajuste a velocidade da voz clonada</p>
                        </div>
                        <span className="text-[12px] font-medium text-[#0F4C61]">1.0×</span>
                    </div>
                </div>
            </div>

            {/* Re-treinar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-[12px] font-medium text-gray-700">Quer atualizar sua voz?</p>
                        <p className="text-[10px] text-gray-400">Envie um novo áudio de 30s para melhorar a qualidade</p>
                    </div>
                    <button className="text-[11px] font-medium px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition-colors">
                        <RefreshCw size={12} /> Re-treinar
                    </button>
                </div>
            </div>
        </div>
    )
}
