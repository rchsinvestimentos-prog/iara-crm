'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Building2, Bot, Sparkles, Star } from 'lucide-react'

const ConfiguracoesTool = dynamic(() => import('@/components/tools/ConfiguracoesTool'))
const AtendimentoTool = dynamic(() => import('@/components/tools/AtendimentoTool'))

const tabs = [
    { id: 'clinica', label: 'Clínica', icon: Building2, emoji: '🏥' },
    { id: 'secretaria', label: 'Secretária IA', icon: Bot, emoji: '🤖' },
    { id: 'servicos', label: 'Serviços', icon: Sparkles, emoji: '💅' },
    { id: 'avancado', label: 'Avançado', icon: Star, emoji: '⭐' },
] as const

type TabId = typeof tabs[number]['id']

export default function ConfiguracoesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('clinica')

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[#0F4C61] tracking-tight">Configurações ⚙️</h1>
                <p className="text-sm text-gray-400 mt-1">Tudo em um só lugar — clínica, IARA, serviços e mais</p>
            </div>

            {/* ====== TABS ====== */}
            <div className="flex gap-1 p-1 mb-6 rounded-xl overflow-x-auto" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all flex-1 justify-center"
                            style={{
                                backgroundColor: isActive ? '#D99773' : 'transparent',
                                color: isActive ? '#fff' : 'var(--text-muted)',
                                boxShadow: isActive ? '0 2px 8px rgba(217,151,115,0.25)' : 'none',
                            }}
                        >
                            <span className="text-sm">{tab.emoji}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* ====== CONTEÚDO DAS TABS ====== */}
            {activeTab === 'clinica' && <ConfiguracoesTool section="clinica" />}
            {activeTab === 'secretaria' && <AtendimentoTool />}
            {activeTab === 'servicos' && <ConfiguracoesTool section="servicos" />}
            {activeTab === 'avancado' && <ConfiguracoesTool section="avancado" />}
        </div>
    )
}
