'use client'

// ============================================
// QUADRO DE TRIAGEM — foto por foto + mini WhatsApp com a IARA
// ============================================
// Pedido do Rafael (03/10): a doutora comenta cada foto separadamente (texto
// ou áudio), a IARA junta tudo numa mensagem só e PEDE PERMISSÃO antes de
// mandar. "Deixa que eu ajusto" faz a IARA encaminhar o texto da doutora sem
// mexer. Foto sem comentário fica de fora da mensagem.

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, Send, Pencil, RotateCcw, Bot, User, FileText } from 'lucide-react'
import BotaoGravarAudio from './BotaoGravarAudio'

export interface MidiaPendente {
    id: string
    url: string
    tipo: string
    createdAt: string
}

interface Props {
    contatoId: number
    nomeCliente: string
    midias: MidiaPendente[]
    /** Horário da foto mais nova na tela (o servidor só dá por vistas até ela) */
    ateMidia: () => string | undefined
    /** Avisa a página que a doutora agiu (a atualização automática descarta respostas velhas) */
    marcarAcao: () => void
    /** Mensagem enviada: a página recarrega o quadro e o chat */
    aoEnviar: (resultado: { fotosNovas?: number; notaSalva?: boolean }) => void
}

type Etapa = 'comentando' | 'preparando' | 'aprovando' | 'ajustando' | 'enviando' | 'enviado'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function QuadroTriagem({ contatoId, nomeCliente, midias, ateMidia, marcarAcao, aoEnviar }: Props) {
    const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
    const [comentarios, setComentarios] = useState<Record<string, string>>({})
    const [rascunho, setRascunho] = useState('')
    const [etapa, setEtapa] = useState<Etapa>('comentando')
    const [proposta, setProposta] = useState('')
    const [textoProprio, setTextoProprio] = useState('')

    const primeiroNome = (nomeCliente || 'a cliente').split(' ')[0]
    const ordem = useMemo(() => new Map(midias.map((m, i) => [m.id, i + 1])), [midias])
    const comentadas = midias.filter(m => comentarios[m.id]?.trim())
    const selecionada = midias.find(m => m.id === selecionadaId) || null

    // Começa (e segue) pela primeira foto ainda sem comentário
    useEffect(() => {
        if (selecionadaId && midias.some(m => m.id === selecionadaId)) return
        const proxima = midias.find(m => !comentarios[m.id]) || midias[0]
        setSelecionadaId(proxima?.id || null)
        setRascunho(proxima ? comentarios[proxima.id] || '' : '')
    }, [midias, selecionadaId, comentarios])

    const selecionar = (id: string) => {
        setSelecionadaId(id)
        setRascunho(comentarios[id] || '')
    }

    // Mudou um comentário depois da proposta? A proposta ficou velha.
    const voltarParaComentarios = () => {
        if (etapa === 'aprovando' || etapa === 'ajustando') {
            setEtapa('comentando')
            setProposta('')
        }
    }

    const salvarComentario = () => {
        if (!selecionadaId || !rascunho.trim()) return
        const novos = { ...comentarios, [selecionadaId]: rascunho.trim() }
        setComentarios(novos)
        voltarParaComentarios()
        const proxima = midias.find(m => m.id !== selecionadaId && !novos[m.id])
        if (proxima) {
            setSelecionadaId(proxima.id)
            setRascunho('')
        }
    }

    const listaComentarios = () => midias
        .filter(m => comentarios[m.id]?.trim())
        .map(m => ({ midiaId: m.id, comentario: comentarios[m.id].trim() }))

    const chamar = async (corpo: Record<string, unknown>) => {
        const res = await fetch(`/api/contatos/${contatoId}/triagem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(corpo),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || `Erro ${res.status}`)
        return data
    }

    const preparar = async () => {
        setEtapa('preparando')
        try {
            const data = await chamar({ action: 'preparar', comentarios: listaComentarios() })
            setProposta(data.proposta)
            setEtapa('aprovando')
        } catch (err: any) {
            alert(err.message || 'A IARA não conseguiu preparar a mensagem. Tente de novo.')
            setEtapa('comentando')
        }
    }

    const enviar = async (texto: string, literal: boolean) => {
        if (!texto.trim()) return
        const voltarPara: Etapa = literal ? 'ajustando' : 'aprovando'
        setEtapa('enviando')
        marcarAcao()
        try {
            const data = await chamar({
                action: 'enviar',
                texto: texto.trim(),
                literal,
                comentarios: listaComentarios(),
                ateMidia: ateMidia(),
            })
            setEtapa('enviado')
            if (data.notaSalva === false) {
                alert('A mensagem foi enviada para a cliente, mas não consegui guardar seus comentários para a IARA. Se a cliente perguntar sobre as fotos, a IARA pode não saber o que você decidiu.')
            }
            aoEnviar(data)
        } catch (err: any) {
            alert(err.message || 'Erro ao enviar. Nada foi enviado para a cliente.')
            setEtapa(voltarPara)
        } finally {
            marcarAcao()
        }
    }

    const ocupado = etapa === 'preparando' || etapa === 'enviando'

    return (
        <div className="space-y-3">
            {/* 1. FOTOS — toque para escolher */}
            <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-petroleo dark:text-white">
                    {midias.length === 1 ? '1 arquivo aguardando avaliação' : `${midias.length} arquivos aguardando avaliação`}
                    <span className="font-normal text-gray-500"> — toque em cada foto e diga o que fazer com ela</span>
                </p>
                <div className="flex flex-wrap gap-2">
                    {midias.map(m => {
                        const ativa = m.id === selecionadaId
                        const feita = !!comentarios[m.id]?.trim()
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => selecionar(m.id)}
                                disabled={ocupado}
                                className={`relative rounded-lg p-0.5 transition-all cursor-pointer ${ativa ? 'ring-[3px] ring-amber-500' : 'ring-1 ring-transparent hover:ring-amber-300'}`}
                                title={`Foto ${ordem.get(m.id)} — recebida às ${hora(m.createdAt)}`}
                            >
                                {m.tipo === 'imagem' ? (
                                    <img src={m.url} alt={`Foto ${ordem.get(m.id)}`} className="w-20 h-20 object-cover rounded-md" />
                                ) : (
                                    <div className="w-20 h-20 rounded-md bg-white/5 border flex flex-col items-center justify-center text-gray-400">
                                        <FileText size={18} />
                                    </div>
                                )}
                                <span className="absolute top-1 left-1 text-[9px] font-bold bg-black/60 text-white rounded px-1">{ordem.get(m.id)}</span>
                                {feita && (
                                    <span className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                                        <Check size={10} />
                                    </span>
                                )}
                                <span className="block text-[9px] text-gray-500 text-center">{hora(m.createdAt)}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 2. MINI WHATSAPP COM A IARA */}
            <div className="rounded-xl border bg-white/60 dark:bg-white/5 p-3 space-y-2 max-h-[45vh] overflow-y-auto">
                <BalaoIara>
                    Oi, Doutora! {primeiroNome} mandou {midias.length === 1 ? 'uma foto' : `${midias.length} fotos`}. Me diz o que fazer com cada uma — por texto ou áudio. A que você não comentar fica de fora.
                </BalaoIara>

                {comentadas.map(m => (
                    <BalaoDoutora key={m.id}>
                        <span className="flex gap-2 items-start">
                            {m.tipo === 'imagem' && <img src={m.url} alt="" className="w-8 h-8 object-cover rounded" />}
                            <span><b>Foto {ordem.get(m.id)}:</b> {comentarios[m.id]}</span>
                        </span>
                    </BalaoDoutora>
                ))}

                {(etapa === 'aprovando' || etapa === 'ajustando' || etapa === 'enviando' || etapa === 'enviado') && proposta && (
                    <BalaoIara>
                        Entendi! Posso mandar isto para {primeiroNome}?
                        <span className="block mt-2 p-2 rounded-lg bg-white dark:bg-black/20 border whitespace-pre-wrap">{proposta}</span>
                    </BalaoIara>
                )}

                {etapa === 'ajustando' && (
                    <BalaoIara>
                        Perfeito, Doutora! Escreve a mensagem aqui embaixo. Do jeito que você mandar, eu encaminho para {primeiroNome} sem mexer.
                    </BalaoIara>
                )}

                {etapa === 'preparando' && (
                    <BalaoIara><Loader2 size={11} className="animate-spin inline mr-1" /> Escrevendo a mensagem...</BalaoIara>
                )}
                {etapa === 'enviado' && <BalaoIara>Pronto! Mandei para {primeiroNome}. ✅</BalaoIara>}
            </div>

            {/* 3. O QUE A DOUTORA FAZ AGORA */}
            {etapa === 'comentando' && selecionada && (
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-petroleo dark:text-white">
                        Foto {ordem.get(selecionada.id)} — o que fazer com esta foto?
                    </p>
                    <textarea
                        value={rascunho}
                        onChange={e => setRascunho(e.target.value)}
                        placeholder="Ex.: vai precisar de pelo menos 3 sessões para o resultado ficar bom"
                        className="input-field text-[11px] h-14 w-full"
                    />
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <BotaoGravarAudio onTexto={t => setRascunho(prev => (prev.trim() ? `${prev.trim()} ${t}` : t))} />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={salvarComentario}
                                disabled={!rascunho.trim()}
                                className="px-3 py-1 rounded-lg bg-petroleo text-white font-bold text-[9px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <Check size={10} /> {comentarios[selecionada.id] ? 'Atualizar comentário' : 'Salvar comentário'}
                            </button>
                            <button
                                type="button"
                                onClick={preparar}
                                disabled={comentadas.length === 0}
                                title={comentadas.length === 0 ? 'Comente pelo menos uma foto' : ''}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <Bot size={10} /> Preparar mensagem ({comentadas.length} {comentadas.length === 1 ? 'foto' : 'fotos'})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {etapa === 'aprovando' && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => enviar(proposta, false)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                        <Send size={11} /> Sim, pode mandar
                    </button>
                    <button
                        type="button"
                        onClick={() => { setTextoProprio(proposta); setEtapa('ajustando') }}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                        <Pencil size={11} /> Deixa que eu ajusto
                    </button>
                    <button
                        type="button"
                        onClick={voltarParaComentarios}
                        className="px-3 py-1.5 rounded-lg text-gray-500 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                    >
                        <RotateCcw size={11} /> Mudar comentários
                    </button>
                </div>
            )}

            {etapa === 'ajustando' && (
                <div className="space-y-2">
                    <textarea
                        value={textoProprio}
                        onChange={e => setTextoProprio(e.target.value)}
                        className="input-field text-[11px] h-24 w-full"
                    />
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <BotaoGravarAudio onTexto={t => setTextoProprio(prev => (prev.trim() ? `${prev.trim()} ${t}` : t))} />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEtapa('aprovando')}
                                className="px-3 py-1 rounded-lg text-gray-500 font-bold text-[9px] cursor-pointer"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                onClick={() => enviar(textoProprio, true)}
                                disabled={!textoProprio.trim()}
                                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <Send size={10} /> Enviar exatamente este texto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {etapa === 'enviando' && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Enviando para {primeiroNome}...</p>
            )}
        </div>
    )
}

function BalaoIara({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-1.5 items-start max-w-[90%]">
            <Bot size={12} className="text-[#D99773] mt-1 shrink-0" />
            <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#D99773]/10 border border-[#D99773]/20 text-[11px] text-petroleo dark:text-white leading-relaxed">
                {children}
            </div>
        </div>
    )
}

function BalaoDoutora({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-1.5 items-start justify-end ml-auto max-w-[90%]">
            <div className="px-3 py-2 rounded-2xl rounded-tr-sm bg-petroleo/10 border border-petroleo/20 text-[11px] text-petroleo dark:text-white leading-relaxed">
                {children}
            </div>
            <User size={12} className="text-petroleo mt-1 shrink-0" />
        </div>
    )
}
