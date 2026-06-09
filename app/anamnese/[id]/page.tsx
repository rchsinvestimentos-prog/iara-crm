'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ShieldCheck, FileText, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Sparkles, Send } from 'lucide-react'

interface Pergunta {
    id: string
    tipo: 'texto' | 'sim_nao' | 'multipla_escolha' | 'foto'
    label: string
    opcoes?: string[]
    obrigatorio: boolean
}

interface ModeloAnamnese {
    id: string
    titulo: string
    perguntas: Pergunta[]
}

interface ClinicaInfo {
    nome: string
    avatar: string
}

export default function PublicAnamnesePage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const modeloId = params?.id as string
    const contatoIdStr = searchParams?.get('contatoId')
    const contatoId = contatoIdStr ? Number(contatoIdStr) : null

    const [modelo, setModelo] = useState<ModeloAnamnese | null>(null)
    const [clinica, setClinica] = useState<ClinicaInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [hash, setHash] = useState('')

    // Respostas do formulário
    const [respostas, setRespostas] = useState<Record<string, any>>({})
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    // Assinatura Canvas
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSigned, setHasSigned] = useState(false)

    // Buscar perguntas e dados da clínica
    useEffect(() => {
        if (!modeloId) return

        const fetchQuestions = async () => {
            try {
                const res = await fetch(`/api/anamnese/publico/${modeloId}`)
                if (!res.ok) {
                    throw new Error('Ficha de anamnese não encontrada ou inativa.')
                }
                const data = await res.json()
                setModelo(data.modelo)
                setClinica(data.clinica)

                // Inicializar respostas
                const initialRespostas: Record<string, any> = {}
                data.modelo.perguntas.forEach((q: Pergunta) => {
                    if (q.tipo === 'sim_nao') {
                        initialRespostas[q.label] = 'Não' // valor inicial seguro
                    } else if (q.tipo === 'multipla_escolha') {
                        initialRespostas[q.label] = [] // array vazio para múltipla escolha
                    } else {
                        initialRespostas[q.label] = ''
                    }
                })
                setRespostas(initialRespostas)
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar perguntas.')
            } finally {
                setLoading(false)
            }
        }

        fetchQuestions()
    }, [modeloId])

    // Ajustar tamanho do canvas de assinatura para alta resolução
    useEffect(() => {
        if (!loading && modelo && canvasRef.current) {
            const canvas = canvasRef.current
            const rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * 2
            canvas.height = rect.height * 2
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.scale(2, 2)
            }
        }
    }, [loading, modelo])

    // Lógica de desenho no Canvas
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.strokeStyle = '#0F172A' // cor escura
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        const x = clientX - rect.left
        const y = clientY - rect.top

        ctx.beginPath()
        ctx.moveTo(x, y)
        setIsDrawing(true)
        setHasSigned(true)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const rect = canvas.getBoundingClientRect()
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        const x = clientX - rect.left
        const y = clientY - rect.top

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setHasSigned(false)
    }

    // Gerenciar mudança de respostas
    const handleTextChange = (label: string, value: string) => {
        setRespostas(prev => ({ ...prev, [label]: value }))
        if (value.trim() && validationErrors[label]) {
            setValidationErrors(prev => {
                const copy = { ...prev }
                delete copy[label]
                return copy
            })
        }
    }

    const handleCheckboxChange = (label: string, option: string, isChecked: boolean) => {
        const currentOptions = Array.isArray(respostas[label]) ? respostas[label] : []
        let newOptions: string[]
        if (isChecked) {
            newOptions = [...currentOptions, option]
        } else {
            newOptions = currentOptions.filter((o: string) => o !== option)
        }
        setRespostas(prev => ({ ...prev, [label]: newOptions }))
        if (newOptions.length > 0 && validationErrors[label]) {
            setValidationErrors(prev => {
                const copy = { ...prev }
                delete copy[label]
                return copy
            })
        }
    }

    // Leitor de imagem base64 para o tipo foto
    const handleFileChange = async (label: string, file: File | null) => {
        if (!file) {
            setRespostas(prev => ({ ...prev, [label]: '' }))
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            const base64String = reader.result as string
            setRespostas(prev => ({ ...prev, [label]: base64String }))
            if (validationErrors[label]) {
                setValidationErrors(prev => {
                    const copy = { ...prev }
                    delete copy[label]
                    return copy
                })
            }
        }
        reader.readAsDataURL(file)
    }

    // Enviar formulário
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!contatoId) {
            alert('Identificação do contato ausente na URL (?contatoId=...)')
            return
        }

        // Validar campos obrigatórios
        const errors: Record<string, string> = {}
        modelo?.perguntas.forEach(q => {
            if (q.obrigatorio) {
                const resp = respostas[q.label]
                if (q.tipo === 'multipla_escolha') {
                    if (!Array.isArray(resp) || resp.length === 0) {
                        errors[q.label] = 'Selecione pelo menos uma opção.'
                    }
                } else if (!resp || (typeof resp === 'string' && !resp.trim())) {
                    errors[q.label] = 'Esta pergunta é obrigatória.'
                }
            }
        })

        if (!hasSigned) {
            errors['_assinatura'] = 'Desenhe sua assinatura no campo abaixo.'
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            // Scroll to the first error
            const firstErrorLabel = Object.keys(errors)[0]
            const element = document.getElementById(`q-${firstErrorLabel}`) || document.getElementById('signature-section')
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
        }

        setSubmitting(true)
        setError(null)

        try {
            const canvas = canvasRef.current
            const assinaturaPng = canvas ? canvas.toDataURL('image/png') : ''

            const body = {
                contatoId,
                respostas,
                assinaturaPng,
            }

            const res = await fetch(`/api/anamnese/publico/${modeloId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                const data = await res.json()
                setHash(data.hash)
                setSuccess(true)
            } else {
                const errData = await res.json()
                throw new Error(errData.error || 'Erro ao enviar a ficha.')
            }
        } catch (err: any) {
            setError(err.message || 'Houve um erro de conexão. Tente novamente.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-[#D99773]/20 border-t-[#D99773] rounded-full animate-spin mb-4" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Carregando prontuário seguro...</p>
            </div>
        )
    }

    if (error && !modelo) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex flex-col items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-xl max-w-md w-full text-center border dark:border-white/10 space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Ficha Indisponível</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
                    <p className="text-[10px] text-slate-400">Entre em contato com a clínica para obter um novo link válido.</p>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0F172A] p-8 rounded-3xl shadow-2xl max-w-xl w-full text-center border dark:border-white/10 space-y-6 animate-scale-up">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
                        <CheckCircle2 size={40} className="animate-bounce" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Ficha Assinada com Sucesso!</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Obrigado! Suas respostas foram salvas e enviadas diretamente para a equipe da clínica.
                        </p>
                    </div>

                    <div className="border-t border-dashed dark:border-white/10 pt-6 space-y-4">
                        <div className="bg-orange-50/40 dark:bg-[#D99773]/5 border border-orange-200/50 dark:border-orange-500/10 rounded-2xl p-4 text-left space-y-3 relative">
                            <div className="absolute -top-3 left-4 bg-white dark:bg-[#0F172A] px-2 flex items-center gap-1 text-[#D99773] font-bold text-[10px] uppercase tracking-wider">
                                <ShieldCheck size={12} /> Validade Jurídica Garantida
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                Este prontuário foi assinado eletronicamente e selado com criptografia inalterável. Registramos os metadados de auditoria e geramos o seguinte selo de integridade legal:
                            </p>
                            <div>
                                <span className="text-[9px] font-bold block text-slate-700 dark:text-slate-300">Hash SHA-256 de Segurança:</span>
                                <code className="font-mono text-[9px] break-all bg-slate-100 dark:bg-black/40 text-[#D99773] p-1.5 rounded-lg inline-block mt-1 w-full border dark:border-white/5">
                                    {hash}
                                </code>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-400">
                        Você já pode fechar esta aba. Nos vemos em breve no seu procedimento!
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-800 dark:text-slate-200 py-8 px-4 flex flex-col items-center">
            {/* Background elements */}
            <div className="fixed top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#D99773]/10 to-transparent pointer-events-none" />
            
            <div className="max-w-2xl w-full space-y-6 relative z-10">
                {/* Clinic Header */}
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-[#D99773] to-[#8B5CF6] rounded-full blur-sm opacity-35" />
                        <img 
                            src={clinica?.avatar} 
                            alt={clinica?.nome} 
                            className="w-16 h-16 rounded-full border-2 border-white dark:border-[#0F172A] shadow-md object-cover relative" 
                        />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-wide text-[#D99773]">{clinica?.nome}</h2>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">{modelo?.titulo}</h1>
                        <p className="text-[10px] text-slate-400 mt-1">Preencha as informações com atenção. Seus dados estão seguros e criptografados.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-xl border dark:border-white/10 p-6 sm:p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 text-red-600 rounded-2xl flex items-start gap-2 text-xs">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        {modelo?.perguntas.map((q, idx) => {
                            const hasError = !!validationErrors[q.label]
                            return (
                                <div 
                                    key={q.id} 
                                    id={`q-${q.label}`}
                                    className={`space-y-2 pb-4 border-b dark:border-white/5 last:border-b-0 last:pb-0`}
                                >
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {idx + 1}. {q.label}
                                        {q.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                                    </label>

                                    {/* Campo: Texto Livre */}
                                    {q.tipo === 'texto' && (
                                        <textarea
                                            value={respostas[q.label] || ''}
                                            onChange={(e) => handleTextChange(q.label, e.target.value)}
                                            rows={3}
                                            placeholder="Digite sua resposta aqui..."
                                            className={`w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-black/20 border ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-white/10 focus:border-[#D99773] focus:ring-[#D99773]'} focus:outline-none focus:ring-1 transition-all`}
                                        />
                                    )}

                                    {/* Campo: Sim / Não */}
                                    {q.tipo === 'sim_nao' && (
                                        <div className="flex gap-4">
                                            {['Não', 'Sim'].map((option) => {
                                                const isSelected = respostas[q.label] === option
                                                return (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => handleTextChange(q.label, option)}
                                                        className={`flex-1 py-2 px-4 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                                                            isSelected 
                                                                ? 'bg-[#D99773] border-[#D99773] text-white' 
                                                                : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {option}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Campo: Múltipla Escolha */}
                                    {q.tipo === 'multipla_escolha' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border dark:border-white/5">
                                            {q.opcoes?.map((option) => {
                                                const isChecked = Array.isArray(respostas[q.label]) && respostas[q.label].includes(option)
                                                return (
                                                    <label 
                                                        key={option} 
                                                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-[11px] transition-colors ${isChecked ? 'bg-orange-500/5 dark:bg-[#D99773]/5 font-semibold text-[#D99773]' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => handleCheckboxChange(q.label, option, e.target.checked)}
                                                            className="w-4 h-4 rounded text-[#D99773] focus:ring-[#D99773] border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 cursor-pointer"
                                                        />
                                                        {option}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Campo: Foto Upload */}
                                    {q.tipo === 'foto' && (
                                        <div className="space-y-3">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange(q.label, e.target.files ? e.target.files[0] : null)}
                                                className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 dark:file:bg-[#D99773]/10 file:text-[#D99773] hover:file:bg-orange-100 cursor-pointer"
                                            />
                                            {respostas[q.label] && (
                                                <div className="relative rounded-2xl overflow-hidden border dark:border-white/10 max-w-xs">
                                                    <img src={respostas[q.label]} alt="Pré-visualização" className="w-full max-h-40 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTextChange(q.label, '')}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {hasError && (
                                        <p className="text-[10px] text-red-500 flex items-center gap-1 font-semibold mt-1">
                                            <AlertCircle size={10} /> {validationErrors[q.label]}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Signature Section */}
                    <div id="signature-section" className="pt-6 border-t dark:border-white/10 space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Assinatura Eletrônica Oblíqua (Rubrica) <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[10px] text-slate-400">Use seu dedo na tela (celular) ou o mouse (computador) para desenhar sua assinatura dentro do quadro abaixo.</p>
                        
                        <div className={`relative rounded-2xl overflow-hidden border ${validationErrors['_assinatura'] ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} bg-slate-50 dark:bg-white`}>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-40 cursor-crosshair block"
                            />
                            {hasSigned && (
                                <button
                                    type="button"
                                    onClick={clearCanvas}
                                    className="absolute bottom-3 right-3 py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-[10px] font-semibold flex items-center gap-1 transition-colors"
                                >
                                    <RefreshCw size={10} /> Limpar
                                </button>
                            )}
                        </div>

                        {validationErrors['_assinatura'] && (
                            <p className="text-[10px] text-red-500 flex items-center gap-1 font-semibold mt-1">
                                <AlertCircle size={10} /> {validationErrors['_assinatura']}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className={`w-full py-3.5 px-6 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-lg ${submitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#D99773] to-[#C08160] hover:scale-[1.01] hover:shadow-orange-500/10'}`}
                    >
                        {submitting ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" /> Salvando dados de prontuário...
                            </>
                        ) : (
                            <>
                                <Send size={14} /> Assinar e Enviar Prontuário
                            </>
                        )}
                    </button>
                </form>

                {/* Secure footer */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                    <ShieldCheck size={14} className="text-green-500" />
                    <span>Conexão criptografada TLS 1.3 • Auditoria jurídica ativa</span>
                </div>
            </div>
        </div>
    )
}
