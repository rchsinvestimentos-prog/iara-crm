'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  MessageCircle,
  Calendar,
  Instagram,
  Settings,
  CreditCard,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Smartphone,
  Menu,
  X,
  Building2,
  Users,
  UsersRound,
  User,
  Tag,
  Palmtree,
  Stethoscope,
  BookOpen,
  Package,
  Link2,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import SeletorIdioma from './SeletorIdioma'
import dynamic from 'next/dynamic'

interface ClinicaItem {
  id: number
  nomeClinica: string | null
  nome: string | null
  endereco: string | null
}

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.userType === 'admin'
  const isProfissional = (session?.user as any)?.userType === 'profissional'
  const profissionalNome = isProfissional ? (session?.user as any)?.name || 'Profissional' : ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [planoAtual, setPlanoAtual] = useState(1)
  const [nomeClinica, setNomeClinica] = useState('')
  const [nomePlano, setNomePlano] = useState('Essencial')
  const [clinicas, setClinicas] = useState<ClinicaItem[]>([])
  const [clinicaAtiva, setClinicaAtiva] = useState<number | null>(null)
  const [showClinicaDropdown, setShowClinicaDropdown] = useState(false)
  const isDark = theme === 'dark'

  // Buscar plano da clínica
  useEffect(() => {
    fetch('/api/clinica')
      .then(r => r.json())
      .then(data => {
        if (data?.nivel) setPlanoAtual(Math.min(3, Number(data.nivel)))
        if (data?.nome_clinica || data?.nomeClinica) setNomeClinica(data.nome_clinica || data.nomeClinica)
        const nomes: Record<number, string> = { 1: 'Essencial', 2: 'Pro', 3: 'Premium' }
        setNomePlano(nomes[Math.min(3, Number(data?.nivel))] || 'Essencial')
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
                  ) : isProfissional ? (
                    <span className="flex items-center gap-1">
                      <span>👩‍⚕️</span>
                      <span style={{ color: '#D99773' }}>{profissionalNome}</span>
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

          {/* ─── PROFISSIONAL: sidebar simplificada ─── */}
          {isProfissional ? (
            <>
              <div className="mb-1">
                <Link href="/dashboard" className={linkClass('/dashboard')}>
                  <LayoutDashboard size={17} strokeWidth={1.8} />
                  <span>Dashboard</span>
                </Link>
              </div>

              <div className="flex items-center gap-2 px-3 mb-2 mt-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#374151' : '#CBD5E1' }}>Meu Painel</span>
                <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)' }} />
              </div>

              <Link href="/habilidades/agendamento" className={linkClass('/habilidades/agendamento')}>
                <Calendar size={17} strokeWidth={1.8} />
                <span>Minha Agenda</span>
              </Link>
              <Link href="/meu-perfil" className={linkClass('/meu-perfil')}>
                <User size={17} strokeWidth={1.8} />
                <span>Meu Perfil</span>
              </Link>
              <Link href="/link-agendamento" className={linkClass('/link-agendamento')}>
                <Link2 size={17} strokeWidth={1.8} />
                <span>Link de Agendamento</span>
              </Link>

              <div className="flex items-center gap-2 px-3 mb-2 mt-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#374151' : '#CBD5E1' }}>Serviços</span>
                <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)' }} />
              </div>

              <Link href="/meus-procedimentos" className={linkClass('/meus-procedimentos')}>
                <Stethoscope size={17} strokeWidth={1.8} />
                <span>Procedimentos</span>
              </Link>
              <Link href="/meus-cursos" className={linkClass('/meus-cursos')}>
                <BookOpen size={17} strokeWidth={1.8} />
                <span>Cursos</span>
              </Link>
              <Link href="/meus-combos" className={linkClass('/meus-combos')}>
                <Package size={17} strokeWidth={1.8} />
                <span>Combos</span>
              </Link>
              <Link href="/minhas-promocoes" className={linkClass('/minhas-promocoes')}>
                <Tag size={17} strokeWidth={1.8} />
                <span>Promoções</span>
              </Link>

              <div className="flex items-center gap-2 px-3 mb-2 mt-4">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#374151' : '#CBD5E1' }}>Status</span>
                <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)' }} />
              </div>

              <Link href="/ferias" className={linkClass('/ferias')}>
                <Palmtree size={17} strokeWidth={1.8} />
                <span>Modo Férias</span>
              </Link>
              <Link href="/meu-perfil" className={linkClass('/meu-perfil')}>
                <Settings size={17} strokeWidth={1.8} />
                <span>Configurações</span>
              </Link>
            </>
          ) : (
            /* ─── CLÍNICA / ADMIN: sidebar simplificada v2 ─── */
            <>
              {/* Menu Principal */}
              <div className="space-y-0.5 mb-4">
                <Link href="/dashboard" className={linkClass('/dashboard')}>
                  <LayoutDashboard size={17} strokeWidth={1.8} />
                  <span>Dashboard</span>
                </Link>
                <Link href="/conversas" className={linkClass('/conversas')}>
                  <MessageCircle size={17} strokeWidth={1.8} />
                  <span>Conversas</span>
                </Link>
                <Link href="/agenda" className={linkClass('/agenda')}>
                  <Calendar size={17} strokeWidth={1.8} />
                  <span>Agenda</span>
                </Link>
                <Link href="/crm" className={linkClass('/crm')}>
                  <Users size={17} strokeWidth={1.8} />
                  <span>CRM / Contatos</span>
                </Link>
                <Link href="/promocoes" className={linkClass('/promocoes')}>
                  <Tag size={17} strokeWidth={1.8} />
                  <span>Promoções / Combos</span>
                </Link>

                {/* Equipe / Profissionais */}
                <Link href="/equipe" className={linkClass('/equipe')}>
                  <UsersRound size={17} strokeWidth={1.8} />
                  <span>Equipe</span>
                </Link>

                {/* Multi-Clínica — visível para todos, bloqueado para não-Premium */}
                <Link href="/clinicas" className={linkClass('/clinicas')}>
                  <Building2 size={17} strokeWidth={1.8} />
                  <span className="flex-1">Multi-Clínica</span>
                  {planoAtual < 3 && (
                    <span style={{
                      fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: '#D99773', background: 'rgba(217,151,115,0.1)', padding: '2px 6px',
                      borderRadius: 6, lineHeight: 1.4,
                    }}>
                      PREMIUM
                    </span>
                  )}
                </Link>
              </div>

              {/* Separator */}
              <div className="flex items-center gap-2 px-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: isDark ? '#374151' : '#CBD5E1' }}>Conta</span>
                <div className="flex-1 h-px" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.08)' }} />
              </div>

              <div className="space-y-0.5">
                <Link href="/configuracoes" className={linkClass('/configuracoes')}>
                  <Settings size={17} strokeWidth={1.8} />
                  <span>Configurar IARA</span>
                </Link>
                <Link href="/instancias" className={linkClass('/instancias')}>
                  <Smartphone size={17} strokeWidth={1.8} />
                  <span>WhatsApp</span>
                </Link>
                <Link href="/plano" className={linkClass('/plano')}>
                  <CreditCard size={17} strokeWidth={1.8} />
                  <span>Meu Plano</span>
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 pt-2" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.06)'}` }}>
          <SeletorIdioma />

          {/* Clinic Selector — não mostrar para profissional */}
          {!isProfissional && <div className="relative">
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
          </div>}

          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] w-full transition-all text-gray-400 hover:text-red-400 hover:bg-red-500/5">
            <LogOut size={15} strokeWidth={1.8} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
