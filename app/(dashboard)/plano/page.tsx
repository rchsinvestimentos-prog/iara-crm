'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles, Zap, Crown, Star, ExternalLink, Loader2 } from 'lucide-react'

// Links reais dos produtos na Hotmart — substituir quando tiver o CNPJ aprovado
const HOTMART_LINKS: Record<string, string> = {
    'Secretária': '#', // ex: https://pay.hotmart.com/XXXXXXXXX
    'Estrategista': '#',
    'Designer': '#',
    'Audiovisual': '#',
}

// Preços corretos conforme Bíblia IARA
const planos = [
    {
        nome: 'Secretária',
        preco: 97,
        nivel: 1,
        icon: Sparkles,
        cor: '#D99773',
        popular: false,
        creditos: 500,
        features: [
            'Atendimento WhatsApp 24/7',
            'Agendamento automático',
            'Follow-up de pacientes',
            'Até 500 mensagens/mês',
            'Dashboard de métricas',
        ],
    },
    {
        nome: 'Estrategista',
        preco: 197,
        nivel: 2,
        icon: Zap,
        cor: '#8B5CF6',
        popular: true,
        creditos: 2000,
        features: [
            'Tudo do Secretária +',
            'IA Sonnet (respostas premium)',
            'Roteiro de Reels automático',
            'Análise de marketing',
            'Até 2.000 mensagens/mês',
            'Voz OpenAI TTS',
        ],
    },
    {
        nome: 'Designer',
        preco: 297,
        nivel: 3,
        icon: Star,
        cor: '#06D6A0',
        popular: false,
        creditos: 5000,
        features: [
            'Tudo do Estrategista +',
            'Avatar IA personalizado',
            'Criação de posts',
            'Identidade de marca',
            'Até 5.000 mensagens/mês',
            'Voz ElevenLabs premium',
        ],
    },
    {
        nome: 'Audiovisual',
        preco: 497,
        nivel: 4,
        icon: Crown,
        cor: '#F59E0B',
        popular: false,
        creditos: -1,
        features: [
            'Tudo do Designer +',
            'Vídeo com avatar IA',
            'Voz clonada exclusiva',
            'Editor de vídeo',
            'Mensagens ilimitadas',
            'Gerente de sucesso',
        ],
    },
]

interface StatsData {
    creditosRestantes: number
    plano: number
    nomeClinica: string
    nomeIA: string
}

export default function PlanoPage() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const planoAtual = stats?.plano ?? 1
    const creditosUsados = planoAtual === 4 ? 0 : (stats ? (planos[planoAtual - 1]?.creditos ?? 500) - (stats.creditosRestantes ?? 0) : 0)
    const creditosTotal = planos[planoAtual - 1]?.creditos ?? 500
    const percentUsado = creditosTotal > 0 ? Math.min(100, Math.max(0, (creditosUsados / creditosTotal) * 100)) : 0

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center animate-fade-in">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Planos & Créditos
                </h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    Escolha o plano ideal para sua clínica crescer com a {stats?.nomeIA || 'IARA'}
                </p>
            </div>

            {/* Uso atual — dinâmico */}
            <div className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-[#D99773]" />
                        <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando dados...</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                Plano atual: <span className="font-bold" style={{ color: planos[planoAtual - 1]?.cor }}>{planos[planoAtual - 1]?.nome}</span>
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {planoAtual === 4
                                    ? 'Mensagens ilimitadas 🎉'
                                    : `${stats?.creditosRestantes ?? 0} créditos restantes`
                                }
                            </p>
                        </div>
                        {planoAtual < 4 && (
                            <div className="w-56">
                                <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                                    <span>{creditosUsados} usados</span>
                                    <span>{creditosTotal} total</span>
                                </div>
                                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${percentUsado}%`,
                                            background: percentUsado > 80
                                                ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                                                : percentUsado > 50
                                                    ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                                                    : `linear-gradient(90deg, ${planos[planoAtual - 1]?.cor}, ${planos[planoAtual - 1]?.cor}CC)`,
                                        }}
                                    />
                                </div>
                                {percentUsado > 80 && (
                                    <p className="text-[10px] text-red-500 mt-1">⚠️ Créditos acabando! Considere fazer upgrade.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Grid de planos */}
            <div className="grid grid-cols-4 gap-4">
                {planos.map((plano, i) => {
                    const isAtual = plano.nivel === planoAtual
                    const hotmartLink = HOTMART_LINKS[plano.nome]
                    const isDowngrade = plano.nivel < planoAtual

                    return (
                        <div
                            key={plano.nome}
                            className="group relative backdrop-blur-xl rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 overflow-hidden animate-fade-in"
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                backgroundColor: 'var(--bg-card)',
                                border: isAtual ? `2px solid ${plano.cor}` : plano.popular ? `1px solid ${plano.cor}40` : '1px solid var(--border-default)',
                            }}
                        >
                            {/* Glow line hover */}
                            <div
                                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `linear-gradient(90deg, transparent, ${plano.cor}, transparent)` }}
                            />

                            {/* Current badge */}
                            {isAtual && (
                                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${plano.cor}20`, color: plano.cor }}>
                                    Seu plano ✓
                                </div>
                            )}

                            {/* Popular badge */}
                            {plano.popular && !isAtual && (
                                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${plano.cor}15`, color: plano.cor }}>
                                    Recomendado
                                </div>
                            )}

                            {/* Icon */}
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${plano.cor}15` }}>
                                <plano.icon size={20} style={{ color: plano.cor }} />
                            </div>

                            {/* Name + Price */}
                            <h3 className="text-[15px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{plano.nome}</h3>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-2xl font-bold" style={{ color: plano.cor }}>R${plano.preco}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/mês</span>
                            </div>

                            {/* Credits */}
                            <p className="text-[11px] mb-4 px-2 py-1 rounded-md inline-block" style={{ backgroundColor: `${plano.cor}10`, color: plano.cor }}>
                                {plano.creditos === -1 ? '∞ Ilimitado' : `${plano.creditos.toLocaleString()} msgs/mês`}
                            </p>

                            {/* Features */}
                            <ul className="space-y-2 mb-6">
                                {plano.features.map((f, j) => (
                                    <li key={j} className="flex items-start gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                                        <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: plano.cor }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            {isAtual ? (
                                <button
                                    className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all"
                                    style={{ borderColor: plano.cor, color: plano.cor }}
                                    disabled
                                >
                                    Plano atual ✓
                                </button>
                            ) : isDowngrade ? (
                                <button
                                    className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all opacity-50"
                                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}
                                    disabled
                                >
                                    Plano inferior
                                </button>
                            ) : (
                                <a
                                    href={hotmartLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                                    style={{
                                        background: `linear-gradient(135deg, ${plano.cor}, ${plano.cor}CC)`,
                                        boxShadow: `0 4px 20px ${plano.cor}30`,
                                    }}
                                >
                                    {planoAtual > 0 ? 'Fazer upgrade' : 'Assinar'} <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Info Hotmart */}
            <div className="rounded-xl p-4 text-center animate-fade-in" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    🔒 Pagamento processado pela <strong style={{ color: 'var(--text-secondary)' }}>Hotmart</strong> com segurança •
                    Pix, boleto e cartão de crédito • 7 dias de garantia •{' '}
                    <a href="#" className="text-[#D99773] hover:text-[#E8B89A] transition-colors">Fale conosco</a>
                </p>
            </div>
        </div>
    )
}
