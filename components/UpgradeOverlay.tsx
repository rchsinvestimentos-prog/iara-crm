'use client'

import Link from 'next/link'
import { Lock, Crown, ArrowRight } from 'lucide-react'

interface UpgradeOverlayProps {
    planoAtual: number
    planoMinimo: number
    nomeFeature: string
    descricao?: string
    children: React.ReactNode
    /** 'section' = bloqueia seção inteira com blur, 'inline' = overlay compacto */
    variante?: 'section' | 'inline'
}

const PLANO_NOMES: Record<number, string> = {
    1: 'Essencial',
    2: 'Pro',
    3: 'Premium',
}

const PLANO_CORES: Record<number, string> = {
    2: '#8B5CF6',
    3: '#D99773',
}

export default function UpgradeOverlay({
    planoAtual,
    planoMinimo,
    nomeFeature,
    descricao,
    children,
    variante = 'section',
}: UpgradeOverlayProps) {
    // Se já tem o plano, renderiza normal
    if (planoAtual >= planoMinimo) {
        return <>{children}</>
    }

    const nomePlano = PLANO_NOMES[planoMinimo] || 'Pro'
    const corPlano = PLANO_CORES[planoMinimo] || '#8B5CF6'

    if (variante === 'inline') {
        return (
            <div style={{ position: 'relative' }}>
                <div style={{ opacity: 0.4, pointerEvents: 'none', filter: 'grayscale(0.3)' }}>
                    {children}
                </div>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10,
                    }}
                >
                    <Link
                        href="/plano"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 16px',
                            borderRadius: 10,
                            background: `linear-gradient(135deg, ${corPlano}, ${corPlano}dd)`,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                            boxShadow: `0 4px 15px ${corPlano}40`,
                            transition: 'transform 0.2s',
                        }}
                    >
                        <Lock size={12} />
                        Plano {nomePlano}
                        <ArrowRight size={12} />
                    </Link>
                </div>
            </div>
        )
    }

    // variante = 'section'
    return (
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
            {/* Conteúdo com blur — visível mas intocável */}
            <div
                style={{
                    filter: 'blur(3px)',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                {children}
            </div>

            {/* Overlay glassmorphism */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20,
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    borderRadius: 18,
                    padding: 24,
                    textAlign: 'center',
                }}
            >
                {/* Ícone */}
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: `linear-gradient(135deg, ${corPlano}20, ${corPlano}10)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 14,
                    }}
                >
                    <Crown size={24} style={{ color: corPlano }} />
                </div>

                {/* Texto */}
                <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                    {nomeFeature}
                </h4>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', maxWidth: 280, lineHeight: 1.5 }}>
                    {descricao || `Disponível no plano ${nomePlano}. Faça upgrade para desbloquear!`}
                </p>

                {/* Badge do plano atual */}
                <p style={{ margin: '0 0 12px', fontSize: 11, color: '#94a3b8' }}>
                    Seu plano: <span style={{ fontWeight: 600, color: '#0F4C61' }}>{PLANO_NOMES[planoAtual] || 'Essencial'}</span>
                </p>

                {/* CTA */}
                <Link
                    href="/plano"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 28px',
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${corPlano}, ${corPlano}cc)`,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: `0 6px 20px ${corPlano}35`,
                        transition: 'all 0.2s',
                    }}
                >
                    <Crown size={16} />
                    Fazer Upgrade para {nomePlano}
                    <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    )
}
