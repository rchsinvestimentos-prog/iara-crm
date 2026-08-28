'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Play, Pause, Check, RefreshCw, Volume2, Lock, Crown, Sparkles, Radio, Square, Headphones, Loader2, X } from 'lucide-react'
import CheckoutModal from '@/components/CheckoutModal'
import { PACOTES } from '@/lib/planos'

// ============================================
// VOZES PADRÃO (Azure pt-BR) — inclusas em todos os planos
// ============================================
// Substituíram as três da OpenAI, que tinham sotaque de quem aprendeu
// português. Custam praticamente o mesmo (R$0,026 contra R$0,025 por áudio).
// A voz masculina do catálogo foi deixada de fora: a IARA é assistente mulher.
//
// 'preview' aponta para um arquivo estático em public/vozes/. Tocar direto
// dali é instantâneo e não gasta API — antes cada clique gerava um áudio novo.
const vozesTTS = [
    { id: 'pt-BR-FranciscaNeural', nome: 'Francisca', desc: 'Acolhedora e natural — a mais parecida com recepcionista', tom: 'Acolhedora', preview: '/vozes/francisca.mp3' },
    { id: 'pt-BR-ThalitaNeural', nome: 'Thalita', desc: 'Jovem e simpática, ritmo mais leve', tom: 'Jovem', preview: '/vozes/thalita.mp3' },
    { id: 'pt-BR-BrendaNeural', nome: 'Brenda', desc: 'Calma e clara, boa para explicar procedimento', tom: 'Clara', preview: '/vozes/brenda.mp3' },
    { id: 'pt-BR-LeilaNeural', nome: 'Leila', desc: 'Madura e segura, transmite autoridade', tom: 'Autoridade', preview: '/vozes/leila.mp3' },
    { id: 'pt-BR-YaraNeural', nome: 'Yara', desc: 'Doce e próxima', tom: 'Doce', preview: '/vozes/yara.mp3' },
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
    const [vozTTSSelecionada, setVozTTSSelecionada] = useState('pt-BR-FranciscaNeural')
    const [vozUltraSelecionada, setVozUltraSelecionada] = useState('7eUAxNOneHxqfyRS77mW')
    // Os pacotes de voz são vendidos soltos, não vêm com o plano — por isso a
    // liberação olha configuracoes, não o nível.
    const [temPacoteRealista, setTemPacoteRealista] = useState(false)
    const [temPacoteClonagem, setTemPacoteClonagem] = useState(false)
    const [ofertaAberta, setOfertaAberta] = useState<null | 'realista' | 'clonagem'>(null)
    const [checkoutAberto, setCheckoutAberto] = useState(false)

    // Dicionário de pronúncia da clínica: nomes próprios que a IARA leria
    // errado (marca da clínica, nome de procedimento, sobrenome). As regras
    // gerais de leitura — horas, valores, Dra. — continuam como estavam.
    const [pronuncias, setPronuncias] = useState<{ escrita: string; falada: string }[]>([])
    const [novaEscrita, setNovaEscrita] = useState('')
    const [novaFalada, setNovaFalada] = useState('')
    const [testandoPronuncia, setTestandoPronuncia] = useState(false)
    const [salvandoPronuncias, setSalvandoPronuncias] = useState(false)
    const [pronunciasSalvas, setPronunciasSalvas] = useState(false)
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
            .then(data => setNivel(data?.plano || 1))
            .catch(() => { })

        // Carregar a voz salva e os pacotes contratados (tudo em configuracoes)
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                const cfg = data?.configuracoes || {}
                setTemPacoteRealista(!!cfg.pacote_voz_realista)
                setTemPacoteClonagem(!!cfg.pacote_clonagem)

                // 'tts' e 'ultra' são os nomes antigos, de antes dos pacotes.
                const LEGADO: Record<string, TipoVoz> = { tts: 'tts', ultra: 'ultra' }
                if (cfg.tipo_voz_ativa) setTipoVozAtiva(LEGADO[cfg.tipo_voz_ativa] || cfg.tipo_voz_ativa)
                if (cfg.azure_voice_id) setVozTTSSelecionada(cfg.azure_voice_id)
                if (cfg.eleven_voice_id) setVozUltraSelecionada(cfg.eleven_voice_id)
                if (Array.isArray(cfg.pronuncias)) setPronuncias(cfg.pronuncias)
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
    const playVoice = useCallback(async (voiceId: string, key: string, tipo: 'tts' | 'elevenlabs' = 'tts', arquivo?: string) => {
        if (tocando === key) {
            audioRef.current?.pause()
            setTocando(null)
            return
        }

        if (audioRef.current) audioRef.current.pause()

        // Voz padrão: o áudio já está pronto em public/vozes/, toca na hora e
        // sem chamar API nenhuma.
        if (arquivo) {
            const audio = new Audio(arquivo)
            audioRef.current = audio
            setTocando(key)
            audio.onended = () => setTocando(null)
            audio.play().catch(() => setTocando(null))
            return
        }

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
    /** Fala a palavra do jeito cadastrado, antes de salvar. */
    const ouvirPronuncia = async (escrita: string, falada: string) => {
        if (!escrita.trim() || !falada.trim() || testandoPronuncia) return
        setTestandoPronuncia(true)
        try {
            const res = await fetch('/api/voz/testar-pronuncia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Só a palavra: quem está ajustando a pronúncia quer ouvir
                    // ela isolada, não enterrada no meio de uma frase.
                    texto: escrita.trim(),
                    pronuncias: [{ escrita: escrita.trim(), falada: falada.trim() }],
                }),
            })
            const data = await res.json()
            if (data.audioBase64) {
                if (audioRef.current) audioRef.current.pause()
                const audio = new Audio(`data:audio/mp3;base64,${data.audioBase64}`)
                audioRef.current = audio
                audio.play().catch(() => { })
            }
        } catch { /* silencioso: o botão volta ao normal e a pessoa tenta de novo */ }
        setTestandoPronuncia(false)
    }

    const adicionarPronuncia = () => {
        const escrita = novaEscrita.trim()
        const falada = novaFalada.trim()
        if (!escrita || !falada) return
        // Reescrever a mesma palavra substitui, em vez de duplicar
        setPronuncias(prev => [...prev.filter(p => p.escrita.toLowerCase() !== escrita.toLowerCase()), { escrita, falada }])
        setNovaEscrita('')
        setNovaFalada('')
        setPronunciasSalvas(false)
    }

    const salvarPronuncias = async () => {
        setSalvandoPronuncias(true)
        try {
            const atual = await fetch('/api/clinica').then(r => r.json()).catch(() => ({}))
            const cfg = { ...(atual?.configuracoes || {}), pronuncias }
            const res = await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configuracoes: cfg }),
            })
            if (res.ok) {
                setPronunciasSalvas(true)
                setTimeout(() => setPronunciasSalvas(false), 3000)
            }
        } catch { /* mantém o botão disponível para tentar de novo */ }
        setSalvandoPronuncias(false)
    }

    const salvarVoz = async () => {
        // Escolheu voz realista ou clonagem sem ter o pacote: em vez de salvar
        // uma configuração que a IARA vai ignorar, mostra a oferta.
        if (tipoVozAtiva === 'ultra' && !podeAtivarUltra) { setOfertaAberta('realista'); return }
        if (tipoVozAtiva === 'clone' && !podeAtivarClone) { setOfertaAberta('clonagem'); return }

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
                // Voz padrão (Azure) — audio.ts lê cfg.azure_voice_id
                cfgUpdate.azure_voice_id = vozTTSSelecionada
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

    // Antes era nivel >= 2 e nivel >= 3. Agora são pacotes avulsos: qualquer
    // plano pode comprar qualquer um, e nenhum plano dá acesso sozinho.
    const podeAtivarUltra = temPacoteRealista
    const podeAtivarClone = temPacoteClonagem
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

                <div className="grid grid-cols-2 gap-3">
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
                            <div onClick={(e) => { e.stopPropagation(); playVoice(voz.id, `tts-${voz.id}`, 'tts', voz.preview) }}>
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
                            onClick={() => {
                                if (podeAtivarUltra) { setVozUltraSelecionada(voz.id); setTipoVozAtiva('ultra') }
                                else { setVozUltraSelecionada(voz.id); setOfertaAberta('realista') }
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${podeAtivarUltra && vozUltraSelecionada === voz.id && tipoVozAtiva === 'ultra'
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
                            <Crown size={10} /> Ativar
                        </a>
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* COMO A IARA FALA CERTAS PALAVRAS */}
            {/* ============================================ */}
            {/* Nomes próprios que nenhuma regra geral acerta: a marca da
                clínica, um procedimento em inglês, o sobrenome da profissional.
                Aqui a clínica escreve como quer ouvir, testa, e salva. */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-1 flex items-center gap-2">
                    <Headphones size={15} className="text-[#0F4C61]" />
                    Como a IARA fala certas palavras
                </h3>
                <p className="text-[10px] text-gray-400 mb-4">
                    Nome da clínica, procedimento em inglês, sobrenome — se a IARA lê errado, ensine aqui como deve soar.
                </p>

                {/* Lista do que já foi ensinado */}
                {pronuncias.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {pronuncias.map(p => (
                            <div key={p.escrita} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50">
                                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                    <span className="text-[12px] font-medium text-gray-700">{p.escrita}</span>
                                    <span className="text-[11px] text-gray-300">fala</span>
                                    <span className="text-[12px] font-medium text-[#D99773]">{p.falada}</span>
                                </div>
                                <button
                                    onClick={() => ouvirPronuncia(p.escrita, p.falada)}
                                    disabled={testandoPronuncia}
                                    title="Ouvir"
                                    className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <Play size={13} className="text-[#0F4C61]" />
                                </button>
                                <button
                                    onClick={() => { setPronuncias(prev => prev.filter(x => x.escrita !== p.escrita)); setPronunciasSalvas(false) }}
                                    title="Remover"
                                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Ensinar uma palavra nova */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Como se escreve</label>
                        <input
                            value={novaEscrita}
                            onChange={e => setNovaEscrita(e.target.value)}
                            placeholder="microblading"
                            className="w-full px-3 py-2 rounded-xl text-[12px] bg-gray-50 border border-gray-200 focus:border-[#0F4C61] outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 mb-1 block">Como deve soar</label>
                        <input
                            value={novaFalada}
                            onChange={e => setNovaFalada(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') adicionarPronuncia() }}
                            placeholder="microbleidin"
                            className="w-full px-3 py-2 rounded-xl text-[12px] bg-gray-50 border border-gray-200 focus:border-[#D99773] outline-none"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 mb-3">
                    Escreva do jeito que se fala, não do jeito certo. Ex.: <strong>peeling</strong> → <strong>pílin</strong>
                </p>

                <div className="flex gap-2">
                    <button
                        onClick={() => ouvirPronuncia(novaEscrita, novaFalada)}
                        disabled={!novaEscrita.trim() || !novaFalada.trim() || testandoPronuncia}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold border transition-colors disabled:opacity-40"
                        style={{ borderColor: 'var(--border-default)', color: '#0F4C61' }}
                    >
                        {testandoPronuncia ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                        Ouvir
                    </button>
                    <button
                        onClick={adicionarPronuncia}
                        disabled={!novaEscrita.trim() || !novaFalada.trim()}
                        className="flex-1 px-4 py-2 rounded-xl text-[12px] font-semibold text-white disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #0F4C61, #1a6e8b)' }}
                    >
                        Adicionar à lista
                    </button>
                </div>

                {pronuncias.length > 0 && (
                    <button
                        onClick={salvarPronuncias}
                        disabled={salvandoPronuncias}
                        className="w-full mt-3 py-2.5 rounded-xl text-[12.5px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{ background: pronunciasSalvas ? '#06D6A0' : 'linear-gradient(135deg, #D99773, #C07A55)' }}
                    >
                        {salvandoPronuncias ? <Loader2 size={14} className="animate-spin" />
                            : pronunciasSalvas ? <Check size={14} /> : <Sparkles size={14} />}
                        {pronunciasSalvas ? 'Salvo! A IARA já fala assim' : 'Salvar palavras'}
                    </button>
                )}
            </div>

            {/* ============================================ */}
            {/* OFERTA — aparece ao tentar usar voz de pacote */}
            {/* ============================================ */}
            {/* A clínica ouve todas as vozes à vontade; a trava só chega quando
                ela tenta usar. É aqui que a vontade já está criada — ela acabou
                de ouvir a diferença — então a oferta vem no lugar de um clique
                que simplesmente não fazia nada. */}
            {ofertaAberta && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(8,20,26,0.55)' }}
                    onClick={() => setOfertaAberta(null)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 bg-white"
                        style={{ border: '1px solid var(--border-default)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'rgba(217,151,115,0.15)' }}>
                                <Sparkles size={19} style={{ color: '#D99773' }} />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold text-gray-800 leading-tight">
                                    {ofertaAberta === 'realista'
                                        ? 'Essa voz pode ser a da sua clínica'
                                        : 'Sua própria voz atendendo por você'}
                                </h3>
                                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
                                    {ofertaAberta === 'realista'
                                        ? 'Você acabou de ouvir a diferença. Suas clientes não percebem que é IA.'
                                        : 'A IARA aprende a sua voz e atende com ela. A cliente sente que falou com você.'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.25)' }}>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-[26px] font-bold text-[#D99773]">
                                    {ofertaAberta === 'realista' ? 'R$ 97' : 'R$ 147'}
                                </span>
                                <span className="text-[12px] text-gray-500">por mês</span>
                            </div>
                            <p className="text-[11.5px] text-gray-600 leading-relaxed">
                                {ofertaAberta === 'realista'
                                    ? 'Some ao seu plano atual, seja ele qual for. Cancela quando quiser.'
                                    : 'Some ao seu plano atual. Inclui a clonagem e a troca de voz sempre que quiser.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            {/* Abre o checkout em vez de mandar para /plano, onde o
                                pacote não existe — a clínica clicava em ativar e
                                caía numa tela sem o que ela queria comprar. */}
                            <button
                                onClick={() => setCheckoutAberto(true)}
                                className="w-full py-3 rounded-xl text-[14px] font-semibold text-white text-center"
                                style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}
                            >
                                Quero ativar
                            </button>
                            <button
                                onClick={() => setOfertaAberta(null)}
                                className="w-full py-2 text-[12.5px] font-medium text-gray-400 hover:text-gray-600"
                            >
                                Agora não
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout do pacote que a clínica acabou de querer */}
            {ofertaAberta && (
                <CheckoutModal
                    aberto={checkoutAberto}
                    onClose={() => { setCheckoutAberto(false); setOfertaAberta(null) }}
                    tipo="pacote"
                    item={ofertaAberta === 'realista' ? 'voz_realista' : 'clonagem'}
                    nome={ofertaAberta === 'realista' ? PACOTES.voz_realista.nome : PACOTES.clonagem.nome}
                    preco={ofertaAberta === 'realista' ? PACOTES.voz_realista.preco : PACOTES.clonagem.preco}
                />
            )}
        </div>
    )
}
