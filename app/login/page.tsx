'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Sparkles, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'

const ADMIN_HOSTS = ['adm.iara.click', 'admin.iara.click']
function isAdminDomain() {
    if (typeof window === 'undefined') return false
    return ADMIN_HOSTS.some(h => window.location.hostname === h)
}

function LoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [resetMode, setResetMode] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [resetSent, setResetSent] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const searchParams = useSearchParams()

    // Auto-login por token (impersonação ou magic link de reset)
    useEffect(() => {
        const impersonateToken = searchParams.get('impersonateToken')
        const magicToken = searchParams.get('magicToken')
        const token = impersonateToken || magicToken
        if (!token) return

        setLoading(true)
        // Primeiro faz logout da sessão atual, depois loga com o token
        signOut({ redirect: false }).then(() => {
            signIn('credentials', {
                impersonateToken: token,
                redirect: false,
            }).then((result) => {
                if (result?.ok) {
                    // Magic link → pede nova senha após login
                    const dest = isAdminDomain() ? '/admin' : '/dashboard'
                    window.location.href = magicToken
                        ? `${dest}?trocarSenha=1`
                        : dest
                } else {
                    setError('Link inválido ou expirado. Solicite um novo.')
                    setLoading(false)
                }
            })
        })
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('E-mail ou senha incorretos')
                setLoading(false)
                return
            }

            // Login bem-sucedido — redirecionar
            window.location.href = isAdminDomain() ? '/admin' : '/dashboard'
        } catch {
            setError('Erro ao conectar. Tente novamente.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Noise overlay */}
            <div className="noise-overlay" />

            {/* Animated gradient orbs */}
            <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#D99773]/8 rounded-full blur-[160px] animate-float" />
            <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#0F4C61]/12 rounded-full blur-[140px] animate-float" style={{ animationDelay: '-2s' }} />
            <div className="fixed top-[40%] left-[30%] w-[300px] h-[300px] bg-[#8B5CF6]/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-4s' }} />

            {/* Grid pattern */}
            <div className="fixed inset-0 opacity-[0.015]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
            }} />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-2xl mx-auto mb-5 overflow-hidden shadow-2xl shadow-[#D99773]/20 border border-white/10">
                            <img src="/iara-avatar.png" alt="IARA" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[#0B0F19] shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                        Bem-vinda à <span className="font-serif font-bold" style={{ background: 'linear-gradient(135deg, #D99773, #E8B89A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>IARA</span>
                    </h1>
                    <p className="text-sm text-gray-400">
                        Acesse o painel da sua clínica
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 shadow-2xl shadow-black/20">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="input-field"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">
                                Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="text-right mt-1">
                                <button
                                    type="button"
                                    onClick={() => { setResetMode(true); setResetEmail(email); setResetSent(false) }}
                                    className="text-xs text-gray-500 hover:text-[#D99773] transition-colors"
                                >
                                    Esqueci minha senha
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                                <AlertCircle size={16} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgba(217,151,115,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Reset Password Modal */}
                {resetMode && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setResetMode(false)}>
                        <div className="w-full max-w-sm bg-[#111827] border border-white/[0.06] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                            {resetSent ? (
                                <div className="text-center">
                                    <p className="text-3xl mb-3">📧</p>
                                    <h3 className="text-lg font-bold text-white mb-2">Email enviado!</h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Se o email estiver cadastrado, você receberá uma nova senha em instantes.
                                    </p>
                                    <button
                                        onClick={() => { setResetMode(false); setResetSent(false) }}
                                        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white"
                                    >
                                        Voltar ao login
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold text-white mb-1">Esqueceu a senha? 🔑</h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Digite seu email e enviaremos uma nova senha.
                                    </p>
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={e => setResetEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="input-field mb-4"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!resetEmail.trim()) return
                                            setResetLoading(true)
                                            try {
                                                await fetch('/api/auth/reset-password', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ email: resetEmail }),
                                                })
                                                setResetSent(true)
                                            } catch { /* */ }
                                            finally { setResetLoading(false) }
                                        }}
                                        disabled={resetLoading || !resetEmail.trim()}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white disabled:opacity-50"
                                    >
                                        {resetLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : 'Enviar nova senha'}
                                    </button>
                                    <button
                                        onClick={() => setResetMode(false)}
                                        className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        Voltar ao login
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    Precisa de ajuda?{' '}
                    <a href="#" className="text-[#D99773] font-medium hover:text-[#E8B89A] transition-colors">
                        Fale com o suporte
                    </a>
                </p>
                <p className="text-center text-[10px] text-gray-700 mt-3">
                    <a href="/privacidade" className="hover:text-gray-500 transition-colors">Política de Privacidade</a>
                    {' · '}
                    <a href="/termos" className="hover:text-gray-500 transition-colors">Termos de Serviço</a>
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#D99773] border-t-transparent rounded-full animate-spin" /></div>}>
            <LoginContent />
        </Suspense>
    )
}
