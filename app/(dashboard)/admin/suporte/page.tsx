'use client'

import { useState, useEffect } from 'react'
import {
    Search, Activity, AlertTriangle, CheckCircle, XCircle,
    RefreshCw, ChevronDown, Zap, MessageCircle, Mic, Video,
    Phone, Database, Shield, Clock,
} from 'lucide-react'

type Clinica = {
    id: number; nome_clinica: string; status: string; plano: number;
    creditos: number; idioma: string; creditos_status: string
}

type Teste = {
    nome: string; status: 'ok' | 'erro' | 'aviso'; detalhe: string; solucao?: string
}

type Diagnostico = {
    code: string; problema: string; solucao: string; fluxo: string
}

export default function SuportePage() {
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [selected, setSelected] = useState<number | null>(null)
    const [detalhes, setDetalhes] = useState<any>(null)
    const [testes, setTestes] = useState<Teste[]>([])
    const [testando, setTestando] = useState(false)
    const [busca, setBusca] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/diagnostico')
            .then(r => r.json())
            .then(d => { setClinicas(d.clinicas || []); setLoading(false) })
    }, [])

    const selecionarClinica = async (id: number) => {
        setSelected(id)
        setTestes([])
        const r = await fetch(`/api/admin/diagnostico?clinicaId=${id}`)
        const d = await r.json()
        setDetalhes(d)
    }

    const rodarTestes = async () => {
        setTestando(true)
        const r = await fetch('/api/admin/diagnostico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinicaId: selected }),
        })
        const d = await r.json()
        setTestes(d.resultados || [])
        setTestando(false)
    }

    const filtered = clinicas.filter(c =>
        c.nome_clinica?.toLowerCase().includes(busca.toLowerCase())
    )

    const statusColor = (s: string) =>
        s === 'ok' ? '#22c55e' : s === 'erro' ? '#ef4444' : '#f59e0b'

    const statusIcon = (s: string) =>
        s === 'ok' ? <CheckCircle size={16} color="#22c55e" />
            : s === 'erro' ? <XCircle size={16} color="#ef4444" />
                : <AlertTriangle size={16} color="#f59e0b" />

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    🛠️ Central de Suporte
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Diagnóstico de clínicas, testes de conexão e solução de problemas
                </p>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Lista de Clínicas */}
                <div className="col-span-4 rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <Search size={16} style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar clínica..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="flex-1 bg-transparent text-sm outline-none"
                            style={{ color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Carregando...</p>
                        ) : filtered.map(c => (
                            <button
                                key={c.id}
                                onClick={() => selecionarClinica(c.id)}
                                className="w-full text-left px-3 py-2 rounded-xl transition-all text-sm flex items-center gap-2"
                                style={{
                                    backgroundColor: selected === c.id ? 'rgba(217,151,115,0.1)' : 'transparent',
                                    color: selected === c.id ? '#D99773' : 'var(--text-primary)',
                                }}
                            >
                                <span className={`w-2 h-2 rounded-full ${c.status === 'ativo' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="flex-1 truncate">{c.nome_clinica || `Clínica #${c.id}`}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                                    backgroundColor: c.creditos_status === 'zerado' ? '#fef2f2' : c.creditos_status === 'baixo' ? '#fffbeb' : '#f0fdf4',
                                    color: c.creditos_status === 'zerado' ? '#ef4444' : c.creditos_status === 'baixo' ? '#f59e0b' : '#22c55e',
                                }}>
                                    P{c.plano}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Painel de Detalhes */}
                <div className="col-span-8 space-y-4">
                    {!selected ? (
                        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                            <Activity size={48} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4 opacity-30" />
                            <p style={{ color: 'var(--text-muted)' }}>Selecione uma clínica para diagnosticar</p>
                        </div>
                    ) : (
                        <>
                            {/* Info da Clínica */}
                            {detalhes?.clinica && (
                                <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                    <div className="flex items-center justify-between mb-3">
                                        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            {detalhes.clinica.nome_clinica}
                                        </h2>
                                        <div className="flex gap-2">
                                            <span className="text-xs px-2 py-1 rounded-full" style={{
                                                backgroundColor: detalhes.clinica.status === 'ativo' ? '#dcfce7' : '#fef2f2',
                                                color: detalhes.clinica.status === 'ativo' ? '#16a34a' : '#ef4444',
                                            }}>
                                                {detalhes.clinica.status}
                                            </span>
                                            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(217,151,115,0.1)', color: '#D99773' }}>
                                                Plano {detalhes.clinica.plano}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[
                                            { label: 'Créditos', value: detalhes.clinica.creditos || 0, icon: Zap },
                                            { label: 'Idioma', value: detalhes.clinica.idioma || 'pt-BR', icon: MessageCircle },
                                            { label: 'Canal', value: detalhes.clinica.canal_principal || 'whatsapp', icon: Phone },
                                            { label: 'Procedimentos', value: detalhes.procedimentos?.length || 0, icon: Shield },
                                        ].map((item, i) => (
                                            <div key={i} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                                <item.icon size={14} className="mb-1" style={{ color: '#D99773' }} />
                                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Diagnóstico Automático */}
                            {detalhes?.diagnostico?.length > 0 && (
                                <div className="rounded-2xl p-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                                    <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                                        <AlertTriangle size={16} /> Problemas Detectados
                                    </h3>
                                    {detalhes.diagnostico.map((d: Diagnostico, i: number) => (
                                        <div key={i} className="bg-white rounded-xl p-3 mb-2">
                                            <p className="text-sm font-medium text-red-700">{d.problema}</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                <strong>Fluxo:</strong> {d.fluxo}
                                            </p>
                                            <p className="text-xs text-green-700 mt-1 bg-green-50 rounded-lg p-2">
                                                ✅ <strong>Solução:</strong> {d.solucao}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Botão de Teste */}
                            <button
                                onClick={rodarTestes}
                                disabled={testando}
                                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all"
                                style={{ backgroundColor: testando ? '#9ca3af' : '#D99773' }}
                            >
                                <RefreshCw size={16} className={testando ? 'animate-spin' : ''} />
                                {testando ? 'Testando conexões...' : '🔌 Rodar Teste Completo de Conexão'}
                            </button>

                            {/* Resultados dos Testes */}
                            {testes.length > 0 && (
                                <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <Activity size={16} /> Resultados
                                    </h3>
                                    {testes.map((t, i) => (
                                        <div key={i} className="rounded-xl p-3" style={{
                                            backgroundColor: t.status === 'ok' ? '#f0fdf4' : t.status === 'erro' ? '#fef2f2' : '#fffbeb',
                                            border: `1px solid ${t.status === 'ok' ? '#bbf7d0' : t.status === 'erro' ? '#fecaca' : '#fde68a'}`,
                                        }}>
                                            <div className="flex items-center gap-2">
                                                {statusIcon(t.status)}
                                                <span className="font-medium text-sm">{t.nome}</span>
                                                <span className="flex-1 text-right text-xs" style={{ color: statusColor(t.status) }}>
                                                    {t.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-xs mt-1 text-gray-600">{t.detalhe}</p>
                                            {t.solucao && (
                                                <p className="text-xs mt-2 bg-white/80 rounded-lg p-2 text-green-800">
                                                    ✅ <strong>Solução:</strong> {t.solucao}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Últimas Mensagens */}
                            {detalhes?.ultimasMsgs?.length > 0 && (
                                <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <Clock size={16} /> Últimas Mensagens ({detalhes.totalMsgs})
                                    </h3>
                                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                        {detalhes.ultimasMsgs.map((m: any, i: number) => (
                                            <div key={i} className="flex gap-2 text-xs py-1" style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {new Date(m.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                </span>
                                                <span className="px-1 rounded" style={{
                                                    backgroundColor: m.tipo === 'texto' ? '#dbeafe' : m.tipo === 'audio' ? '#fce7f3' : '#e5e7eb',
                                                    color: m.tipo === 'texto' ? '#2563eb' : m.tipo === 'audio' ? '#db2777' : '#6b7280',
                                                }}>
                                                    {m.tipo}
                                                </span>
                                                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {m.mensagem?.substring(0, 80) || '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ========== AÇÕES RÁPIDAS ========== */}
                            <AcoesRapidas clinicaId={selected} onRefresh={() => selecionarClinica(selected!)} />

                            {/* ========== CHAT IA SUPORTE ========== */}
                            <ChatSuporte clinicaId={selected} clinicaNome={detalhes?.clinica?.nome_clinica} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ==========================================
// AÇÕES RÁPIDAS (botões visuais)
// ==========================================
function AcoesRapidas({ clinicaId, onRefresh }: { clinicaId: number; onRefresh: () => void }) {
    const [executando, setExecutando] = useState<string | null>(null)
    const [resultado, setResultado] = useState<{ sucesso: boolean; mensagem: string } | null>(null)

    const executar = async (acao: string, parametros?: any) => {
        setExecutando(acao)
        setResultado(null)
        const r = await fetch('/api/admin/diagnostico/acoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ acao, clinicaId, parametros }),
        })
        const d = await r.json()
        setResultado(d)
        setExecutando(null)
        if (d.sucesso) setTimeout(onRefresh, 1000)
    }

    const ACOES = [
        { id: 'recarregar_creditos', emoji: '🔋', label: 'Recarregar Créditos', color: '#22c55e' },
        { id: 'reativar_clinica', emoji: '✅', label: 'Reativar', color: '#3b82f6' },
        { id: 'despausar_iara', emoji: '▶️', label: 'Despausar IARA', color: '#8b5cf6' },
        { id: 'enviar_teste', emoji: '📱', label: 'Enviar Teste', color: '#D99773' },
        { id: 'resetar_memoria', emoji: '🧹', label: 'Resetar Memória', color: '#f59e0b' },
    ]

    return (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Zap size={16} /> Ações Rápidas
            </h3>
            <div className="flex gap-2 flex-wrap">
                {ACOES.map(a => (
                    <button
                        key={a.id}
                        onClick={() => executar(a.id)}
                        disabled={executando !== null}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-white transition-all hover:opacity-80"
                        style={{ backgroundColor: executando === a.id ? '#9ca3af' : a.color }}
                    >
                        {executando === a.id ? '⏳' : a.emoji} {a.label}
                    </button>
                ))}
            </div>
            {resultado && (
                <div className={`mt-3 p-3 rounded-xl text-xs ${resultado.sucesso ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {resultado.sucesso ? '✅' : '❌'} {resultado.mensagem}
                </div>
            )}
        </div>
    )
}

// ==========================================
// CHAT IA DE SUPORTE
// ==========================================
type ChatMsg = { role: 'user' | 'assistant'; content: string; sqlResults?: any[] }

function ChatSuporte({ clinicaId, clinicaNome }: { clinicaId: number; clinicaNome?: string }) {
    const [msgs, setMsgs] = useState<ChatMsg[]>([])
    const [input, setInput] = useState('')
    const [enviando, setEnviando] = useState(false)

    const enviar = async () => {
        if (!input.trim() || enviando) return
        const userMsg: ChatMsg = { role: 'user', content: input }
        setMsgs(prev => [...prev, userMsg])
        setInput('')
        setEnviando(true)

        try {
            const r = await fetch('/api/admin/suporte-ia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensagem: input,
                    clinicaId,
                    historico: msgs.map(m => ({ role: m.role, content: m.content })),
                }),
            })
            const d = await r.json()
            if (d.erro) {
                setMsgs(prev => [...prev, { role: 'assistant', content: `❌ ${d.erro}` }])
            } else {
                const textoLimpo = d.resposta
                    .replace(/\[SQL_EXECUTE\][\s\S]*?\[\/SQL_EXECUTE\]/g, '')
                    .replace(/\[SQL_SUGGEST\]([\s\S]*?)\[\/SQL_SUGGEST\]/g, '```sql\n$1\n```')
                    .trim()
                setMsgs(prev => [...prev, {
                    role: 'assistant',
                    content: textoLimpo + (d.modelo ? `\n\n_via ${d.modelo}_` : ''),
                    sqlResults: d.sqlResults,
                }])
            }
        } catch (err: any) {
            setMsgs(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${err.message}` }])
        }
        setEnviando(false)
    }

    return (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(217,151,115,0.08)', borderBottom: '1px solid var(--border-default)' }}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center">
                    <span className="text-xs font-bold text-white">IA</span>
                </div>
                <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Técnico de Suporte IA</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {clinicaNome ? `Contexto: ${clinicaNome}` : 'Selecione uma clínica'} · Claude + execução automática
                    </p>
                </div>
            </div>

            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto min-h-[150px]">
                {msgs.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>💬 Pergunte qualquer coisa sobre a clínica</p>
                        <div className="flex gap-2 justify-center mt-3 flex-wrap">
                            {['Por que a IARA não responde?', 'Recarrega 200 créditos', 'Mostra as últimas mensagens', 'Muda pro plano 3'].map((s, i) => (
                                <button key={i} onClick={() => setInput(s)}
                                    className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                                    style={{ backgroundColor: 'rgba(217,151,115,0.1)', color: '#D99773' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {msgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                            style={{ backgroundColor: m.role === 'user' ? '#D99773' : 'var(--bg-subtle)', color: m.role === 'user' ? 'white' : 'var(--text-primary)' }}>
                            <div className="whitespace-pre-wrap">{m.content}</div>
                            {m.sqlResults?.map((sr, j) => (
                                <div key={j} className="mt-2 p-2 rounded-lg text-xs"
                                    style={{ backgroundColor: sr.executado ? '#dcfce7' : '#fef2f2', color: sr.executado ? '#166534' : '#991b1b' }}>
                                    <p className="font-mono text-[10px] mb-1 opacity-60">{sr.sql}</p>
                                    {sr.executado
                                        ? <p>✅ Executado — {Array.isArray(sr.resultado) ? `${sr.resultado.length} resultado(s)` : 'OK'}</p>
                                        : <p>❌ {sr.erro}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {enviando && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-4 py-3 flex gap-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && enviar()}
                    placeholder="Descreva o problema ou peça uma ação..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }} />
                <button onClick={enviar} disabled={enviando || !input.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ backgroundColor: enviando ? '#9ca3af' : '#D99773' }}>
                    {enviando ? '⏳' : '📤'} Enviar
                </button>
            </div>
        </div>
    )
}
