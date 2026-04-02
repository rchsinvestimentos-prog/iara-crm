'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Play, Pause, Check, RefreshCw, Volume2, Lock, Crown, Sparkles, Radio, Square, Headphones, Loader2 } from 'lucide-react'

// ============================================
// VOZES DIGITAIS (OpenAI TTS) — Plano 1+
// ============================================
const vozesTTS = [
    { id: 'nova', nome: 'Nova', desc: 'Jovem, animada e acolhedora', tom: 'Alegre' },
    { id: 'shimmer', nome: 'Shimmer', desc: 'Suave, sofisticada e elegante', tom: 'Premium' },
    { id: 'alloy', nome: 'Alloy', desc: 'Equilibrada, profissional e clara', tom: 'Neutro' },
]

// ============================================
// VOZES ULTRA REALISTAS (ElevenLabs BR) — Plano 2+
// ============================================
const vozesUltra = [
    { id: '7eUAxNOneHxqfyRS77mW', nome: 'Carla', desc: 'Confiante e calorosa', tom: 'Vendedora' },
    { id: 'lWq4KDY8znfkV0DrK8Vb', nome: 'Yasmin', desc: 'Moderna e empática', tom: 'Amiga' },
    { id: 'oi8rgjIfLgJRsQ6rbZh3', nome: 'Amanda', desc: 'Profissional e acolhedora', tom: 'Especialista' },
    { id: 'a7l5EMFEpTRuD82NW0rC', nome: 'Rhay', desc: 'Dinâmica e carismática', tom: 'Energia' },
    { id: 'rthJ5Dw4ng8Orz8mYafh', nome: 'Luana', desc: 'Suave e transmite confiança', tom: 'Tranquila' },
    { id: 'OB6x7EbXYlhG4DDTB1XU', nome: 'Michelle', desc: 'Elegante e articulada', tom: 'Premium' },
    { id: 'x3mAOLD9WzlmrFCwA1S3', nome: 'Evellyn', desc: 'Jovem e simpática', tom: 'Alegre' },
    { id: 'GFPGeIuI7dxt6YeFLE7l', nome: 'Ayres', desc: 'Madura e sofisticada', tom: 'Autoridade' },
    { id: 'RGymW84CSmfVugnA5tvA', nome: 'Roberta', desc: 'Clara e objetiva', tom: 'Direta' },
    { id: '5EtawPduB139avoMLQgH', nome: 'Thais', desc: 'Doce e envolvente', tom: 'Acolhedora' },
    { id: 'e06XicPETIbfUaeHM9zH', nome: 'Fabi', desc: 'Animada e persuasiva', tom: 'Vendas' },
    { id: 'UZ8QqWVrz7tMdxiglcLh', nome: 'Livia', desc: 'Serena e profissional', tom: 'Consultora' },
]

type TipoVoz = 'tts' | 'ultra' | 'clone'

export default function VozTool() {
    const [nivel, setNivel] = useState(1)
    const [tipoVozAtiva, setTipoVozAtiva] = useState<TipoVoz>('tts')
    const [vozTTSSelecionada, setVozTTSSelecionada] = useState('nova')
    const [vozUltraSelecionada, setVozUltraSelecionada] = useState('7eUAxNOneHxqfyRS77mW')
    const [salvando, setSalvando] = useState(false)
    const [salvo, setSalvo] = useState(false)

    // Audio player
    const [tocando, setTocando] = useState<string | null>(null)
    const [carregando, setCarregando] = useState<string | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const audioCache = useRef<Record<string, string>>({})

    // Gravação de voz
    const [gravando, setGravando] = useState(false)
    const [tempoGravacao, setTempoGravacao] = useState(0)
    const [audioGravado, setAudioGravado] = useState<string | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
                setNivel(data?.plano || 1)
                if (data?.vozClonada && data?.plano >= 3) setTipoVozAtiva('clone')
                else if (data?.plano >= 2) setTipoVozAtiva('ultra')
            })
            .catch(() => { })

        // Carregar a voz salva (está em configuracoes)
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                const cfg = data?.configuracoes || {}
                if (cfg.tipo_voz_ativa) setTipoVozAtiva(cfg.tipo_voz_ativa)
                if (cfg.openai_voice_id) setVozTTSSelecionada(cfg.openai_voice_id)
                if (cfg.eleven_voice_id) setVozUltraSelecionada(cfg.eleven_voice_id)
            })
            .catch(() => { })
    }, [])

    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    // ============================================
    // PLAY — Gera TTS (OpenAI ou ElevenLabs) e toca
    // ============================================
    const playVoice = useCallback(async (voiceId: string, key: string, tipo: 'tts' | 'elevenlabs' = 'tts') => {
        if (tocando === key) {
            audioRef.current?.pause()
            setTocando(null)
            return
        }

        if (audioRef.current) audioRef.current.pause()

        // Cache hit
        if (audioCache.current[key]) {
            const audio = new Audio(audioCache.current[key])
            audioRef.current = audio
            setTocando(key)
            audio.onended = () => setTocando(null)
            audio.play()
            return
        }

        // Gerar TTS
        setCarregando(key)
        try {
            const res = await fetch('/api/voice-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voice: voiceId, tipo }),
            })
            const data = await res.json()
            if (data.audio) {
                audioCache.current[key] = data.audio
                const audio = new Audio(data.audio)
                audioRef.current = audio
                setTocando(key)
                setCarregando(null)
                audio.onended = () => setTocando(null)
                audio.play()
            } else {
                console.error('Erro preview:', data.error)
            }
        } catch (e) {
            console.error('Erro ao gerar preview:', e)
        }
        setCarregando(null)
    }, [tocando])

    // ============================================
    // GRAVAÇÃO DE VOZ (MediaRecorder)
    // ============================================
    const iniciarGravacao = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                const url = URL.createObjectURL(blob)
                setAudioGravado(url)
                stream.getTracks().forEach(t => t.stop())
            }

            mediaRecorder.start()
            setGravando(true)
            setTempoGravacao(0)

            timerRef.current = setInterval(() => {
                setTempoGravacao(prev => {
                    if (prev >= 30) {
                        pararGravacao()
                        return 30
                    }
                    return prev + 1
                })
            }, 1000)
        } catch {
            alert('Permita o acesso ao microfone para gravar.')
        }
    }

    const pararGravacao = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        setGravando(false)
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }

    // ============================================
    // SALVAR
    // ============================================
    const salvarVoz = async () => {
        setSalvando(true)
        try {
            const vozNome = tipoVozAtiva === 'tts'
                ? vozesTTS.find(v => v.id === vozTTSSelecionada)?.nome || vozTTSSelecionada
                : tipoVozAtiva === 'ultra'
                    ? vozesUltra.find(v => v.id === vozUltraSelecionada)?.nome || vozUltraSelecionada
                    : 'clone'

            // Montar configuracoes com as chaves que audio.ts realmente lê
            const cfgUpdate: Record<string, unknown> = {
                tipo_voz_ativa: tipoVozAtiva,
                voz_nome: vozNome,
            }

            if (tipoVozAtiva === 'tts') {
                // OpenAI TTS — audio.ts lê cfg.openai_voice_id
                cfgUpdate.openai_voice_id = vozTTSSelecionada
            } else if (tipoVozAtiva === 'ultra') {
                // ElevenLabs — audio.ts lê cfg.eleven_voice_id
                cfgUpdate.eleven_voice_id = vozUltraSelecionada
                cfgUpdate.usar_voz_clonada = false
            } else if (tipoVozAtiva === 'clone') {
                // Voz clonada — audio.ts lê cfg.usar_voz_clonada + vozClonada
                cfgUpdate.usar_voz_clonada = true
            }

            // Buscar configuracoes atuais e fazer merge
            const res = await fetch('/api/clinica')
            const dados = await res.json()
            const cfgAtual = dados.configuracoes || {}

            await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    configuracoes: { ...cfgAtual, ...cfgUpdate },
                }),
            })
            setSalvo(true)
            setTimeout(() => setSalvo(false), 3000)
        } catch { }
        setSalvando(false)
    }

    const podeAtivarUltra = nivel >= 2
    const podeAtivarClone = nivel >= 3
    const formatTime = (s: number) => `0:${String(s).padStart(2, '0')}`

    // Helper: play button
    const PlayBtn = ({ voiceKey, loading, playing, color }: { voiceKey: string; loading: boolean; playing: boolean; color: string }) => (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity`} style={{ backgroundColor: color }}>
            {loading ? (
                <Loader2 size={13} className="text-white animate-spin" />
            ) : playing ? (
                <Pause size={13} className="text-white" />
            ) : (
                <Play size={13} className="text-white ml-0.5" />
            )}
        </div>
    )

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="space-y-6">

            {/* SELETOR DE TIPO DE VOZ */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
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
                        <Volume2 size={14} className={tipoVozAtiva === 'tts' ? 'text-[#0F4C61]' : 'text-gray-400'} />
                        <p className="text-[11px] font-semibold text-gray-700 mt-1">Voz Digital</p>
                        <p className="text-[9px] text-gray-400">Naturais e rápidas</p>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium mt-2 inline-block">Todos os planos</span>
                        {tipoVozAtiva === 'tts' && <Check size={14} className="text-[#0F4C61] mt-1" />}
                    </button>

                    {/* Ultra Realista */}
                    <button
                        onClick={() => podeAtivarUltra ? setTipoVozAtiva('ultra') : null}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative ${!podeAtivarUltra ? 'cursor-default' :
                            tipoVozAtiva === 'ultra' ? 'border-[#D99773] bg-[#D99773]/5' : 'border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        {!podeAtivarUltra && <Lock size={12} className="absolute top-3 right-3 text-gray-300" />}
                        <Sparkles size={14} className={tipoVozAtiva === 'ultra' ? 'text-[#D99773]' : 'text-gray-400'} />
                        <p className="text-[11px] font-semibold text-gray-700 mt-1">Ultra Realista</p>
                        <p className="text-[9px] text-gray-400">Parecem humanos de verdade</p>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium mt-2 inline-block">Plano 2+</span>
                        {tipoVozAtiva === 'ultra' && <Check size={14} className="text-[#D99773] mt-1" />}
                    </button>

                    {/* Clone */}
                    <button
                        onClick={() => podeAtivarClone ? setTipoVozAtiva('clone') : null}
                        className={`p-4 rounded-xl border-2 transition-all text-left relative ${!podeAtivarClone ? 'cursor-default' :
                            tipoVozAtiva === 'clone' ? 'border-purple-400 bg-purple-50' : 'border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        {!podeAtivarClone && <Lock size={12} className="absolute top-3 right-3 text-gray-300" />}
                        <Mic size={14} className={tipoVozAtiva === 'clone' ? 'text-purple-500' : 'text-gray-400'} />
                        <p className="text-[11px] font-semibold text-gray-700 mt-1">Sua Voz</p>
                        <p className="text-[9px] text-gray-400">Clone da sua própria voz</p>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium mt-2 inline-block">Plano 3+</span>
                        {tipoVozAtiva === 'clone' && <Check size={14} className="text-purple-500 mt-1" />}
                    </button>
                </div>

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
            {/* VOZES DIGITAIS (P1+) */}
            {/* ============================================ */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-1 flex items-center gap-2">
                    <Volume2 size={15} className="text-[#0F4C61]" />
                    Vozes Digitais
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">Ouça e escolha a voz que combina com a personalidade da sua clínica</p>

                <div className="space-y-2">
                    {vozesTTS.map(voz => (
                        <div
                            key={voz.id}
                            onClick={() => { setVozTTSSelecionada(voz.id); setTipoVozAtiva('tts') }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${vozTTSSelecionada === voz.id && tipoVozAtiva === 'tts'
                                ? 'bg-[#0F4C61]/5 border-2 border-[#0F4C61]'
                                : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                }`}
                        >
                            <div onClick={(e) => { e.stopPropagation(); playVoice(voz.id, `tts-${voz.id}`, 'tts') }}>
                                <PlayBtn voiceKey={`tts-${voz.id}`} loading={carregando === `tts-${voz.id}`} playing={tocando === `tts-${voz.id}`} color="#0F4C61" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-[12px] font-medium text-gray-700">{voz.nome}</p>
                                <p className="text-[9px] text-gray-400">{voz.desc}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{voz.tom}</span>
                            {vozTTSSelecionada === voz.id && tipoVozAtiva === 'tts' && <Check size={14} className="text-[#0F4C61]" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* ============================================ */}
            {/* VOZ ULTRA REALISTA — 12 vozes BR (P2+) */}
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

                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {vozesUltra.map(voz => (
                        <div
                            key={voz.id}
                            onClick={() => { if (podeAtivarUltra) { setVozUltraSelecionada(voz.id); setTipoVozAtiva('ultra') } }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${podeAtivarUltra ? 'cursor-pointer' : ''} ${podeAtivarUltra && vozUltraSelecionada === voz.id && tipoVozAtiva === 'ultra'
                                ? 'bg-[#D99773]/5 border-2 border-[#D99773]'
                                : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                }`}
                        >
                            {/* Play — TODO MUNDO pode ouvir, inclusive P1 */}
                            <div onClick={(e) => { e.stopPropagation(); playVoice(voz.id, `ultra-${voz.id}`, 'elevenlabs') }}>
                                <PlayBtn voiceKey={`ultra-${voz.id}`} loading={carregando === `ultra-${voz.id}`} playing={tocando === `ultra-${voz.id}`} color="#D99773" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-[12px] font-medium text-gray-700">{voz.nome}</p>
                                <p className="text-[9px] text-gray-400">{voz.desc}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#D99773]/10 text-[#D99773]">{voz.tom}</span>
                            {podeAtivarUltra && vozUltraSelecionada === voz.id && tipoVozAtiva === 'ultra' && <Check size={14} className="text-[#D99773]" />}
                        </div>
                    ))}
                </div>

                {!podeAtivarUltra && (
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3">
                        <Headphones size={16} className="text-amber-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] font-medium text-gray-700">Gostou? Faça upgrade para ativar</p>
                            <p className="text-[9px] text-gray-400">Suas clientes não vão perceber que é IA</p>
                        </div>
                        <a href="/plano" className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1">
                            <Crown size={10} /> Upgrade
                        </a>
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* CLONE DA SUA VOZ (P3+) */}
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
                <p className="text-[10px] text-gray-400 mb-4">Grave um áudio de 30 segundos e ouça como a IA reproduz a SUA voz. Incrível!</p>

                {/* Gravação direto pelo app */}
                <div className="p-4 bg-gray-50 rounded-xl mb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${gravando ? 'bg-red-500 animate-pulse' : 'bg-purple-100'}`}>
                            <Mic size={16} className={gravando ? 'text-white' : 'text-purple-500'} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[12px] font-medium text-gray-700">
                                {gravando ? `Gravando... ${formatTime(tempoGravacao)}` : audioGravado ? 'Áudio gravado!' : 'Grave sua voz por 30 segundos'}
                            </p>
                            <p className="text-[9px] text-gray-400">
                                {gravando ? 'Fale naturalmente sobre qualquer assunto' : audioGravado ? 'Ouça abaixo o resultado' : 'Fale naturalmente por 30 segundos'}
                            </p>
                        </div>
                    </div>

                    {gravando && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                            <div className="bg-red-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(tempoGravacao / 30) * 100}%` }} />
                        </div>
                    )}

                    <div className="flex gap-2">
                        {!gravando ? (
                            <button
                                onClick={iniciarGravacao}
                                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-[11px] font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                            >
                                <Mic size={14} />
                                {audioGravado ? 'Gravar novamente' : 'Começar a gravar'}
                            </button>
                        ) : (
                            <button
                                onClick={pararGravacao}
                                className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-[11px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                <Square size={14} />
                                Parar gravação
                            </button>
                        )}
                    </div>
                </div>

                {audioGravado && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-2">Seu Áudio Original</p>
                            <audio src={audioGravado} controls className="w-full h-8" />
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl">
                            <p className="text-[9px] uppercase tracking-wider text-purple-400 mb-2">Sua Voz Clonada (IA)</p>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg text-[10px] text-gray-400">
                                <Loader2 size={12} className="animate-spin text-purple-400" />
                                Processando clone...
                            </div>
                        </div>
                    </div>
                )}

                {!podeAtivarClone && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-purple-50 to-fuchsia-50 flex items-center gap-3">
                        <Mic size={16} className="text-purple-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-[11px] font-medium text-gray-700">Ative no Plano 3+ para usar sua voz</p>
                            <p className="text-[9px] text-gray-400">Sua IARA vai falar com a SUA voz clonada</p>
                        </div>
                        <a href="/plano" className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-1">
                            <Crown size={10} /> Upgrade
                        </a>
                    </div>
                )}

                {podeAtivarClone && audioGravado && (
                    <button className="w-full text-[11px] font-medium px-3 py-2 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-100 transition-colors">
                        <RefreshCw size={12} /> Re-treinar voz
                    </button>
                )}
            </div>
        </div>
    )
}
