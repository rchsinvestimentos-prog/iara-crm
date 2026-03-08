'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Download, RotateCw, FlipHorizontal, Layers, Image as ImageIcon, Type, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { useFeatureLimit } from '@/hooks/useFeatureLimit'
import FeatureLimitBanner from '@/components/FeatureLimitBanner'

/* ===== TEMPLATES ===== */
const templates = [
    { id: 'gradient', nome: 'Gradient Blend', desc: 'Transição suave horizontal', emoji: '🌅' },
    { id: 'diagonal', nome: 'Diagonal Wipe', desc: 'Linha diagonal com blur', emoji: '📐' },
    { id: 'circle', nome: 'Circle Reveal', desc: 'Círculo revela o depois', emoji: '🔵' },
    { id: 'gold', nome: 'Split Gold Line', desc: 'Linha dourada elegante', emoji: '✨' },
    { id: 'shatter', nome: 'Shatter Effect', desc: 'Fragmentos revelam o depois', emoji: '💥' },
    { id: 'slider', nome: 'Slider', desc: 'Slider arrastável no meio', emoji: '↔️' },
]

const formatos = [
    { id: '1:1', w: 1080, h: 1080, label: '1:1 Feed' },
    { id: '3:4', w: 1080, h: 1350, label: '3:4 Portrait' },
    { id: '16:9', w: 1920, h: 1080, label: '16:9 Wide' },
    { id: '9:16', w: 1080, h: 1920, label: '9:16 Reels' },
]

/* ===== COMPONENTE ===== */
export default function CollagemTool() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [antes, setAntes] = useState<string | null>(null)
    const [depois, setDepois] = useState<string | null>(null)
    const [templateSel, setTemplateSel] = useState(0)
    const [formatoSel, setFormatoSel] = useState(0)
    const [sliderPos, setSliderPos] = useState(50)
    const [logo, setLogo] = useState<string | null>(null)
    const [logoOpacity, setLogoOpacity] = useState(80)
    const [logoSize, setLogoSize] = useState(15) // % do canvas
    const [mostrarLabels, setMostrarLabels] = useState(true)
    const feature = useFeatureLimit('antesDepois')

    /* Upload helper */
    const handleUpload = (setter: (v: string) => void) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
                const reader = new FileReader()
                reader.onload = () => setter(reader.result as string)
                reader.readAsDataURL(file)
            }
        }
        input.click()
    }

    /* Desenhar no Canvas */
    const desenhar = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas || !antes || !depois) return

        const fmt = formatos[formatoSel]
        const previewW = 600
        const ratio = fmt.h / fmt.w
        const previewH = previewW * ratio

        canvas.width = previewW
        canvas.height = previewH
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const imgA = new window.Image()
        const imgD = new window.Image()
        imgA.crossOrigin = 'anonymous'
        imgD.crossOrigin = 'anonymous'

        let loaded = 0
        const onLoad = () => {
            loaded++
            if (loaded < 2) return

            const drawCover = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
                const imgRatio = img.width / img.height
                const boxRatio = w / h
                let sx = 0, sy = 0, sw = img.width, sh = img.height
                if (imgRatio > boxRatio) {
                    sw = img.height * boxRatio
                    sx = (img.width - sw) / 2
                } else {
                    sh = img.width / boxRatio
                    sy = (img.height - sh) / 2
                }
                ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
            }

            const tpl = templates[templateSel].id
            const W = previewW
            const H = previewH

            // Fundo preto
            ctx.fillStyle = '#050505'
            ctx.fillRect(0, 0, W, H)

            if (tpl === 'gradient') {
                drawCover(imgA, 0, 0, W, H)
                ctx.save()
                const grad = ctx.createLinearGradient(W * 0.35, 0, W * 0.65, 0)
                grad.addColorStop(0, 'rgba(0,0,0,0)')
                grad.addColorStop(1, 'rgba(0,0,0,1)')
                ctx.globalCompositeOperation = 'destination-out'
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, W, H)
                ctx.restore()
                ctx.globalCompositeOperation = 'destination-over'
                drawCover(imgD, 0, 0, W, H)
                ctx.globalCompositeOperation = 'source-over'
            } else if (tpl === 'diagonal') {
                drawCover(imgD, 0, 0, W, H)
                ctx.save()
                ctx.beginPath()
                ctx.moveTo(W * 0.4, 0)
                ctx.lineTo(W * 0.6, H)
                ctx.lineTo(0, H)
                ctx.lineTo(0, 0)
                ctx.closePath()
                ctx.clip()
                drawCover(imgA, 0, 0, W, H)
                ctx.restore()
                // Linha diagonal
                ctx.save()
                ctx.strokeStyle = 'rgba(255,255,255,0.6)'
                ctx.lineWidth = 2
                ctx.setLineDash([8, 6])
                ctx.beginPath()
                ctx.moveTo(W * 0.4, 0)
                ctx.lineTo(W * 0.6, H)
                ctx.stroke()
                ctx.restore()
            } else if (tpl === 'circle') {
                drawCover(imgA, 0, 0, W, H)
                ctx.save()
                ctx.beginPath()
                const r = Math.min(W, H) * 0.35
                ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2)
                ctx.clip()
                drawCover(imgD, 0, 0, W, H)
                ctx.restore()
                // Borda do círculo
                ctx.strokeStyle = 'rgba(255,255,255,0.5)'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2)
                ctx.stroke()
            } else if (tpl === 'gold') {
                const halfW = W / 2
                ctx.save()
                ctx.beginPath()
                ctx.rect(0, 0, halfW, H)
                ctx.clip()
                drawCover(imgA, 0, 0, W, H)
                ctx.restore()
                ctx.save()
                ctx.beginPath()
                ctx.rect(halfW, 0, halfW, H)
                ctx.clip()
                drawCover(imgD, 0, 0, W, H)
                ctx.restore()
                // Linha dourada
                ctx.strokeStyle = '#C9A08B'
                ctx.lineWidth = 4
                ctx.beginPath()
                ctx.moveTo(halfW, 0)
                ctx.lineTo(halfW, H)
                ctx.stroke()
                // Labels
                if (mostrarLabels) {
                    ctx.font = `bold ${Math.round(W * 0.025)}px system-ui`
                    ctx.textAlign = 'center'
                    ctx.fillStyle = 'rgba(255,255,255,0.9)'
                    ctx.shadowColor = 'rgba(0,0,0,0.8)'
                    ctx.shadowBlur = 6
                    ctx.fillText('ANTES', halfW / 2, H - W * 0.04)
                    ctx.fillText('DEPOIS', halfW + halfW / 2, H - W * 0.04)
                    ctx.shadowBlur = 0
                }
            } else if (tpl === 'shatter') {
                drawCover(imgD, 0, 0, W, H)
                // Fragmentos "quebrando" revelam o antes
                const cols = 6, rows = Math.ceil(H / W * cols)
                const cellW = W / cols, cellH = H / rows
                ctx.save()
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if ((c + r) % 3 !== 0) continue
                        const x = c * cellW, y = r * cellH
                        const offsetX = (Math.random() - 0.5) * cellW * 0.3
                        const offsetY = (Math.random() - 0.5) * cellH * 0.3
                        ctx.save()
                        ctx.translate(x + cellW / 2 + offsetX, y + cellH / 2 + offsetY)
                        ctx.rotate((Math.random() - 0.5) * 0.15)
                        ctx.beginPath()
                        ctx.rect(-cellW / 2, -cellH / 2, cellW, cellH)
                        ctx.clip()
                        ctx.translate(-(x + cellW / 2 + offsetX), -(y + cellH / 2 + offsetY))
                        drawCover(imgA, 0, 0, W, H)
                        ctx.restore()
                    }
                }
                ctx.restore()
            } else if (tpl === 'slider') {
                const splitX = W * (sliderPos / 100)
                ctx.save()
                ctx.beginPath()
                ctx.rect(0, 0, splitX, H)
                ctx.clip()
                drawCover(imgA, 0, 0, W, H)
                ctx.restore()
                ctx.save()
                ctx.beginPath()
                ctx.rect(splitX, 0, W - splitX, H)
                ctx.clip()
                drawCover(imgD, 0, 0, W, H)
                ctx.restore()
                // Handle
                ctx.strokeStyle = '#fff'
                ctx.lineWidth = 3
                ctx.beginPath()
                ctx.moveTo(splitX, 0)
                ctx.lineTo(splitX, H)
                ctx.stroke()
                // Bolinha
                ctx.fillStyle = '#fff'
                ctx.beginPath()
                ctx.arc(splitX, H / 2, 18, 0, Math.PI * 2)
                ctx.fill()
                ctx.fillStyle = '#333'
                ctx.font = 'bold 16px system-ui'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText('⇔', splitX, H / 2)
            }

            // Labels ANTES / DEPOIS (exceto gold que já tem)
            if (mostrarLabels && tpl !== 'gold') {
                ctx.font = `bold ${Math.round(W * 0.022)}px system-ui`
                ctx.fillStyle = 'rgba(255,255,255,0.85)'
                ctx.shadowColor = 'rgba(0,0,0,0.8)'
                ctx.shadowBlur = 4
                ctx.textAlign = 'left'
                ctx.fillText('ANTES', W * 0.04, H - W * 0.03)
                ctx.textAlign = 'right'
                ctx.fillText('DEPOIS', W - W * 0.04, H - W * 0.03)
                ctx.shadowBlur = 0
            }

            // Logo overlay
            if (logo) {
                const imgLogo = new window.Image()
                imgLogo.crossOrigin = 'anonymous'
                imgLogo.onload = () => {
                    const size = W * (logoSize / 100)
                    const lRatio = imgLogo.width / imgLogo.height
                    const lW = size
                    const lH = size / lRatio
                    ctx.globalAlpha = logoOpacity / 100
                    ctx.drawImage(imgLogo, W - lW - W * 0.03, H - lH - W * 0.03, lW, lH)
                    ctx.globalAlpha = 1
                }
                imgLogo.src = logo
            }
        }

        imgA.onload = onLoad
        imgD.onload = onLoad
        imgA.src = antes
        imgD.src = depois
    }, [antes, depois, templateSel, formatoSel, sliderPos, logo, logoOpacity, logoSize, mostrarLabels])

    useEffect(() => { desenhar() }, [desenhar])

    /* Export */
    const handleExport = async () => {
        if (!canvasRef.current) return
        if (!feature.permitido) { alert('Você atingiu o limite de Antes e Depois grátis este mês! Faça upgrade para criar mais.'); return }
        // Re-render at full resolution
        const fmt = formatos[formatoSel]
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = fmt.w
        exportCanvas.height = fmt.h
        const exportCtx = exportCanvas.getContext('2d')
        if (!exportCtx || !canvasRef.current) return
        // Scale up from preview
        exportCtx.drawImage(canvasRef.current, 0, 0, fmt.w, fmt.h)
        const url = exportCanvas.toDataURL('image/png', 1.0)
        const a = document.createElement('a')
        a.href = url
        a.download = `colagem-${templates[templateSel].id}-${formatos[formatoSel].id}.png`
        a.click()
        await feature.increment()
    }

    const temAmbasFotos = antes && depois

    return (
        <div className="space-y-6">
            <FeatureLimitBanner {...feature} />
            {/* Step 1: Upload */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <Upload size={16} className="text-terracota" />
                    Fotos Antes & Depois
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* ANTES */}
                    <button
                        onClick={() => handleUpload(setAntes)}
                        className="relative aspect-[4/5] rounded-2xl border-2 border-dashed transition-all overflow-hidden group"
                        style={{ borderColor: antes ? '#06D6A0' : 'var(--border-default)' }}
                    >
                        {antes ? (
                            <>
                                <img src={antes} alt="Antes" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-sm font-semibold">Trocar foto</span>
                                </div>
                                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ANTES</span>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center gap-2 text-acinzentado">
                                <Upload size={24} />
                                <span className="text-sm font-semibold">ANTES</span>
                                <span className="text-[10px]">Clique para enviar</span>
                            </div>
                        )}
                    </button>

                    {/* DEPOIS */}
                    <button
                        onClick={() => handleUpload(setDepois)}
                        className="relative aspect-[4/5] rounded-2xl border-2 border-dashed transition-all overflow-hidden group"
                        style={{ borderColor: depois ? '#06D6A0' : 'var(--border-default)' }}
                    >
                        {depois ? (
                            <>
                                <img src={depois} alt="Depois" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-sm font-semibold">Trocar foto</span>
                                </div>
                                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">DEPOIS</span>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center gap-2 text-acinzentado">
                                <Upload size={24} />
                                <span className="text-sm font-semibold">DEPOIS</span>
                                <span className="text-[10px]">Clique para enviar</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Step 2: Formato */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-3 flex items-center gap-2">
                    <Layers size={16} className="text-terracota" />
                    Formato
                </h3>
                <div className="flex gap-2">
                    {formatos.map((f, i) => (
                        <button
                            key={f.id}
                            onClick={() => setFormatoSel(i)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${formatoSel === i
                                ? 'bg-terracota text-white'
                                : 'bg-glacial text-petroleo hover:bg-terracota/10'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 3: Template */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-3 flex items-center gap-2">
                    <ImageIcon size={16} className="text-terracota" />
                    Template Premium
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {templates.map((t, i) => (
                        <button
                            key={t.id}
                            onClick={() => setTemplateSel(i)}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${templateSel === i
                                ? 'border-terracota bg-terracota/5 shadow-lg shadow-terracota/10'
                                : 'border-transparent bg-glacial hover:border-terracota/30'
                                }`}
                        >
                            <span className="text-xl block mb-1">{t.emoji}</span>
                            <p className="font-semibold text-petroleo text-sm">{t.nome}</p>
                            <p className="text-[11px] text-acinzentado">{t.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Slider control (only for slider template) */}
            {templates[templateSel].id === 'slider' && (
                <div className="glass-card p-6">
                    <h3 className="font-semibold text-petroleo mb-3">↔️ Posição do Slider</h3>
                    <input
                        type="range" min={10} max={90} value={sliderPos}
                        onChange={(e) => setSliderPos(Number(e.target.value))}
                        className="w-full accent-terracota"
                    />
                    <p className="text-xs text-acinzentado text-center mt-1">{sliderPos}%</p>
                </div>
            )}

            {/* Step 4: Logo */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-petroleo flex items-center gap-2">
                        <Type size={16} className="text-terracota" />
                        Logo da Clínica
                    </h3>
                    <label className="flex items-center gap-2 text-xs text-acinzentado">
                        <input type="checkbox" checked={mostrarLabels} onChange={(e) => setMostrarLabels(e.target.checked)} className="accent-terracota" />
                        Mostrar "Antes / Depois"
                    </label>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleUpload(setLogo)}
                        className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                        <Upload size={14} /> {logo ? 'Trocar logo' : 'Enviar logo'}
                    </button>
                    {logo && (
                        <>
                            <div className="flex items-center gap-2 text-xs text-acinzentado">
                                <ZoomOut size={12} />
                                <input type="range" min={5} max={40} value={logoSize} onChange={(e) => setLogoSize(Number(e.target.value))} className="w-20 accent-terracota" />
                                <ZoomIn size={12} />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-acinzentado">
                                Opacidade:
                                <input type="range" min={20} max={100} value={logoOpacity} onChange={(e) => setLogoOpacity(Number(e.target.value))} className="w-20 accent-terracota" />
                                {logoOpacity}%
                            </div>
                            <button onClick={() => setLogo(null)} className="text-red-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Preview */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4">👁️ Preview</h3>
                <div className="flex justify-center bg-[#111] rounded-2xl p-4">
                    {temAmbasFotos ? (
                        <canvas
                            ref={canvasRef}
                            className="rounded-xl shadow-2xl"
                            style={{ maxWidth: '100%', maxHeight: '70vh' }}
                        />
                    ) : (
                        <div className="py-20 text-center text-acinzentado">
                            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">Envie as duas fotos para ver o preview</p>
                            <p className="text-xs mt-1">Antes & Depois</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Export */}
            {temAmbasFotos && (
                <div className="glass-card p-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-petroleo">📤 Exportar</h3>
                            <p className="text-xs text-acinzentado mt-0.5">
                                {formatos[formatoSel].w}×{formatos[formatoSel].h}px • PNG de alta qualidade
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleExport} className="btn-primary flex items-center gap-2">
                                <Download size={16} /> Baixar Imagem
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
