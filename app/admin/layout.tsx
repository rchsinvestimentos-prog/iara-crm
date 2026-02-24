import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#0A0A1B]">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8 transition-all duration-300">
                {children}
            </main>
        </div>
    )
}
