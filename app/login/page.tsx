'use client'

import { useState } from 'react'
import { Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            window.location.href = '/dashboard'
        }, 1000)
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
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] mx-auto mb-5 flex items-center justify-center shadow-2xl shadow-[#D99773]/20">
                            <Sparkles size={28} className="text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-[#0B0F19] shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                        Bem-vinda à <span className="title-serif">IARA</span>
                    </h1>
                    <p className="text-sm text-gray-500">
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
                        </div>

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

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[11px] text-gray-600 uppercase tracking-wider">ou</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>

                    {/* Demo access */}
                    <button
                        onClick={() => {
                            setEmail('demo@iara.click')
                            setPassword('iara123')
                        }}
                        className="w-full py-3 rounded-xl border border-white/[0.06] text-gray-400 text-sm font-medium hover:bg-white/[0.03] hover:text-gray-300 hover:border-white/[0.1] transition-all duration-300"
                    >
                        Acessar conta demo
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    Precisa de ajuda?{' '}
                    <a href="#" className="text-[#D99773] font-medium hover:text-[#E8B89A] transition-colors">
                        Fale com o suporte
                    </a>
                </p>
            </div>
        </div>
    )
}
