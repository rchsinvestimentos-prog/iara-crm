import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#0A0A1B]">
            <AdminSidebar />
            <main className="flex-1 pt-16 px-4 pb-6 lg:pt-8 lg:px-8 lg:pb-8 lg:ml-64 transition-all duration-300 w-full min-w-0">
                {children}
            </main>
        </div>
    )
}

