'use client'

import { useState } from 'react'
import { FileText, Wand2, Copy, Download, Hash, Clock } from 'lucide-react'

export default function RoteirosTool() {
    const [assunto, setAssunto] = useState('')
    const [estilo, setEstilo] = useState('educativo')
    const [gerando, setGerando] = useState(false)
    const [roteiro, setRoteiro] = useState('')

    const handleGerar = () => {
        if (!assunto.trim()) return
        setGerando(true)
        setTimeout(() => {
            setGerando(false)
            setRoteiro(`🎬 ROTEIRO: ${assunto.toUpperCase()}

📌 HOOK (primeiros 3 segundos):
"Você sabia que 90% das mulheres cometem esse erro com a sobrancelha?"

📍 CENA 1 - PROBLEMA:
[Mostre a câmera frontal]
"Se você sofre com sobrancelha falhada, esse vídeo é pra você..."

📍 CENA 2 - SOLUÇÃO:
[B-roll do procedimento]
"A micropigmentação fio a fio resolve isso de forma natural. Dura 1-2 anos!"

📍 CENA 3 - PROVA:
[Mostre antes e depois]
"Olha esse resultado incrível da minha cliente..."

📍 CENA 4 - CTA:
[Olhe pra câmera e sorria]
"Quer agendar a sua? Link na bio! 💜"

🎵 Áudio sugerido: Use o trending sound do momento
⏱️ Duração: 15-30 segundos
#micropigmentação #sobrancelha #autoestima #beauty`)
        }, 2000)
    }

    return (
        <div className="space-y-6">
            {/* Criar roteiro */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-terracota" />
                    Criar Roteiro de Reels
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Sobre o que é o Reels?</label>
                        <input
                            className="input-field"
                            value={assunto}
                            onChange={(e) => setAssunto(e.target.value)}
                            placeholder="Ex: Dica sobre micropigmentação, antes e depois, bastidores do estúdio..."
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">Estilo</label>
                        <select className="input-field" value={estilo} onChange={(e) => setEstilo(e.target.value)}>
                            <option value="educativo">📚 Educativo (Dica/Tutorial)</option>
                            <option value="antes-depois">✨ Antes e Depois</option>
                            <option value="bastidores">🎥 Bastidores do estúdio</option>
                            <option value="depoimento">💬 Depoimento de cliente</option>
                            <option value="trend">🔥 Trend do momento</option>
                        </select>
                    </div>
                </div>
                <button
                    onClick={handleGerar}
                    disabled={gerando || !assunto.trim()}
                    className="btn-primary flex items-center gap-2 mt-4 disabled:opacity-50"
                >
                    {gerando ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Criando roteiro...
                        </>
                    ) : (
                        <>
                            <Wand2 size={16} /> Gerar Roteiro
                        </>
                    )}
                </button>
            </div>

            {/* Roteiro gerado */}
            {roteiro && (
                <div className="glass-card p-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-petroleo">📝 Roteiro Pronto!</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigator.clipboard.writeText(roteiro)}
                                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                                <Copy size={12} /> Copiar
                            </button>
                            <button className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                                <Download size={12} /> PDF
                            </button>
                        </div>
                    </div>
                    <div className="p-5 bg-glacial rounded-2xl">
                        <pre className="text-sm text-petroleo whitespace-pre-wrap font-sans leading-relaxed">
                            {roteiro}
                        </pre>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => { setRoteiro(''); setAssunto('') }} className="btn-secondary">
                            Gerar outro
                        </button>
                    </div>
                </div>
            )}

            {/* Roteiros anteriores */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">📁 Meus Roteiros</h3>
                <div className="space-y-2">
                    {['Dica de Micropigmentação', 'Trend: Get Ready With Me', 'Bastidores do estúdio'].map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-glacial rounded-xl hover:bg-verde-agua transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <FileText size={16} className="text-terracota" />
                                <div>
                                    <p className="text-sm font-medium text-petroleo">{r}</p>
                                    <p className="text-xs text-acinzentado flex items-center gap-2">
                                        <Clock size={10} /> {i + 1} dia atrás
                                        <Hash size={10} /> 15-30s
                                    </p>
                                </div>
                            </div>
                            <Copy size={14} className="text-acinzentado hover:text-terracota" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
