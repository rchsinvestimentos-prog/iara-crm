'use client'

import { useState, useEffect } from 'react'
import { Mic, Play, Pause, Check, RefreshCw, Volume2, Lock, Crown, Sparkles, Radio } from 'lucide-react'

// OpenAI TTS voices disponíveis (femininas)
const vozesTTS = [
    { id: 'nova', nome: 'Nova', desc: 'Jovem, animada e acolhedora', tom: 'Alegre' },
    { id: 'shimmer', nome: 'Shimmer', desc: 'Suave, sofisticada e elegante', tom: 'Premium' },
    { id: 'alloy', nome: 'Alloy', desc: 'Equilibrada, profissional e clara', tom: 'Neutro' },
]

// ElevenLabs voices pré-selecionadas (reais)
const vozesElevenLabs = [
    { id: 'rachel', nome: 'Rachel', desc: 'Brasileira, tom quente e confiante', tom: 'Vendedora' },
    { id: 'bella', nome: 'Bella', desc: 'Jovem, empática e moderna', tom: 'Amiga' },
    { id: 'elli', nome: 'Elli', desc: 'Madura, transmite autoridade e segurança', tom: 'Especialista' },
    { id: 'domi', nome: 'Domi', desc: 'Enérgica, persuasiva e dinâmica', tom: 'Motivacional' },
]

type TipoVoz = 'tts' | 'elevenlabs' | 'clone'

export default function VozTool() {
    const [nivel, setNivel] = useState(1)
    const [tipoVozAtiva, setTipoVozAtiva] = useState<TipoVoz>('tts')
    const [vozTTSSelecionada, setVozTTSSelecionada] = useState('nova')
    const [vozElevenSelecionada, setVozElevenSelecionada] = useState('rachel')
    const [tocando, setTocando] = useState<string | null>(null)
    const [salvando, setSalvando] = useState(false)
    const [salvo, setSalvo] = useState(false)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
                setNivel(data?.plano || 1)
                // Se tem voz clonada e é P3+, seleciona clone
                if (data?.vozClonada && data?.plano >= 3) setTipoVozAtiva('clone')
                else if (data?.plano >= 2) setTipoVozAtiva('elevenlabs')
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
                    voz_assistente: tipoVozAtiva === 'tts' ? vozTTSSelecionada : tipoVozAtiva === 'elevenlabs' ? vozElevenSelecionada : 'clone',
                }),
            })
            setSalvo(true)
            setTimeout(() => setSalvo(false), 3000)
        } catch { }
        setSalvando(false)
    }

    const podeSelecionarEL = nivel >= 2
    const podeSelecionarClone = nivel >= 3

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

                    {/* ElevenLabs */}
                    <button
                        onClick={() => podeSelecionarEL && setTipoVozAtiva('elevenlabs')}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative ${!podeSelecionarEL ? 'opacity-60 cursor-not-allowed' :
                                tipoVozAtiva === 'elevenlabs' ? 'border-[#D99773] bg-[#D99773]/5' : 'border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        {!podeSelecionarEL && <Lock size={12} className="absolute top-3 right-3 text-gray-300" />}
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className={tipoVozAtiva === 'elevenlabs' ? 'text-[#D99773]' : 'text-gray-400'} />
                            <span className="text-[11px] font-semibold text-gray-700">Voz Real</span>
                        </div>
                        <p className="text-[9px] text-gray-400">Vozes ultra-reais ElevenLabs</p>
                        <div className="mt-2">
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Plano 2+</span>
                        </div>
                        {tipoVozAtiva === 'elevenlabs' && <Check size={14} className="text-[#D99773] mt-2" />}
                    </button>

                    {/* Clone */}
                    <button
                        onClick={() => podeSelecionarClone && setTipoVozAtiva('clone')}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative ${!podeSelecionarClone ? 'opacity-60 cursor-not-allowed' :
                                tipoVozAtiva === 'clone' ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        {!podeSelecionarClone && <Lock size={12} className="absolute top-3 right-3 text-gray-300" />}
                        <div className="flex items-center gap-2 mb-2">
                            <Mic size={14} className={tipoVozAtiva === 'clone' ? 'text-purple-500' : 'text-gray-400'} />
                            <span className="text-[11px] font-semibold text-gray-700">Sua Voz</span>
                        </div>
                        <p className="text-[9px] text-gray-400">Clone da sua voz com IA</p>
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
            {/* SEÇÃO 1: VOZES TTS (P1+) */}
            {/* ============================================ */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-1 flex items-center gap-2">
                    <Volume2 size={15} className="text-[#0F4C61]" />
                    Vozes Digitais
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Ouça e escolha a voz que combina com sua clínica</p>

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
            {/* SEÇÃO 2: VOZES REAIS — ELEVENLABS (P2+) */}
            {/* ============================================ */}
            <div className={`bg-white rounded-2xl border p-5 relative ${podeSelecionarEL ? 'border-gray-100' : 'border-amber-100'}`}>
                {!podeSelecionarEL && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl z-10 flex flex-col items-center justify-center">
                        <Lock size={24} className="text-amber-400 mb-2" />
                        <p className="text-[12px] font-semibold text-gray-700">Vozes Reais — Plano Estrategista</p>
                        <p className="text-[10px] text-gray-400 mb-3">Vozes ultra-reais da ElevenLabs</p>
                        <a href="/habilidades/plano" className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors flex items-center gap-1">
                            <Crown size={11} /> Fazer upgrade
                        </a>
                    </div>
                )}

                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <Sparkles size={15} className="text-[#D99773]" />
                        Vozes Reais
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Plano 2+</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">Vozes humanas de alta qualidade — a cliente não percebe que é IA</p>

                <div className="space-y-2">
                    {vozesElevenLabs.map(voz => (
                        <button
                            key={voz.id}
                            onClick={() => { if (podeSelecionarEL) { setVozElevenSelecionada(voz.id); setTipoVozAtiva('elevenlabs') } }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${vozElevenSelecionada === voz.id && tipoVozAtiva === 'elevenlabs'
                                    ? 'bg-[#D99773]/5 border-2 border-[#D99773]'
                                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                }`}
                        >
                            <div
                                onClick={(e) => { e.stopPropagation(); setTocando(tocando === `el-${voz.id}` ? null : `el-${voz.id}`) }}
                                className="w-9 h-9 rounded-full bg-[#D99773] flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {tocando === `el-${voz.id}` ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-[12px] font-medium text-gray-700">{voz.nome}</p>
                                <p className="text-[9px] text-gray-400">{voz.desc}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#D99773]/10 text-[#D99773]">{voz.tom}</span>
                            {vozElevenSelecionada === voz.id && tipoVozAtiva === 'elevenlabs' && (
                                <Check size={14} className="text-[#D99773]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ============================================ */}
            {/* SEÇÃO 3: VOZ CLONADA (P3+) */}
            {/* ============================================ */}
            <div className={`bg-white rounded-2xl border p-5 relative ${podeSelecionarClone ? 'border-gray-100' : 'border-purple-100'}`}>
                {!podeSelecionarClone && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl z-10 flex flex-col items-center justify-center">
                        <Lock size={24} className="text-purple-400 mb-2" />
                        <p className="text-[12px] font-semibold text-gray-700">Clone da Sua Voz — Plano Designer</p>
                        <p className="text-[10px] text-gray-400 mb-3">A IARA responde com a SUA voz clonada</p>
                        <a href="/habilidades/plano" className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex items-center gap-1">
                            <Crown size={11} /> Fazer upgrade
                        </a>
                    </div>
                )}

                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2">
                        <Mic size={15} className="text-purple-500" />
                        Clone da Sua Voz
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Plano 3+</span>
                </div>
                <p className="text-[10px] text-gray-400 mb-4">Envie um áudio de 30 segundos e a IA aprende sua voz</p>

                {/* Steps do clone */}
                <div className="flex items-center gap-0 mb-4">
                    {[
                        { num: 1, titulo: 'Enviar Áudio', desc: 'Grave 30s falando' },
                        { num: 2, titulo: 'Treinar Modelo', desc: 'IA aprende (~5 min)' },
                        { num: 3, titulo: 'Pronto!', desc: 'Voz ativa' },
                    ].map((e, i) => (
                        <div key={e.num} className="flex items-center flex-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${podeSelecionarClone ? 'bg-purple-100 text-purple-500' : 'bg-gray-100 text-gray-400'
                                }`}>
                                <span className="text-[10px] font-bold">{e.num}</span>
                            </div>
                            {i < 2 && <div className="flex-1 h-0.5 mx-2 bg-gray-200" />}
                        </div>
                    ))}
                </div>

                {podeSelecionarClone && (
                    <div className="space-y-3">
                        {/* Comparação Original vs Clone - quando disponível */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Áudio Original</p>
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
                                <p className="text-[9px] uppercase tracking-wider text-purple-400 mb-2">Voz Clonada (IA)</p>
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

                        <button className="w-full text-[11px] font-medium px-3 py-2 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-100 transition-colors">
                            <RefreshCw size={12} /> Re-treinar voz
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
