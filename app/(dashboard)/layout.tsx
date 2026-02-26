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
                ">
                    {children}
                </main>
            </div>
        </IdiomaProvider>
    )
}
