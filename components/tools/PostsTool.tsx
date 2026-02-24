'use client'

import { useState } from 'react'
import { Paintbrush, Wand2, Download, ChevronLeft, ChevronRight, Plus, Image } from 'lucide-react'

const templates = [
    { nome: 'Antes e Depois', tipo: 'Carrossel 5 slides', cor: '#D99773' },
    { nome: 'Dica Rápida', tipo: 'Post único', cor: '#0F4C61' },
    { nome: 'Depoimento', tipo: 'Carrossel 3 slides', cor: '#06D6A0' },
    { nome: 'Promoção', tipo: 'Post + Stories', cor: '#F59E0B' },
]

export default function PostsTool() {
    const [tema, setTema] = useState('')
    const [templateSel, setTemplateSel] = useState<number | null>(null)
    const [gerando, setGerando] = useState(false)
    const [postGerado, setPostGerado] = useState(false)

    const handleGerar = () => {
        if (!tema.trim()) return
        setGerando(true)
        // TODO: POST webhook N8N
        setTimeout(() => {
            setGerando(false)
            setPostGerado(true)
        }, 2500)
    }

    return (
        <div className="space-y-6">
            {/* Templates */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <Paintbrush size={16} className="text-terracota" />
                    Escolha um Template
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {templates.map((t, i) => (
                        <button
                            key={i}
                            onClick={() => setTemplateSel(i)}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${templateSel === i
                                    ? 'border-terracota bg-terracota/5'
                                    : 'border-transparent bg-glacial hover:border-terracota/30'
                                }`}
                        >
                            <div
                                className="w-full aspect-square rounded-xl mb-3 flex items-center justify-center"
                                style={{ backgroundColor: t.cor + '15' }}
                            >
                                <Image size={28} style={{ color: t.cor }} />
                            </div>
                            <p className="font-semibold text-petroleo text-sm">{t.nome}</p>
                            <p className="text-xs text-acinzentado">{t.tipo}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Criar post */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">✍️ Descreva seu Post</h3>
                <textarea
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    placeholder="Sobre o que é o post?&#10;&#10;Ex: Carrossel explicando os benefícios da micropigmentação fio a fio, com antes e depois"
                    className="input-field min-h-[100px] resize-none"
                    rows={4}
                />
                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-acinzentado">
                        {templateSel !== null ? `Template: ${templates[templateSel].nome}` : 'Nenhum template selecionado'}
                    </p>
                    <button
                        onClick={handleGerar}
                        disabled={gerando || !tema.trim()}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {gerando ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <Wand2 size={16} /> Gerar Post
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Post gerado - Simulação de carrossel */}
            {postGerado && (
                <div className="glass-card p-6 animate-fade-in">
                    <h3 className="font-semibold text-petroleo mb-4">🎨 Post Pronto!</h3>
                    <div className="relative">
                        {/* Simulação de slide */}
                        <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-terracota/10 via-petroleo/5 to-terracota/5 flex flex-col items-center justify-center p-8">
                            <div className="glass-card p-6 text-center max-w-sm">
                                <h4 className="title-serif text-lg mb-2">Micropigmentação</h4>
                                <h4 className="title-serif text-lg text-terracota">Fio a Fio</h4>
                                <p className="text-sm text-acinzentado mt-3">Resultado natural que dura 1-2 anos</p>
                                <div className="flex justify-center gap-1.5 mt-4">
                                    {[0, 1, 2, 3, 4].map((dot) => (
                                        <div
                                            key={dot}
                                            className={`w-2 h-2 rounded-full ${dot === 0 ? 'bg-terracota' : 'bg-terracota/30'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Nav */}
                        <button className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                            <ChevronLeft size={20} className="text-petroleo" />
                        </button>
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                            <ChevronRight size={20} className="text-petroleo" />
                        </button>
                    </div>

                    {/* Legenda */}
                    <div className="mt-4 p-4 bg-glacial rounded-2xl">
                        <p className="text-sm text-petroleo font-medium mb-1">Legenda sugerida:</p>
                        <p className="text-sm text-acinzentado">
                            ✨ Sobrancelhas perfeitas SEM ESFORÇO! 🙌 A micropigmentação fio a fio é ideal para quem quer acordar pronta todos os dias...
                        </p>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button className="btn-primary flex items-center gap-2">
                            <Download size={16} /> Baixar Imagens
                        </button>
                        <button className="btn-secondary">
                            Editar
                        </button>
                        <button className="btn-secondary">
                            Gerar outro
                        </button>
                    </div>
                </div>
            )}

            {/* Posts anteriores */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-petroleo">📁 Meus Posts</h3>
                    <span className="text-xs text-acinzentado">3 posts criados</span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {['Promo Fev', 'Dica Hidratação', 'Antes/Depois'].map((titulo, i) => (
                        <div key={i} className="group rounded-2xl overflow-hidden bg-glacial aspect-square flex items-center justify-center cursor-pointer relative">
                            <Image size={24} className="text-terracota/30 group-hover:text-terracota transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-sm">
                                <p className="text-xs font-medium text-petroleo truncate">{titulo}</p>
                            </div>
                        </div>
                    ))}
                    <button className="rounded-2xl border-2 border-dashed border-terracota/30 aspect-square flex items-center justify-center hover:border-terracota transition-colors">
                        <Plus size={24} className="text-terracota/50" />
                    </button>
                </div>
            </div>
        </div>
    )
}
