'use client'

// Grava um áudio no navegador e devolve o texto (Whisper, o mesmo que a IARA
// usa no WhatsApp). Para a doutora falar em vez de digitar.

import { useRef, useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

export default function BotaoGravarAudio({ onTexto, disabled }: { onTexto: (texto: string) => void; disabled?: boolean }) {
    const [estado, setEstado] = useState<'parado' | 'gravando' | 'transcrevendo'>('parado')
    const gravadorRef = useRef<MediaRecorder | null>(null)
    const pedacosRef = useRef<Blob[]>([])

    const comecar = async () => {
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            alert('Este navegador não grava áudio. Digite a mensagem.')
            return
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const gravador = new MediaRecorder(stream)
            pedacosRef.current = []
            gravador.ondataavailable = e => { if (e.data.size > 0) pedacosRef.current.push(e.data) }
            gravador.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                const tipo = gravador.mimeType || 'audio/webm'
                const blob = new Blob(pedacosRef.current, { type: tipo })
                if (blob.size === 0) {
                    setEstado('parado')
                    alert('O áudio saiu vazio. Tente gravar de novo.')
                    return
                }
                setEstado('transcrevendo')
                try {
                    const audioBase64 = await paraBase64(blob)
                    const res = await fetch('/api/voz/transcrever', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ audioBase64, mimeType: tipo }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok || !data.texto) {
                        alert(data.error || 'Não consegui entender o áudio. Tente de novo ou digite.')
                        return
                    }
                    onTexto(data.texto)
                } catch (err) {
                    console.error('[Gravar áudio] Erro ao transcrever:', err)
                    alert('Erro de conexão ao transcrever o áudio. Tente de novo ou digite.')
                } finally {
                    setEstado('parado')
                }
            }
            gravadorRef.current = gravador
            gravador.start()
            setEstado('gravando')
        } catch (err) {
            console.error('[Gravar áudio] Sem acesso ao microfone:', err)
            alert('Não consegui usar o microfone. Libere o acesso no navegador ou digite a mensagem.')
        }
    }

    const parar = () => gravadorRef.current?.stop()

    if (estado === 'transcrevendo') {
        return (
            <button type="button" disabled className="px-2 py-1 rounded-lg border text-[9px] font-bold flex items-center gap-1 text-gray-500">
                <Loader2 size={10} className="animate-spin" /> Entendendo o áudio...
            </button>
        )
    }

    return estado === 'gravando' ? (
        <button
            type="button"
            onClick={parar}
            className="px-2 py-1 rounded-lg bg-red-500 text-white text-[9px] font-bold flex items-center gap-1 animate-pulse cursor-pointer"
        >
            <Square size={10} /> Parar e usar o áudio
        </button>
    ) : (
        <button
            type="button"
            onClick={comecar}
            disabled={disabled}
            title="Fale em vez de digitar"
            className="px-2 py-1 rounded-lg border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 text-[9px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
            <Mic size={10} /> Gravar áudio
        </button>
    )
}

function paraBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader()
        leitor.onload = () => resolve(String(leitor.result).split(',')[1] || '')
        leitor.onerror = () => reject(leitor.error)
        leitor.readAsDataURL(blob)
    })
}
