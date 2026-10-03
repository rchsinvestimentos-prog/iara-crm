'use client'

import { useState } from 'react'

// Foto, vídeo ou documento que a cliente mandou, dentro do balão da conversa.
// Usado na ficha da cliente (aba Chat) e na tela de Conversas.

export interface MidiaNaConversaProps {
    url: string
    tipo: 'imagem' | 'video' | 'documento'
}

export default function MidiaNaConversa({ url, tipo }: MidiaNaConversaProps) {
    // Arquivo apagado do disco ou sem permissão: avisa em vez de mostrar balão vazio
    const [quebrou, setQuebrou] = useState(false)
    if (quebrou) {
        return <p className="italic opacity-70">{tipo === 'video' ? '🎬 Vídeo' : '📷 Foto'} indisponível</p>
    }

    if (tipo === 'imagem') {
        return (
            <a href={url} target="_blank" rel="noreferrer" title="Abrir a foto em tamanho real" className="block">
                <img
                    src={url}
                    alt="Foto enviada pela cliente"
                    loading="lazy"
                    onError={() => setQuebrou(true)}
                    className="rounded-xl max-w-full w-60 max-h-72 object-cover cursor-zoom-in"
                />
            </a>
        )
    }

    if (tipo === 'video') {
        return <video controls preload="metadata" src={url} onError={() => setQuebrou(true)} className="rounded-xl max-w-full w-60 max-h-72" />
    }

    return (
        <a href={url} target="_blank" rel="noreferrer" className="underline font-semibold">
            📄 Abrir documento
        </a>
    )
}
