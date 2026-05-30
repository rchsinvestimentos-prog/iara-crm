'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Info, Shield, Bell, Globe } from 'lucide-react'

export default function AdminConfigPage() {
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)

    // Placeholder configs
    const [config, setConfig] = useState({
        manutencao: false,
        registroAberto: true,
        limiteClinicas: 500,
        notificacoesAdmin: true,
    })

    const handleSave = async () => {
        setLoading(true)
        setSaved(false)
        try {
            // TODO: POST to /api/admin/config
            await new Promise(r => setTimeout(r, 800))
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings className="text-violet-400" size={24} />
                    Configurações Globais
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                    Ajustes que afetam todo o sistema
                </p>
            </div>

            <div className="max-w-2xl space-y-6">
                {/* Manutenção */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield size={18} className="text-orange-400" />
                            <div>
                                <p className="text-white text-sm font-medium">Modo Manutenção</p>
                                <p className="text-gray-500 text-xs">Bloqueia acesso de clientes ao painel</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setConfig(c => ({ ...c, manutencao: !c.manutencao }))}
                            className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${config.manutencao ? 'bg-orange-500' : 'bg-gray-700'}`}
                        >
                            <span className={`w-5 h-5 rounded-full bg-white shadow transition-all ${config.manutencao ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Registro */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Globe size={18} className="text-blue-400" />
                            <div>
                                <p className="text-white text-sm font-medium">Registro Aberto</p>
                                <p className="text-gray-500 text-xs">Permite novas clínicas se cadastrarem</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setConfig(c => ({ ...c, registroAberto: !c.registroAberto }))}
                            className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${config.registroAberto ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                            <span className={`w-5 h-5 rounded-full bg-white shadow transition-all ${config.registroAberto ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Limite Clínicas */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Info size={18} className="text-violet-400" />
                        <div>
                            <p className="text-white text-sm font-medium">Limite de Clínicas Simultâneas</p>
                            <p className="text-gray-500 text-xs">Máximo de clínicas ativas no sistema</p>
                        </div>
                    </div>
                    <input
                        type="number"
                        value={config.limiteClinicas}
                        onChange={e => setConfig(c => ({ ...c, limiteClinicas: parseInt(e.target.value) || 0 }))}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-32 focus:outline-none focus:border-violet-500"
                    />
                </div>

                {/* Notificações */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell size={18} className="text-green-400" />
                            <div>
                                <p className="text-white text-sm font-medium">Notificações Admin</p>
                                <p className="text-gray-500 text-xs">Receber alertas de erros e eventos críticos</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setConfig(c => ({ ...c, notificacoesAdmin: !c.notificacoesAdmin }))}
                            className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${config.notificacoesAdmin ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                            <span className={`w-5 h-5 rounded-full bg-white shadow transition-all ${config.notificacoesAdmin ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Salvar */}
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {saved ? '✅ Salvo!' : 'Salvar Configurações'}
                </button>
            </div>
        </div>
    )
}
