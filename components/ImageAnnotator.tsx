'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, Save, Undo, Trash2, Download, Image as ImageIcon, Circle } from 'lucide-react'

interface ImageAnnotatorProps {
    onClose: () => void
    onSave: (base64Image: string, title?: string, notes?: string) => Promise<void>
}

export default function ImageAnnotator({ onClose, onSave }: ImageAnnotatorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [image, setImage] = useState<HTMLImageElement | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState('#D99773') // Default Iara color
    const [brushSize, setBrushSize] = useState(3)
    const [mode, setMode] = useState<'draw' | 'dot'>('draw')
    
    // Form fields
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    // History for undo
    const [history, setHistory] = useState<ImageData[]>([])

    const COLORS = ['#D99773', '#0F4C61', '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#000000', '#FFFFFF']

    useEffect(() => {
        if (image && canvasRef.current && containerRef.current) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Responsive sizing
            const containerWidth = containerRef.current.clientWidth
            const containerHeight = containerRef.current.clientHeight
            
            // Calculate scale to fit image in container
            const scale = Math.min(containerWidth / image.width, containerHeight / image.height)
            
            canvas.width = image.width * scale
            canvas.height = image.height * scale

            ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
            saveHistoryState()
        }
    }, [image])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const img = new Image()
            img.onload = () => {
                setImage(img)
                setHistory([])
            }
            img.src = event.target?.result as string
        }
        reader.readAsDataURL(file)
    }

    const saveHistoryState = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
            setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)])
        }
    }

    const undo = () => {
        if (history.length <= 1) return
        const newHistory = [...history]
        newHistory.pop() // remove current state
        const prevState = newHistory[newHistory.length - 1]
        
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) {
            ctx.putImageData(prevState, 0, 0)
            setHistory(newHistory)
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!image) return
        setIsDrawing(true)
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        const x = clientX - rect.left
        const y = clientY - rect.top

        ctx.beginPath()
        
        if (mode === 'dot') {
            ctx.arc(x, y, brushSize * 2, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
            setIsDrawing(false)
            saveHistoryState()
        } else {
            ctx.moveTo(x, y)
            ctx.strokeStyle = color
            ctx.lineWidth = brushSize
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
        }
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || mode === 'dot') return
        e.preventDefault() // prevent scrolling on touch
        
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        const x = clientX - rect.left
        const y = clientY - rect.top

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        if (isDrawing && mode === 'draw') {
            setIsDrawing(false)
            saveHistoryState()
        }
    }

    const handleSave = async () => {
        const canvas = canvasRef.current
        if (!canvas || !image) return

        try {
            setSaving(true)
            const base64 = canvas.toDataURL('image/png')
            await onSave(base64, title, notes)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex bg-black/80 backdrop-blur-sm animate-fade-in text-sm">
            {/* Sidebar */}
            <div className="w-80 bg-white dark:bg-[#0B0F19] h-full shadow-2xl flex flex-col border-r border-gray-200 dark:border-white/10 z-10">
                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                    <h2 className="font-bold text-petroleo dark:text-white flex items-center gap-2">
                        <ImageIcon size={18} className="text-terracota" /> Editor Clínico
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {!image && (
                        <div className="text-center p-6 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl">
                            <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                            />
                            <ImageIcon size={32} className="text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500 text-xs mb-3">Selecione uma foto do paciente para iniciar o mapeamento.</p>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="btn-primary w-full text-xs py-2"
                            >
                                Carregar Foto
                            </button>
                        </div>
                    )}

                    {image && (
                        <>
                            <div className="space-y-3">
                                <h3 className="font-bold text-xs text-petroleo dark:text-gray-300 uppercase">Ferramentas</h3>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setMode('draw')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${mode === 'draw' ? 'bg-petroleo text-white border-petroleo' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10'}`}
                                    >
                                        Pincel Livre
                                    </button>
                                    <button 
                                        onClick={() => setMode('dot')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${mode === 'dot' ? 'bg-petroleo text-white border-petroleo' : 'bg-transparent text-gray-500 border-gray-200 dark:border-white/10'}`}
                                    >
                                        <Circle size={10} className={mode === 'dot' ? 'fill-white' : ''} /> Pontos
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-xs text-petroleo dark:text-gray-300 uppercase">Cores</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={`w-full aspect-square rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-gray-400 shadow-md' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-xs text-petroleo dark:text-gray-300 uppercase">Espessura: {brushSize}</h3>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="20" 
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
                                <button 
                                    onClick={undo}
                                    disabled={history.length <= 1}
                                    className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                    <Undo size={14} /> Desfazer
                                </button>
                                <button 
                                    onClick={() => {
                                        setImage(null)
                                        setHistory([])
                                    }}
                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={14} /> Descartar
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Título do Procedimento</label>
                                    <input 
                                        type="text" 
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Ex: Mapeamento Facial Botox"
                                        className="input-field text-xs py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Anotações</label>
                                    <textarea 
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Detalhes dos pontos de aplicação..."
                                        className="input-field text-xs py-2 resize-none"
                                    />
                                </div>

                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <><Save size={16} /> Salvar no Prontuário</>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center p-8 relative" ref={containerRef}>
                {!image && (
                    <div className="text-center text-white/50 flex flex-col items-center">
                        <ImageIcon size={64} className="mb-4 opacity-30" />
                        <h2 className="text-xl font-bold">Nenhuma imagem selecionada</h2>
                        <p className="text-sm">Use a barra lateral para carregar a foto do paciente.</p>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className={`shadow-2xl rounded-lg bg-transparent ${image ? 'cursor-crosshair' : 'hidden'} touch-none`}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
            </div>
        </div>
    )
}
