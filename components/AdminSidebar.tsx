'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    AlertTriangle,
    MessageSquare,
    Activity,
    Users,
    CreditCard,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Settings,
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/clinicas', label: 'Clínicas', icon: Building2 },
    { href: '/admin/conversas', label: 'Conversas', icon: MessageSquare },
    { href: '/admin/logs', label: 'Logs & Erros', icon: AlertTriangle },
    { href: '/admin/saude', label: 'Saúde do Sistema', icon: Activity },
    { href: '/admin/financeiro', label: 'Financeiro', icon: CreditCard },
    { href: '/admin/config', label: 'Config Global', icon: Settings },
]

export default function AdminSidebar() {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={`fixed left-0 top-0 h-screen bg-[#0F0F23] border-r border-white/5 flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            {/* Logo */}
            <div className="p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">I</span>
                </div>
                {!collapsed && (
                    <div>
                        <h1 className="text-lg font-bold text-white">IARA</h1>
                        <p className="text-xs text-violet-300/60">Admin Panel</p>
                    </div>
                )}
            </div>

            <div className="mx-4 border-t border-white/5" />

            {/* Menu */}
            <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
                    const isExactDash = item.href === '/admin' && pathname === '/admin'
                    const active = isActive || isExactDash
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={18} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    )
                })}
            </nav>

            {/* User / Collapse */}
            <div className="border-t border-white/5 p-3 space-y-1">
                {!collapsed && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-violet-500/30 flex items-center justify-center">
                            <Users size={14} className="text-violet-300" />
                        </div>
                        <div>
                            <p className="text-white text-xs font-semibold">Rafael</p>
                            <p className="text-violet-300/50 text-xs">Administrador</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 w-full transition-all"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span>Recolher</span>}
                </button>
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/60 hover:text-red-400 hover:bg-red-500/10 w-full transition-all">
                    <LogOut size={18} />
                    {!collapsed && <span>Sair</span>}
                </button>
            </div>
        </aside>
    )
}
