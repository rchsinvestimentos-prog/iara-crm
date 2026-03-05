'use client'

import Sidebar from '@/components/Sidebar'
import { IdiomaProvider } from '@/components/IdiomaProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <IdiomaProvider>
            <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="noise-overlay" />
                <Sidebar />
                <main className="
                    flex-1 
                    pt-[70px] px-4 pb-6
                    lg:pt-8 lg:px-8 lg:pb-8 lg:ml-[260px]
                    transition-all duration-300 relative z-10
                    w-full min-w-0
                    flex flex-col
                ">
                    <div className="flex-1">{children}</div>
                    <footer className="mt-8 pt-4 text-center" style={{ borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted, #4B5563)' }}>
                            A IARA é uma Inteligência Artificial. Ela pode cometer erros. Todas as conversas são armazenadas para fins de segurança e qualidade.
                        </p>
                        <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted, #374151)' }}>
                            © {new Date().getFullYear()} IARA — Assistente Inteligente para Clínicas de Estética
                        </p>
                    </footer>
                </main>
            </div>
        </IdiomaProvider>
    )
}
