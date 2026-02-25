'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Video,
  Mic,
  Edit3,
  Settings,
  CreditCard,
  LogOut,
  Lock,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

type Skill = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; nivel: number }

const planoAtual = 4

const habilidadesMenu: { titulo: string; nivel: number; emoji: string; skills: Skill[] }[] = [
  {
    titulo: 'Secretária',
    nivel: 1,
    emoji: '💬',
    skills: [
      { href: '/habilidades/atendimento', label: 'Atendimento', icon: MessageCircle, nivel: 1 },
      { href: '/habilidades/agendamento', label: 'Agenda', icon: Calendar, nivel: 1 },
      { href: '/habilidades/follow-up', label: 'Follow-up', icon: UserCheck, nivel: 1 },
    ],
  },
  {
    titulo: 'Estrategista',
    nivel: 2,
    emoji: '📊',
    skills: [
      { href: '/habilidades/roteiros', label: 'Roteiro Reels', icon: PenTool, nivel: 2 },
      { href: '/habilidades/marketing', label: 'Marketing', icon: BarChart3, nivel: 2 },
      { href: '/habilidades/instagram', label: 'Instagram', icon: Instagram, nivel: 2 },
    ],
  },
  {
    titulo: 'Designer',
    nivel: 3,
    emoji: '🎨',
    skills: [
      { href: '/habilidades/avatar', label: 'Avatar IA', icon: Camera, nivel: 3 },
      { href: '/habilidades/posts', label: 'Posts', icon: Palette, nivel: 3 },
      { href: '/habilidades/marca', label: 'Marca', icon: Award, nivel: 3 },
    ],
  },
  {
    titulo: 'Audiovisual',
    nivel: 4,
    emoji: '🎬',
    skills: [
      { href: '/habilidades/video', label: 'Vídeo Avatar', icon: Video, nivel: 4 },
      { href: '/habilidades/voz', label: 'Voz Clonada', icon: Mic, nivel: 4 },
      { href: '/habilidades/editor', label: 'Editor', icon: Edit3, nivel: 4 },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<number[]>([1])

  const toggleGroup = (nivel: number) => {
    setExpandedGroups(prev =>
      prev.includes(nivel) ? prev.filter(n => n !== nivel) : [...prev, nivel]
    )
  }

  const linkClass = (href: string, exact = true) => {
    const active = exact ? pathname === href : pathname?.startsWith(href)
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${active
        ? 'bg-gradient-to-r from-[#D99773]/15 to-[#D99773]/5 text-[#D99773] border border-[#D99773]/15 shadow-[0_0_20px_rgba(217,151,115,0.05)]'
        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
      }`
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-[#0B0F19]/90 backdrop-blur-2xl border-r border-white/[0.04] flex flex-col z-50">
      {/* Subtle gradient accent on left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-[#D99773]/20 via-transparent to-[#0F4C61]/20" />

      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center shadow-lg shadow-[#D99773]/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0B0F19]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-tight">IARA</h1>
            <p className="text-[10px] text-gray-600 font-medium uppercase tracking-wider">Painel</p>
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
            {/* Unread badge */}
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#D99773]/15 text-[#D99773]">2</span>
          </Link>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2 px-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Habilidades</span>
          <div className="flex-1 h-px bg-white/[0.04]" />
        </div>

        {/* Skills Groups */}
        <div className="space-y-0.5 mb-4">
          {habilidadesMenu.map((grupo) => {
            const desbloqueado = planoAtual >= grupo.nivel
            const isExpanded = expandedGroups.includes(grupo.nivel)

            return (
              <div key={grupo.nivel}>
                <button
                  onClick={() => toggleGroup(grupo.nivel)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all cursor-pointer ${desbloqueado
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-white/[0.03]'
                      : 'text-gray-600 hover:bg-white/[0.02]'
                    }`}
                >
                  <span className="text-sm">{grupo.emoji}</span>
                  <span className="flex-1 text-left">{grupo.titulo}</span>
                  {!desbloqueado && <Lock size={11} className="text-gray-600" />}
                  <ChevronDown
                    size={13}
                    className={`text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-3 pl-3 border-l border-white/[0.04] space-y-0.5 py-0.5">
                    {grupo.skills.map((skill) => {
                      const active = pathname === skill.href
                      const habilitada = planoAtual >= skill.nivel
                      return (
                        <Link
                          key={skill.href}
                          href={skill.href}
                          className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] transition-all duration-300 ${active
                              ? 'bg-[#D99773]/10 text-[#D99773] font-semibold'
                              : habilitada
                                ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                                : 'text-gray-700 hover:bg-white/[0.02]'
                            }`}
                        >
                          {habilitada ? (
                            <skill.icon size={14} />
                          ) : (
                            <Lock size={12} strokeWidth={1.5} />
                          )}
                          <span>{skill.label}</span>
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
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Conta</span>
          <div className="flex-1 h-px bg-white/[0.04]" />
        </div>

        <Link href="/configuracoes" className={linkClass('/configuracoes')}>
          <Settings size={17} strokeWidth={1.8} />
          <span>Configurações</span>
        </Link>
        <Link href="/plano" className={linkClass('/plano')}>
          <CreditCard size={17} strokeWidth={1.8} />
          <span>Plano & Créditos</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center shadow-lg shadow-[#D99773]/10">
            <span className="text-[11px] font-bold text-white">AS</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white truncate">Dra. Ana Silva</p>
            <p className="text-[10px] text-gray-600">Plano Secretária</p>
          </div>
        </div>
        <button className="flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] text-gray-600 hover:text-red-400 hover:bg-red-500/5 w-full transition-all">
          <LogOut size={15} strokeWidth={1.8} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
