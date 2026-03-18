'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  UserCheck,
  PenTool,
  BarChart3,
  Instagram,
  Camera,
  Palette,
  Award,
  Mic,
  Edit3,
  Bot,
  Shield,
  Gift,
  History,
  Zap,
  CalendarDays,
  FileText,
  Settings,
  CreditCard,
  LogOut,
  Lock,
  ChevronDown,
  Sparkles,
  Sun,
  Moon,
  Smartphone,
  Menu,
  X,
  Layers,
  Building2,
  Video,
  Kanban,
  Target,
  Globe,
  Search,
  Megaphone,
  Users,
  TestTube2,
  Star,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import SeletorIdioma from './SeletorIdioma'
import dynamic from 'next/dynamic'

type Skill = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; nivel: number }

interface ClinicaItem {
  id: number
  nomeClinica: string | null
  nome: string | null
  endereco: string | null
}

const habilidadesMenu: { titulo: string; nivel: number; emoji: string; skills: Skill[] }[] = [
  {
    titulo: 'Secretária', nivel: 1, emoji: '💬',
    skills: [
      { href: '/habilidades/atendimento', label: 'Atendimento', icon: MessageCircle, nivel: 1 },
      { href: '/habilidades/agendamento', label: 'Agenda', icon: Calendar, nivel: 1 },
      { href: '/habilidades/follow-up', label: 'Follow-up', icon: UserCheck, nivel: 1 },
      { href: '/habilidades/voz', label: 'Voz', icon: Mic, nivel: 1 },
    ],
  },
  {
    titulo: 'Estrategista', nivel: 2, emoji: '⭐',
    skills: [
      { href: '/habilidades/instagram', label: 'Instagram', icon: Instagram, nivel: 2 },
      { href: '/habilidades/marketing', label: 'Marketing', icon: BarChart3, nivel: 2 },
      { href: '/habilidades/roteiros', label: 'Roteiros', icon: PenTool, nivel: 2 },
      { href: '/habilidades/avatar', label: 'Fotos IA', icon: Camera, nivel: 2 },
      { href: '/habilidades/posts', label: 'Posts', icon: Palette, nivel: 2 },
      { href: '/habilidades/colagem', label: 'Antes/Depois', icon: Layers, nivel: 2 },
      { href: '/habilidades/marca', label: 'Marca', icon: Award, nivel: 2 },
      { href: '/habilidades/editor', label: 'Editor', icon: Edit3, nivel: 2 },
      { href: '/habilidades/raiox', label: 'Raio-X Instagram', icon: Search, nivel: 2 },
      { href: '/habilidades/calendario', label: 'Calendário Conteúdo', icon: CalendarDays, nivel: 2 },
    ],
  },
  {
    titulo: 'Designer', nivel: 3, emoji: '💎',
    skills: [
      { href: '/habilidades/voz-clonada', label: 'Voz Clonada', icon: Mic, nivel: 3 },
      { href: '/habilidades/crm', label: 'CRM Mini', icon: Kanban, nivel: 3 },
      { href: '/habilidades/leads', label: 'Lead Scoring', icon: Target, nivel: 3 },
      { href: '/habilidades/multi-clinica', label: 'Multi-clínica', icon: Building2, nivel: 3 },
    ],
  },
  {
    titulo: 'Audiovisual', nivel: 4, emoji: '🎬',
    skills: [
      { href: '/habilidades/videos', label: 'Avatar Vídeo', icon: Video, nivel: 4 },
      { href: '/habilidades/app-config', label: 'App da Clínica', icon: Globe, nivel: 4 },
    ],
  },
]

// Mapa rota → featureId (deve bater com admin/links FEATURES)
const ROUTE_TO_FEATURE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/conversas': 'conversas',
  '/crm': 'crm',
  '/contatos': 'crm',
  '/campanhas': 'campanhas',
  '/habilidades/atendimento': 'atendimento',
  '/habilidades/agendamento': 'agendamento',
  '/habilidades/follow-up': 'follow-up',
  '/habilidades/voz': 'voz',
  '/habilidades/instagram': 'instagram',
  '/habilidades/marketing': 'marketing',
  '/habilidades/roteiros': 'roteiros',
  '/habilidades/avatar': 'fotos-ia',
  '/habilidades/posts': 'posts',
  '/habilidades/colagem': 'colagem',
  '/habilidades/marca': 'marca',
  '/habilidades/editor': 'editor',
  '/habilidades/raiox': 'raiox',
  '/habilidades/calendario': 'calendario',
  '/habilidades/voz-clonada': 'voz-clonada',
  '/habilidades/crm': 'midia',
  '/habilidades/leads': 'lancamentos',
  '/habilidades/multi-clinica': 'midia',
  '/habilidades/videos': 'reels',
  '/habilidades/app-config': 'app-config',
  '/instancias': 'instancias',
  '/configuracoes': 'configuracoes',
  '/equipe': 'equipe',
  '/satisfacao': 'satisfacao',
  '/cofre': 'cofre',
  '/features': 'features',
  '/agenda': 'agenda',
  '/templates': 'templates',
  '/indicacoes': 'indicacoes',
  '/historico-creditos': 'historico',
  '/melhorar-iara': 'melhorar-iara',
  '/plano': 'plano',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.userType === 'admin'
  const [expandedGroups, setExpandedGroups] = useState<number[]>([1])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [planoAtual, setPlanoAtual] = useState(1)
  const [nomeClinica, setNomeClinica] = useState('')
  const [nomePlano, setNomePlano] = useState('Essencial')
  const [clinicas, setClinicas] = useState<ClinicaItem[]>([])
  const [clinicaAtiva, setClinicaAtiva] = useState<number | null>(null)
  const [showClinicaDropdown, setShowClinicaDropdown] = useState(false)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({})
  const isDark = theme === 'dark'

  // Buscar plano da clínica
  useEffect(() => {
    fetch('/api/clinica')
      .then(r => r.json())
      .then(data => {
        if (data?.nivel) setPlanoAtual(Number(data.nivel))
        if (data?.nome_clinica || data?.nomeClinica) setNomeClinica(data.nome_clinica || data.nomeClinica)
        const nomes: Record<number, string> = { 1: 'Secretária', 2: 'Estrategista', 3: 'Designer', 4: 'Audiovisual' }
        setNomePlano(nomes[Number(data?.nivel)] || 'Secretária')
        if (data?.id) setClinicaAtiva(Number(data.id))
      })
      .catch(() => { })
  }, [])

  // Buscar lista de clínicas do usuário
  useEffect(() => {
    fetch('/api/clinicas')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setClinicas(data)
      })
      .catch(() => { })
  }, [])

  // Buscar feature flags (visibilidade de features)
  useEffect(() => {
    if (isAdmin) return // Admin vê tudo
    fetch('/api/admin/feature-flags')
      .then(r => r.json())
      .then(data => {
        if (data.flags) setFeatureFlags(data.flags)
      })
      .catch(() => { })
  }, [isAdmin])

  // Verifica se uma rota está visível (feature flag ativa)
  const isRouteVisible = (href: string): boolean => {
    if (isAdmin) return true // Admin vê tudo
    const featureId = ROUTE_TO_FEATURE[href]
    if (!featureId) return true // Rota sem flag = sempre visível
    if (featureFlags[featureId] === undefined) return true // Sem flag no banco = visível
    return featureFlags[featureId]
  }

  // Trocar clínica ativa
  const switchClinica = async (id: number) => {
    try {
      const res = await fetch('/api/clinicas/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicaId: id }),
      })
      if (res.ok) {
        setShowClinicaDropdown(false)
        window.location.reload()
      }
    } catch { }
  }

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const toggleGroup = (nivel: number) => {
    setExpandedGroups(prev =>
      prev.includes(nivel) ? prev.filter(n => n !== nivel) : [...prev, nivel]
    )
  }

  const linkClass = (href: string) => {
    const active = pathname === href
    if (active) {
      return isDark
        ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 bg-gradient-to-r from-[#D99773]/15 to-[#D99773]/5 text-[#D99773] border border-[#D99773]/15'
        : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 bg-[#0F4C61] text-white shadow-sm shadow-[#0F4C61]/20'
    }
    return isDark
      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 text-gray-500 hover:text-[#0F4C61] hover:bg-gray-100/60'
  }

  return (
    <>
      {/* Mobile Header Bar */}
      <div
        className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-50 lg:hidden"
        style={{
          backgroundColor: isDark ? 'rgba(11,15,25,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)'}`,
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,76,97,0.06)',
              color: isDark ? '#D99773' : '#0F4C61',
            }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg shadow-[#D99773]/20 border border-white/10">
            <img src="/iara-avatar.png" alt="IARA" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-[14px] font-bold tracking-tight" style={{ color: isDark ? '#FFFFFF' : '#0F4C61' }}>IARA</h1>
        </div>

        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,76,97,0.06)',
            color: isDark ? '#D99773' : '#0F4C61',
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-[280px] lg:w-[260px] backdrop-blur-2xl flex flex-col z-50
          transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={{
          backgroundColor: isDark ? 'rgba(11,15,25,0.95)' : 'rgba(255,255,255,0.95)',
          borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)'}`,
        }}
      >
        {/* Gradient accent on left edge */}
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#D99773]/20 via-transparent to-[#0F4C61]/20" />

        {/* Logo */}
        <div className="px-5 pt-5 pb-3 lg:px-6 lg:pt-6 lg:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[#D99773]/20 border border-white/10">
                  <img src="/iara-avatar.png" alt="IARA" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2" style={{ borderColor: isDark ? '#0B0F19' : '#FFFFFF' }} />
              </div>
              <div>
                <h1 className="text-[15px] font-bold tracking-tight" style={{ color: isDark ? '#FFFFFF' : '#0F4C61' }}>IARA</h1>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: isDark ? '#4B5563' : '#94A3B8' }}>
                  {isAdmin ? (
                    <span className="flex items-center gap-1">
                      <span>👑</span>
                      <span style={{ color: '#D99773' }}>Boss Manager</span>
                    </span>
                  ) : 'Painel'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center transition-all duration-300 hover:scale-110"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,76,97,0.06)',
                  color: isDark ? '#D99773' : '#0F4C61',
                }}
                title={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,76,97,0.06)',
                  color: isDark ? '#9CA3AF' : '#6B7280',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="mb-1">
            <Link href="/dashboard" className={linkClass('/dashboard')}>
              <LayoutDashboard size={17} strokeWidth={1.8} />
              <span>Dashboard</span>
            </Link>
          </div>
          <div className="mb-4">
            <Link href="/conversas" className={linkClass('/conversas')}>
              <MessageCircle size={17} strokeWidth={1.8} />
              <span>Conversas</span>
            </Link>
            <Link href="/crm" className={linkClass('/crm')}>
              <Users size={17} strokeWidth={1.8} />
              <span>CRM</span>
            </Link>
            <Link href="/contatos" className={linkClass('/contatos')}>
              <UserCheck size={17} strokeWidth={1.8} />
              <span>Contatos</span>
            </Link>
            <Link href="/campanhas" className={linkClass('/campanhas')}>
              <Megaphone size={17} strokeWidth={1.8} />
              <span>Campanhas</span>
            </Link>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-2 px-3 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#374151' : '#CBD5E1' }}>Habilidades</span>
            <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)' }} />
          </div>

          {/* Skills Groups */}
          <div className="space-y-0.5 mb-4">
            {habilidadesMenu.map((grupo) => {
              const desbloqueado = true // Todas as habilidades são acessíveis — limites controlam uso
              const isExpanded = expandedGroups.includes(grupo.nivel)
              const visibleSkills = grupo.skills.filter(skill => isRouteVisible(skill.href))
              const allHidden = !isAdmin && visibleSkills.length === 0

              return (
                <div key={grupo.nivel}>
                  <button
                    onClick={() => !allHidden && toggleGroup(grupo.nivel)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${allHidden ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
                    style={{ color: isDark ? (desbloqueado ? '#9CA3AF' : '#374151') : (desbloqueado ? '#6B7280' : '#CBD5E1') }}
                  >
                    <span className="text-sm">{grupo.emoji}</span>
                    <span className="flex-1 text-left">{grupo.titulo}</span>
                    {allHidden ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>EM BREVE</span>
                    ) : (
                      <>
                        {!desbloqueado && <Lock size={11} style={{ color: isDark ? '#374151' : '#CBD5E1' }} />}
                        <ChevronDown
                          size={13}
                          className={`transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                          style={{ color: isDark ? '#374151' : '#CBD5E1' }}
                        />
                      </>
                    )}
                  </button>

                  {isExpanded && !allHidden && (
                    <div className="ml-3 pl-3 space-y-0.5 py-0.5" style={{ borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)'}` }}>
                      {visibleSkills.map((skill) => {
                        const active = pathname === skill.href
                        const habilitada = true // Limites de uso em vez de bloqueio de acesso
                        return (
                          <Link
                            key={skill.href}
                            href={skill.href}
                            className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] transition-all duration-300 ${active
                              ? 'bg-[#D99773]/10 text-[#D99773] font-semibold'
                              : habilitada
                                ? isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]' : 'text-gray-500 hover:text-[#0F4C61] hover:bg-gray-100/50'
                                : isDark ? 'text-gray-700 hover:bg-white/[0.02]' : 'text-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {habilitada ? <skill.icon size={14} /> : <Lock size={12} strokeWidth={1.5} />}
                            <span>{skill.label}</span>
                            {planoAtual < skill.nivel && (
                              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[#D99773]/10 text-[#D99773]">TRIAL</span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Separator */}
          <div className="flex items-center gap-2 px-3 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#374151' : '#CBD5E1' }}>Conta</span>
            <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)' }} />
          </div>

          {isRouteVisible('/instancias') && <Link href="/instancias" className={linkClass('/instancias')}>
            <Smartphone size={17} strokeWidth={1.8} />
            <span>Instâncias & Canais</span>
          </Link>}
          {isRouteVisible('/configuracoes') && <Link href="/configuracoes" className={linkClass('/configuracoes')}>
            <Settings size={17} strokeWidth={1.8} />
            <span>Configurações</span>
          </Link>}
          <Link href="/equipe" className={linkClass('/equipe')}>
            <Users size={17} strokeWidth={1.8} />
            <span>Equipe</span>
          </Link>
          <Link href="/satisfacao" className={linkClass('/satisfacao')}>
            <Star size={17} strokeWidth={1.8} />
            <span>Satisfação</span>
          </Link>
          {/* WA Fake e Simulador removidos — só no admin (adm.iara.click) */}
          {isRouteVisible('/cofre') && <Link href="/cofre" className={linkClass('/cofre')}>
            <Shield size={17} strokeWidth={1.8} />
            <span>Personalizar IA</span>
          </Link>}
          {isRouteVisible('/features') && <Link href="/features" className={linkClass('/features')}>
            <Zap size={17} strokeWidth={1.8} />
            <span>Features</span>
          </Link>}
          {/* Agenda movida para Habilidades > Secretária */}
          {isRouteVisible('/templates') && <Link href="/templates" className={linkClass('/templates')}>
            <FileText size={17} strokeWidth={1.8} />
            <span>Templates</span>
          </Link>}
          {isRouteVisible('/indicacoes') && <Link href="/indicacoes" className={linkClass('/indicacoes')}>
            <Gift size={17} strokeWidth={1.8} />
            <span>Indicações</span>
          </Link>}
          {isRouteVisible('/historico-creditos') && <Link href="/historico-creditos" className={linkClass('/historico-creditos')}>
            <History size={17} strokeWidth={1.8} />
            <span>Créditos Usados</span>
          </Link>}
          {isRouteVisible('/melhorar-iara') && <Link href="/melhorar-iara" className={linkClass('/melhorar-iara')}>
            <Sparkles size={17} strokeWidth={1.8} />
            <span>Melhorar a IARA</span>
          </Link>}
          {isRouteVisible('/plano') && <Link href="/plano" className={linkClass('/plano')}>
            <CreditCard size={17} strokeWidth={1.8} />
            <span>Plano & Créditos</span>
          </Link>}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 pt-2" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.06)'}` }}>
          <SeletorIdioma />

          {/* Clinic Selector */}
          <div className="relative">
            <button
              onClick={() => clinicas.length > 1 && setShowClinicaDropdown(!showClinicaDropdown)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-2 transition-all ${clinicas.length > 1 ? 'cursor-pointer hover:opacity-80' : ''}`}
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,76,97,0.03)' }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center shadow-lg shadow-[#D99773]/10">
                <span className="text-[11px] font-bold text-white">{nomeClinica ? nomeClinica.slice(0, 2).toUpperCase() : 'IA'}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-semibold truncate" style={{ color: isDark ? '#FFFFFF' : '#0F4C61' }}>{nomeClinica || 'Minha Clínica'}</p>
                <p className="text-[10px]" style={{ color: isDark ? '#374151' : '#94A3B8' }}>Plano {nomePlano}</p>
              </div>
              {clinicas.length > 1 && (
                <ChevronDown size={13} className={`transition-transform ${showClinicaDropdown ? 'rotate-180' : ''}`} style={{ color: isDark ? '#4B5563' : '#94A3B8' }} />
              )}
            </button>

            {/* Dropdown de clínicas */}
            {showClinicaDropdown && clinicas.length > 1 && (
              <div
                className="absolute bottom-full left-0 right-0 mb-1 rounded-xl py-1 shadow-xl z-50 border"
                style={{
                  backgroundColor: isDark ? '#1a1f2e' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,76,97,0.1)',
                }}
              >
                {clinicas.map(c => (
                  <button
                    key={c.id}
                    onClick={() => switchClinica(c.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:opacity-80 ${clinicaAtiva === c.id ? 'bg-[#0F4C61]/10' : ''}`}
                  >
                    <Building2 size={13} style={{ color: clinicaAtiva === c.id ? '#D99773' : isDark ? '#4B5563' : '#94A3B8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate" style={{ color: clinicaAtiva === c.id ? '#D99773' : isDark ? '#FFFFFF' : '#0F4C61' }}>
                        {c.nomeClinica || c.nome || 'Clínica'}
                      </p>
                      {c.endereco && <p className="text-[9px] truncate" style={{ color: isDark ? '#374151' : '#94A3B8' }}>{c.endereco}</p>}
                    </div>
                    {clinicaAtiva === c.id && <div className="w-1.5 h-1.5 rounded-full bg-[#D99773]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] w-full transition-all text-gray-400 hover:text-red-400 hover:bg-red-500/5">
            <LogOut size={15} strokeWidth={1.8} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
