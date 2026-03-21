'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import {
    User, Mail, Phone, Stethoscope, Clock, Key, FileText,
    Save, AlertTriangle, CheckCircle2, Loader2, Shield
} from 'lucide-react'

interface ProfissionalData {
    id: string
    nome: string
    email: string
    whatsapp: string
    tratamento: string | null
    bio: string | null
    especialidade: string | null
    diferenciais: string | null
    fotoUrl: string | null
    horarioSemana: string | null
    almocoSemana: string | null
    atendeSabado: boolean
    horarioSabado: string | null
    atendeDomingo: boolean
    horarioDomingo: string | null
    intervaloAtendimento: number | null
    termosAceitos: string | null
    disclaimerPosAceito: boolean
    disclaimerPosAceitoEm: string | null
    temSenha: boolean
    nomeClinica: string
    plano: number
}

export default function MeuPerfilPage() {
    const { data: session } = useSession()
    const searchParams = useSearchParams()
    const trocarSenha = searchParams?.get('trocarSenha') === '1'

    const [prof, setProf] = useState<ProfissionalData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')
    const [msgType, setMsgType] = useState<'success' | 'error'>('success')

    // Senha
    const [novaSenha, setNovaSenha] = useState('')
    const [confirmarSenha, setConfirmarSenha] = useState('')

    // Termos
    const [showTermos, setShowTermos] = useState(false)
    const [aceitandoTermos, setAceitandoTermos] = useState(false)

    // Disclaimer
    const [showDisclaimer, setShowDisclaimer] = useState(false)
    const [disclaimerNome, setDisclaimerNome] = useState('')
    const [disclaimerReg, setDisclaimerReg] = useState('')
    const [aceitandoDisclaimer, setAceitandoDisclaimer] = useState(false)

    // Edição
    const [editData, setEditData] = useState<Record<string, any>>({})

    useEffect(() => {
        fetch('/api/profissional/me')
            .then(r => r.json())
            .then(data => {
                if (data.id) {
                    setProf(data)
                    setEditData({
                        nome: data.nome || '',
                        bio: data.bio || '',
                        whatsapp: data.whatsapp || '',
                        tratamento: data.tratamento || '',
                        especialidade: data.especialidade || '',
                        diferenciais: data.diferenciais || '',
                        horarioSemana: data.horarioSemana || '',
                        almocoSemana: data.almocoSemana || '',
                        atendeSabado: data.atendeSabado || false,
                        horarioSabado: data.horarioSabado || '',
                        atendeDomingo: data.atendeDomingo || false,
                        horarioDomingo: data.horarioDomingo || '',
                        intervaloAtendimento: data.intervaloAtendimento || 30,
                    })

                    // Se veio de magic link sem senha, forçar trocar
                    if (!data.temSenha || trocarSenha) setShowTermos(true)
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [trocarSenha])

    const flash = (message: string, type: 'success' | 'error' = 'success') => {
        setMsg(message)
        setMsgType(type)
        setTimeout(() => setMsg(''), 4000)
    }

    const handleSalvarSenha = async () => {
        if (novaSenha.length < 6) return flash('Senha deve ter pelo menos 6 caracteres', 'error')
        if (novaSenha !== confirmarSenha) return flash('Senhas não conferem', 'error')
        setSaving(true)
        try {
            const res = await fetch('/api/profissional/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novaSenha }),
            })
            if (res.ok) {
                flash('✅ Senha criada com sucesso!')
                setNovaSenha('')
                setConfirmarSenha('')
                setProf(p => p ? { ...p, temSenha: true } : p)
            } else flash('Erro ao salvar senha', 'error')
        } catch { flash('Erro ao salvar', 'error') }
        setSaving(false)
    }

    const handleAceitarTermos = async () => {
        setAceitandoTermos(true)
        try {
            const res = await fetch('/api/profissional/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aceitarTermos: true }),
            })
            if (res.ok) {
                flash('✅ Termos aceitos!')
                setProf(p => p ? { ...p, termosAceitos: new Date().toISOString() } : p)
                setShowTermos(false)
            }
        } catch { }
        setAceitandoTermos(false)
    }

    const handleAceitarDisclaimer = async () => {
        if (!disclaimerNome.trim()) return flash('Nome completo é obrigatório', 'error')
        setAceitandoDisclaimer(true)
        try {
            const res = await fetch('/api/profissional/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    aceitarDisclaimer: true,
                    nomeCompleto: disclaimerNome,
                    registroProfissional: disclaimerReg,
                }),
            })
            if (res.ok) {
                flash('✅ Disclaimer aceito!')
                setProf(p => p ? { ...p, disclaimerPosAceito: true, disclaimerPosAceitoEm: new Date().toISOString() } : p)
                setShowDisclaimer(false)
            }
        } catch { }
        setAceitandoDisclaimer(false)
    }

    const handleSalvarPerfil = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/profissional/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            })
            if (res.ok) flash('✅ Perfil atualizado!')
            else flash('Erro ao salvar', 'error')
        } catch { flash('Erro ao salvar', 'error') }
        setSaving(false)
    }

    if (loading) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-[#D99773]" />
        </div>
    )

    if (!prof) return (
        <div className="flex items-center justify-center h-screen text-gray-400">
            Profissional não encontrado
        </div>
    )

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#C07A55] flex items-center justify-center shadow-lg shadow-[#D99773]/20">
                    <User className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
                    <p className="text-sm text-gray-400">{prof.nomeClinica}</p>
                </div>
            </div>

            {/* Toast */}
            {msg && (
                <div className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-2 ${msgType === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {msgType === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {msg}
                </div>
            )}

            {/* ─── 1. Senha (força no primeiro login) ─── */}
            {(showTermos || !prof.temSenha) && (
                <div className="rounded-2xl border border-[#D99773]/20 bg-[#D99773]/5 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-[#D99773]" />
                        <h2 className="text-lg font-semibold text-white">
                            {prof.temSenha ? 'Alterar Senha' : '🔑 Crie sua Senha'}
                        </h2>
                    </div>
                    {!prof.temSenha && (
                        <p className="text-sm text-gray-400">Bem-vinda! Crie uma senha para acessar seu painel.</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="password"
                            placeholder="Nova senha (min. 6 caracteres)"
                            value={novaSenha}
                            onChange={e => setNovaSenha(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                        <input
                            type="password"
                            placeholder="Confirmar senha"
                            value={confirmarSenha}
                            onChange={e => setConfirmarSenha(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>

                    <button
                        onClick={handleSalvarSenha}
                        disabled={saving || novaSenha.length < 6}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white font-medium text-sm disabled:opacity-40 hover:scale-[1.02] transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                        Salvar Senha
                    </button>

                    {/* Aceitar termos */}
                    {!prof.termosAceitos && (
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-[#D99773] mt-0.5" />
                                <div className="text-sm text-gray-300 space-y-2">
                                    <p className="font-medium text-white">Termos de Uso</p>
                                    <p>Ao utilizar o painel, você concorda com os nossos termos de uso e política de privacidade.
                                        Seus dados são protegidos e utilizados exclusivamente para operação do sistema da clínica.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAceitarTermos}
                                disabled={aceitandoTermos}
                                className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-medium text-sm hover:bg-white/15 transition-all"
                            >
                                {aceitandoTermos ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                                ✅ Li e aceito os termos
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── 2. Disclaimer Pós-Procedimento ─── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-[#D99773]" />
                        <h2 className="text-lg font-semibold text-white">Pós-Procedimento</h2>
                    </div>
                    {prof.disclaimerPosAceito ? (
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-green-500/10 text-green-400">
                            ✅ Aceito em {new Date(prof.disclaimerPosAceitoEm!).toLocaleDateString('pt-BR')}
                        </span>
                    ) : (
                        <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-400">
                            ⚠️ Pendente
                        </span>
                    )}
                </div>

                <p className="text-sm text-gray-400">
                    Para cadastrar orientações de pós-procedimento, é necessário aceitar o disclaimer de responsabilidade técnica.
                    Isso garante que as orientações fornecidas pela IARA aos seus pacientes são de sua responsabilidade.
                </p>

                {!prof.disclaimerPosAceito && !showDisclaimer && (
                    <button
                        onClick={() => setShowDisclaimer(true)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-medium text-sm hover:scale-[1.02] transition-all"
                    >
                        📋 Aceitar Disclaimer
                    </button>
                )}

                {showDisclaimer && (
                    <div className="border border-amber-500/20 rounded-xl bg-amber-500/5 p-5 space-y-4">
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300 space-y-2">
                            <p className="font-semibold text-red-400">⚠️ ATENÇÃO — Responsabilidade Técnica</p>
                            <p>Ao aceitar este disclaimer, eu declaro que:</p>
                            <ul className="list-disc list-inside space-y-1 text-red-300/80">
                                <li>Sou responsável técnica pelas orientações de pós-procedimento cadastradas</li>
                                <li>As orientações são baseadas em evidências científicas e boas práticas clínicas</li>
                                <li>A IARA reproduzirá fielmente as orientações cadastradas, sem alterá-las</li>
                                <li>Compreendo que orientações inadequadas podem gerar riscos jurídicos e à saúde</li>
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder="Nome completo"
                                value={disclaimerNome}
                                onChange={e => setDisclaimerNome(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-amber-500/40 focus:outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Registro profissional (CRM, CREFITO...)"
                                value={disclaimerReg}
                                onChange={e => setDisclaimerReg(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-amber-500/40 focus:outline-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleAceitarDisclaimer}
                                disabled={aceitandoDisclaimer || !disclaimerNome.trim()}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white font-medium text-sm disabled:opacity-40 hover:scale-[1.02] transition-all"
                            >
                                {aceitandoDisclaimer ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                                Aceitar e Assinar
                            </button>
                            <button
                                onClick={() => setShowDisclaimer(false)}
                                className="px-6 py-2.5 rounded-xl bg-white/5 text-gray-400 font-medium text-sm hover:bg-white/10 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── 3. Dados do Perfil ─── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <Stethoscope className="w-5 h-5 text-[#D99773]" />
                    <h2 className="text-lg font-semibold text-white">Informações Pessoais</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Nome</label>
                        <input
                            type="text"
                            value={editData.nome || ''}
                            onChange={e => setEditData(d => ({ ...d, nome: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Tratamento</label>
                        <input
                            type="text"
                            placeholder="Dra., Dr., Fisio..."
                            value={editData.tratamento || ''}
                            onChange={e => setEditData(d => ({ ...d, tratamento: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Mail size={12} /> Email</label>
                        <input
                            type="email"
                            value={prof.email}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-white/3 border border-white/5 text-gray-500 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Phone size={12} /> WhatsApp</label>
                        <input
                            type="text"
                            value={editData.whatsapp || ''}
                            onChange={e => setEditData(d => ({ ...d, whatsapp: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">Especialidade</label>
                        <input
                            type="text"
                            value={editData.especialidade || ''}
                            onChange={e => setEditData(d => ({ ...d, especialidade: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-gray-400 mb-1 block">Bio</label>
                        <textarea
                            rows={3}
                            value={editData.bio || ''}
                            onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* ─── 4. Horários ─── */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-[#D99773]" />
                    <h2 className="text-lg font-semibold text-white">Horários</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Horário Semana</label>
                        <input
                            type="text"
                            placeholder="08:00 - 18:00"
                            value={editData.horarioSemana || ''}
                            onChange={e => setEditData(d => ({ ...d, horarioSemana: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Almoço Semana</label>
                        <input
                            type="text"
                            placeholder="12:00 - 13:00"
                            value={editData.almocoSemana || ''}
                            onChange={e => setEditData(d => ({ ...d, almocoSemana: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Intervalo Atendimento (min)</label>
                        <input
                            type="number"
                            value={editData.intervaloAtendimento || 30}
                            onChange={e => setEditData(d => ({ ...d, intervaloAtendimento: Number(e.target.value) }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#D99773]/40 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Salvar */}
            <div className="flex justify-end">
                <button
                    onClick={handleSalvarPerfil}
                    disabled={saving}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white font-semibold text-sm shadow-lg shadow-[#D99773]/20 hover:scale-[1.02] transition-all disabled:opacity-40 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                    Salvar Perfil
                </button>
            </div>
        </div>
    )
}
