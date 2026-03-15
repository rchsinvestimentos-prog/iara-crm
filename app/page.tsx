'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-white">
      <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 border border-white/10">
        <img src="/iara-avatar.png" alt="IARA" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-2xl font-bold mb-1">IARA</h1>
      <p className="text-sm text-gray-400 mb-6">Assistente Virtual para Clínicas de Estética</p>
      <div className="w-6 h-6 border-2 border-[#D99773] border-t-transparent rounded-full animate-spin mb-8" />
      <div className="text-[10px] text-gray-600 flex gap-3">
        <a href="/privacidade" className="hover:text-gray-400 transition-colors">Política de Privacidade</a>
        <span>·</span>
        <a href="/termos" className="hover:text-gray-400 transition-colors">Termos de Serviço</a>
      </div>
    </div>
  )
}
