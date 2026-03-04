'use client'

import { useEffect, useState } from 'react'
import { Check, Sparkles, Star, ExternalLink, Loader2, Smartphone, Plus } from 'lucide-react'

const HOTMART_LINKS: Record<string, string> = {
    'Essencial': '#',
    'Premium': '#',
}

const planos = [
    {
        nome: 'Essencial',
        nivel: 1,
        icon: Sparkles,
        cor: '#D99773',
        popular: false,
        creditos: 500,
        precos: { USD: 47, EUR: 47, BRL: 97 },
        features: [
            'Atendimento WhatsApp 24/7',
            '1 WhatsApp conectado',
            'Agendamento automático (Google Calendar)',
            'Follow-up de pacientes',
            'Voz OpenAI TTS',
            'Relatório semanal',
            'Dashboard de métricas',
        ],
    },
    {
        nome: 'Premium',
        nivel: 2,
        icon: Star,
        cor: '#8B5CF6',
        popular: true,
        creditos: 2000,
        precos: { USD: 87, EUR: 87, BRL: 197 },
        features: [
            'Tudo do Essencial +',
            '📷 Instagram conectado',
            'IA Sonnet (respostas premium)',
            'Voz clonada (ElevenLabs)',
            '4 idiomas (PT-BR, PT-PT, EN, ES)',
            'Fotos IA + Antes/Depois',
            'Roteiros + Marketing',
            'Posts e Carrosséis',
            'Até 2.000 mensagens/mês',
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
    const [moeda, setMoeda] = useState<'USD' | 'EUR' | 'BRL'>('USD')
    const [simbolo, setSimbolo] = useState('$')
    const [comprando, setComprando] = useState(false)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false))

        // Detect currency from clinic country
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                const pais = data?.pais || 'US'
                if (pais === 'BR') { setMoeda('BRL'); setSimbolo('R$') }
                else if (['PT', 'ES'].includes(pais)) { setMoeda('EUR'); setSimbolo('€') }
                else { setMoeda('USD'); setSimbolo('$') }
            })
            .catch(() => { })
    }, [])

    const planoAtual = Math.min(2, stats?.plano ?? 1)
    const creditosTotal = planos[planoAtual - 1]?.creditos ?? 500
    const creditosUsados = stats ? creditosTotal - (stats.creditosRestantes ?? 0) : 0
    const percentUsado = creditosTotal > 0 ? Math.min(100, Math.max(0, (creditosUsados / creditosTotal) * 100)) : 0

    const precoInstanciaExtra = Math.ceil(planos[planoAtual - 1]?.precos[moeda] / 2)

    const handleComprarInstancia = async () => {
        setComprando(true)
        try {
            const res = await fetch('/api/instancias/comprar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moeda }),
            })
            const data = await res.json()
            if (data?.checkoutUrl) {
                window.open(data.checkoutUrl, '_blank')
            } else {
                alert('Link de pagamento em breve. Entre em contato com o suporte.')
            }
        } catch {
            alert('Erro ao processar. Tente novamente.')
        } finally {
            setComprando(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center animate-fade-in">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Planos & Créditos
                </h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    Escolha o plano ideal para sua clínica crescer com a {stats?.nomeIA || 'IARA'}
                </p>
            </div>

            {/* Uso atual */}
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
                                {stats?.creditosRestantes ?? 0} créditos restantes
                            </p>
                        </div>
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
                                            : `linear-gradient(90deg, ${planos[planoAtual - 1]?.cor}, ${planos[planoAtual - 1]?.cor}CC)`,
                                    }}
                                />
                            </div>
                            {percentUsado > 80 && (
                                <p className="text-[10px] text-red-500 mt-1">⚠️ Créditos acabando!</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Grid de planos — 2 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {planos.map((plano, i) => {
                    const isAtual = plano.nivel === planoAtual
                    const hotmartLink = HOTMART_LINKS[plano.nome]
                    const isDowngrade = plano.nivel < planoAtual
                    const preco = plano.precos[moeda]

                    return (
                        <div
                            key={plano.nome}
                            className="group relative backdrop-blur-xl rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1 overflow-hidden animate-fade-in"
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                backgroundColor: 'var(--bg-card)',
                                border: isAtual ? `2px solid ${plano.cor}` : plano.popular ? `2px solid ${plano.cor}60` : '1px solid var(--border-default)',
                            }}
                        >
                            {/* Glow */}
                            <div
                                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: `linear-gradient(90deg, transparent, ${plano.cor}, transparent)` }}
                            />

                            {isAtual && (
                                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${plano.cor}20`, color: plano.cor }}>
                                    Seu plano ✓
                                </div>
                            )}

                            {plano.popular && !isAtual && (
                                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${plano.cor}15`, color: plano.cor }}>
                                    Recomendado
                                </div>
                            )}

                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${plano.cor}15` }}>
                                <plano.icon size={22} style={{ color: plano.cor }} />
                            </div>

                            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{plano.nome}</h3>
                            <div className="flex items-baseline gap-1 mb-5">
                                <span className="text-3xl font-bold" style={{ color: plano.cor }}>{simbolo}{preco}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/mês</span>
                            </div>

                            <p className="text-[11px] mb-5 px-2 py-1 rounded-md inline-block" style={{ backgroundColor: `${plano.cor}10`, color: plano.cor }}>
                                {plano.creditos.toLocaleString()} msgs/mês
                            </p>

                            <ul className="space-y-2.5 mb-8">
                                {plano.features.map((f, j) => (
                                    <li key={j} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                                        <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plano.cor }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {isAtual ? (
                                <button className="w-full py-3 rounded-xl text-sm font-medium border transition-all" style={{ borderColor: plano.cor, color: plano.cor }} disabled>
                                    Plano atual ✓
                                </button>
                            ) : isDowngrade ? (
                                <button className="w-full py-3 rounded-xl text-sm font-medium border transition-all opacity-50" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }} disabled>
                                    Plano inferior
                                </button>
                            ) : (
                                <a
                                    href={hotmartLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                                    style={{
                                        background: `linear-gradient(135deg, ${plano.cor}, ${plano.cor}CC)`,
                                        boxShadow: `0 4px 20px ${plano.cor}30`,
                                    }}
                                >
                                    Fazer upgrade <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Instância Extra WhatsApp */}
            <div className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone size={22} className="text-green-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                            Instância Extra de WhatsApp
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Conecte mais um número de WhatsApp à sua IARA. Ideal para filiais ou números diferentes.
                        </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-green-500">{simbolo}{precoInstanciaExtra}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mês</span></p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Metade do seu plano</p>
                    </div>
                    <button
                        onClick={handleComprarInstancia}
                        disabled={comprando}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-all hover:-translate-y-0.5 flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                        style={{ boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
                    >
                        {comprando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Adicionar
                    </button>
                </div>
            </div>

            {/* Info */}
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
