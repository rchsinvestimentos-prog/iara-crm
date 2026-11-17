'use client'

import { useState } from 'react'
import { useT } from '@/components/IdiomaProvider'

// Foto, vídeo ou documento que a cliente mandou, dentro do balão da conversa.
// Usado na ficha da cliente (aba Chat) e na tela de Conversas.

export interface MidiaNaConversaProps {
    url: string
    tipo: 'imagem' | 'video' | 'documento'
}

export default function MidiaNaConversa({ url, tipo }: MidiaNaConversaProps) {
    const { t } = useT()
    // Arquivo apagado do disco ou sem permissão: avisa em vez de mostrar balão vazio
    const [quebrou, setQuebrou] = useState(false)
    if (quebrou) {
        return <p className="italic opacity-70">{tipo === 'video' ? `🎬 ${t('Vídeo indisponível')}` : `📷 ${t('Foto indisponível')}`}</p>
    }

    if (tipo === 'imagem') {
        return (
            <a href={url} target="_blank" rel="noreferrer" title={t('Abrir a foto em tamanho real')} className="block">
                <img
                    src={url}
                    alt={t('Foto enviada pela cliente')}
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
            📄 {t('Abrir documento')}
        </a>
    )
}
