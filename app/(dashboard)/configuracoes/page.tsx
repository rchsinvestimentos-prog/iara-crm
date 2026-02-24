'use client'

import dynamic from 'next/dynamic'

const ConfiguracoesTool = dynamic(() => import('@/components/tools/ConfiguracoesTool'))

export default function ConfiguracoesPage() {
    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#0F4C61] tracking-tight">Configurações ⚙️</h1>
                <p className="text-sm text-gray-400 mt-1">Dados da clínica, procedimentos e conexão WhatsApp</p>
            </div>
            <ConfiguracoesTool />
        </div>
    )
}
