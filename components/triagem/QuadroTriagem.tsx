'use client'

// ============================================
// QUADRO DE TRIAGEM — foto por foto + mini WhatsApp com a IARA
// ============================================
// Pedido do Rafael (03/10): a doutora comenta cada foto separadamente (texto
// ou áudio), a IARA junta tudo numa mensagem só e PEDE PERMISSÃO antes de
// mandar. "Deixa que eu ajusto" faz a IARA encaminhar o texto da doutora sem
// mexer. Foto sem comentário fica de fora da mensagem.

import { useEffect, useMemo, useRef, useState } from 'react'
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
    /** Avisa a página que a doutora agiu (a atualização automática descarta respostas velhas) */
    marcarAcao: () => void
    /** Mensagem enviada: a página recarrega o quadro e o chat */
    aoEnviar: (resultado: { restantes?: number | null; notaSalva?: boolean }) => void
}

type Etapa = 'comentando' | 'preparando' | 'aprovando' | 'ajustando' | 'enviando' | 'enviado'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export default function QuadroTriagem({ contatoId, nomeCliente, midias, marcarAcao, aoEnviar }: Props) {
    const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
    const [comentarios, setComentarios] = useState<Record<string, string>>({})
    // Fotos que a doutora marcou "não precisa de resposta": saem da lista sem entrar na mensagem
    const [semResposta, setSemResposta] = useState<Set<string>>(new Set())
    const [rascunho, setRascunho] = useState('')
    const [etapa, setEtapa] = useState<Etapa>('comentando')
    const [proposta, setProposta] = useState('')
    const [textoProprio, setTextoProprio] = useState('')

    const primeiroNome = (nomeCliente || 'a cliente').split(' ')[0]
    // Mantém a última fala do mini chat à vista — rolando só a caixa dele, não a tela
    const chatRef = useRef<HTMLDivElement>(null)
    const ordem = useMemo(() => new Map(midias.map((m, i) => [m.id, i + 1])), [midias])
    const comentadas = midias.filter(m => comentarios[m.id]?.trim())
    const dispensadas = midias.filter(m => semResposta.has(m.id))
    const decidida = (id: string) => !!comentarios[id]?.trim() || semResposta.has(id)
    const faltando = midias.filter(m => !decidida(m.id))
    const selecionada = midias.find(m => m.id === selecionadaId) || null

    // Começa (e segue) pela primeira foto ainda sem comentário
    useEffect(() => {
        if (selecionadaId && midias.some(m => m.id === selecionadaId)) return
        const proxima = midias.find(m => !comentarios[m.id] && !semResposta.has(m.id)) || midias[0]
        setSelecionadaId(proxima?.id || null)
        setRascunho(proxima ? comentarios[proxima.id] || '' : '')
    }, [midias, selecionadaId, comentarios, semResposta])

    useEffect(() => {
        const c = chatRef.current
        if (c) c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' })
    }, [selecionadaId, etapa, comentarios, semResposta, proposta])

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

    const irParaProxima = (novosComentarios: Record<string, string>, novasSem: Set<string>) => {
        const proxima = midias.find(m => m.id !== selecionadaId && !novosComentarios[m.id] && !novasSem.has(m.id))
        if (proxima) {
            setSelecionadaId(proxima.id)
            setRascunho('')
        }
    }

    const salvarComentario = () => {
        if (!selecionadaId || !rascunho.trim()) return
        const novos = { ...comentarios, [selecionadaId]: rascunho.trim() }
        const novasSem = new Set(semResposta)
        novasSem.delete(selecionadaId)
        setComentarios(novos)
        setSemResposta(novasSem)
        voltarParaComentarios()
        irParaProxima(novos, novasSem)
    }

    // "Esta não precisa de resposta": sai da lista, não entra na mensagem, para de ser lembrada
    const marcarSemResposta = () => {
        if (!selecionadaId) return
        const novos = { ...comentarios }
        delete novos[selecionadaId]
        const novasSem = new Set(semResposta)
        novasSem.add(selecionadaId)
        setComentarios(novos)
        setSemResposta(novasSem)
        setRascunho('')
        voltarParaComentarios()
        irParaProxima(novos, novasSem)
    }

    // Só fotos dispensadas, nenhuma comentada: conclui sem mandar nada à cliente
    const concluirSemMensagem = async () => {
        setEtapa('enviando')
        marcarAcao()
        try {
            const data = await chamar({ action: 'nada', midiaIds: dispensadas.map(m => m.id) })
            setEtapa('enviado')
            aoEnviar(data)
        } catch (err: any) {
            alert(err.message || 'Não consegui concluir. Tente de novo.')
            setEtapa('comentando')
        } finally {
            marcarAcao()
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
                semResposta: dispensadas.map(m => m.id),
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
                        const dispensada = semResposta.has(m.id)
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
                                {dispensada && (
                                    <span className="absolute top-1 right-1 bg-gray-500 text-white rounded-full px-1 text-[8px] font-bold" title="Não precisa de resposta">—</span>
                                )}
                                <span className="block text-[9px] text-gray-500 text-center">{hora(m.createdAt)}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 2. MINI WHATSAPP COM A IARA */}
            <div ref={chatRef} className="rounded-xl border bg-white/60 dark:bg-white/5 p-3 space-y-2 max-h-[45vh] overflow-y-auto">
                <BalaoIara>
                    Oi, Doutora! {primeiroNome} mandou {midias.length === 1 ? 'uma foto' : `${midias.length} fotos`}. Me diz o que fazer com cada uma — por texto ou áudio. A que você não comentar fica de fora.
                </BalaoIara>

                {midias.filter(m => decidida(m.id)).map(m => (
                    <BalaoDoutora key={m.id}>
                        <span className="flex gap-2 items-start">
                            {m.tipo === 'imagem' && <img src={m.url} alt="" className="w-8 h-8 object-cover rounded" />}
                            <span><b>Foto {ordem.get(m.id)}:</b> {semResposta.has(m.id) ? <i>não precisa de resposta</i> : comentarios[m.id]}</span>
                        </span>
                    </BalaoDoutora>
                ))}

                {(etapa === 'aprovando' || etapa === 'ajustando' || etapa === 'enviando' || etapa === 'enviado') && proposta && (
                    <BalaoIara>
                        Entendi! Posso mandar isto para {primeiroNome}?
                        <span className="block mt-2 p-2 rounded-lg bg-white dark:bg-black/20 border whitespace-pre-wrap">{proposta}</span>
                        {faltando.length > 0 && (
                            <span className="block mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                                {faltando.length === 1
                                    ? `A foto ${ordem.get(faltando[0].id)} ficou sem comentário — ela continua na lista e eu te lembro dela.`
                                    : `As fotos ${faltando.map(m => ordem.get(m.id)).join(', ')} ficaram sem comentário — continuam na lista e eu te lembro delas.`}
                            </span>
                        )}
                    </BalaoIara>
                )}

                {etapa === 'ajustando' && (
                    <BalaoIara>
                        Perfeito, Doutora! Escreve a mensagem aqui embaixo. Do jeito que você mandar, eu encaminho para {primeiroNome} sem mexer.
                    </BalaoIara>
                )}

                {/* A foto escolhida agora aparece no chat, com a pergunta da IARA */}
                {etapa === 'comentando' && faltando.length === 0 && (
                    <BalaoIara>
                        Pronto, Doutora! Todas as fotos têm decisão.{' '}
                        {comentadas.length > 0
                            ? <>Toque em <b>Responder à IARA</b> que eu preparo a mensagem para {primeiroNome}.</>
                            : <>Nenhuma pede resposta: toque em <b>Concluir</b> e nada é enviado.</>}
                        {' '}Para mudar alguma, é só tocar nela.
                    </BalaoIara>
                )}

                {etapa === 'comentando' && selecionada && !decidida(selecionada.id) && (
                    <BalaoIara>
                        <span className="block mb-1.5">
                            E a <b>foto {ordem.get(selecionada.id)}</b>? O que faço com ela?
                        </span>
                        {selecionada.tipo === 'imagem' ? (
                            <a href={selecionada.url} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                                <img src={selecionada.url} alt={`Foto ${ordem.get(selecionada.id)}`} className="w-40 h-40 object-cover rounded-lg cursor-zoom-in" />
                            </a>
                        ) : (
                            <a href={selecionada.url} target="_blank" rel="noreferrer" className="underline font-semibold">📄 Abrir arquivo {ordem.get(selecionada.id)}</a>
                        )}
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
                        <div className="flex gap-2 flex-wrap">
                            <BotaoGravarAudio onTexto={t => setRascunho(prev => (prev.trim() ? `${prev.trim()} ${t}` : t))} />
                            <button
                                type="button"
                                onClick={marcarSemResposta}
                                title="Ela sai da lista, não entra na mensagem e eu paro de lembrar dela"
                                className="px-2 py-1 rounded-lg border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300 text-[9px] font-bold cursor-pointer"
                            >
                                Esta não precisa de resposta
                            </button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={salvarComentario}
                                disabled={!rascunho.trim()}
                                className="px-3 py-1 rounded-lg bg-petroleo text-white font-bold text-[9px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <Check size={10} /> {comentarios[selecionada.id] ? 'Atualizar comentário' : 'Salvar comentário'}
                            </button>
                            {comentadas.length === 0 && dispensadas.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={concluirSemMensagem}
                                    title="Nada é enviado à cliente; as fotos marcadas saem da lista"
                                    className="px-3 py-1 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-bold text-[9px] flex items-center gap-1 cursor-pointer"
                                >
                                    <Check size={10} /> Concluir (nada é enviado)
                                </button>
                            ) : (
                            <button
                                type="button"
                                onClick={preparar}
                                disabled={comentadas.length === 0}
                                title={comentadas.length === 0 ? 'Comente pelo menos uma foto' : 'A IARA junta seus comentários numa mensagem e pergunta se pode mandar'}
                                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                <Bot size={10} /> Responder à IARA ({comentadas.length} {comentadas.length === 1 ? 'foto comentada' : 'fotos comentadas'})
                            </button>
                            )}
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
