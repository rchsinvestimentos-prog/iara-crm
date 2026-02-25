'use client'

import { useState } from 'react'
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Filter, Search, ChevronDown } from 'lucide-react'

const feedbacks = [
    { id: 1, clinica: 'Studio Ana Silva', plano: 'Secretária', tipo: 'sugestão', msg: 'Seria ótimo se a IARA pudesse mandar o link de pagamento direto no WhatsApp.', nota: 5, data: '24/02/2026', status: 'novo' },
    { id: 2, clinica: 'Espaço Bella', plano: 'Estrategista', tipo: 'elogio', msg: 'A qualidade dos roteiros melhorou muito! Meus reels triplicaram o alcance.', nota: 5, data: '23/02/2026', status: 'lido' },
    { id: 3, clinica: 'Dra. Camila Santos', plano: 'Audiovisual', tipo: 'bug', msg: 'O vídeo do avatar ficou sem áudio na segunda geração. Tive que refazer.', nota: 3, data: '23/02/2026', status: 'resolvido' },
    { id: 4, clinica: 'Clínica Renascer', plano: 'Secretária', tipo: 'sugestão', msg: 'Preciso de um relatório mensal automático com quantos clientes a IARA atendeu.', nota: 4, data: '22/02/2026', status: 'novo' },
    { id: 5, clinica: 'Studio Beauty', plano: 'Designer', tipo: 'elogio', msg: 'O avatar ficou idêntico a mim! Minhas pacientes acharam que era real.', nota: 5, data: '21/02/2026', status: 'lido' },
    { id: 6, clinica: 'Dra. Fernanda Lima', plano: 'Estrategista', tipo: 'bug', msg: 'A análise de Instagram parou de funcionar depois que mudei meu @ do perfil.', nota: 2, data: '20/02/2026', status: 'resolvido' },
    { id: 7, clinica: 'Espaço Harmonia', plano: 'Secretária', tipo: 'sugestão', msg: 'Quero poder configurar mensagens diferentes para feriados.', nota: 4, data: '19/02/2026', status: 'lido' },
]

const tipoColor: Record<string, string> = {
    sugestão: 'bg-blue-500/10 text-blue-400',
    elogio: 'bg-green-500/10 text-green-400',
    bug: 'bg-red-500/10 text-red-400',
}

const statusColor: Record<string, string> = {
    novo: 'bg-yellow-500/10 text-yellow-400',
    lido: 'bg-gray-500/10 text-gray-400',
    resolvido: 'bg-green-500/10 text-green-400',
}

export default function FeedbackPage() {
    const [filtro, setFiltro] = useState('todos')

    const filtered = filtro === 'todos' ? feedbacks : feedbacks.filter(f => f.tipo === filtro)

    const stats = {
        total: feedbacks.length,
        sugestoes: feedbacks.filter(f => f.tipo === 'sugestão').length,
        elogios: feedbacks.filter(f => f.tipo === 'elogio').length,
        bugs: feedbacks.filter(f => f.tipo === 'bug').length,
        notaMedia: (feedbacks.reduce((a, b) => a + b.nota, 0) / feedbacks.length).toFixed(1),
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Feedback</h1>
                    <p className="text-sm text-gray-400 mt-1">Sugestões, elogios e bugs reportados pelas clientes</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: 'Total', value: stats.total, icon: MessageSquare, color: '#8B5CF6' },
                    { label: 'Sugestões', value: stats.sugestoes, icon: ThumbsUp, color: '#3B82F6' },
                    { label: 'Elogios', value: stats.elogios, icon: Star, color: '#10B981' },
                    { label: 'Bugs', value: stats.bugs, icon: ThumbsDown, color: '#EF4444' },
                    { label: 'Nota Média', value: stats.notaMedia, icon: Star, color: '#F59E0B' },
                ].map((s, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <s.icon size={16} style={{ color: s.color }} />
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                    {['todos', 'sugestão', 'elogio', 'bug'].map(t => (
                        <button
                            key={t}
                            onClick={() => setFiltro(t)}
                            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all capitalize ${filtro === t ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <Search size={14} className="text-gray-500" />
                    <input type="text" placeholder="Buscar feedback..." className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-40" />
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {filtered.map(f => (
                    <div key={f.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[13px] font-semibold text-white">{f.clinica}</span>
                                    <span className="text-[10px] text-gray-500">• {f.plano}</span>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${tipoColor[f.tipo]}`}>{f.tipo}</span>
                                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[f.status]}`}>{f.status}</span>
                                </div>
                                <p className="text-[13px] text-gray-300 leading-relaxed">{f.msg}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="flex items-center gap-0.5 mb-1">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <Star key={n} size={12} className={n <= f.nota ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-500">{f.data}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
