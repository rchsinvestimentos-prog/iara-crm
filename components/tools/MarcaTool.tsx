'use client'

import { useState } from 'react'
import { Award, Wand2, Download, Palette, Type, Copy } from 'lucide-react'
import { useFeatureLimit } from '@/hooks/useFeatureLimit'
import FeatureLimitBanner from '@/components/FeatureLimitBanner'

const paletas = [
    { nome: 'Terrosos', cores: ['#D99773', '#0F4C61', '#F0F8FA', '#2D2D2D', '#FFFFFF'] },
    { nome: 'Rosa Gold', cores: ['#E8B4B8', '#4A4A4A', '#FAF0F0', '#2D2D2D', '#FFFFFF'] },
    { nome: 'Minimalista', cores: ['#111111', '#666666', '#F5F5F5', '#CCCCCC', '#FFFFFF'] },
    { nome: 'Natura', cores: ['#4A7C59', '#2D5016', '#F0F5E8', '#8B6914', '#FFFFFF'] },
]

const fontes = [
    { titulo: 'Playfair Display', body: 'Inter', estilo: 'Elegante + Moderno' },
    { titulo: 'Cormorant Garamond', body: 'Lato', estilo: 'Clássico + Clean' },
    { titulo: 'Montserrat', body: 'Open Sans', estilo: 'Moderno + Profissional' },
]

export default function MarcaTool() {
    const [etapa, setEtapa] = useState<'form' | 'resultado'>('form')
    const [nomeClinica, setNomeClinica] = useState('')
    const [nicho, setNicho] = useState('micropigmentacao')
    const [estilo, setEstilo] = useState('elegante')
    const [paletaSel, setPaletaSel] = useState(0)
    const [fonteSel, setFonteSel] = useState(0)
    const [gerando, setGerando] = useState(false)
    const [marcaGerada, setMarcaGerada] = useState<any>(null)
    const feature = useFeatureLimit('marca')

    const handleGerar = async () => {
        if (!nomeClinica.trim()) return
        if (!feature.permitido) { alert('Você atingiu o limite de marcas grátis este mês! Faça upgrade para criar mais.'); return }
        setGerando(true)
        try {
            const res = await fetch('/api/gerar-conteudo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: 'marca',
                    nome: nomeClinica,
                    especialidade: nicho,
                    estilo
                })
            })
            const data = await res.json()
            if (data.sucesso) {
                setMarcaGerada(data.marca)
                setEtapa('resultado')
                feature.increment()
            } else {
                alert(data.error || 'Erro ao gerar marca')
            }
        } catch {
            alert('Erro de conexão. Tente novamente.')
        } finally {
            setGerando(false)
        }
    }

    if (etapa === 'resultado' && marcaGerada) {
        const pal = marcaGerada.paleta || {}
        const tip = marcaGerada.tipografia || {}
        const cores = [pal.primaria, pal.secundaria, pal.accent, pal.fundo, pal.texto].filter(Boolean)

        return (
            <div className="space-y-6">
                {/* Logo gerada */}
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-6">Sua Logo</p>
                    <div
                        className="w-48 h-48 mx-auto rounded-3xl flex items-center justify-center mb-4"
                        style={{ background: `linear-gradient(135deg, ${pal.primaria || '#D99773'}15, ${pal.secundaria || '#0F4C61'}15)` }}
                    >
                        <div className="text-center">
                            <p className="text-4xl font-bold" style={{ color: pal.secundaria || '#0F4C61', fontFamily: `${tip.titulo || 'Playfair Display'}, serif` }}>
                                {(marcaGerada.nome || nomeClinica).split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.3em] mt-1" style={{ color: pal.primaria || '#D99773', fontFamily: `${tip.corpo || 'Inter'}, sans-serif` }}>
                                {marcaGerada.nome || nomeClinica}
                            </p>
                        </div>
                    </div>
                    {marcaGerada.tagline && (
                        <p className="text-sm text-gray-500 italic mb-4">&ldquo;{marcaGerada.tagline}&rdquo;</p>
                    )}
                    <div className="flex justify-center gap-3">
                        <button className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5">
                            <Download size={13} /> Baixar PNG
                        </button>
                        <button className="text-[11px] font-medium px-4 py-2 bg-gray-100 text-gray-600 rounded-lg flex items-center gap-1.5">
                            <Download size={13} /> Baixar SVG
                        </button>
                    </div>
                </div>

                {/* Paleta de cores */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                        <Palette size={15} className="text-[#D99773]" />
                        Paleta de Cores
                    </h3>
                    <div className="flex gap-2 mb-3">
                        {cores.map((cor, i) => (
                            <div key={i} className="flex-1 group relative">
                                <div className="aspect-square rounded-xl cursor-pointer" style={{ backgroundColor: cor }} />
                                <p className="text-[9px] text-gray-400 text-center mt-1.5">{cor}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => { navigator.clipboard.writeText(cores.join(', ')); alert('Cores copiadas!') }}
                        className="text-[10px] text-[#D99773] font-medium hover:underline flex items-center gap-1"
                    >
                        <Copy size={10} /> Copiar códigos HEX
                    </button>
                </div>

                {/* Tipografia */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                        <Type size={15} className="text-[#D99773]" />
                        Tipografia
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-[10px] text-gray-400 uppercase mb-2">Títulos</p>
                            <p className="text-2xl font-bold text-[#0F4C61]" style={{ fontFamily: `${tip.titulo || 'Playfair Display'}, serif` }}>
                                {tip.titulo || 'Playfair Display'}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">Aa Bb Cc 1 2 3</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-[10px] text-gray-400 uppercase mb-2">Corpo de texto</p>
                            <p className="text-lg text-gray-600">
                                {tip.corpo || 'Inter'}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">Aa Bb Cc 1 2 3</p>
                        </div>
                    </div>
                </div>

                {/* Personalidade + Tom de Voz */}
                {(marcaGerada.personalidade || marcaGerada.tom_de_voz) && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-3">✨ Personalidade da Marca</h3>
                        {marcaGerada.personalidade && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {marcaGerada.personalidade.map((p: string, i: number) => (
                                    <span key={i} className="text-[11px] px-3 py-1 rounded-full bg-[#D99773]/10 text-[#D99773] font-medium">{p}</span>
                                ))}
                            </div>
                        )}
                        {marcaGerada.tom_de_voz && (
                            <p className="text-[12px] text-gray-500">{marcaGerada.tom_de_voz}</p>
                        )}
                    </div>
                )}

                {/* Bio Instagram sugerida */}
                {marcaGerada.sugestao_bio && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-2">📱 Bio Instagram Sugerida</h3>
                        <p className="text-[12px] text-gray-600 whitespace-pre-wrap">{marcaGerada.sugestao_bio}</p>
                        <button
                            onClick={() => { navigator.clipboard.writeText(marcaGerada.sugestao_bio); alert('Bio copiada!') }}
                            className="text-[10px] text-[#D99773] font-medium hover:underline flex items-center gap-1 mt-2"
                        >
                            <Copy size={10} /> Copiar Bio
                        </button>
                    </div>
                )}

                {/* Manual de marca */}
                <div className="bg-gradient-to-r from-[#0F4C61] to-[#0F4C61]/90 rounded-2xl p-6 text-white">
                    <h3 className="text-[14px] font-semibold mb-2">📖 Manual de Marca Completo</h3>
                    <p className="text-[12px] text-white/60 mb-4">PDF com logo, paleta, tipografia, aplicações em redes sociais e exemplos de uso.</p>
                    <button className="text-[11px] font-medium px-4 py-2 bg-white/20 text-white rounded-lg flex items-center gap-1.5 hover:bg-white/30 transition-colors">
                        <Download size={13} /> Baixar Manual (PDF)
                    </button>
                </div>

                <button onClick={() => { setEtapa('form'); setMarcaGerada(null) }} className="text-[12px] text-gray-400 hover:text-[#D99773]">
                    ← Gerar outra marca
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <FeatureLimitBanner {...feature} />
            {/* Formulário */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                    <Award size={15} className="text-[#D99773]" />
                    Criar Identidade Visual
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-[12px] font-medium text-gray-600 block mb-1.5">Nome da Clínica</label>
                        <input className="input-field" value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} placeholder="Ex: Studio Ana, Espaço Beleza..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-medium text-gray-600 block mb-1.5">Nicho</label>
                            <select className="input-field" value={nicho} onChange={(e) => setNicho(e.target.value)}>
                                <option value="micropigmentacao">Micropigmentação</option>
                                <option value="estetica">Estética Geral</option>
                                <option value="dermatologia">Dermatologia</option>
                                <option value="odontologia">Odontologia</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-gray-600 block mb-1.5">Estilo</label>
                            <select className="input-field" value={estilo} onChange={(e) => setEstilo(e.target.value)}>
                                <option value="elegante">Elegante & Clean</option>
                                <option value="moderno">Moderno & Bold</option>
                                <option value="minimalista">Minimalista</option>
                                <option value="classico">Clássico & Luxo</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Paleta */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-3">🎨 Escolha uma Paleta</h3>
                <div className="grid grid-cols-2 gap-3">
                    {paletas.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setPaletaSel(i)}
                            className={`p-3 rounded-xl border-2 transition-all ${paletaSel === i ? 'border-[#D99773]' : 'border-transparent bg-gray-50 hover:border-gray-200'
                                }`}
                        >
                            <div className="flex gap-1 mb-2">
                                {p.cores.map((c, j) => (
                                    <div key={j} className="flex-1 h-6 rounded-md first:rounded-l-lg last:rounded-r-lg" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-600 font-medium">{p.nome}</p>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleGerar}
                disabled={gerando || !nomeClinica.trim()}
                className="w-full py-3 bg-[#0F4C61] text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#0F4C61]/90 transition-colors disabled:opacity-50"
            >
                {gerando ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Criando marca...</>
                ) : (
                    <><Wand2 size={16} /> Gerar Identidade Visual</>
                )}
            </button>
        </div>
    )
}
