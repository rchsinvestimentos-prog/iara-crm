'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Redirect antigo /agendar/[slug] → novo /a/[slug]
 * Mantido apenas para compatibilidade com links já compartilhados.
 */
export default function RedirectAgendar() {
    const params = useParams()
    const router = useRouter()
    const slug = params?.slug as string

    useEffect(() => {
        if (slug) {
            router.replace(`/a/${slug}`)
        }
    }, [slug, router])

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5f0' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #e8ddd4', borderTop: '3px solid #D99773', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ color: '#8c7b6b', fontSize: 14 }}>Redirecionando...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        </div>
    )
}
