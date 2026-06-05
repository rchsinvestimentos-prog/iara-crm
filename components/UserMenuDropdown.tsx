'use client'

import { useRef, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  Lock,
  Camera,
  LogOut,
  User,
  Sun,
  Moon,
  ChevronRight,
  X,
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import Image from 'next/image'

interface UserMenuDropdownProps {
  onClose: () => void
  onOpenTrocarSenha: () => void
  onOpenFotoPerfil: () => void
  avatarUrl?: string | null
}

export default function UserMenuDropdown({
  onClose,
  onOpenTrocarSenha,
  onOpenFotoPerfil,
  avatarUrl,
}: UserMenuDropdownProps) {
  const { data: session } = useSession()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const ref = useRef<HTMLDivElement>(null)

  const userName = (session?.user as any)?.name || session?.user?.email || 'Usuário'
  const userEmail = session?.user?.email || ''
  const userType = (session?.user as any)?.userType || ''
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  const userTypeBadge: Record<string, { label: string; color: string }> = {
    admin: { label: '👑 Admin', color: '#D99773' },
    profissional: { label: '👩‍⚕️ Profissional', color: '#06D6A0' },
  }
  const badge = userTypeBadge[userType]

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const menuBg = isDark ? '#1a1f2e' : '#ffffff'
  const menuBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,76,97,0.1)'
  const itemHoverBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.04)'
  const textPrimary = isDark ? '#E5E7EB' : '#0F4C61'
  const textMuted = isDark ? '#6B7280' : '#94A3B8'
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)'

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl shadow-2xl z-50 border overflow-hidden animate-fade-in"
      style={{
        backgroundColor: menuBg,
        borderColor: menuBorder,
        boxShadow: isDark
          ? '0 -8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 -8px 40px rgba(15,76,97,0.12), 0 0 0 1px rgba(15,76,97,0.06)',
      }}
    >
      {/* Faixa de gradiente no topo */}
      <div
        className="h-[2px] w-full"
        style={{
          background: 'linear-gradient(90deg, #D99773, #0F4C61)',
        }}
      />

      {/* Header: avatar + info */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-bold text-white text-[15px]"
            style={{
              background: 'linear-gradient(135deg, #D99773, #0F4C61)',
              boxShadow: '0 4px 12px rgba(217,151,115,0.3)',
            }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={userName}
                width={44}
                height={44}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span>{initials || <User size={18} />}</span>
            )}
          </div>
          {/* Indicador online */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2"
            style={{ borderColor: menuBg }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: textPrimary }}>
            {userName}
          </p>
          <p className="text-[11px] truncate" style={{ color: textMuted }}>
            {userEmail}
          </p>
          {badge && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block"
              style={{ color: badge.color, backgroundColor: `${badge.color}18` }}
            >
              {badge.label}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:scale-110"
          style={{ color: textMuted, backgroundColor: itemHoverBg }}
          title="Fechar"
        >
          <X size={13} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: dividerColor, margin: '0 16px' }} />

      {/* Menu items */}
      <div className="py-2 px-2">
        {/* Foto de Perfil */}
        <MenuItem
          icon={<Camera size={15} />}
          label="Foto de Perfil"
          description="Altere sua foto do painel"
          onClick={() => { onOpenFotoPerfil(); onClose() }}
          accentColor="#D99773"
          isDark={isDark}
          hoverBg={itemHoverBg}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />

        {/* Redefinir Senha */}
        <MenuItem
          icon={<Lock size={15} />}
          label="Redefinir Senha"
          description="Altere sua senha de acesso"
          onClick={() => { onOpenTrocarSenha(); onClose() }}
          accentColor="#0F4C61"
          isDark={isDark}
          hoverBg={itemHoverBg}
          textPrimary={textPrimary}
          textMuted={textMuted}
        />

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: dividerColor, margin: '8px 8px' }} />

        {/* Tema */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
          style={{ color: textPrimary }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = itemHoverBg)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(15,76,97,0.08)', color: isDark ? '#FBBF24' : '#0F4C61' }}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium">{isDark ? 'Modo Claro' : 'Modo Escuro'}</p>
            <p className="text-[10px]" style={{ color: textMuted }}>
              {isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            </p>
          </div>
          <div
            className="w-9 h-5 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0"
            style={{ backgroundColor: isDark ? '#D99773' : 'rgba(15,76,97,0.15)' }}
          >
            <div
              className="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ transform: isDark ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </div>
        </button>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: dividerColor, margin: '8px 8px' }} />

        {/* Sair */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)'
            e.currentTarget.style.color = '#EF4444'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = textMuted
          }}
          style={{ color: textMuted }}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
          >
            <LogOut size={14} />
          </span>
          <p className="text-[12px] font-medium">Sair da Conta</p>
        </button>
      </div>
    </div>
  )
}

// Sub-componente de item de menu
function MenuItem({
  icon,
  label,
  description,
  onClick,
  accentColor,
  isDark,
  hoverBg,
  textPrimary,
  textMuted,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
  accentColor: string
  isDark: boolean
  hoverBg: string
  textPrimary: string
  textMuted: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium" style={{ color: textPrimary }}>{label}</p>
        <p className="text-[10px]" style={{ color: textMuted }}>{description}</p>
      </div>
      <ChevronRight size={12} style={{ color: textMuted }} className="group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}
