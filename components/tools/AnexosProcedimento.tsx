'use client'

// Anexos do procedimento, no formulário de "Configurar IARA" e no da tela
// "Procedimentos". Cada arquivo sobe na hora (não espera o "Salvar" do
// procedimento), por isso só aparece quando o procedimento já existe.
// Aceita vários arquivos de uma vez: a clínica escolhe as 4 fotos de
// trabalhos juntas e escreve uma descrição só.

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
import { useT } from '@/components/IdiomaProvider'

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
    const { t } = useT()
    const [anexos, setAnexos] = useState<AnexoTela[]>([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState('')

    const [arquivos, setArquivos] = useState<File[]>([])
    const [descricao, setDescricao] = useState('')
    const [momento, setMomento] = useState<MomentoAnexo>('perguntar')
    const [enviando, setEnviando] = useState(false)
    const [progresso, setProgresso] = useState('')
    const [apagando, setApagando] = useState<string | null>(null)
    const [arrastando, setArrastando] = useState(false)
    const [falhouCarregar, setFalhouCarregar] = useState(false)
    const [tentativa, setTentativa] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    const base = `/api/procedimentos/${procedimentoId}/anexos`

    useEffect(() => {
        // Quem usa passa key={procedimentoId}; mesmo assim, nada do
        // procedimento anterior pode sobrar na tela nem chegar atrasado.
        let cancelado = false
        setCarregando(true)
        setFalhouCarregar(false)
        setAnexos([])
        setErro('')
        fetch(base)
            .then(async r => {
                const d = await r.json().catch(() => ({}))
                if (!r.ok || !Array.isArray(d.anexos)) throw new Error(d.error || `HTTP ${r.status}`)
                if (!cancelado) setAnexos(d.anexos)
            })
            // Lista que não carregou não pode parecer lista vazia: a clínica
            // anexaria de novo o que já está lá. Some a área de anexar.
            .catch(() => { if (!cancelado) setFalhouCarregar(true) })
            .finally(() => { if (!cancelado) setCarregando(false) })
        return () => { cancelado = true }
    }, [base, tentativa])

    const escolher = (lista: FileList | null) => {
        setErro('')
        const todos = Array.from(lista || [])
        const grandes = todos.filter(f => f.size > MAX_BYTES_ANEXO)
        const cabem = Math.max(0, MAX_ANEXOS_POR_PROCEDIMENTO - anexos.length)
        const aceitos = todos.filter(f => f.size <= MAX_BYTES_ANEXO).slice(0, cabem)

        const avisos: string[] = []
        if (grandes.length) {
            const vars = { arquivos: grandes.map(f => `"${f.name}" (${mb(f.size)})`).join(', '), limite: mb(MAX_BYTES_ANEXO) }
            avisos.push(grandes.length > 1
                ? t('{arquivos} passam de {limite}, o limite do WhatsApp, e ficaram de fora.', vars)
                : t('{arquivos} passa de {limite}, o limite do WhatsApp, e ficou de fora.', vars))
        }
        const semLugar = todos.length - grandes.length - aceitos.length
        if (semLugar > 0) {
            const vars = { max: MAX_ANEXOS_POR_PROCEDIMENTO, n: semLugar }
            avisos.push(semLugar > 1
                ? t('Cada procedimento guarda até {max} arquivos: {n} ficaram de fora.', vars)
                : t('Cada procedimento guarda até {max} arquivos: {n} ficou de fora.', vars))
        }
        if (avisos.length) setErro(avisos.join(' '))

        setArquivos(aceitos)
        if (!aceitos.length && inputRef.current) inputRef.current.value = ''
    }

    const enviar = async () => {
        if (!arquivos.length) return setErro(t('Escolha um arquivo.'))
        if (!descricao.trim()) return setErro(t('Escreva o que é o arquivo, para a IARA saber quando mandar.'))
        setEnviando(true)
        setErro('')
        // Um por vez: se um falhar, os que já subiram ficam e o resto
        // continua escolhido para tentar de novo.
        const faltam = [...arquivos]
        try {
            while (faltam.length) {
                const arquivo = faltam[0]
                if (arquivos.length > 1) setProgresso(`${arquivos.length - faltam.length + 1}/${arquivos.length}`)
                const fd = new FormData()
                fd.append('file', arquivo)
                fd.append('descricao', descricao.trim())
                fd.append('momento', momento)
                const res = await fetch(base, { method: 'POST', body: fd })
                const d = await res.json().catch(() => ({}))
                if (!res.ok || !d.anexo) {
                    setErro(`"${arquivo.name}": ${d.error || t('erro ao enviar o arquivo.')}`)
                    return
                }
                setAnexos(prev => [...prev, d.anexo])
                faltam.shift()
            }
            setDescricao('')
            setMomento('perguntar')
        } catch {
            setErro(t('Erro de conexão ao enviar "{arquivo}".', { arquivo: faltam[0]?.name ?? '' }))
        } finally {
            // O que faltou fica no estado; o campo é limpo para dar para
            // escolher os mesmos arquivos de novo.
            setArquivos(faltam)
            if (inputRef.current) inputRef.current.value = ''
            setEnviando(false)
            setProgresso('')
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
            setErro(t('Não consegui salvar a mudança.'))
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
        else setErro(t('Não consegui salvar a descrição.'))
    }

    const apagar = async (a: AnexoTela) => {
        if (!confirm(t('Apagar "{arquivo}"? A IARA para de enviar este arquivo.', { arquivo: a.nomeArquivo }))) return
        setApagando(a.id)
        const res = await fetch(`${base}?anexoId=${a.id}`, { method: 'DELETE' }).catch(() => null)
        if (res && res.ok) setAnexos(prev => prev.filter(x => x.id !== a.id))
        else setErro(t('Não consegui apagar o arquivo.'))
        setApagando(null)
    }

    const cheio = anexos.length >= MAX_ANEXOS_POR_PROCEDIMENTO

    return (
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <Paperclip size={12} /> {t('Anexos para a IARA enviar')}
                </p>
                {!carregando && !falhouCarregar && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{anexos.length}/{MAX_ANEXOS_POR_PROCEDIMENTO}</span>
                )}
            </div>
            <p className="text-[9px] mb-3" style={{ color: 'var(--text-muted)' }}>
                {t('Foto, vídeo (até 15 MB) ou PDF. A IARA manda pelo WhatsApp no momento que você escolher, uma vez por paciente.')}
            </p>

            {carregando ? (
                <div className="py-3 flex justify-center"><Loader2 size={14} className="animate-spin text-[#D99773]" /></div>
            ) : falhouCarregar ? (
                <div className="py-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] text-red-500">{t('Não consegui carregar os anexos deste procedimento.')}</p>
                    <button
                        type="button"
                        onClick={() => setTentativa(n => n + 1)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-md flex-shrink-0"
                        style={{ border: '1px solid #D99773', color: '#C07A55' }}
                    >
                        {t('Tentar de novo')}
                    </button>
                </div>
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
                                    <a href={a.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-md" style={{ color: 'var(--text-muted)' }} title={t('Abrir')}>
                                        <ExternalLink size={13} />
                                    </a>
                                    <button type="button" onClick={() => apagar(a)} disabled={apagando === a.id} className="p-1.5 rounded-md text-red-400 hover:text-red-500" title={t('Apagar')}>
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
                                    {MOMENTOS.map(m => <option key={m.valor} value={m.valor}>{t('Enviar: {momento}', { momento: t(m.rotulo) })}</option>)}
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
                                onDrop={e => { e.preventDefault(); setArrastando(false); escolher(e.dataTransfer.files) }}
                                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                style={{
                                    border: '1.5px dashed #D99773',
                                    backgroundColor: arrastando ? 'rgba(217,151,115,0.18)' : 'rgba(217,151,115,0.07)',
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf"
                                    onChange={e => escolher(e.target.files)}
                                    className="sr-only"
                                />
                                <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                                    <Upload size={16} className="text-white" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-[12px] font-semibold truncate" style={{ color: '#C07A55' }}>
                                        {arquivos.length === 0
                                            ? t('Clique para escolher os arquivos')
                                            : arquivos.length === 1 ? arquivos[0].name : t('{n} arquivos escolhidos', { n: arquivos.length })}
                                    </span>
                                    <span className="block text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {arquivos.length
                                            ? t('{tamanho} · clique para trocar', { tamanho: mb(arquivos.reduce((s, f) => s + f.size, 0)) })
                                            : t('ou arraste aqui · até {n} de uma vez · foto, vídeo MP4 até 15 MB ou PDF', { n: MAX_ANEXOS_POR_PROCEDIMENTO - anexos.length })}
                                    </span>
                                </span>
                            </label>
                            <textarea
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                maxLength={MAX_DESCRICAO_ANEXO}
                                rows={2}
                                placeholder={arquivos.length > 1
                                    ? t('O que são estes arquivos? Ex: Fotos de trabalhos da doutora, antes e depois de micropigmentação labial')
                                    : t('O que é este arquivo? Ex: Vídeo de antes e depois de uma cliente que fez fio a fio')}
                                className="w-full px-2.5 py-1.5 text-[11px] rounded-md focus:outline-none resize-none"
                                style={inputStyle}
                            />
                            <select
                                value={momento}
                                onChange={e => setMomento(e.target.value as MomentoAnexo)}
                                className="w-full px-2.5 py-1.5 text-[11px] rounded-md focus:outline-none"
                                style={inputStyle}
                            >
                                {MOMENTOS.map(m => <option key={m.valor} value={m.valor}>{t('Enviar: {momento}', { momento: t(m.rotulo) })}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={enviar}
                                disabled={enviando || !arquivos.length}
                                className="text-[11px] font-medium px-3 py-1.5 bg-[#D99773] text-white rounded-md flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {enviando ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                                {enviando ? (progresso ? t('Enviando {progresso}...', { progresso }) : t('Enviando...')) : arquivos.length > 1 ? t('Anexar {n}', { n: arquivos.length }) : t('Anexar')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {erro && <p className="text-[10px] mt-2 text-red-500">{erro}</p>}
        </div>
    )
}
