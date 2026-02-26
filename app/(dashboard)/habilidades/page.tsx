'use client'

import { useEffect, useState } from 'react'
import {
    MessageSquare,
    Mic,
    Calendar,
    UserCheck,
    BarChart3,
    Instagram,
    FileText,
    Camera,
    Paintbrush,
    Palette,
    Video,
    Wand2,
    Lock,
    Check,
    Loader2,
    ArrowUpRight,
    Sparkles,
} from 'lucide-react'
import Link from 'next/link'

interface Skill {
    nome: string
    descricao: string
    icon: React.ReactNode
    nivel: number
    slug?: string
}

const habilidades: { titulo: string; nivel: number; preco: string; cor: string; skills: Skill[] }[] = [
    {
        titulo: 'Secretária',
        nivel: 1,
        preco: 'R$ 97/mês',
        cor: '#06D6A0',
        skills: [
            { nome: 'Atendimento por Texto', descricao: 'Responde clientes via WhatsApp automaticamente', icon: <MessageSquare size={20} />, nivel: 1, slug: 'atendimento' },
            { nome: 'Atendimento por Áudio', descricao: 'Transcreve e responde áudios com IA', icon: <Mic size={20} />, nivel: 1, slug: 'audio' },
            { nome: 'Agendamento Automático', descricao: 'Agenda direto no Google Calendar', icon: <Calendar size={20} />, nivel: 1, slug: 'agendamento' },
            { nome: 'Follow-up', descricao: 'Lembrete 24h e 2h antes da consulta', icon: <UserCheck size={20} />, nivel: 1, slug: 'followup' },
        ],
    },
    {
        titulo: 'Estrategista',
        nivel: 2,
        preco: 'R$ 197/mês',
        cor: '#F59E0B',
        skills: [
            { nome: 'Roteiro de Reels', descricao: 'Gera roteiros criativos para Instagram', icon: <FileText size={20} />, nivel: 2, slug: 'roteiro' },
            { nome: 'Plano de Marketing', descricao: 'Estratégias personalizadas para sua clínica', icon: <BarChart3 size={20} />, nivel: 2, slug: 'marketing' },
            { nome: 'Análise do Instagram', descricao: 'Analisa perfil, engajamento e métricas', icon: <Instagram size={20} />, nivel: 2, slug: 'instagram' },
        ],
    },
    {
        titulo: 'Designer',
        nivel: 3,
        preco: 'R$ 297/mês',
        cor: '#D99773',
        skills: [
            { nome: 'Avatar Fotorrealista', descricao: 'Book profissional com fotos IA', icon: <Camera size={20} />, nivel: 3, slug: 'avatar' },
            { nome: 'Posts Carrossel', descricao: 'Monta posts prontos para Instagram', icon: <Paintbrush size={20} />, nivel: 3, slug: 'posts' },
            { nome: 'Logo + Manual de Marca', descricao: 'Identidade visual completa', icon: <Palette size={20} />, nivel: 3, slug: 'marca' },
        ],
    },
    {
        titulo: 'Audiovisual',
        nivel: 4,
        preco: 'R$ 497/mês',
        cor: '#0F4C61',
        skills: [
            { nome: 'Vídeo com Avatar', descricao: 'Gera vídeos com avatar IA (HeyGen)', icon: <Video size={20} />, nivel: 4, slug: 'video' },
            { nome: 'Voz Clonada', descricao: 'Sua voz clonada via ElevenLabs', icon: <Mic size={20} />, nivel: 4, slug: 'voz' },
            { nome: 'Editor de Vídeo', descricao: 'Edições minimalistas automáticas', icon: <Wand2 size={20} />, nivel: 4, slug: 'editor' },
        ],
    },
]

export default function HabilidadesPage() {
    const [planoAtual, setPlanoAtual] = useState(1)
    const [nomeIA, setNomeIA] = useState('IARA')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(data => {
                setPlanoAtual(data.plano || 1)
                setNomeIA(data.nomeIA || 'IARA')
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#D99773]" />
            </div>
        )
    }

    return (
        <div className="animate-fade-in max-w-5xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Habilidades da {nomeIA}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Sua {nomeIA} é <span className="font-bold text-[#D99773]">Nível {planoAtual}</span> — desbloqueie novas habilidades fazendo upgrade
                </p>
            </div>

            <div className="space-y-8">
                {habilidades.map((grupo) => {
                    const desbloqueado = planoAtual >= grupo.nivel
                    return (
                        <div key={grupo.nivel} className="animate-fade-in" style={{ animationDelay: `${(grupo.nivel - 1) * 0.1}s` }}>
                            {/* Cabeçalho do nível */}
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm"
                                    style={{ backgroundColor: desbloqueado ? grupo.cor : 'var(--text-muted)', opacity: desbloqueado ? 1 : 0.4 }}
                                >
                                    {grupo.nivel}
                                </div>
                                <div>
                                    <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        {nomeIA} {grupo.titulo}
                                    </h2>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{grupo.preco}</p>
                                </div>
                                {desbloqueado ? (
                                    <span className="ml-auto text-[11px] font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: `${grupo.cor}15`, color: grupo.cor }}>
                                        <Check size={12} className="inline mr-1" /> Ativo
                                    </span>
                                ) : (
                                    <Link
                                        href="/plano"
                                        className="ml-auto text-[11px] font-semibold px-4 py-2 rounded-xl text-white flex items-center gap-1.5 transition-all hover:-translate-y-0.5"
                                        style={{ background: `linear-gradient(135deg, ${grupo.cor}, ${grupo.cor}CC)`, boxShadow: `0 4px 16px ${grupo.cor}30` }}
                                    >
                                        <Sparkles size={12} /> Fazer Upgrade <ArrowUpRight size={11} />
                                    </Link>
                                )}
                            </div>

                            {/* Skills Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {grupo.skills.map((skill) => {
                                    const habilitada = planoAtual >= skill.nivel
                                    return (
                                        <Link
                                            key={skill.nome}
                                            href={habilitada && skill.slug ? `/habilidades/${skill.slug}` : '/plano'}
                                            className={`group relative backdrop-blur-xl rounded-2xl p-5 text-left transition-all duration-500 overflow-hidden ${habilitada
                                                ? 'hover:-translate-y-1 cursor-pointer'
                                                : 'opacity-60'
                                                }`}
                                            style={{
                                                backgroundColor: 'var(--bg-card)',
                                                border: habilitada ? `1px solid var(--border-default)` : '1px solid var(--border-subtle)',
                                            }}
                                        >
                                            {/* Glow on hover */}
                                            {habilitada && (
                                                <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${grupo.cor}, transparent)` }} />
                                            )}

                                            <div className="flex items-center gap-3 mb-2">
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                                    style={{ backgroundColor: habilitada ? `${grupo.cor}15` : 'var(--bg-subtle)', color: habilitada ? grupo.cor : 'var(--text-muted)' }}
                                                >
                                                    {habilitada ? skill.icon : <Lock size={18} />}
                                                </div>
                                                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{skill.nome}</span>
                                            </div>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{skill.descricao}</p>

                                            {!habilitada && (
                                                <div className="mt-3 flex items-center gap-1.5">
                                                    <Lock size={10} style={{ color: 'var(--text-muted)' }} />
                                                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                                                        Disponível no plano {grupo.titulo}
                                                    </span>
                                                </div>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>

                            {/* Upgrade CTA for locked levels */}
                            {!desbloqueado && (
                                <div className="mt-4 p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: `${grupo.cor}08`, border: `1px dashed ${grupo.cor}30` }}>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            🔓 Desbloqueie {grupo.skills.length} habilidades com o plano {grupo.titulo}
                                        </p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                            {grupo.skills.map(s => s.nome).join(' • ')}
                                        </p>
                                    </div>
                                    <Link
                                        href="/plano"
                                        className="text-xs font-semibold px-4 py-2 rounded-lg text-white flex-shrink-0"
                                        style={{ backgroundColor: grupo.cor }}
                                    >
                                        Ver plano →
                                    </Link>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
