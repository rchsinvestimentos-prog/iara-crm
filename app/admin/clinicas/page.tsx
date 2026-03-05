'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Building2, Search, Plus, Loader2, X, Eye, Copy, Check, Mail, MoreHorizontal, KeyRound, Ban, Settings, Trash2, LogIn } from 'lucide-react'

interface Clinica {
    id: number
    nome_clinica: string
    email: string
    nomeIA: string
    nivel: number
    status: string
    whatsapp_clinica: string
    whatsapp_status: string
    creditos_restantes: number
    creditos_total: number
    pct_credito: number
    proxima_renovacao: string | null
    criado_em: string
}

const planoNomes: Record<number, string> = { 1: 'Essencial', 2: 'Premium' }
const planoCores: Record<number, string> = { 1: '#06D6A0', 2: '#D99773' }
const statusCor: Record<string, string> = {
    ativo: 'bg-green-500/15 text-green-400',
    inativo: 'bg-red-500/15 text-red-400',
    trial: 'bg-blue-500/15 text-blue-400',
}

export default function AdminClinicas() {
    const { data: session } = useSession()
    const [clinicas, setClinicas] = useState<Clinica[]>([])
    const [loading, setLoading] = useState(true)
    const [busca, setBusca] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [resultado, setResultado] = useState<{ senha: string; email: string; emailStatus?: string; whatsappStatus?: string } | null>(null)
    const [copiado, setCopiado] = useState(false)

    const isSuperAdmin = (session?.user as any)?.adminRole === 'super_admin'
    const canCreate = isSuperAdmin || (session?.user as any)?.adminRole === 'desenvolvimento'

    const [form, setForm] = useState({
        nome: '',
        email: '',
        telefone: '',
        nivel: 1,
        duracao: '30',
        creditos: 1000,
        enviarEmail: true,
    })

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        try {
            const r = await fetch('/api/admin/clinicas')
            const data = await r.json()
            setClinicas(data.clinicas || [])
        } catch { }
        setLoading(false)
    }

    async function criarClinica() {
        if (!form.nome || !form.email) {
            setMsg('Nome e email são obrigatórios')
            return
        }
        setSaving(true)
        setMsg('')
        try {
            const r = await fetch('/api/admin/clinicas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await r.json()
            if (!r.ok) { setMsg(data.error || 'Erro'); setSaving(false); return }
            setResultado({ senha: data.clinica.senha_gerada, email: form.email, emailStatus: data.emailStatus, whatsappStatus: data.whatsappStatus })
            load()
        } catch { setMsg('Erro de rede') }
        setSaving(false)
    }

    function fecharModal() {
        setShowModal(false)
        setResultado(null)
        setForm({ nome: '', email: '', telefone: '', nivel: 1, duracao: '30', creditos: 1000, enviarEmail: true })
        setMsg('')
    }

    function copiarSenha(senha: string) {
        navigator.clipboard.writeText(senha)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
    }

    const [menuAberto, setMenuAberto] = useState<number | null>(null)

    // Fechar menu ao clicar fora (simples)
    useEffect(() => {
        const handleClick = () => setMenuAberto(null)
        window.addEventListener('click', handleClick)
        return () => window.removeEventListener('click', handleClick)
    }, [])

    async function executarAcao(id: number, acao: string) {
        if (acao === 'bloquear' && !confirm('Deseja realmente alterar o status (Bloquear/Desbloquear) desta clínica?')) return
        if (acao === 'reenviar' && !confirm('Deseja gerar uma NOVA SENHA e reenviar por email+whatsapp para o cliente?')) return
        if (acao === 'excluir' && !confirm('⚠️ ATENÇÃO: Isso vai EXCLUIR permanentemente a clínica, todos os dados e a instância na Evolution API. Tem certeza?')) return

        try {
            const r = await fetch(`/api/admin/clinicas/${id}/acao`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acao })
            })
            const data = await r.json()
            if (r.ok) {
                // Se for impersonação, abre nova aba com token
                if (acao === 'impersonar' && data.impersonateToken) {
                    window.open(`https://app.iara.click/login?impersonateToken=${data.impersonateToken}`, '_blank')
                    return
                }
                alert(data.message || 'Ação executada com sucesso!')
                load()
            } else {
                alert(data.error || 'Erro ao executar ação')
            }
        } catch (e) {
            alert('Erro de comunicação com o servidor')
        }
    }

    const filtradas = clinicas.filter(c =>
        c.nome_clinica?.toLowerCase().includes(busca.toLowerCase()) ||
        c.email?.toLowerCase().includes(busca.toLowerCase())
    )

    return (
        <div className="max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary, #fff)' }}>
                        🏥 Clínicas
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted, #6B7280)' }}>
                        {clinicas.length} clínicas cadastradas
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                        <input
                            value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                            className="text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none" style={{ backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.04))', border: '1px solid var(--border-default, rgba(255,255,255,0.06))', color: 'var(--text-primary, #fff)', width: 200 }}
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)', color: '#fff' }}
                        >
                            <Plus size={16} /> Nova Clínica
                        </button>
                    )}
                </div>
            </div>

            {/* Tabela */}
            <div className="backdrop-blur-xl rounded-2xl overflow-visible" style={{ backgroundColor: 'var(--bg-card, #111827)', border: '1px solid var(--border-default, rgba(255,255,255,0.06))' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-[#D99773]" />
                    </div>
                ) : filtradas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Building2 size={40} className="mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {busca ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica cadastrada'}
                        </p>
                        {canCreate && !busca && (
                            <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-[#D99773] hover:underline">
                                Criar primeira clínica →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-visible">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))' }}>
                                    {['Clínica', 'Plano', 'Status', 'Créditos', 'WhatsApp', 'Expira em', 'Desde', ''].map((h, i) => (
                                        <th key={i} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtradas.map(c => (
                                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))' }}>
                                        <td className="px-5 py-3.5">
                                            <p className="font-medium text-sm" style={{ color: 'var(--text-primary, #fff)' }}>{c.nome_clinica || '—'}</p>
                                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.email}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${planoCores[c.nivel] || '#999'}15`, color: planoCores[c.nivel] || '#999' }}>
                                                {planoNomes[c.nivel] || `P${c.nivel}`}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCor[c.status] || 'bg-gray-500/15 text-gray-400'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                                    <div className="h-full rounded-full" style={{ width: `${c.pct_credito}%`, backgroundColor: c.pct_credito <= 20 ? '#EF4444' : c.pct_credito > 50 ? '#06D6A0' : '#F59E0B' }} />
                                                </div>
                                                <span className="text-[11px]" style={{ color: c.pct_credito <= 20 ? '#EF4444' : 'var(--text-muted)' }}>{c.pct_credito}%</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-[11px] ${c.whatsapp_status === 'conectado' ? 'text-green-400' : 'text-gray-500'}`}>
                                                {c.whatsapp_status === 'conectado' ? '✅ Conectado' : '⚪ Não conectado'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {c.proxima_renovacao ? new Date(c.proxima_renovacao).toLocaleDateString('pt-BR') : '∞'}
                                        </td>
                                        <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-3 py-3.5 text-right relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setMenuAberto(menuAberto === c.id ? null : c.id); }}
                                                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                <MoreHorizontal size={16} className="text-gray-400" />
                                            </button>
                                            {menuAberto === c.id && (
                                                <div
                                                    className="absolute right-8 top-8 w-48 bg-[#1F2937] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button onClick={() => { setMenuAberto(null); executarAcao(c.id, 'impersonar') }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"><LogIn size={14} className="text-green-400" /> Acessar Painel</button>
                                                    <button onClick={() => { setMenuAberto(null); executarAcao(c.id, 'reenviar') }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"><KeyRound size={14} className="text-[#D99773]" /> Reenviar Acesso</button>
                                                    <button onClick={() => { setMenuAberto(null); executarAcao(c.id, 'bloquear') }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"><Ban size={14} className="text-yellow-400" /> Bloquear/Desbloquear</button>
                                                    <button onClick={() => { setMenuAberto(null); executarAcao(c.id, 'testes') }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 text-gray-300 flex items-center gap-2 transition-colors"><Settings size={14} className="text-blue-400" /> Rodar Testes API</button>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    <button onClick={() => { setMenuAberto(null); executarAcao(c.id, 'excluir') }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition-colors"><Trash2 size={14} /> Excluir Clínica</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Criar Clínica */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={fecharModal}>
                    <div className="rounded-2xl p-6 w-full max-w-md space-y-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>

                        {resultado ? (
                            /* Sucesso — mostrar senha */
                            <div className="text-center space-y-4">
                                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                                    <Check size={28} className="text-green-400" />
                                </div>
                                <h2 className="text-lg font-bold text-white">Clínica criada! 🎉</h2>
                                <div className="text-xs text-left space-y-1 p-3 rounded-lg bg-white/5">
                                    <p className="text-gray-400">📧 Email: <span className="text-white">{resultado.emailStatus || 'não verificado'}</span></p>
                                    <p className="text-gray-400">💬 WhatsApp: <span className="text-white">{resultado.whatsappStatus || 'não verificado'}</span></p>
                                </div>

                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left space-y-2">
                                    <p className="text-xs text-gray-500">Senha gerada:</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-lg font-mono font-bold text-white tracking-wider">{resultado.senha}</code>
                                        <button onClick={() => copiarSenha(resultado.senha)} className="text-gray-500 hover:text-gray-300 transition-colors">
                                            {copiado ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <button onClick={fecharModal}
                                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-700 transition-all">
                                    Fechar
                                </button>
                            </div>
                        ) : (
                            /* Formulário */
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Building2 size={18} className="text-[#D99773]" /> Nova Clínica
                                    </h2>
                                    <button onClick={fecharModal} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Nome da Dra / Clínica *</label>
                                        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Dra. Ana Silva"
                                            className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D99773]/50" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Email *</label>
                                        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="dra.ana@clinica.com"
                                            className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D99773]/50" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Telefone</label>
                                        <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999"
                                            className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D99773]/50" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Plano</label>
                                            <select value={form.nivel} onChange={e => {
                                                const n = Number(e.target.value)
                                                setForm({ ...form, nivel: n, creditos: n === 2 ? 3000 : 1000 })
                                            }}
                                                className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none">
                                                <option value={1} style={{ backgroundColor: '#111827' }}>Essencial</option>
                                                <option value={2} style={{ backgroundColor: '#111827' }}>Premium</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Duração</label>
                                            <select value={form.duracao} onChange={e => setForm({ ...form, duracao: e.target.value })}
                                                className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none">
                                                <option value="7" style={{ backgroundColor: '#111827' }}>7 dias</option>
                                                <option value="15" style={{ backgroundColor: '#111827' }}>15 dias</option>
                                                <option value="30" style={{ backgroundColor: '#111827' }}>30 dias</option>
                                                <option value="90" style={{ backgroundColor: '#111827' }}>90 dias</option>
                                                <option value="ilimitado" style={{ backgroundColor: '#111827' }}>Ilimitado</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Créditos iniciais</label>
                                        <input type="number" value={form.creditos} onChange={e => setForm({ ...form, creditos: Number(e.target.value) })}
                                            className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D99773]/50" />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.enviarEmail} onChange={e => setForm({ ...form, enviarEmail: e.target.checked })}
                                            className="rounded accent-[#D99773]" />
                                        <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={12} /> Enviar email de boas-vindas</span>
                                    </label>
                                </div>

                                {msg && <p className="text-xs text-red-400">{msg}</p>}

                                <button onClick={criarClinica} disabled={saving}
                                    className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)' }}>
                                    {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Criar Clínica'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
