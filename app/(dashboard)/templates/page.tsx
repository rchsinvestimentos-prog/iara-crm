'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send, Plus, Trash2, Edit3, X, Check, Search, Users, MessageSquare } from 'lucide-react'

interface Template {
    id: string
    titulo: string
    mensagem: string
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [contatos, setContatos] = useState<any[]>([])
    const [showEnviar, setShowEnviar] = useState<Template | null>(null)
    const [showAdd, setShowAdd] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [titulo, setTitulo] = useState('')
    const [mensagem, setMensagem] = useState('')
    const [selecionados, setSelecionados] = useState<string[]>([])
    const [enviando, setEnviando] = useState(false)
    const [resultado, setResultado] = useState<string | null>(null)
    const [busca, setBusca] = useState('')

    useEffect(() => {
        Promise.all([
            fetch('/api/features').then(r => r.json()),
            fetch('/api/contatos').then(r => r.json()),
        ]).then(([featData, conData]) => {
            const feats = featData.features || []
            const tplFeat = feats.find((f: any) => f.id === 'templates_whatsapp')
            const tpls = (tplFeat?.config?.templates || [])
                .filter((t: string) => t.trim())
                .map((t: string, i: number) => ({ id: `t${i}`, titulo: t.split('\n')[0].slice(0, 40), mensagem: t }))
            setTemplates(tpls)
            setContatos(conData.contatos || [])
        }).catch(console.error).finally(() => setLoading(false))
    }, [])

    const salvarTemplates = async (newTemplates: Template[]) => {
        setTemplates(newTemplates)
        try {
            const res = await fetch('/api/features')
            const data = await res.json()
            const features = data.features || []
            const updated = features.map((f: any) =>
                f.id === 'templates_whatsapp'
                    ? { ...f, config: { ...f.config, templates: newTemplates.map(t => t.mensagem) } }
                    : f
            )
            if (!features.find((f: any) => f.id === 'templates_whatsapp')) {
                updated.push({ id: 'templates_whatsapp', habilitado: true, config: { templates: newTemplates.map(t => t.mensagem) } })
            }
            await fetch('/api/features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ features: updated }),
            })
        } catch { /* */ }
    }

    const addTemplate = () => {
        if (!mensagem.trim()) return
        const t: Template = { id: `t${Date.now()}`, titulo: titulo || mensagem.slice(0, 40), mensagem }
        salvarTemplates([...templates, t])
        setShowAdd(false)
        setTitulo('')
        setMensagem('')
    }

    const deleteTemplate = (id: string) => {
        salvarTemplates(templates.filter(t => t.id !== id))
    }

    const editTemplate = (t: Template) => {
        setEditId(t.id)
        setTitulo(t.titulo)
        setMensagem(t.mensagem)
    }

    const saveEdit = () => {
        salvarTemplates(templates.map(t => t.id === editId ? { ...t, titulo, mensagem } : t))
        setEditId(null)
        setTitulo('')
        setMensagem('')
    }

    const enviar = async () => {
        if (!showEnviar || selecionados.length === 0) return
        setEnviando(true)
        try {
            const res = await fetch('/api/templates/enviar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem: showEnviar.mensagem, contatos: selecionados }),
            })
            const data = await res.json()
            setResultado(`✅ ${data.enviados || 0} enviado(s), ${data.erros || 0} erro(s)`)
            setTimeout(() => { setResultado(null); setShowEnviar(null); setSelecionados([]) }, 3000)
        } catch { setResultado('❌ Erro ao enviar') }
        finally { setEnviando(false) }
    }

    const filteredContatos = contatos.filter(c =>
        !busca || c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.telefone?.includes(busca)
    )

    const selectAll = () => {
        if (selecionados.length === filteredContatos.length) setSelecionados([])
        else setSelecionados(filteredContatos.map(c => c.telefone))
    }

    const cardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }
    const inputClass = 'w-full px-3 py-2 text-[12px] rounded-xl focus:outline-none'
    const inputStyle = { backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }

    if (loading) {
        return <div className="flex items-center justify-center h-96"><Loader2 size={24} className="animate-spin text-[#D99773]" /></div>
    }

    return (
        <div className="max-w-3xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Templates 📝</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Mensagens pré-prontas para enviar com 1 clique</p>
                </div>
                <button onClick={() => { setShowAdd(true); setTitulo(''); setMensagem('') }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">
                    <Plus size={14} /> Novo Template
                </button>
            </div>

            {/* Templates list */}
            <div className="space-y-3">
                {templates.length === 0 ? (
                    <div className="rounded-xl p-8 text-center" style={cardStyle}>
                        <p className="text-3xl mb-2">📝</p>
                        <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>Nenhum template criado</p>
                        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Crie mensagens pré-prontas para enviar rapidamente</p>
                    </div>
                ) : templates.map(t => (
                    <div key={t.id} className="rounded-xl p-4 group" style={cardStyle}>
                        {editId === t.id ? (
                            <div className="space-y-2">
                                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título" className={inputClass} style={inputStyle} />
                                <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={3} className={`${inputClass} resize-none`} style={inputStyle} />
                                <div className="flex gap-2">
                                    <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[#06D6A0] text-white"><Check size={12} className="inline mr-1" />Salvar</button>
                                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between mb-2">
                                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.titulo}</p>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => editTemplate(t)} className="p-1" title="Editar"><Edit3 size={12} style={{ color: 'var(--text-muted)' }} /></button>
                                        <button onClick={() => deleteTemplate(t.id)} className="p-1" title="Excluir"><Trash2 size={12} className="text-red-400" /></button>
                                    </div>
                                </div>
                                <p className="text-[11px] whitespace-pre-wrap mb-3" style={{ color: 'var(--text-muted)' }}>{t.mensagem.length > 150 ? t.mensagem.slice(0, 150) + '...' : t.mensagem}</p>
                                <button onClick={() => { setShowEnviar(t); setSelecionados([]); setBusca('') }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all">
                                    <Send size={12} /> Enviar para contatos
                                </button>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Template Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4">
                            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Novo Template</h3>
                            <button onClick={() => setShowAdd(false)}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
                        </div>
                        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título (opcional)" className={`${inputClass} mb-3`} style={inputStyle} />
                        <textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={5} placeholder="Escreva a mensagem..." className={`${inputClass} resize-none mb-4`} style={inputStyle} />
                        <button onClick={addTemplate} disabled={!mensagem.trim()}
                            className="w-full py-2.5 rounded-xl text-[13px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all disabled:opacity-50">
                            Criar Template
                        </button>
                    </div>
                </div>
            )}

            {/* Send Modal */}
            {showEnviar && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEnviar(null)}>
                    <div className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4">
                            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Enviar: {showEnviar.titulo}</h3>
                            <button onClick={() => setShowEnviar(null)}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
                        </div>

                        <div className="rounded-xl p-3 mb-4 text-[11px] whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                            {showEnviar.mensagem}
                        </div>

                        {resultado ? (
                            <div className="text-center py-4">
                                <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{resultado}</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="relative flex-1">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar contato..."
                                            className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg" style={inputStyle} />
                                    </div>
                                    <button onClick={selectAll} className="px-2 py-1.5 rounded-lg text-[10px] font-medium" style={{ ...inputStyle }}>
                                        {selecionados.length === filteredContatos.length ? 'Desmarcar' : 'Selecionar'} todos
                                    </button>
                                </div>

                                <div className="space-y-1 max-h-[250px] overflow-y-auto mb-4">
                                    {filteredContatos.map(c => (
                                        <label key={c.id || c.telefone} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:opacity-80" style={{ backgroundColor: selecionados.includes(c.telefone) ? 'rgba(217,151,115,0.08)' : 'transparent' }}>
                                            <input type="checkbox" checked={selecionados.includes(c.telefone)}
                                                onChange={() => setSelecionados(prev => prev.includes(c.telefone) ? prev.filter(t => t !== c.telefone) : [...prev, c.telefone])}
                                                className="rounded accent-[#D99773]" />
                                            <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.nome}</span>
                                            <span className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>{c.telefone}</span>
                                        </label>
                                    ))}
                                </div>

                                <button onClick={enviar} disabled={enviando || selecionados.length === 0}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold bg-[#D99773] text-white hover:bg-[#C4875F] transition-all disabled:opacity-50">
                                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Enviar para {selecionados.length} contato(s)</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
