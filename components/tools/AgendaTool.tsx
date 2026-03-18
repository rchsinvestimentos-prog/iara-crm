'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2 } from 'lucide-react'

export default function AgendaTool() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/agenda')
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[#D99773]/10 flex items-center justify-center">
                <Calendar size={24} className="text-[#D99773]" />
            </div>
            <div className="flex items-center gap-2 text-acinzentado">
                <Loader2 size={16} className="animate-spin" />
                <span>Redirecionando para a Agenda...</span>
            </div>
        </div>
    )
}
