'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Users, Plus, Shield, Eye, EyeOff, Loader2, X, Check } from 'lucide-react'

interface AdminUser {
    id: number
    nome: string
    email: string
    role: string
    ativo: boolean
    createdAt: string
}

const ROLE_OPTIONS = [
    { value: 'super_admin', label: 'Super Admin', color: '#D99773' },
    { value: 'financeiro', label: 'Financeiro', color: '#06D6A0' },
    { value: 'suporte', label: 'Suporte', color: '#8B5CF6' },
    { value: 'desenvolvimento', label: 'Desenvolvimento', color: '#3B82F6' },
    { value: 'visualizador', label: 'Visualizador', color: '#6B7280' },
]

export default function EquipePage() {
    const { data: session } = useSession()
    const [usuarios, setUsuarios] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [showSenha, setShowSenha] = useState(false)
    const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'visualizador' })

    const isSuperAdmin = (session?.user as any)?.adminRole === 'super_admin'

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        try {
            const r = await fetch('/api/admin/usuarios')
            const data = await r.json()
            setUsuarios(data.usuarios || [])
        } catch { }
        setLoading(false)
    }

    async function criar() {
        if (!form.nome || !form.email || !form.senha) {
            setMsg('Preencha todos os campos')
            return
        }
        setSaving(true)
        setMsg('')
        try {
            const r = await fetch('/api/admin/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await r.json()
            if (!r.ok) { setMsg(data.error || 'Erro'); setSaving(false); return }
            setShowModal(false)
            setForm({ nome: '', email: '', senha: '', role: 'visualizador' })
            load()
        } catch { setMsg('Erro de rede') }
        setSaving(false)
    }

    async function toggleAtivo(id: number, ativo: boolean) {
        await fetch(`/api/admin/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: !ativo }),
        })
        load()
    }

    const roleInfo = (role: string) => ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[4]

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary, #fff)' }}>
                        👥 Equipe
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted, #6B7280)' }}>
                        Gerencie os membros da sua equipe e suas permissões
                    </p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', color: '#fff' }}
                    >
                        <Plus size={16} /> Novo Membro
                    </button>
                )}
            </div>

            {/* Tabela */}
            <div className="backdrop-blur-xl rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card, #111827)', border: '1px solid var(--border-default, rgba(255,255,255,0.06))' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-violet-400" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))' }}>
                                {['Membro', 'Role', 'Status', 'Desde', isSuperAdmin ? 'Ações' : ''].filter(Boolean).map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => {
                                const ri = roleInfo(u.role)
                                return (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))' }}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: `${ri.color}20`, color: ri.color }}>
                                                    {u.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium" style={{ color: 'var(--text-primary, #fff)' }}>{u.nome}</p>
                                                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${ri.color}15`, color: ri.color }}>
                                                {ri.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                                {u.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => toggleAtivo(u.id, u.ativo)}
                                                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                                                    style={{ backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.04))', color: 'var(--text-muted)' }}
                                                >
                                                    {u.ativo ? 'Desativar' : 'Ativar'}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Criar */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                    <div className="rounded-2xl p-6 w-full max-w-md space-y-5" style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Shield size={18} className="text-violet-400" /> Novo Membro</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Maria — Suporte"
                                    className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="maria@iara.click"
                                    className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Senha</label>
                                <div className="relative">
                                    <input type={showSenha ? 'text' : 'password'} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder="Mínimo 8 caracteres"
                                        className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50 pr-10" />
                                    <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                                        {showSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Role</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                                    className="w-full text-sm px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-violet-500/50">
                                    {ROLE_OPTIONS.map(r => (
                                        <option key={r.value} value={r.value} style={{ backgroundColor: '#111827' }}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {msg && <p className="text-xs text-red-400">{msg}</p>}

                        <button onClick={criar} disabled={saving}
                            className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Criar Membro'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
