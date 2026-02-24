'use client'

import { useState } from 'react'
import { Video, Upload, Play, Download, Clock, Sparkles } from 'lucide-react'

export default function VideoTool() {
    const [texto, setTexto] = useState('')
    const [gerando, setGerando] = useState(false)
    const [videoGerado, setVideoGerado] = useState(false)

    const handleGerar = () => {
        if (!texto.trim()) return
        setGerando(true)
        // TODO: POST webhook N8N → HeyGen
        setTimeout(() => {
            setGerando(false)
            setVideoGerado(true)
        }, 3000)
    }

    return (
        <div className="space-y-6">
            {/* Avatar + Voz preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="font-semibold text-petroleo text-sm mb-3 flex items-center gap-2">
                        <Video size={16} className="text-terracota" />
                        Seu Avatar
                    </h3>
                    <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-petroleo/5 to-terracota/5 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-terracota/20 mx-auto mb-3 flex items-center justify-center">
                                <span className="text-3xl">👩‍⚕️</span>
                            </div>
                            <p className="text-sm text-acinzentado">Avatar da Dra. Ana</p>
                            <button className="text-xs text-terracota font-semibold mt-2 hover:underline">
                                Trocar avatar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="font-semibold text-petroleo text-sm mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-terracota" />
                        Sua Voz Clonada
                    </h3>
                    <div className="p-4 bg-glacial rounded-2xl mb-3">
                        <div className="flex items-center gap-3">
                            <button className="w-10 h-10 rounded-full bg-terracota flex items-center justify-center flex-shrink-0">
                                <Play size={16} className="text-white ml-0.5" />
                            </button>
                            <div className="flex-1">
                                <div className="w-full h-8 bg-terracota/15 rounded-lg flex items-center px-3">
                                    <div className="flex gap-0.5 items-end h-5">
                                        {Array.from({ length: 30 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1 bg-terracota/40 rounded-full"
                                                style={{ height: `${Math.random() * 100}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-acinzentado mt-1">Prévia da voz clonada • 5s</p>
                            </div>
                        </div>
                    </div>
                    <button className="text-xs text-terracota font-semibold hover:underline flex items-center gap-1">
                        <Upload size={12} /> Enviar novo áudio para clonar
                    </button>
                </div>
            </div>

            {/* Criar vídeo */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">✍️ Criar Novo Vídeo</h3>
                <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Digite o texto que seu avatar vai falar no vídeo...&#10;&#10;Ex: Oi gente! Hoje quero falar sobre micropigmentação fio a fio..."
                    className="input-field min-h-[120px] resize-none"
                    rows={5}
                />
                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-acinzentado flex items-center gap-1">
                        <Clock size={12} /> Tempo estimado: ~2 minutos
                    </p>
                    <button
                        onClick={handleGerar}
                        disabled={gerando || !texto.trim()}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {gerando ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Video size={16} /> Gerar Vídeo
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Vídeo gerado */}
            {videoGerado && (
                <div className="glass-card p-6 animate-fade-in">
                    <h3 className="font-semibold text-petroleo mb-4">🎬 Vídeo Pronto!</h3>
                    <div className="w-full aspect-video rounded-2xl bg-gradient-to-br from-petroleo/10 to-terracota/10 flex items-center justify-center mb-4">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-terracota/20 mx-auto mb-3 flex items-center justify-center">
                                <Play size={28} className="text-terracota ml-1" />
                            </div>
                            <p className="text-sm text-acinzentado">Clique para assistir</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-primary flex items-center gap-2">
                            <Download size={16} /> Baixar MP4
                        </button>
                        <button className="btn-secondary flex items-center gap-2">
                            Gerar outro
                        </button>
                    </div>
                </div>
            )}

            {/* Vídeos anteriores */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">📁 Meus Vídeos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Dica de Micro', 'Promo Março', 'Antes e Depois'].map((titulo, i) => (
                        <div key={i} className="group relative rounded-2xl overflow-hidden bg-glacial aspect-video flex items-center justify-center cursor-pointer">
                            <Play size={24} className="text-terracota/50 group-hover:text-terracota transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-sm">
                                <p className="text-xs font-medium text-petroleo truncate">{titulo}</p>
                                <p className="text-xs text-acinzentado">{i + 1} dia atrás</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
