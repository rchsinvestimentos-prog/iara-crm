'use client'

import { Check, Sparkles, Zap, Crown, Star } from 'lucide-react'

const planos = [
    {
        nome: 'Secretária',
        preco: 197,
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
        preco: 397,
        icon: Zap,
        cor: '#8B5CF6',
        popular: true,
        creditos: 2000,
        features: [
            'Tudo do Secretária +',
            'Roteiro de Reels automático',
            'Análise de marketing',
            'Estratégia Instagram',
            'Até 2.000 mensagens/mês',
            'Relatórios semanais',
        ],
    },
    {
        nome: 'Designer',
        preco: 597,
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
            'Suporte prioritário',
        ],
    },
    {
        nome: 'Audiovisual',
        preco: 997,
        icon: Crown,
        cor: '#F59E0B',
        popular: false,
        creditos: -1,
        features: [
            'Tudo do Designer +',
            'Vídeo com avatar',
            'Voz clonada IA',
            'Editor de vídeo',
            'Mensagens ilimitadas',
            'Gerente de sucesso',
        ],
    },
]

export default function PlanoPage() {
    const planoAtual = 1

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center animate-fade-in">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Planos & Créditos
                </h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    Escolha o plano ideal para sua clínica crescer com a IARA
                </p>
            </div>

            {/* Uso atual */}
            <div className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Plano atual: <span className="text-[#D99773] font-bold">Secretária</span>
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>68 de 500 créditos utilizados este mês</p>
                    </div>
                    <div className="w-48">
                        <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                            <span>68 usados</span>
                            <span>500 total</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            <div className="h-full rounded-full bg-gradient-to-r from-[#D99773] to-[#C07A55] transition-all" style={{ width: '13.6%' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid de planos */}
            <div className="grid grid-cols-4 gap-4">
                {planos.map((plano, i) => {
                    const isAtual = (i + 1) === planoAtual
                    return (
                        <div
                            key={plano.nome}
                            className="group relative backdrop-blur-xl rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 overflow-hidden animate-fade-in"
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                backgroundColor: 'var(--bg-card)',
                                border: plano.popular ? `1px solid ${plano.cor}40` : '1px solid var(--border-default)',
                            }}
                        >
                            {/* Glow line */}
                            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${plano.cor}, transparent)` }} />

                            {/* Popular badge */}
                            {plano.popular && (
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
                                <button className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }} disabled>
                                    Plano atual
                                </button>
                            ) : (
                                <button
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                                    style={{
                                        background: `linear-gradient(135deg, ${plano.cor}, ${plano.cor}CC)`,
                                        boxShadow: `0 4px 20px ${plano.cor}30`,
                                    }}
                                >
                                    {i + 1 > planoAtual ? 'Fazer upgrade' : 'Mudar plano'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* FAQ rápido */}
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Todos os planos incluem 7 dias de teste grátis • Cancele quando quiser •{' '}
                    <a href="#" className="text-[#D99773] hover:text-[#E8B89A] transition-colors">Fale conosco</a>
                </p>
            </div>
        </div>
    )
}
