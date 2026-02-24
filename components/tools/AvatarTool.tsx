'use client'

import { useState } from 'react'
import { Camera, Download, Wand2, RefreshCw } from 'lucide-react'

const estilos = [
    { nome: 'Profissional', desc: 'Ambiente de clínica', emoji: '💼' },
    { nome: 'Casual', desc: 'Lifestyle descontraído', emoji: '☀️' },
    { nome: 'Elegante', desc: 'Look sofisticado', emoji: '💎' },
    { nome: 'Revista', desc: 'Capa de revista', emoji: '📸' },
]

export default function AvatarTool() {
    const [estiloSel, setEstiloSel] = useState(0)
    const [gerando, setGerando] = useState(false)
    const [gerado, setGerado] = useState(false)

    const handleGerar = () => {
        setGerando(true)
        setTimeout(() => {
            setGerando(false)
            setGerado(true)
        }, 3000)
    }

    return (
        <div className="space-y-6">
            {/* Foto base */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <Camera size={16} className="text-terracota" />
                    Sua Foto Base
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="aspect-square rounded-2xl bg-gradient-to-br from-terracota/10 to-petroleo/5 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-terracota/20 mx-auto mb-2 flex items-center justify-center">
                                <span className="text-2xl">👩‍⚕️</span>
                            </div>
                            <p className="text-xs text-acinzentado">Foto atual</p>
                        </div>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        <p className="text-sm text-acinzentado">
                            Essa é a foto que a IA usa como base para criar seus avatares. Envie uma foto de rosto nítida, com boa iluminação.
                        </p>
                        <button className="btn-secondary text-xs flex items-center gap-1.5">
                            <Camera size={14} /> Trocar foto base
                        </button>
                    </div>
                </div>
            </div>

            {/* Escolher estilo */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">🎨 Escolha o Estilo</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {estilos.map((e, i) => (
                        <button
                            key={i}
                            onClick={() => setEstiloSel(i)}
                            className={`p-4 rounded-2xl border-2 transition-all text-center ${estiloSel === i
                                    ? 'border-terracota bg-terracota/5'
                                    : 'border-transparent bg-glacial hover:border-terracota/30'
                                }`}
                        >
                            <span className="text-2xl block mb-2">{e.emoji}</span>
                            <p className="font-semibold text-petroleo text-sm">{e.nome}</p>
                            <p className="text-xs text-acinzentado">{e.desc}</p>
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleGerar}
                    disabled={gerando}
                    className="btn-primary flex items-center gap-2 mt-4 disabled:opacity-50"
                >
                    {gerando ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Gerando fotos...
                        </>
                    ) : (
                        <>
                            <Wand2 size={16} /> Gerar 4 Fotos
                        </>
                    )}
                </button>
            </div>

            {/* Fotos geradas */}
            {gerado && (
                <div className="glass-card p-6 animate-fade-in">
                    <h3 className="font-semibold text-petroleo mb-4">📸 Fotos Geradas!</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="group relative aspect-square rounded-2xl bg-gradient-to-br from-terracota/10 to-petroleo/5 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="text-4xl">👩‍⚕️</span>
                                    <p className="text-xs text-acinzentado mt-2">Variação {n}</p>
                                </div>
                                <div className="absolute inset-0 bg-petroleo/0 group-hover:bg-petroleo/10 rounded-2xl transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                                    <button className="bg-white/90 text-petroleo px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
                                        <Download size={12} /> Baixar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button className="btn-primary flex items-center gap-2">
                            <Download size={16} /> Baixar Todas
                        </button>
                        <button onClick={() => setGerado(false)} className="btn-secondary flex items-center gap-2">
                            <RefreshCw size={16} /> Gerar mais
                        </button>
                    </div>
                </div>
            )}

            {/* Galeria */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">📁 Minhas Fotos</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-2xl bg-glacial flex items-center justify-center cursor-pointer group">
                            <span className="text-2xl opacity-30 group-hover:opacity-60 transition-opacity">👩‍⚕️</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
