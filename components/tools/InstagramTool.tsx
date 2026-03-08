'use client'

import { useState } from 'react'
import { Instagram, TrendingUp, Clock, Hash, Eye, Heart, MessageSquare, Users, Wand2, ArrowUp, ArrowDown } from 'lucide-react'
import { useFeatureLimit } from '@/hooks/useFeatureLimit'
import FeatureLimitBanner from '@/components/FeatureLimitBanner'

const metricas = [
    { label: 'Seguidores', valor: '2.847', change: '+124', up: true, icon: Users },
    { label: 'Engajamento', valor: '4.2%', change: '+0.8%', up: true, icon: Heart },
    { label: 'Alcance/Post', valor: '1.2k', change: '-3%', up: false, icon: Eye },
    { label: 'Comentários/Post', valor: '18', change: '+5', up: true, icon: MessageSquare },
]

const melhoresHorarios = [
    { dia: 'Segunda', horario: '19:00', engajamento: 85 },
    { dia: 'Terça', horario: '12:00', engajamento: 72 },
    { dia: 'Quarta', horario: '19:00', engajamento: 78 },
    { dia: 'Quinta', horario: '20:00', engajamento: 91 },
    { dia: 'Sexta', horario: '18:00', engajamento: 68 },
    { dia: 'Sábado', horario: '10:00', engajamento: 55 },
]

const sugestoes = [
    { tipo: '🔴 Urgente', texto: 'Sua bio não tem CTA. Adicione "📲 Agende pelo link abaixo" e um link direto pro WhatsApp.', prioridade: 'high' },
    { tipo: '🟡 Melhoria', texto: 'Seus Reels têm 3x mais alcance que posts estáticos. Aumente a frequência de 1 para 3 por semana.', prioridade: 'medium' },
    { tipo: '🟡 Melhoria', texto: 'Use mais carrosséis educativos — eles têm 2x mais salvamentos que posts únicos no seu nicho.', prioridade: 'medium' },
    { tipo: '🟢 Bom', texto: 'Seus Stories têm taxa de resposta acima da média (12%). Continue usando enquetes e caixas de perguntas.', prioridade: 'low' },
    { tipo: '🟢 Bonusaos', texto: 'Considere usar Collab Posts com parceiras que atendem o mesmo público (esteticistas, dermatologistas).', prioridade: 'low' },
]

const hashtagsSugeridas = [
    '#micropigmentação', '#sobrancelhaperfeita', '#fioafio', '#beautysp',
    '#sobrancelhas', '#microblading', '#designdesobrancelha', '#belezanatural',
    '#estetica', '#sejasuamelhorversao',
]

export default function InstagramTool() {
    const [analisando, setAnalisando] = useState(false)
    const [handle, setHandle] = useState('')
    const [analise, setAnalise] = useState<any>(null)
    const feature = useFeatureLimit('raioX')

    const handleAnalisar = async () => {
        if (!handle.trim()) { alert('Digite o @ do Instagram'); return }
        if (!feature.permitido) { alert('Você atingiu o limite de análises grátis este mês! Faça upgrade.'); return }
        setAnalisando(true)
        try {
            const res = await fetch('/api/gerar-conteudo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo: 'raioX', handle })
            })
            const data = await res.json()
            if (data.sucesso) {
                setAnalise(data.analise)
                feature.increment()
            } else {
                alert(data.error || 'Erro ao analisar perfil')
            }
        } catch {
            alert('Erro de conexão. Tente novamente.')
        } finally {
            setAnalisando(false)
        }
    }

    return (
        <div className="space-y-6">
            <FeatureLimitBanner {...feature} />

            {/* Input do handle */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                    <Instagram size={15} className="text-[#D99773]" />
                    Analisar Perfil
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={handle}
                        onChange={e => setHandle(e.target.value)}
                        placeholder="@nomedaclinica"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                        onClick={handleAnalisar}
                        className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                        disabled={analisando}
                    >
                        {analisando ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Wand2 size={12} />
                        )}
                        Re-analisar
                    </button>
                </div>
                <div className="space-y-2">
                    {sugestoes.map((s, i) => (
                        <div key={i} className={`p-3 rounded-xl ${s.prioridade === 'high' ? 'bg-red-50/50' : s.prioridade === 'medium' ? 'bg-amber-50/50' : 'bg-green-50/50'
                            }`}>
                            <span className="text-[10px] font-semibold">{s.tipo}</span>
                            <p className="text-[12px] text-gray-600 mt-1">{s.texto}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Melhores horários */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                        <Clock size={15} className="text-[#D99773]" />
                        Melhores Horários
                    </h3>
                    <div className="space-y-2">
                        {melhoresHorarios.map((h, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-400 w-14">{h.dia.slice(0, 3)}</span>
                                <span className="text-[12px] font-semibold text-[#0F4C61] w-12">{h.horario}</span>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-[#D99773] to-[#0F4C61]" style={{ width: `${h.engajamento}%` }} />
                                </div>
                                <span className="text-[10px] text-gray-400 w-8 text-right">{h.engajamento}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hashtags */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                        <Hash size={15} className="text-[#D99773]" />
                        Hashtags Sugeridas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {hashtagsSugeridas.map((h, i) => (
                            <span key={i} className="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 text-[#0F4C61] hover:bg-[#D99773]/10 hover:text-[#D99773] cursor-pointer transition-colors">
                                {h}
                            </span>
                        ))}
                    </div>
                    <button className="w-full mt-3 text-[11px] text-[#D99773] font-medium hover:underline">
                        Copiar todas as hashtags
                    </button>
                </div>
            </div>
        </div>
    )
}
