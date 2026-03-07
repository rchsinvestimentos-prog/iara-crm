'use client'

import { useState, useEffect } from 'react'
import { Mic, Play, Pause, Check, RefreshCw, Volume2, Lock, Crown, Sparkles, Radio, Upload, Headphones } from 'lucide-react'

// Vozes digitais (TTS)
const vozesTTS = [
    { id: 'nova', nome: 'Nova', desc: 'Jovem, animada e acolhedora', tom: 'Alegre' },
    { id: 'shimmer', nome: 'Shimmer', desc: 'Suave, sofisticada e elegante', tom: 'Premium' },
    { id: 'alloy', nome: 'Alloy', desc: 'Equilibrada, profissional e clara', tom: 'Neutro' },
]

// Vozes ultra realistas
const vozesReais = [
    { id: 'rachel', nome: 'Rachel', desc: 'Tom quente e confiante, ideal pra vendas', tom: 'Vendedora' },
    { id: 'bella', nome: 'Bella', desc: 'Jovem, empática e super moderna', tom: 'Amiga' },
    { id: 'elli', nome: 'Elli', desc: 'Madura, transmite autoridade e segurança', tom: 'Especialista' },
    { id: 'domi', nome: 'Domi', desc: 'Enérgica, persuasiva e dinâmica', tom: 'Motivacional' },
]

type TipoVoz = 'tts' | 'ultra' | 'clone'

export default function VozTool() {
    const [nivel, setNivel] = useState(1)
    const [tipoVozAtiva, setTipoVozAtiva] = useState<TipoVoz>('tts')
    const [vozTTSSelecionada, setVozTTSSelecionada] = useState('nova')
    const [vozUltraSelecionada, setVozUltraSelecionada] = useState('rachel')
    const [tocando, setTocando] = useState<string | null>(null)
    const [salvando, setSalvando] = useState(false)
    const [salvo, setSalvo] = useState(false)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
                setNivel(data?.plano || 1)
                if (data?.vozClonada && data?.plano >= 3) setTipoVozAtiva('clone')
                else if (data?.plano >= 2) setTipoVozAtiva('ultra')
            })
            .catch(() => { })
    }, [])

    const salvarVoz = async () => {
        setSalvando(true)
        try {
            await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo_voz: tipoVozAtiva,
                    voz_assistente: tipoVozAtiva === 'tts' ? vozTTSSelecionada : tipoVozAtiva === 'ultra' ? vozUltraSelecionada : 'clone',
                }),
            })
            setSalvo(true)
            setTimeout(() => setSalvo(false), 3000)
        } catch { }
        setSalvando(false)
    }

    const podeAtivarUltra = nivel >= 2
    const podeAtivarClone = nivel >= 3

    return (
        <div className="space-y-6">

            {/* ============================================ */}
            {/* SELETOR DE VOZ ATIVA */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-1 flex items-center gap-2">
                    <Radio size={15} className="text-[#D99773]" />
                    Qual voz a IARA vai usar?
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Selecione o tipo de voz que a sua assistente vai usar nos áudios</p>

                <div className="grid grid-cols-3 gap-3">
                    {/* TTS */}
                    <button
                        onClick={() => setTipoVozAtiva('tts')}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${tipoVozAtiva === 'tts' ? 'border-[#0F4C61] bg-[#0F4C61]/5' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Volume2 size={14} className={tipoVozAtiva === 'tts' ? 'text-[#0F4C61]' : 'text-gray-400'} />
                            <span className="text-[11px] font-semibold text-gray-700">Voz Digital</span>
                        </div>
                        <p className="text-[9px] text-gray-400">Vozes de IA naturais e rápidas</p>
                        <div className="mt-2">
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">Todos os planos</span>
                        </div>
                        {tipoVozAtiva === 'tts' && <Check size={14} className="text-[#0F4C61] mt-2" />}
                    </button>

                    {/* Ultra Realista */}
                    <button
                        onClick={() => podeAtivarUltra ? setTipoVozAtiva('ultra') : null}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative ${!podeAtivarUltra ? 'cursor-default' :
                                tipoVozAtiva === 'ultra' ? 'border-[#D99773] bg-[#D99773]/5' : 'border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        {!podeAtivarUltra && <Lock size={12} className="absolute top-3 right-3 text-gray-300" />}
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className={tipoVozAtiva === 'ultra' ? 'text-[#D99773]' : 'text-gray-400'} />
                            <span className="text-[11px] font-semibold text-gray-700">Ultra Realista</span>
                        </div>
                        <p className="text-[9px] text-gray-400">Parecem humanos de verdade</p>
                        <div className="mt-2">
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Plano 2+</span>
                        </div>
                        {tipoVozAtiva === 'ultra' && <Check size={14} className="text-[#D99773] mt-2" />}
                    </button>

                    {/* Clone */}
                    <button
                        onClick={() => podeAtivarClone ? setTipoVozAtiva('clone') : null}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative ${!podeAtivarClone ? 'cursor-default' :
                                tipoVozAtiva === 'clone' ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        {!podeAtivarClone && <Lock size={12} className="absolute top-3 right-3 text-gray-300" />}
                        <div className="flex items-center gap-2 mb-2">
                            <Mic size={14} className={tipoVozAtiva === 'clone' ? 'text-purple-500' : 'text-gray-400'} />
                            <span className="text-[11px] font-semibold text-gray-700">Sua Voz</span>
                        </div>
                        <p className="text-[9px] text-gray-400">Clone da sua própria voz</p>
                        <div className="mt-2">
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Plano 3+</span>
                        </div>
                        {tipoVozAtiva === 'clone' && <Check size={14} className="text-purple-500 mt-2" />}
                    </button>
                </div>

                {/* Botão salvar */}
                <button
                    onClick={salvarVoz}
                    disabled={salvando}
                    className="mt-4 w-full py-2.5 rounded-xl text-[12px] font-medium transition-all flex items-center justify-center gap-2"
                    style={{ background: salvo ? '#22c55e' : '#0F4C61', color: 'white' }}
                >
                    {salvo ? <><Check size={14} /> Voz salva!</> : salvando ? 'Salvando...' : 'Salvar escolha de voz'}
                </button>
            </div>

            {/* ============================================ */}
            {/* SEÇÃO 1: VOZES DIGITAIS (P1+) */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-1 flex items-center gap-2">
                    <Volume2 size={15} className="text-[#0F4C61]" />
                    Vozes Digitais
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Ouça e escolha a voz que combina com a personalidade da sua clínica</p>

                <div className="space-y-2">
                    {vozesTTS.map(voz => (
                        <button
                            key={voz.id}
                            onClick={() => { setVozTTSSelecionada(voz.id); setTipoVozAtiva('tts') }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${vozTTSSelecionada === voz.id && tipoVozAtiva === 'tts'
                                    ? 'bg-[#0F4C61]/5 border-2 border-[#0F4C61]'
                                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                }`}
                        >
                            <div
                                onClick={(e) => { e.stopPropagation(); setTocando(tocando === voz.id ? null : voz.id) }}
                                className="w-9 h-9 rounded-full bg-[#0F4C61] flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {tocando === voz.id ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-[12px] font-medium text-gray-700">{voz.nome}</p>
                                <p className="text-[9px] text-gray-400">{voz.desc}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{voz.tom}</span>
                            {vozTTSSelecionada === voz.id && tipoVozAtiva === 'tts' && (
                                <Check size={14} className="text-[#0F4C61]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ============================================ */}
            {/* SEÇÃO 2: VOZ ULTRA REALISTA (P2+) */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <Sparkles size={15} className="text-[#D99773]" />
                        Voz Ultra Realista
                    </h3>
                    {!podeAtivarUltra && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-1">
                            <Lock size={9} /> Plano 2+
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 mb-4">Vozes tão realistas que parecem humanos de verdade falando. Ouça e sinta a diferença!</p>

                <div className="space-y-2">
                    {vozesReais.map(voz => (
                        <div
                            key={voz.id}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${podeAtivarUltra && vozUltraSelecionada === voz.id && tipoVozAtiva === 'ultra'
                                    ? 'bg-[#D99773]/5 border-2 border-[#D99773]'
                                    : 'bg-gray-50 border-2 border-transparent'
                                }`}
                        >
                            {/* Play — TODO mundo pode ouvir, mesmo P1 */}
                            <div
                                onClick={() => setTocando(tocando === `r-${voz.id}` ? null : `r-${voz.id}`)}
                                className="w-9 h-9 rounded-full bg-[#D99773] flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {tocando === `r-${voz.id}` ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
                            </div>
                            <div
                                className={`flex-1 text-left ${podeAtivarUltra ? 'cursor-pointer' : ''}`}
                                onClick={() => { if (podeAtivarUltra) { setVozUltraSelecionada(voz.id); setTipoVozAtiva('ultra') } }}
                            >
                                <p className="text-[12px] font-medium text-gray-700">{voz.nome}</p>
                                <p className="text-[9px] text-gray-400">{voz.desc}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#D99773]/10 text-[#D99773]">{voz.tom}</span>
                            {podeAtivarUltra && vozUltraSelecionada === voz.id && tipoVozAtiva === 'ultra' && (
                                <Check size={14} className="text-[#D99773]" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Upgrade discreto */}
                {!podeAtivarUltra && (
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
                        <Headphones size={16} className="text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] font-medium text-gray-700">Gostou das vozes? Faça upgrade para ativar</p>
                            <p className="text-[9px] text-gray-400">Suas clientes não vão perceber que é IA</p>
                        </div>
                        <a href="/habilidades/plano" className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1">
                            <Crown size={10} /> Upgrade
                        </a>
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* SEÇÃO 3: CLONE DA SUA VOZ (P3+) */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <Mic size={15} className="text-purple-500" />
                        Sua Voz — Clone com IA
                    </h3>
                    {!podeAtivarClone && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium flex items-center gap-1">
                            <Lock size={9} /> Plano 3+
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-gray-400 mb-4">Envie um áudio de 30 segundos e ouça como a IA reproduz a SUA voz. É impressionante!</p>

                {/* Upload de áudio — disponível pra TODOS testarem */}
                <div className="p-4 bg-gray-50 rounded-xl mb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Upload size={16} className="text-purple-500" />
                        </div>
                        <div>
                            <p className="text-[12px] font-medium text-gray-700">Envie seu áudio de 30 segundos</p>
                            <p className="text-[9px] text-gray-400">Fale naturalmente por 30 segundos sobre qualquer assunto</p>
                        </div>
                    </div>
                    <label className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-purple-200 rounded-xl text-[11px] text-purple-500 font-medium cursor-pointer hover:bg-purple-50 transition-colors">
                        <Mic size={14} />
                        Clique para enviar áudio
                        <input type="file" accept="audio/*" className="hidden" />
                    </label>
                </div>

                {/* Resultado do clone — preview */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Seu Áudio Original</p>
                        <button
                            onClick={() => setTocando(tocando === 'original' ? null : 'original')}
                            className="w-full flex items-center gap-2 p-2 bg-white rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                {tocando === 'original' ? <Pause size={12} className="text-white" /> : <Play size={12} className="text-white ml-0.5" />}
                            </div>
                            <div className="flex-1 flex gap-0.5 items-end h-5">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i} className="w-1 bg-purple-200 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                                ))}
                            </div>
                        </button>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-purple-400 mb-2">Sua Voz Clonada (IA)</p>
                        <button
                            onClick={() => setTocando(tocando === 'clone' ? null : 'clone')}
                            className="w-full flex items-center gap-2 p-2 bg-white rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                {tocando === 'clone' ? <Pause size={12} className="text-white" /> : <Play size={12} className="text-white ml-0.5" />}
                            </div>
                            <div className="flex-1 flex gap-0.5 items-end h-5">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div key={i} className="w-1 bg-purple-300 rounded-full" style={{ height: `${20 + Math.random() * 80}%` }} />
                                ))}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Ativar / Upgrade */}
                {podeAtivarClone ? (
                    <button className="w-full text-[11px] font-medium px-3 py-2 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-100 transition-colors">
                        <RefreshCw size={12} /> Re-treinar voz
                    </button>
                ) : (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-fuchsia-50 flex items-center gap-3">
                        <Mic size={16} className="text-purple-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] font-medium text-gray-700">Impressionante, né? Ative no Plano 3+</p>
                            <p className="text-[9px] text-gray-400">Sua IARA vai falar com a SUA voz</p>
                        </div>
                        <a href="/habilidades/plano" className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-1">
                            <Crown size={10} /> Upgrade
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
