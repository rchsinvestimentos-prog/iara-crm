import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="noise-overlay" />
            <Sidebar />
            <main className="flex-1 ml-[260px] p-8 transition-all duration-300 relative z-10">
                {children}
            </main>
        </div>
    )
}
