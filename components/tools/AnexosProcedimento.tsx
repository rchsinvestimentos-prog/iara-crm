'use client'

// Anexos do procedimento dentro do formulário de "Configurar IARA".
// Cada arquivo sobe na hora (não espera o "Salvar" do procedimento), por isso
// só aparece quando o procedimento já existe.

import { useEffect, useRef, useState } from 'react'
import { Paperclip, Image as ImageIcon, Film, FileText, Trash2, Loader2, Upload, ExternalLink } from 'lucide-react'
import {
    MOMENTOS,
    MAX_ANEXOS_POR_PROCEDIMENTO,
    MAX_BYTES_ANEXO,
    MAX_DESCRICAO_ANEXO,
    type MomentoAnexo,
    type TipoAnexo,
} from '@/lib/anexos-procedimento'

interface AnexoTela {
    id: string
    tipo: TipoAnexo
    nomeArquivo: string
    tamanho: number
    descricao: string
    momento: MomentoAnexo
    url: string
}

const ICONE: Record<TipoAnexo, typeof ImageIcon> = { imagem: ImageIcon, video: Film, documento: FileText }
const inputStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }

function mb(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export default function AnexosProcedimento({ procedimentoId }: { procedimentoId: number }) {
    const [anexos, setAnexos] = useState<AnexoTela[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    const [arquivo, setArquivo] = useState<File | null>(null)
    const [descricao, setDescricao] = useState('')
    const [momento, setMomento] = useState<MomentoAnexo>('apos_falar')
    const [enviando, setEnviando] = useState(false)
    const [apagando, setApagando] = useState<string | null>(null)
    const [arrastando, setArrastando] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const base = `/api/procedimentos/${procedimentoId}/anexos`

    useEffect(() => {
        setCarregando(true)
        fetch(base)
            .then(r => r.json())
            .then(d => setAnexos(Array.isArray(d.anexos) ? d.anexos : []))
            .catch(() => setErro('Não consegui carregar os anexos.'))
            .finally(() => setCarregando(false))
    }, [base])

    const escolher = (f: File | null) => {
        setErro('')
        if (f && f.size > MAX_BYTES_ANEXO) {
            setErro(`Esse arquivo tem ${mb(f.size)}. O máximo é ${mb(MAX_BYTES_ANEXO)}, limite do WhatsApp.`)
            setArquivo(null)
            if (inputRef.current) inputRef.current.value = ''
            return
        }
        setArquivo(f)
    }

    const enviar = async () => {
        if (!arquivo) return setErro('Escolha um arquivo.')
        if (!descricao.trim()) return setErro('Escreva o que é o arquivo, para a IARA saber quando mandar.')
        setEnviando(true)
        setErro('')
        try {
            const fd = new FormData()
            fd.append('file', arquivo)
            fd.append('descricao', descricao.trim())
            fd.append('momento', momento)
            const res = await fetch(base, { method: 'POST', body: fd })
            const d = await res.json().catch(() => ({}))
            if (!res.ok) return setErro(d.error || 'Erro ao enviar o arquivo.')
            setAnexos(prev => [...prev, d.anexo])
            setArquivo(null)
            setDescricao('')
            setMomento('apos_falar')
            if (inputRef.current) inputRef.current.value = ''
        } catch {
            setErro('Erro de conexão ao enviar o arquivo.')
        } finally {
            setEnviando(false)
        }
    }

    const mudarMomento = async (a: AnexoTela, novo: MomentoAnexo) => {
        const antes = a.momento
        setAnexos(prev => prev.map(x => x.id === a.id ? { ...x, momento: novo } : x))
        const res = await fetch(base, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anexoId: a.id, momento: novo }),
        }).catch(() => null)
        if (!res || !res.ok) {
            setAnexos(prev => prev.map(x => x.id === a.id ? { ...x, momento: antes } : x))
            setErro('Não consegui salvar a mudança.')
        }
    }

    const salvarDescricao = async (a: AnexoTela, texto: string) => {
        const nova = texto.trim()
        if (!nova || nova === a.descricao) return
        const res = await fetch(base, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anexoId: a.id, descricao: nova }),
        }).catch(() => null)
        if (res && res.ok) setAnexos(prev => prev.map(x => x.id === a.id ? { ...x, descricao: nova } : x))
        else setErro('Não consegui salvar a descrição.')
    }

    const apagar = async (a: AnexoTela) => {
        if (!confirm(`Apagar "${a.nomeArquivo}"? A IARA para de enviar este arquivo.`)) return
        setApagando(a.id)
        const res = await fetch(`${base}?anexoId=${a.id}`, { method: 'DELETE' }).catch(() => null)
        if (res && res.ok) setAnexos(prev => prev.filter(x => x.id !== a.id))
        else setErro('Não consegui apagar o arquivo.')
        setApagando(null)
    }

    const cheio = anexos.length >= MAX_ANEXOS_POR_PROCEDIMENTO

    return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Paperclip size={12} /> Anexos para a IARA enviar
                </p>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{anexos.length}/{MAX_ANEXOS_POR_PROCEDIMENTO}</span>
            </div>
            <p className="text-[9px] mb-3" style={{ color: 'var(--text-muted)' }}>
                Foto, vídeo (até 15 MB) ou PDF. A IARA manda pelo WhatsApp no momento que você escolher, uma vez por paciente.
            </p>

            {carregando ? (
                <div className="py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-[#D99773]" /></div>
            ) : (
                <div className="space-y-2">
                    {anexos.map(a => {
                        const Icone = ICONE[a.tipo]
                        return (
                            <div key={a.id} className="p-2.5 rounded-lg" style={{ border: '1px solid var(--border-default)' }}>
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(217,151,115,0.15)' }}>
                                        <Icone size={14} className="text-[#D99773]" />
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.nomeArquivo}</p>
                                        <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{mb(a.tamanho)}</p>
                                    </div>
                                    <a href={a.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }} title="Abrir">
                                        <ExternalLink size={13} />
                                    </a>
                                    <button type="button" onClick={() => apagar(a)} disabled={apagando === a.id} className="p-1.5 rounded-md text-red-400 hover:text-red-500" title="Apagar">
                                        {apagando === a.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                </div>
                                <textarea
                                    defaultValue={a.descricao}
                                    onBlur={e => salvarDescricao(a, e.target.value)}
                                    maxLength={MAX_DESCRICAO_ANEXO}
                                    rows={2}
                                    className="w-full mt-2 px-2.5 py-1.5 text-[11px] rounded-md focus:outline-none resize-none"
                                    style={inputStyle}
                                />
                                <select
                                    value={a.momento}
                                    onChange={e => mudarMomento(a, e.target.value as MomentoAnexo)}
                                    className="w-full mt-1.5 px-2.5 py-1.5 text-[11px] rounded-md focus:outline-none"
                                    style={inputStyle}
                                >
                                    {MOMENTOS.map(m => <option key={m.valor} value={m.valor}>Enviar: {m.rotulo}</option>)}
                                </select>
                            </div>
                        )
                    })}

                    {!cheio && (
                        <div className="p-2.5 rounded-lg space-y-2" style={{ border: '1px solid var(--border-default)' }}>
                            {/* O botão padrão do navegador ("Escolher arquivo") saía cinza,
                                parecendo texto solto. A área inteira abre a escolha e
                                também aceita arrastar o arquivo. */}
                            <label
                                onDragOver={e => { e.preventDefault(); setArrastando(true) }}
                                onDragLeave={() => setArrastando(false)}
                                onDrop={e => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files?.[0] || null) }}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                style={{
                                    border: '1.5px dashed #D99773',
                                    backgroundColor: arrastando ? 'rgba(217,151,115,0.18)' : 'rgba(217,151,115,0.07)',
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf"
                                    onChange={e => escolher(e.target.files?.[0] || null)}
                                    className="sr-only"
                                />
                                <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                                    <Upload size={16} className="text-white" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-[12px] font-semibold truncate" style={{ color: '#C07A55' }}>
                                        {arquivo ? arquivo.name : 'Clique para escolher o arquivo'}
                                    </span>
                                    <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {arquivo ? `${mb(arquivo.size)} · clique para trocar` : 'ou arraste aqui · foto, vídeo MP4 até 15 MB ou PDF'}
                                    </span>
                                </span>
                            </label>
                            <textarea
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                maxLength={MAX_DESCRICAO_ANEXO}
                                rows={2}
                                placeholder="O que é este arquivo? Ex: Vídeo de antes e depois de uma cliente que fez fio a fio"
                                className="w-full px-2.5 py-1.5 text-[11px] rounded-md focus:outline-none resize-none"
                                style={inputStyle}
                            />
                            <select
                                value={momento}
                                onChange={e => setMomento(e.target.value as MomentoAnexo)}
                                className="w-full px-2.5 py-1.5 text-[11px] rounded-md focus:outline-none"
                                style={inputStyle}
                            >
                                {MOMENTOS.map(m => <option key={m.valor} value={m.valor}>Enviar: {m.rotulo}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={enviar}
                                disabled={enviando || !arquivo}
                                className="text-[11px] font-medium px-3 py-1.5 bg-[#D99773] text-white rounded-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {enviando ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                                {enviando ? 'Enviando...' : 'Anexar'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {erro && <p className="text-[10px] mt-2 text-red-500">{erro}</p>}
        </div>
    )
}
