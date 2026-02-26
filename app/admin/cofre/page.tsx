'use client'

import { useState, useEffect } from 'react'
import {
    Brain, Shield, Swords, Target, Send, Plus, Trash2,
    Save, Loader2, CheckCircle, AlertCircle, MessageSquare
} from 'lucide-react'

interface Cofre {
    id: number
    leis_imutaveis: string
    conhecimento_especialista: string
    arsenal_de_objecoes: string
    roteiro_vendas: string
    atualizado_em: string
}

interface Feedback {
    id: number
    feedback: string
    categoria: string
    ativo: boolean
    criado_em: string
}

const categorias = ['comportamento', 'tom', 'vendas', 'agendamento', 'outro']

export default function CofrePage() {
    const [cofre, setCofre] = useState<Cofre | null>(null)
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [novoFeedback, setNovoFeedback] = useState('')
    const [novaCategoria, setNovaCategoria] = useState('comportamento')
    const [activeTab, setActiveTab] = useState<'cofre' | 'feedbacks'>('cofre')

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            const res = await fetch('/api/admin/cofre')
            if (res.ok) {
                const data = await res.json()
                setCofre(data.cofre)
                setFeedbacks(data.feedbacks.filter((f: Feedback) => f.ativo))
            }
        } catch (err) {
            console.error('Erro ao carregar:', err)
        } finally {
            setLoading(false)
        }
    }

    async function salvarCofre() {
        if (!cofre) return
        setSaving(true)
        try {
            const res = await fetch('/api/admin/cofre', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cofre),
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (err) {
            console.error('Erro ao salvar:', err)
        } finally {
            setSaving(false)
        }
    }

    async function adicionarFeedback() {
        if (!novoFeedback.trim()) return
        try {
            const res = await fetch('/api/admin/cofre', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback: novoFeedback, categoria: novaCategoria }),
            })
            if (res.ok) {
                setNovoFeedback('')
                fetchData()
            }
        } catch (err) {
            console.error('Erro:', err)
        }
    }

    async function removerFeedback(id: number) {
        try {
            await fetch(`/api/admin/cofre?id=${id}`, { method: 'DELETE' })
            fetchData()
        } catch (err) {
            console.error('Erro:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#D99773]" />
            </div>
        )
    }

    const sections = [
        { key: 'leis_imutaveis', label: '⚖️ Leis Imutáveis', icon: Shield, desc: 'Regras fundamentais de comportamento da IARA' },
        { key: 'conhecimento_especialista', label: '🧠 Conhecimento Especialista', icon: Brain, desc: 'Expertise técnica em estética e procedimentos' },
        { key: 'arsenal_de_objecoes', label: '🗡️ Arsenal de Objeções', icon: Swords, desc: 'Argumentos para contornar objeções de venda' },
        { key: 'roteiro_vendas', label: '🎯 Roteiro de Vendas (Método ELLA)', icon: Target, desc: 'Os 8 passos do método de conversão' },
    ]

    const catColors: Record<string, string> = {
        comportamento: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        tom: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        vendas: 'bg-green-500/10 text-green-400 border-green-500/20',
        agendamento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        outro: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                        <Brain size={24} className="text-[#D99773]" />
                        Cofre da IARA
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Personalidade central + feedbacks que valem para TODAS as clínicas
                    </p>
                </div>
                {activeTab === 'cofre' && (
                    <button
                        onClick={salvarCofre}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                        style={{
                            background: saved ? '#06D6A0' : 'linear-gradient(135deg, #D99773, #C07A55)',
                            color: 'white',
                        }}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
                        {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Cofre'}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab('cofre')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'cofre' ? 'bg-[#D99773]/20 text-[#D99773]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    🧠 Prompt-Mestre
                </button>
                <button
                    onClick={() => setActiveTab('feedbacks')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'feedbacks' ? 'bg-[#D99773]/20 text-[#D99773]' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    📝 Feedbacks
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#D99773]/15 text-[#D99773] font-bold">
                        {feedbacks.length}
                    </span>
                </button>
            </div>

            {/* COFRE Tab */}
            {activeTab === 'cofre' && cofre && (
                <div className="space-y-4">
                    {sections.map((s) => (
                        <div key={s.key} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5">
                                <s.icon size={16} className="text-[#D99773]" />
                                <div>
                                    <h3 className="text-[13px] font-semibold text-white">{s.label}</h3>
                                    <p className="text-[11px] text-gray-500">{s.desc}</p>
                                </div>
                            </div>
                            <textarea
                                value={(cofre as unknown as Record<string, string>)[s.key] || ''}
                                onChange={(e) => setCofre({ ...cofre, [s.key]: e.target.value })}
                                className="w-full bg-transparent text-[13px] text-gray-300 leading-relaxed p-5 outline-none resize-y min-h-[120px] font-mono"
                                placeholder={`Conteúdo de ${s.label}...`}
                            />
                        </div>
                    ))}

                    {cofre.atualizado_em && (
                        <p className="text-[11px] text-gray-500 text-right">
                            Última atualização: {new Date(cofre.atualizado_em).toLocaleString('pt-BR')}
                        </p>
                    )}
                </div>
            )}

            {/* FEEDBACKS Tab */}
            {activeTab === 'feedbacks' && (
                <div className="space-y-4">
                    {/* Info box */}
                    <div className="flex items-start gap-3 bg-[#D99773]/5 border border-[#D99773]/15 rounded-xl p-4">
                        <AlertCircle size={18} className="text-[#D99773] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[13px] text-[#D99773] font-medium">Como funciona</p>
                            <p className="text-[12px] text-gray-400 mt-1">
                                Cada feedback aqui é adicionado ao prompt da IARA e vale para <strong className="text-white">TODAS</strong> as clínicas.
                                Ex: &ldquo;Não se apresente novamente se a conversa já começou&rdquo; — isso muda o comportamento da IARA em todos os atendimentos.
                            </p>
                        </div>
                    </div>

                    {/* Add new feedback */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Plus size={14} className="text-[#D99773]" />
                            <h3 className="text-[13px] font-semibold text-white">Novo Feedback</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <textarea
                                value={novoFeedback}
                                onChange={(e) => setNovoFeedback(e.target.value)}
                                placeholder="Ex: Quando a cliente disser que vai pensar, não insista mais de 2 vezes..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white placeholder-gray-500 outline-none resize-none min-h-[60px]"
                            />
                            <div className="flex sm:flex-col gap-2">
                                <select
                                    value={novaCategoria}
                                    onChange={(e) => setNovaCategoria(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-gray-300 outline-none"
                                >
                                    {categorias.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={adicionarFeedback}
                                    disabled={!novoFeedback.trim()}
                                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                                    style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)', color: 'white' }}
                                >
                                    <Send size={14} />
                                    Enviar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Feedbacks list */}
                    <div className="space-y-2">
                        {feedbacks.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageSquare size={32} className="mx-auto mb-3 text-gray-700" />
                                <p className="text-sm text-gray-500">Nenhum feedback ativo</p>
                                <p className="text-xs text-gray-600 mt-1">Adicione instruções acima para melhorar a IARA</p>
                            </div>
                        ) : (
                            feedbacks.map(f => (
                                <div key={f.id} className="group bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${catColors[f.categoria] || catColors.outro}`}>
                                                    {f.categoria}
                                                </span>
                                                <span className="text-[10px] text-gray-600">
                                                    {new Date(f.criado_em).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-gray-300 leading-relaxed">{f.feedback}</p>
                                        </div>
                                        <button
                                            onClick={() => removerFeedback(f.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400"
                                            title="Remover feedback"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
