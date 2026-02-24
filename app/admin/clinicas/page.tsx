'use client'

import { useState } from 'react'
import { Building2, Search, Filter, Eye, MoreVertical, MessageSquare, Calendar, Activity } from 'lucide-react'

const clinicas = [
    { id: 1, nome: 'Dra. Ana Silva', email: 'ana@clinica.com', cidade: 'São Paulo', plano: 'Secretária', preço: 97, status: 'ativa', msgs_mes: 3420, leads: 89, agendamentos: 34, uptime: 99.9, desde: '2025-11-15' },
    { id: 2, nome: 'Dra. Beatriz Costa', email: 'bia@beleza.com', cidade: 'Rio de Janeiro', plano: 'Estrategista', preço: 197, status: 'ativa', msgs_mes: 2180, leads: 67, agendamentos: 28, uptime: 99.7, desde: '2025-12-01' },
    { id: 3, nome: 'Dra. Carla Mendes', email: 'carla@estetica.com', cidade: 'Belo Horizonte', plano: 'Designer', preço: 297, status: 'ativa', msgs_mes: 1540, leads: 45, agendamentos: 19, uptime: 98.5, desde: '2026-01-10' },
    { id: 4, nome: 'Dra. Diana Rocha', email: 'diana@beauty.com', cidade: 'Curitiba', plano: 'Audiovisual', preço: 497, status: 'ativa', msgs_mes: 4200, leads: 112, agendamentos: 52, uptime: 99.8, desde: '2025-10-20' },
    { id: 5, nome: 'Dra. Elena Santos', email: 'elena@micro.com', cidade: 'Brasília', plano: 'Secretária', preço: 97, status: 'ativa', msgs_mes: 980, leads: 31, agendamentos: 12, uptime: 99.9, desde: '2026-02-01' },
    { id: 6, nome: 'Dra. Flávia Lima', email: 'flavia@pele.com', cidade: 'Florianópolis', plano: 'Secretária', preço: 97, status: 'trial', msgs_mes: 230, leads: 8, agendamentos: 3, uptime: 100, desde: '2026-02-18' },
    { id: 7, nome: 'Dra. Gabriela Torres', email: 'gabi@face.com', cidade: 'Porto Alegre', plano: 'Estrategista', preço: 197, status: 'inadimplente', msgs_mes: 0, leads: 0, agendamentos: 0, uptime: 0, desde: '2025-09-05' },
]

const planoCor: Record<string, string> = {
    'Secretária': 'text-green-400 bg-green-400/10',
    'Estrategista': 'text-amber-400 bg-amber-400/10',
    'Designer': 'text-orange-400 bg-orange-400/10',
    'Audiovisual': 'text-violet-400 bg-violet-400/10',
}

const statusCor: Record<string, string> = {
    'ativa': 'text-green-400',
    'trial': 'text-blue-400',
    'inadimplente': 'text-red-400',
    'pausada': 'text-gray-400',
}

export default function AdminClinicas() {
    const [busca, setBusca] = useState('')
    const [filtroPlano, setFiltroPlano] = useState('todos')

    const filtradas = clinicas.filter(c => {
        const matchBusca = c.nome.toLowerCase().includes(busca.toLowerCase()) || c.cidade.toLowerCase().includes(busca.toLowerCase())
        const matchPlano = filtroPlano === 'todos' || c.plano === filtroPlano
        return matchBusca && matchPlano
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Clínicas</h1>
                <p className="text-gray-500 text-sm mt-1">{clinicas.length} clínicas cadastradas • {clinicas.filter(c => c.status === 'ativa').length} ativas</p>
            </div>

            {/* Filtros */}
            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-violet-500/50"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar por nome ou cidade..."
                    />
                </div>
                <select
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 outline-none focus:border-violet-500/50"
                    value={filtroPlano}
                    onChange={(e) => setFiltroPlano(e.target.value)}
                >
                    <option value="todos">Todos os planos</option>
                    <option value="Secretária">Secretária</option>
                    <option value="Estrategista">Estrategista</option>
                    <option value="Designer">Designer</option>
                    <option value="Audiovisual">Audiovisual</option>
                </select>
            </div>

            {/* Tabela */}
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Clínica</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Plano</th>
                                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Msgs/mês</th>
                                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Leads</th>
                                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Agend.</th>
                                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">Uptime</th>
                                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtradas.map((c) => (
                                <tr key={c.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 text-xs font-bold">
                                                {c.nome.split(' ').slice(1).map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{c.nome}</p>
                                                <p className="text-gray-600 text-xs">{c.cidade}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planoCor[c.plano]}`}>
                                            {c.plano}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`text-xs font-medium capitalize ${statusCor[c.status]}`}>
                                            • {c.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right text-sm text-gray-300">{c.msgs_mes.toLocaleString()}</td>
                                    <td className="px-5 py-4 text-right text-sm text-gray-300">{c.leads}</td>
                                    <td className="px-5 py-4 text-right text-sm text-gray-300">{c.agendamentos}</td>
                                    <td className="px-5 py-4 text-right">
                                        <span className={`text-sm ${c.uptime >= 99.5 ? 'text-green-400' : c.uptime >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {c.uptime}%
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                                            <Eye size={16} className="text-gray-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
