'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    LayoutDashboard, MessageCircle, Calendar, UserCheck, Mic, BarChart3,
    Instagram, Camera, Palette, Award, Edit3, Search, CalendarDays, Mic2,
    Layers, Globe, Video, Bot, TestTube2, Shield, Zap, Smartphone,
    Settings, FileText, History, Gift, Lock, Kanban, Target, Megaphone,
    Eye, EyeOff, ExternalLink, CheckCircle2, XCircle,
} from 'lucide-react'

// ============================================================
// MAPA COMPLETO DE FEATURES / ROTAS
// ============================================================
type Feature = {
    id: string
    label: string
    route: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    categoria: string
    planoMinimo: number   // 1=Secretária 2=Estrategista 3=Designer 4=Audiovisual
    adminOnly?: boolean
    descricao?: string
}

const FEATURES: Feature[] = [
    // ── Núcleo ──────────────────────────────────────────────────────
    { id: 'dashboard',        label: 'Dashboard',               route: '/dashboard',                   icon: LayoutDashboard, categoria: 'Núcleo',       planoMinimo: 1 },
    { id: 'conversas',        label: 'Conversas',               route: '/conversas',                   icon: MessageCircle,   categoria: 'Núcleo',       planoMinimo: 1,  descricao: 'Histórico completo de todas as conversas' },
    { id: 'crm',              label: 'CRM / Leads',             route: '/crm',                         icon: Kanban,          categoria: 'Núcleo',       planoMinimo: 1,  descricao: 'Kanban de leads e pipeline de vendas' },
    { id: 'campanhas',        label: 'Campanhas',               route: '/campanhas',                   icon: Megaphone,       categoria: 'Núcleo',       planoMinimo: 1,  descricao: 'Disparo em massa e campanhas de WhatsApp' },
    // ── Secretária (P1) ─────────────────────────────────────────────
    { id: 'atendimento',      label: 'Atendimento',             route: '/habilidades/atendimento',     icon: MessageCircle,   categoria: 'Secretária',   planoMinimo: 1 },
    { id: 'agendamento',      label: 'Agendamento',             route: '/habilidades/agendamento',     icon: Calendar,        categoria: 'Secretária',   planoMinimo: 1 },
    { id: 'follow-up',        label: 'Follow-up',               route: '/habilidades/follow-up',       icon: UserCheck,       categoria: 'Secretária',   planoMinimo: 1 },
    { id: 'voz',              label: 'Voz',                     route: '/habilidades/voz',             icon: Mic,             categoria: 'Secretária',   planoMinimo: 1,  descricao: 'Controle de TTS e transcrição de áudio' },
    // ── Estrategista (P2) ────────────────────────────────────────────
    { id: 'instagram',        label: 'Instagram',               route: '/habilidades/instagram',       icon: Instagram,       categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'marketing',        label: 'Marketing',               route: '/habilidades/marketing',       icon: BarChart3,       categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'roteiros',         label: 'Roteiros',                route: '/habilidades/roteiros',        icon: Edit3,           categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'fotos-ia',         label: 'Fotos IA (Astria)',       route: '/habilidades/avatar',          icon: Camera,          categoria: 'Estrategista', planoMinimo: 2,  descricao: 'Geração de fotos profissionais com IA' },
    { id: 'posts',            label: 'Posts',                   route: '/habilidades/posts',           icon: Palette,         categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'colagem',          label: 'Antes/Depois',            route: '/habilidades/colagem',         icon: Layers,          categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'marca',            label: 'Marca',                   route: '/habilidades/marca',           icon: Award,           categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'editor',           label: 'Editor',                  route: '/habilidades/editor',          icon: Edit3,           categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'raiox',            label: 'Raio-X Instagram',        route: '/habilidades/raiox',           icon: Search,          categoria: 'Estrategista', planoMinimo: 2 },
    { id: 'calendario',       label: 'Calendário Conteúdo',     route: '/habilidades/calendario',      icon: CalendarDays,    categoria: 'Estrategista', planoMinimo: 2 },
    // ── Designer (P3) ───────────────────────────────────────────────
    { id: 'voz-clonada',      label: 'Voz Clonada',             route: '/habilidades/voz-clonada',     icon: Mic2,            categoria: 'Designer',     planoMinimo: 3 },
    { id: 'midia',            label: 'Mídia (Photos)',          route: '/midia',                       icon: Camera,          categoria: 'Designer',     planoMinimo: 3 },
    { id: 'lancamentos',      label: 'Lançamentos',             route: '/habilidades/lancamentos',     icon: Target,          categoria: 'Designer',     planoMinimo: 3 },
    // ── Audiovisual (P4) ─────────────────────────────────────────────
    { id: 'carroseis',        label: 'Carrosséis',              route: '/habilidades/carroseis',       icon: Layers,          categoria: 'Audiovisual',  planoMinimo: 4 },
    { id: 'reels',            label: 'Reels',                   route: '/habilidades/reels',           icon: Video,           categoria: 'Audiovisual',  planoMinimo: 4 },
    { id: 'app-config',       label: 'App da Clínica',          route: '/habilidades/app-config',      icon: Globe,           categoria: 'Audiovisual',  planoMinimo: 4 },
    // ── Conta ───────────────────────────────────────────────────────
    { id: 'instancias',       label: 'Instâncias & Canais',     route: '/instancias',                  icon: Smartphone,      categoria: 'Conta',        planoMinimo: 1 },
    { id: 'configuracoes',    label: 'Configurações',           route: '/configuracoes',               icon: Settings,        categoria: 'Conta',        planoMinimo: 1 },
    { id: 'cofre',            label: 'Personalizar IA',         route: '/cofre',                       icon: Shield,          categoria: 'Conta',        planoMinimo: 1,  descricao: 'Prompt system, regras e personalidade da IARA' },
    { id: 'features',         label: 'Features (Beta flags)',   route: '/features',                    icon: Zap,             categoria: 'Conta',        planoMinimo: 1,  descricao: 'Flags de funcionalidades experimentais por clínica' },
    { id: 'agenda',           label: 'Agenda',                  route: '/agenda',                      icon: CalendarDays,    categoria: 'Conta',        planoMinimo: 1 },
    { id: 'templates',        label: 'Templates',               route: '/templates',                   icon: FileText,        categoria: 'Conta',        planoMinimo: 1 },
    { id: 'historico',        label: 'Histórico Créditos',      route: '/historico-creditos',          icon: History,         categoria: 'Conta',        planoMinimo: 1 },
    { id: 'indicacoes',       label: 'Indicações',              route: '/indicacoes',                  icon: Gift,            categoria: 'Conta',        planoMinimo: 1 },
    { id: 'plano',            label: 'Plano & Faturamento',     route: '/plano',                       icon: Lock,            categoria: 'Conta',        planoMinimo: 1 },
    // ── Admin-only ──────────────────────────────────────────────────
    { id: 'simulador',        label: 'Simulador IA',            route: '/simulador',                   icon: Bot,             categoria: 'Admin',        planoMinimo: 1, adminOnly: true, descricao: 'Testa prompt e respostas da IA sem Evolution' },
    { id: 'whatsapp-fake',    label: 'WA Fake 🧪',              route: '/whatsapp-fake',               icon: TestTube2,       categoria: 'Admin',        planoMinimo: 1, adminOnly: true, descricao: 'Pipeline completo: catraca → IA → TTS + suporte a imagens' },
    { id: 'melhorar-iara',    label: 'Melhorar IARA',           route: '/melhorar-iara',               icon: Zap,             categoria: 'Admin',        planoMinimo: 1, adminOnly: true },
    { id: 'privacidade',      label: 'Privacidade',             route: '/privacidade',                 icon: Shield,          categoria: 'Admin',        planoMinimo: 1, adminOnly: true },
]

const CATEGORIAS_ORDEN = ['Núcleo', 'Secretária', 'Estrategista', 'Designer', 'Audiovisual', 'Conta', 'Admin']

const PLANO_CORES: Record<number, string> = {
    1: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    2: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    3: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    4: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
}
const PLANO_LABELS: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' }

const STORAGE_KEY = 'iara_admin_features_enabled'

export default function AdminLinksPage() {
    const [enabled, setEnabled] = useState<Record<string, boolean>>({})
    const [filter, setFilter] = useState('')
    const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)

    // Carregar estado do localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                setEnabled(JSON.parse(stored))
            } else {
                // Por padrão, tudo habilitado
                const defaults: Record<string, boolean> = {}
                FEATURES.forEach(f => { defaults[f.id] = true })
                setEnabled(defaults)
            }
        } catch {
            const defaults: Record<string, boolean> = {}
            FEATURES.forEach(f => { defaults[f.id] = true })
            setEnabled(defaults)
        }
    }, [])

    const toggleFeature = (id: string) => {
        setEnabled(prev => {
            const next = { ...prev, [id]: !prev[id] }
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { }
            return next
        })
    }

    const toggleAll = (ids: string[], value: boolean) => {
        setEnabled(prev => {
            const next = { ...prev }
            ids.forEach(id => { next[id] = value })
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { }
            return next
        })
    }

    const featuresFiltradas = FEATURES.filter(f => {
        const matchText = f.label.toLowerCase().includes(filter.toLowerCase()) ||
            f.route.toLowerCase().includes(filter.toLowerCase()) ||
            (f.descricao || '').toLowerCase().includes(filter.toLowerCase())
        const matchCat = !categoriaAtiva || f.categoria === categoriaAtiva
        return matchText && matchCat
    })

    const categorias = CATEGORIAS_ORDEN.filter(cat =>
        featuresFiltradas.some(f => f.categoria === cat)
    )

    const total = FEATURES.length
    const ativas = Object.values(enabled).filter(Boolean).length

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">🗺️ Mapa de Features & Rotas</h1>
                <p className="text-gray-400 text-sm">Todas as rotas construídas. Ative ou desative features para controlar a visibilidade no painel.</p>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <span className="text-green-300 text-sm font-medium">{ativas} ativas</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-red-300 text-sm font-medium">{total - ativas} desativadas</span>
                    </div>
                    <span className="text-gray-600 text-sm">{total} features no total</span>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-6">
                <input
                    type="text"
                    placeholder="🔍 Buscar feature ou rota..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64"
                />
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setCategoriaAtiva(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${!categoriaAtiva ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                    >
                        Todas
                    </button>
                    {CATEGORIAS_ORDEN.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoriaAtiva(cat === categoriaAtiva ? null : cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${categoriaAtiva === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Categorias */}
            <div className="space-y-8">
                {categorias.map(cat => {
                    const features = featuresFiltradas.filter(f => f.categoria === cat)
                    const allEnabled = features.every(f => enabled[f.id] !== false)
                    const idsCategoria = features.map(f => f.id)

                    return (
                        <div key={cat}>
                            {/* Cabeçalho da categoria */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">{cat}</h2>
                                    <span className="text-xs text-gray-600">{features.length} features</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleAll(idsCategoria, !allEnabled)}
                                        className={`text-xs px-2 py-1 rounded border transition-all ${allEnabled
                                            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-green-500/10 hover:border-green-500/30 hover:text-green-400'
                                            }`}
                                    >
                                        {allEnabled ? 'Desativar todas' : 'Ativar todas'}
                                    </button>
                                </div>
                            </div>
                            <div className="w-full h-px bg-gray-800 mb-4" />

                            {/* Grid de features */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {features.map(feat => {
                                    const Icon = feat.icon
                                    const isEnabled = enabled[feat.id] !== false
                                    return (
                                        <div
                                            key={feat.id}
                                            className={`relative rounded-xl border p-4 transition-all ${isEnabled
                                                ? 'bg-gray-900 border-gray-700/60'
                                                : 'bg-gray-950 border-gray-800 opacity-50'
                                                }`}
                                        >
                                            {/* Admin badge */}
                                            {feat.adminOnly && (
                                                <span className="absolute top-3 right-12 text-[10px] bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1.5 py-0.5">
                                                    admin
                                                </span>
                                            )}

                                            {/* Toggle */}
                                            <button
                                                onClick={() => toggleFeature(feat.id)}
                                                className={`absolute top-3 right-3 w-9 h-5 rounded-full transition-all flex items-center px-0.5 ${isEnabled ? 'bg-green-500' : 'bg-gray-700'}`}
                                            >
                                                <span className={`w-4 h-4 rounded-full bg-white shadow transition-all ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>

                                            <div className="flex items-start gap-3 pr-10">
                                                <div className={`p-2 rounded-lg flex-shrink-0 ${isEnabled ? 'bg-blue-500/10' : 'bg-gray-800'}`}>
                                                    <Icon size={16} className={isEnabled ? 'text-blue-400' : 'text-gray-600'} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-medium text-sm text-white truncate">{feat.label}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${PLANO_CORES[feat.planoMinimo]}`}>
                                                            {PLANO_LABELS[feat.planoMinimo]}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-[11px] text-gray-500 font-mono truncate">{feat.route}</code>
                                                        <Link
                                                            href={feat.route}
                                                            target="_blank"
                                                            className="flex-shrink-0 text-gray-600 hover:text-blue-400 transition-colors"
                                                        >
                                                            <ExternalLink size={11} />
                                                        </Link>
                                                    </div>
                                                    {feat.descricao && (
                                                        <p className="text-[11px] text-gray-500 mt-1 leading-tight">{feat.descricao}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-gray-800 text-center">
                <p className="text-xs text-gray-600">
                    Os toggles são salvos localmente (localStorage) e visíveis apenas para você como admin.
                    Para desativar features por clínica, use a página <Link href="/features" className="text-blue-400 hover:underline">/features</Link>.
                </p>
            </div>
        </div>
    )
}
