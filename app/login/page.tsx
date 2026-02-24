'use client'

import { useState } from 'react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        // TODO: integrar com NextAuth
        setTimeout(() => {
            window.location.href = '/dashboard'
        }, 1000)
    }

    return (
        <div className="min-h-screen bg-glacial flex items-center justify-center p-4">
            {/* Decorative blobs */}
            <div className="fixed top-0 right-0 w-96 h-96 bg-terracota/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="fixed bottom-0 left-0 w-96 h-96 bg-petroleo/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="glass-card p-10 w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-terracota mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-white text-2xl font-bold font-serif">I</span>
                    </div>
                    <h1 className="title-serif text-2xl">Bem-vinda à IARA</h1>
                    <p className="text-acinzentado text-sm mt-2">
                        Acesse o painel da sua clínica
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">
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
                        <label className="text-sm font-medium text-petroleo mb-1.5 block">
                            Senha
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input-field"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-xs text-acinzentado mt-8">
                    Precisa de ajuda?{' '}
                    <a href="#" className="text-terracota font-semibold hover:underline">
                        Fale com o suporte
                    </a>
                </p>
            </div>
        </div>
    )
}
