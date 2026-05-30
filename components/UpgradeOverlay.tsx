'use client'

import Link from 'next/link'
import { Lock, Crown, ArrowRight, Check } from 'lucide-react'

interface UpgradeOverlayProps {
    planoAtual: number
    planoMinimo: number
    nomeFeature: string
    descricao?: string
    /** Lista de benefícios que a cliente ganha ao fazer upgrade */
    beneficios?: string[]
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

const PLANO_PRECOS: Record<number, string> = {
    2: 'R$ 197',
    3: 'R$ 297',
}

// Benefícios padrão por plano (usados se nenhum for passado)
const BENEFICIOS_PADRAO: Record<number, string[]> = {
    2: [
        '12 vozes ultra realistas (ElevenLabs)',
        'Até 3 profissionais na equipe',
        'Instagram DM com IA',
        'Atendimento em 4 idiomas',
        '3.000 mensagens/mês',
    ],
    3: [
        'Clone da sua própria voz',
        'Profissionais ilimitados',
        'Multi-clínica',
        '2 WhatsApps conectados',
        '5.000 mensagens/mês',
    ],
}

export default function UpgradeOverlay({
    planoAtual,
    planoMinimo,
    nomeFeature,
    descricao,
    beneficios,
    children,
    variante = 'section',
}: UpgradeOverlayProps) {
    // Se já tem o plano, renderiza normal
    if (planoAtual >= planoMinimo) {
        return <>{children}</>
    }

    const nomePlano = PLANO_NOMES[planoMinimo] || 'Pro'
    const corPlano = PLANO_CORES[planoMinimo] || '#8B5CF6'
    const precoPlano = PLANO_PRECOS[planoMinimo] || ''
    const listaBeneficios = beneficios || BENEFICIOS_PADRAO[planoMinimo] || []

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
                    background: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    borderRadius: 18,
                    padding: '28px 24px',
                    textAlign: 'center',
                }}
            >
                {/* Ícone */}
                <div
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${corPlano}20, ${corPlano}10)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                    }}
                >
                    <Crown size={22} style={{ color: corPlano }} />
                </div>

                {/* Título */}
                <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                    {nomeFeature}
                </h4>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b', maxWidth: 320, lineHeight: 1.5 }}>
                    {descricao || `Disponível no plano ${nomePlano}. Faça upgrade para desbloquear!`}
                </p>

                {/* Lista de benefícios */}
                {listaBeneficios.length > 0 && (
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.9)',
                            borderRadius: 14,
                            padding: '14px 18px',
                            marginBottom: 16,
                            border: `1px solid ${corPlano}20`,
                            textAlign: 'left',
                            maxWidth: 320,
                            width: '100%',
                        }}
                    >
                        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: corPlano, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ✨ O que você ganha no {nomePlano}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {listaBeneficios.map((b, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: 6,
                                            background: `${corPlano}15`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Check size={11} style={{ color: corPlano }} strokeWidth={3} />
                                    </div>
                                    <span style={{ fontSize: 12, color: '#334155', lineHeight: 1.3 }}>{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Badge do plano atual + preço */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        Seu plano: <span style={{ fontWeight: 600, color: '#0F4C61' }}>{PLANO_NOMES[planoAtual] || 'Essencial'}</span>
                    </span>
                    {precoPlano && (
                        <>
                            <span style={{ color: '#e2e8f0' }}>•</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                                {nomePlano}: <span style={{ fontWeight: 700, color: corPlano }}>{precoPlano}/mês</span>
                            </span>
                        </>
                    )}
                </div>

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
