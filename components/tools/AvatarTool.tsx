'use client'

import { useState, useRef } from 'react'
import { Camera, Download, Wand2, RefreshCw, Upload } from 'lucide-react'
import { useFeatureLimit } from '@/hooks/useFeatureLimit'
import FeatureLimitBanner from '@/components/FeatureLimitBanner'

const estilos = [
    { nome: 'Profissional', desc: 'Ambiente de clínica', emoji: '💼', prompt: 'professional healthcare aesthetic clinic environment, white coat, confident pose, clean modern medical office background' },
    { nome: 'Casual', desc: 'Lifestyle descontraído', emoji: '☀️', prompt: 'casual lifestyle photo, warm natural lighting, relaxed confident smile, modern cafe or garden background' },
    { nome: 'Elegante', desc: 'Look sofisticado', emoji: '💎', prompt: 'elegant sophisticated look, luxury aesthetic, pearl jewelry, soft studio lighting, high-end beauty editorial' },
    { nome: 'Revista', desc: 'Capa de revista', emoji: '📸', prompt: 'magazine cover photo, dramatic lighting, flawless makeup, editorial fashion photography, Vogue style' },
]

export default function AvatarTool() {
    const [estiloSel, setEstiloSel] = useState(0)
    const [gerando, setGerando] = useState(false)
    const [fotosGeradas, setFotosGeradas] = useState<string[]>([])
    const [fotoBase, setFotoBase] = useState<string | null>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const feature = useFeatureLimit('fotosIA')

    const handleUploadFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = reader.result as string
            setFotoBase(base64)
            setFotoPreview(base64)
        }
        reader.readAsDataURL(file)
    }

    const handleGerar = async () => {
        if (!feature.permitido) { alert('Você atingiu o limite de fotos IA grátis este mês! Faça upgrade para gerar mais.'); return }
        setGerando(true)
        setFotosGeradas([])
        try {
            const estilo = estilos[estiloSel]
            const res = await fetch('/api/fotos-ia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Beautiful woman, ${estilo.prompt}`,
                    image: fotoBase,
                    aspectRatio: '9:16',
                    numImages: 2,
                })
            })
            const data = await res.json()
            if (data.success && data.images) {
                setFotosGeradas(data.images)
                feature.increment()
            } else {
                alert(data.error || 'Erro ao gerar fotos')
            }
        } catch {
            alert('Erro de conexão. Tente novamente.')
        } finally {
            setGerando(false)
        }
    }

    return (
        <div className="space-y-6">
            <FeatureLimitBanner {...feature} />

            {/* Foto base */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <Camera size={16} className="text-terracota" />
                    Sua Foto Base
                </h3>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="aspect-square rounded-2xl bg-gradient-to-br from-terracota/10 to-petroleo/5 flex items-center justify-center cursor-pointer hover:opacity-80 transition overflow-hidden"
                    >
                        {fotoPreview ? (
                            <img src={fotoPreview} alt="Foto base" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-full bg-terracota/20 mx-auto mb-2 flex items-center justify-center">
                                    <Upload size={24} className="text-terracota" />
                                </div>
                                <p className="text-xs text-acinzentado">Clique para enviar foto</p>
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2 space-y-3">
                        <p className="text-sm text-acinzentado">
                            Envie uma foto de rosto nítida, com boa iluminação. A IA usará essa referência para criar fotos profissionais no estilo escolhido.
                        </p>
                        <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs flex items-center gap-1.5">
                            <Camera size={14} /> {fotoPreview ? 'Trocar foto base' : 'Enviar foto base'}
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
                            Gerando fotos... (pode levar 30-60s)
                        </>
                    ) : (
                        <>
                            <Wand2 size={16} /> Gerar Fotos
                        </>
                    )}
                </button>
            </div>

            {/* Fotos geradas */}
            {fotosGeradas.length > 0 && (
                <div className="glass-card p-6 animate-fade-in">
                    <h3 className="font-semibold text-petroleo mb-4">📸 Fotos Geradas!</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {fotosGeradas.map((url, i) => (
                            <div key={i} className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-glacial">
                                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-petroleo/0 group-hover:bg-petroleo/20 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                                    <a
                                        href={url}
                                        target="_blank"
                                        download={`foto-ia-${i + 1}.jpg`}
                                        className="bg-white/90 text-petroleo px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md"
                                    >
                                        <Download size={12} /> Baixar
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setFotosGeradas([]); handleGerar() }} className="btn-secondary flex items-center gap-2">
                            <RefreshCw size={16} /> Gerar mais
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
