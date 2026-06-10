'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { ShieldCheck, FileText, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, Sparkles, Send, Camera, Smartphone, X, Printer } from 'lucide-react'

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

    // Selfie
    const [selfiePng, setSelfiePng] = useState<string>('')
    const [viewReceipt, setViewReceipt] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [cameraActive, setCameraActive] = useState(false)
    const [currentUrl, setCurrentUrl] = useState('')
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
        setIsMobile(isMobileDevice)
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href)
        }
    }, [])

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
        }
    }, [])

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setCameraActive(false)
    }

    const startWebcam = async () => {
        try {
            setCameraActive(true)
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
            }
        } catch (err) {
            console.error('Erro ao acessar webcam:', err)
            alert('Não foi possível acessar a webcam. Por favor, tente pelo celular usando o QR Code ou dê permissão de câmera no seu navegador.')
            setCameraActive(false)
        }
    }

    const captureWebcamPhoto = () => {
        if (!videoRef.current) return
        const video = videoRef.current
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        const ctx = canvas.getContext('2d')
        if (ctx) {
            ctx.translate(canvas.width, 0)
            ctx.scale(-1, 1)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const dataUrl = canvas.toDataURL('image/png')
            setSelfiePng(dataUrl)
            if (validationErrors['_selfie']) {
                setValidationErrors(prev => {
                    const copy = { ...prev }
                    delete copy['_selfie']
                    return copy
                })
            }
        }
        stopWebcam()
    }

    const handleMobileSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const base64String = reader.result as string
            setSelfiePng(base64String)
            if (validationErrors['_selfie']) {
                setValidationErrors(prev => {
                    const copy = { ...prev }
                    delete copy['_selfie']
                    return copy
                })
            }
        }
        reader.readAsDataURL(file)
    }

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

        if (!selfiePng) {
            errors['_selfie'] = 'A foto de confirmação (selfie) é obrigatória para assinar o prontuário.'
        }

        if (!hasSigned) {
            errors['_assinatura'] = 'Desenhe sua assinatura no campo abaixo.'
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            // Scroll to the first error
            const firstErrorLabel = Object.keys(errors)[0]
            let element: HTMLElement | null = null
            if (firstErrorLabel === '_selfie') {
                element = document.getElementById('selfie-section')
            } else if (firstErrorLabel === '_assinatura') {
                element = document.getElementById('signature-section')
            } else {
                element = document.getElementById(`q-${firstErrorLabel}`)
            }
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
                selfiePng,
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

    if (success && viewReceipt) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-800 dark:text-slate-200 py-8 px-4 flex flex-col items-center print:bg-white print:text-black print:p-0">
                <div className="max-w-2xl w-full space-y-6 relative z-10 print:max-w-none print:shadow-none print:border-none">
                    {/* Header Actions (hidden on print) */}
                    <div className="flex justify-between items-center bg-white dark:bg-[#0F172A] p-4 rounded-2xl border dark:border-white/10 shadow-sm print:hidden">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Comprovante de Preenchimento</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="py-1.5 px-3 rounded-xl bg-[#D99773] hover:bg-[#C08160] text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <Printer size={12} /> Imprimir / PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewReceipt(false)}
                                className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>

                    {/* Document Receipt */}
                    <div className="bg-white dark:bg-[#0F172A] print:bg-white rounded-3xl shadow-xl border dark:border-white/10 p-6 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
                        <div className="text-center space-y-2 border-b pb-6 dark:border-white/5 print:border-slate-200">
                            {clinica?.avatar && (
                                <img src={clinica.avatar} alt={clinica.nome} className="w-12 h-12 rounded-full mx-auto object-cover print:hidden" />
                            )}
                            <h2 className="text-[10px] uppercase tracking-wider font-bold text-[#D99773]">{clinica?.nome}</h2>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white print:text-black uppercase">{modelo?.titulo}</h1>
                            <p className="text-[10px] text-slate-400">Prontuário assinado eletronicamente pelo paciente.</p>
                        </div>

                        {/* Respostas */}
                        <div className="space-y-4">
                            {modelo?.perguntas.map((q) => {
                                const resp = respostas[q.label]
                                return (
                                    <div key={q.id} className="p-3 bg-slate-50 dark:bg-black/10 print:bg-white rounded-xl border dark:border-white/5 print:border-slate-100">
                                        <p className="font-bold text-[10px] text-slate-700 dark:text-slate-300 print:text-black">{q.label}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 print:text-black mt-1">
                                            {Array.isArray(resp) ? resp.join(', ') : (resp || <span className="italic">Sem resposta</span>)}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Selo Jurídico */}
                        <div className="mt-8 border-2 border-[#D99773] rounded-2xl p-5 bg-orange-50/20 dark:bg-[#D99773]/5 print:bg-white break-inside-avoid">
                            <div className="flex items-center gap-1.5 text-[#D99773] font-bold text-[11px] mb-4">
                                <ShieldCheck size={14} /> Certificado de Validade Jurídica
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-700">
                                    <div>
                                        <span className="font-bold block text-slate-700 dark:text-slate-300 print:text-black">Preenchido em:</span>
                                        {new Date().toLocaleString('pt-BR')}
                                    </div>
                                    <div>
                                        <span className="font-bold block text-slate-700 dark:text-slate-300 print:text-black">Endereço IP:</span>
                                        Registrado na trilha de auditoria
                                    </div>
                                    <div>
                                        <span className="font-bold block text-slate-700 dark:text-slate-300 print:text-black">Hash SHA-256:</span>
                                        <code className="font-mono text-[9px] break-all">{hash}</code>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 border-l dark:border-white/5 print:border-slate-200 pl-4">
                                    {selfiePng && (
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-[9px] mb-1.5 text-slate-700 dark:text-slate-300 print:text-black">Foto (Selfie)</span>
                                            <div className="w-16 h-16 rounded-full overflow-hidden border border-[#D99773]">
                                                <img src={selfiePng} alt="Selfie" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-[9px] mb-1.5 text-slate-700 dark:text-slate-300 print:text-black">Assinatura</span>
                                        {canvasRef.current ? (
                                            <img src={canvasRef.current.toDataURL('image/png')} alt="Assinatura" className="max-h-16 object-contain filter dark:invert print:invert-0" />
                                        ) : (
                                            <div className="text-[9px] italic text-slate-400">Assinatura</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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

                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={() => setViewReceipt(true)}
                            className="py-2.5 px-5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <FileText size={14} className="text-[#D99773]" /> Visualizar / Salvar PDF
                        </button>
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

                    {/* Selfie Section */}
                    <div id="selfie-section" className="pt-6 border-t dark:border-white/10 space-y-4">
                        <div className="flex items-center gap-2">
                            <Camera className="text-[#D99773] w-5 h-5" />
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Validação de Identidade (Selfie Obrigatória) <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Para certificar a autenticidade e validade jurídica deste termo, precisamos de uma foto de confirmação.
                        </p>

                        {/* Se a foto já foi tirada */}
                        {selfiePng ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 p-4 flex flex-col items-center justify-center space-y-3">
                                <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-[#D99773] shadow-lg">
                                    <img src={selfiePng} alt="Selfie do paciente" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-center space-y-1">
                                    <span className="text-[10px] font-semibold text-green-500 flex items-center justify-center gap-1">
                                        <CheckCircle2 size={12} /> Selfie capturada com sucesso!
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setSelfiePng('')}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1 mx-auto mt-1 cursor-pointer"
                                    >
                                        <X size={12} /> Remover e tirar outra foto
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Caso contrário, decide layout com base em ser mobile ou desktop */
                            isMobile ? (
                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-black/10 space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-[#D99773]/10 flex items-center justify-center text-[#D99773]">
                                        <Camera size={24} />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tirar selfie pelo celular</p>
                                        <p className="text-[10px] text-slate-400">Sua câmera frontal será aberta para capturar a foto.</p>
                                    </div>
                                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-semibold text-white text-xs bg-[#D99773] hover:bg-[#C08160] transition-colors shadow-sm">
                                        <Camera size={14} />
                                        Abrir Câmera do Celular
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="user"
                                            onChange={handleMobileSelfieChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Captura de Webcam */}
                                    <div className="flex flex-col items-center justify-center p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-black/10 space-y-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-[#D99773]/10 flex items-center justify-center text-[#D99773]">
                                            <Camera size={20} />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">Usar Webcam do Computador</p>
                                        
                                        {cameraActive ? (
                                            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border dark:border-white/10">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className="w-full h-full object-cover scale-x-[-1]"
                                                />
                                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 px-2">
                                                    <button
                                                        type="button"
                                                        onClick={captureWebcamPhoto}
                                                        className="py-1.5 px-3 bg-[#D99773] hover:bg-[#C08160] text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-md cursor-pointer"
                                                    >
                                                        Tirar Foto
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={stopWebcam}
                                                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-md cursor-pointer"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={startWebcam}
                                                className="py-2 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                            >
                                                Ativar Webcam
                                            </button>
                                        )}
                                    </div>

                                    {/* QR Code de Transição para Celular */}
                                    <div className="flex flex-col items-center justify-center p-5 border border-[#D99773]/20 dark:border-[#D99773]/10 rounded-2xl bg-orange-50/20 dark:bg-[#D99773]/5 space-y-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-[#D99773]/10 flex items-center justify-center text-[#D99773]">
                                            <Smartphone size={20} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Prefere preencher no Celular?</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">Assinatura com o dedo e selfie são mais fáceis pelo smartphone.</p>
                                        </div>
                                        
                                        {currentUrl ? (
                                            <div className="bg-white p-2.5 rounded-xl border dark:border-white/10 shadow-sm flex items-center justify-center">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(currentUrl)}`}
                                                    alt="Escanear Prontuário no Celular"
                                                    className="w-[110px] h-[110px]"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-[110px] h-[110px] bg-slate-100 dark:bg-black/20 rounded-xl animate-pulse" />
                                        )}
                                        <span className="text-[9px] text-[#D99773] font-semibold">Aponte a câmera do seu celular</span>
                                    </div>
                                </div>
                            )
                        )}

                        {validationErrors['_selfie'] && (
                            <p className="text-[10px] text-red-500 flex items-center gap-1 font-semibold mt-1">
                                <AlertCircle size={10} /> {validationErrors['_selfie']}
                            </p>
                        )}
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
                                className="w-full h-40 cursor-crosshair block touch-none"
                                style={{ touchAction: 'none' }}
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
