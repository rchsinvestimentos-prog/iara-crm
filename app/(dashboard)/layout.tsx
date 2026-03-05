'use client'

import Sidebar from '@/components/Sidebar'
import { IdiomaProvider } from '@/components/IdiomaProvider'
import TermosModal from '@/components/TermosModal'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [showTermos, setShowTermos] = useState(false)
    const [loading, setLoading] = useState(true)
    const [nomeClinica, setNomeClinica] = useState('')
    const isLegalPage = ['/termos', '/privacidade'].includes(pathname || '')

    useEffect(() => {
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                if (!data?.aceite_termos && !data?.aceiteTermos) {
                    setShowTermos(true)
                }
                setNomeClinica(data?.nome_clinica || data?.nomeClinica || '')
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

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
                        <p className="text-[9px] mt-1 space-x-2" style={{ color: 'var(--text-muted, #374151)' }}>
                            <Link href="/termos" className="hover:underline">Termos de Uso</Link>
                            <span>·</span>
                            <Link href="/privacidade" className="hover:underline">Política de Privacidade</Link>
                            <span>·</span>
                            <span>© {new Date().getFullYear()} IARA</span>
                        </p>
                    </footer>
                </main>
            </div>

            {/* Modal de aceite — NÃO aparece em /termos e /privacidade */}
            {!loading && showTermos && !isLegalPage && (
                <TermosModal
                    nomeClinica={nomeClinica}
                    onAccept={() => setShowTermos(false)}
                />
            )}
        </IdiomaProvider>
    )
}
