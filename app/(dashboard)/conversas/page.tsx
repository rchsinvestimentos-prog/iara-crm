'use client'

import { useState } from 'react'
import { Search, MessageSquare, Shield, Clock } from 'lucide-react'

const mockConversas = [
    {
        telefone: '5541977777777',
        nome: 'Maria Santos',
        ultimaMsg: 'Quero agendar para amanhã às 14h!',
        hora: '14:23',
        naoLidas: 2,
        status: 'ativo',
    },
    {
        telefone: '5541988888888',
        nome: 'Ana Costa',
        ultimaMsg: 'Quanto custa a micropigmentação?',
        hora: '13:45',
        naoLidas: 0,
        status: 'ativo',
    },
    {
        telefone: '5541966666666',
        nome: 'Julia Mendes',
        ultimaMsg: 'Obrigada! Vou confirmar amanhã',
        hora: '12:20',
        naoLidas: 0,
        status: 'encerrado',
    },
    {
        telefone: '5541955555555',
        nome: 'Carla Lima',
        ultimaMsg: 'Bloqueada pela segurança',
        hora: '11:00',
        naoLidas: 0,
        status: 'bloqueada',
    },
    {
        telefone: '5541944444444',
        nome: 'Fernanda Rocha',
        ultimaMsg: 'Tá caro, não tem desconto?',
        hora: '10:30',
        naoLidas: 1,
        status: 'ativo',
    },
]

export default function ConversasPage() {
    const [busca, setBusca] = useState('')
    const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(null)

    const filtradas = mockConversas.filter(
        (c) =>
            c.nome.toLowerCase().includes(busca.toLowerCase()) ||
            c.telefone.includes(busca)
    )

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="title-serif text-2xl">Conversas</h1>
                <p className="text-acinzentado text-sm mt-1">Acompanhe os atendimentos da IARA</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
                {/* Lista de conversas */}
                <div className="glass-card p-4 overflow-hidden flex flex-col">
                    {/* Busca */}
                    <div className="relative mb-4">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-acinzentado" />
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar conversa..."
                            className="input-field pl-10"
                        />
                    </div>

                    {/* Lista */}
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {filtradas.map((conv) => (
                            <button
                                key={conv.telefone}
                                onClick={() => setConversaSelecionada(conv.telefone)}
                                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${conversaSelecionada === conv.telefone
                                        ? 'bg-terracota/10 border-2 border-terracota/30'
                                        : 'hover:bg-glacial'
                                    }`}
                            >
                                <div className="w-11 h-11 rounded-full bg-terracota/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-terracota font-bold text-sm">
                                        {conv.nome.split(' ').map((n) => n[0]).join('')}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-petroleo text-sm truncate">{conv.nome}</span>
                                        <span className="text-xs text-acinzentado ml-2">{conv.hora}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {conv.status === 'bloqueada' && <Shield size={12} className="text-red-500" />}
                                        <p className="text-xs text-acinzentado truncate">{conv.ultimaMsg}</p>
                                    </div>
                                </div>
                                {conv.naoLidas > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-terracota text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                                        {conv.naoLidas}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat */}
                <div className="lg:col-span-2 glass-card p-6 flex flex-col">
                    {conversaSelecionada ? (
                        <>
                            {/* Header do chat */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-terracota/20 flex items-center justify-center">
                                        <span className="text-terracota font-bold text-sm">
                                            {mockConversas.find((c) => c.telefone === conversaSelecionada)?.nome.split(' ').map((n) => n[0]).join('')}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-petroleo">
                                            {mockConversas.find((c) => c.telefone === conversaSelecionada)?.nome}
                                        </p>
                                        <p className="text-xs text-acinzentado">{conversaSelecionada}</p>
                                    </div>
                                </div>
                                <button className="btn-secondary text-xs">Assumir conversa</button>
                            </div>

                            {/* Mensagens mock */}
                            <div className="flex-1 overflow-y-auto py-4 space-y-3">
                                <div className="flex justify-start">
                                    <div className="bg-glacial rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[70%]">
                                        <p className="text-sm text-petroleo">Oi, quero fazer sobrancelha</p>
                                        <span className="text-xs text-acinzentado">14:20</span>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <div className="bg-terracota/10 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[70%]">
                                        <p className="text-sm text-petroleo">Oii gata! 😍 Que legal! O que te incomoda na sua sobrancelha?</p>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <span className="text-xs text-acinzentado">14:20</span>
                                            <span className="text-xs text-terracota font-medium">IARA</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="bg-glacial rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[70%]">
                                        <p className="text-sm text-petroleo">Ela é muito falhada, quero uma mais cheia</p>
                                        <span className="text-xs text-acinzentado">14:22</span>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <div className="bg-terracota/10 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[70%]">
                                        <p className="text-sm text-petroleo">Entendo perfeitamente! 💜 A Micro Fio a Fio é perfeita pro seu caso! Fica super natural e dura 1-2 anos.</p>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <span className="text-xs text-acinzentado">14:23</span>
                                            <span className="text-xs text-terracota font-medium">IARA</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare size={48} className="text-terracota/30 mx-auto mb-3" />
                                <p className="text-acinzentado">Selecione uma conversa</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
