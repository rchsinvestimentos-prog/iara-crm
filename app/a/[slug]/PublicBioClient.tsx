'use client'

import {
    Instagram, ExternalLink, MapPin, MessageCircle,
    Stethoscope, BookOpen, Package, Tag, Check,
    Percent, DollarSign, Clock, Monitor, MapPinned,
    ChevronDown, ChevronUp, Users as UsersIcon, X, Calendar as CalendarIcon, Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface Procedimento {
    id: number; nome: string; valor: number; desconto: number
    parcelas: number | null; duracao: number | null; descricao: string | null
}
interface Curso {
    id: string; nome: string; modalidade: string; valor: number
    duracao: string | null; vagas: number | null; desconto: number
    descricao: string | null; link: string | null
}
interface Combo {
    id: string; nome: string; descricao: string | null
    valor_original: number; valor_combo: number; procedimentos: string[]
}
interface Promocao {
    id: string; nome: string; descricao: string | null
    tipo_desconto: string; valor_desconto: number
    data_inicio: string; data_fim: string; procedimentos: string[]
}

interface Props {
    profissionalId: string
    clinicaId: number
    nome: string
    tratamento: string | null
    especialidade: string | null
    bio: string | null
    fotoUrl: string | null
    whatsapp: string | null
    linkConfig: {
        cor1?: string; cor2?: string; corTexto1?: string; corTexto2?: string
        nomeApp?: string; logotipoUrl?: string; endereco?: string
        instagram?: string; tiktok?: string; youtube?: string; linkedin?: string
    }
    nomeClinica: string
    procedimentos: Procedimento[]
    cursos: Curso[]
    combos: Combo[]
    promocoes: Promocao[]
}

export default function PublicBioClient({
    profissionalId, clinicaId,
    nome, tratamento, especialidade, bio, fotoUrl, whatsapp,
    linkConfig, nomeClinica, procedimentos, cursos, combos, promocoes
}: Props) {
    const [expandedProc, setExpandedProc] = useState<number | null>(null)
    const [expandedCombo, setExpandedCombo] = useState<string | null>(null)

    // Agendamento State
    const [bookingProc, setBookingProc] = useState<Procedimento | null>(null)
    const [bookingDate, setBookingDate] = useState<string>('')
    const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [selectedSlot, setSelectedSlot] = useState<string>('')
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [patientName, setPatientName] = useState('')
    const [patientPhone, setPatientPhone] = useState('')
    const [bookingStatus, setBookingStatus] = useState<'idle'|'loading'|'success'|'error'>('idle')

    const cor1 = linkConfig.cor1 || '#D99773'
    const cor2 = linkConfig.cor2 || '#1a1a2e'
    const displayName = tratamento ? `${tratamento} ${linkConfig.nomeApp || nome}` : (linkConfig.nomeApp || nome)
    const whatsappLink = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, '')}` : null

    const economia = (orig: number, combo: number) => {
        if (orig <= 0) return 0
        return Math.round(((orig - combo) / orig) * 100)
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const hasSocials = linkConfig.instagram || linkConfig.tiktok || linkConfig.youtube || linkConfig.linkedin

    // Gerar próximos 14 dias
    const nextDays = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return d
    })

    const fetchSlots = async (dateStr: string, duracao: number) => {
        setBookingDate(dateStr)
        setSelectedSlot('')
        setLoadingSlots(true)
        try {
            const res = await fetch(`/api/agendamento-publico/horarios?profissionalId=${profissionalId}&data=${dateStr}&duracao=${duracao}`)
            const data = await res.json()
            setAvailableSlots(data.slots || [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoadingSlots(false)
        }
    }

    const handleBookingSubmit = async () => {
        if (!bookingProc || !bookingDate || !selectedSlot || !patientName || !patientPhone) return
        setBookingStatus('loading')
        try {
            const res = await fetch('/api/agendamento-publico/reservar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinicaId,
                    profissionalId,
                    nomePaciente: patientName,
                    telefone: patientPhone,
                    procedimento: bookingProc.nome,
                    data: bookingDate,
                    horario: selectedSlot,
                    duracao: bookingProc.duracao || 30,
                    valor: bookingProc.valor
                })
            })
            if (!res.ok) throw new Error()
            setBookingStatus('success')
        } catch (e) {
            setBookingStatus('error')
        }
    }

    const formatWeekDay = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
    const formatDayNum = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit' })
    const toDateString = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    return (
        <div className="min-h-screen relative" style={{ backgroundColor: '#f8f6f3' }}>
            {/* Profile Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${cor2} 0%, ${cor1}40 100%)` }} />
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 120%, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />

                <div className="relative pt-12 pb-8 px-6 flex flex-col items-center text-center">
                    {fotoUrl ? (
                        <div className="relative mb-4">
                            <div className="w-28 h-28 rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${cor1}, ${cor1}80, ${cor1}40)` }}>
                                <img src={fotoUrl} alt={nome} className="w-full h-full rounded-full object-cover border-3 border-white" />
                            </div>
                        </div>
                    ) : (
                        <div className="w-28 h-28 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${cor1}20` }}>
                            <span className="text-5xl">👩‍⚕️</span>
                        </div>
                    )}

                    <h1 className="text-2xl font-bold text-white drop-shadow-sm">{displayName}</h1>
                    {especialidade && <p className="text-sm text-white/70 mt-1 font-medium">{especialidade}</p>}
                    {bio && <p className="text-sm text-white/60 mt-3 max-w-xs leading-relaxed">{bio}</p>}

                    {hasSocials && (
                        <div className="flex gap-4 mt-4">
                            {linkConfig.instagram && (
                                <a href={`https://instagram.com/${linkConfig.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-110">
                                    <Instagram size={18} className="text-white" />
                                </a>
                            )}
                            {linkConfig.tiktok && (
                                <a href={`https://tiktok.com/@${linkConfig.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-110">
                                    <span className="text-white text-lg font-bold">T</span>
                                </a>
                            )}
                            {linkConfig.youtube && (
                                <a href={linkConfig.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-110">
                                    <span className="text-white text-sm font-bold">▶</span>
                                </a>
                            )}
                        </div>
                    )}

                    {linkConfig.endereco && (
                        <div className="flex items-center gap-1.5 mt-3 text-white/50 text-xs">
                            <MapPin size={12} />
                            <span>{linkConfig.endereco}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content sections */}
            <div className="px-4 -mt-4 relative z-10 pb-28 space-y-4 max-w-lg mx-auto">
                {/* Promoções ativas */}
                {promocoes.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Tag size={16} style={{ color: cor1 }} />
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Promoções</h2>
                        </div>
                        <div className="space-y-2">
                            {promocoes.map(p => (
                                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-800 text-sm">{p.nome}</h3>
                                            {p.descricao && <p className="text-xs text-gray-400 mt-1">{p.descricao}</p>}
                                        </div>
                                        <div className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${cor1}15`, color: cor1 }}>
                                            {p.tipo_desconto === 'percentual' ? `${p.valor_desconto}% OFF` : `R$${p.valor_desconto} OFF`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                                        <span>Até {formatDate(p.data_fim)}</span>
                                        {p.procedimentos.length > 0 && <span>• {p.procedimentos.join(', ')}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Procedimentos */}
                {procedimentos.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Stethoscope size={16} style={{ color: cor1 }} />
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Serviços e Agendamento</h2>
                        </div>
                        <div className="space-y-2">
                            {procedimentos.map(p => (
                                <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                        onClick={() => setExpandedProc(expandedProc === p.id ? null : p.id)}>
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h3 className="font-semibold text-gray-900 text-[15px]">{p.nome}</h3>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                {p.valor > 0 && (
                                                    <span className="text-sm font-bold" style={{ color: cor1 }}>
                                                        R$ {p.valor.toFixed(2)}
                                                        {p.desconto > 0 && (
                                                            <span className="text-green-500 ml-1 text-xs">
                                                                (- R$ {p.desconto.toFixed(2)})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {p.duracao && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        <Clock size={12} /> {p.duracao} min
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setBookingProc(p); }}
                                            className="px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 transition-transform active:scale-95"
                                            style={{ backgroundColor: cor1 }}
                                        >
                                            Agendar
                                        </button>
                                    </div>
                                    {expandedProc === p.id && p.descricao && (
                                        <div className="px-4 pb-4 pt-1 text-sm text-gray-500 bg-gray-50/30">
                                            <p className="leading-relaxed">{p.descricao}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Combos */}
                {combos.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Package size={16} style={{ color: cor1 }} />
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Pacotes & Combos</h2>
                        </div>
                        <div className="space-y-2">
                            {combos.map(c => (
                                <div key={c.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedCombo(expandedCombo === c.id ? null : c.id)}>
                                        <div>
                                            <h3 className="font-medium text-gray-800 text-sm">{c.nome}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400 line-through">R$ {c.valor_original.toFixed(2)}</span>
                                                <span className="text-sm font-bold" style={{ color: cor1 }}>R$ {c.valor_combo.toFixed(2)}</span>
                                                {economia(c.valor_original, c.valor_combo) > 0 && <span className="bg-green-50 text-green-600 rounded-full px-2 py-0.5 text-[10px] font-bold">-{economia(c.valor_original, c.valor_combo)}%</span>}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setBookingProc({
                                                    id: parseInt(c.id.slice(0, 5), 16), // Mock ID
                                                    nome: c.nome,
                                                    valor: c.valor_combo,
                                                    desconto: c.valor_original - c.valor_combo,
                                                    parcelas: 1, 
                                                    duracao: 60, // Mock duration
                                                    descricao: c.descricao
                                                }); 
                                            }}
                                            className="px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0 ml-4 transition-transform active:scale-95"
                                            style={{ backgroundColor: cor1 }}
                                        >
                                            Agendar
                                        </button>
                                    </div>
                                    {expandedCombo === c.id && (
                                        <div className="px-4 pb-3 bg-gray-50/30 pt-2">
                                            {c.descricao && <p className="text-xs text-gray-500 mb-3">{c.descricao}</p>}
                                            {c.procedimentos.length > 0 && (
                                                <ul className="space-y-1.5">
                                                    {c.procedimentos.map((nome, i) => (
                                                        <li key={i} className="text-xs text-gray-600 flex items-center gap-2 font-medium">
                                                            <div className="w-4 h-4 rounded-full flex items-center justify-center bg-green-100">
                                                                <Check size={10} className="text-green-600" /> 
                                                            </div>
                                                            {nome}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <div className="text-center pt-4 pb-2">
                    {nomeClinica && <p className="text-xs text-gray-400">{nomeClinica}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">
                        Powered by <strong className="font-semibold text-gray-600">IARA</strong>
                    </p>
                </div>
            </div>

            {/* Modal de Agendamento */}
            {bookingProc && (
                <div className="fixed inset-0 z-[100] flex sm:items-center items-end justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setBookingProc(null)} />
                    
                    <div className="relative bg-[#f8f6f3] w-full sm:w-[460px] max-h-[90vh] sm:rounded-[32px] rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
                        {/* Header do Modal */}
                        <div className="bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Agendar Horário</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{bookingProc.nome}</p>
                            </div>
                            <button onClick={() => { setBookingProc(null); setBookingStatus('idle'); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-8 pb-safe">
                            {bookingStatus === 'success' ? (
                                <div className="py-12 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50">
                                        <Check size={40} className="text-green-600" />
                                    </div>
                                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Reserva Confirmada!</h4>
                                    <p className="text-gray-500 text-sm max-w-[260px] leading-relaxed">
                                        Seu horário para <strong>{bookingProc.nome}</strong> no dia <strong>{bookingDate.split('-').reverse().join('/')}</strong> às <strong>{selectedSlot}</strong> foi agendado com sucesso.
                                    </p>
                                    <button 
                                        onClick={() => { setBookingProc(null); setBookingStatus('idle'); }}
                                        className="mt-8 px-8 py-3.5 rounded-xl font-bold text-white transition-all active:scale-95 text-sm"
                                        style={{ backgroundColor: cor1 }}
                                    >
                                        Concluir
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Passo 1: Data */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                            <CalendarIcon size={16} style={{ color: cor1 }} /> 
                                            Escolha o Dia
                                        </label>
                                        <div className="flex gap-2 overflow-x-auto pb-4 snap-x no-scrollbar">
                                            {nextDays.map((d, i) => {
                                                const dateStr = toDateString(d)
                                                const isSelected = bookingDate === dateStr
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => fetchSlots(dateStr, bookingProc.duracao || 30)}
                                                        className={`shrink-0 snap-center flex flex-col items-center justify-center w-[72px] h-[84px] rounded-2xl border transition-all ${
                                                            isSelected 
                                                                ? 'border-transparent text-white shadow-md scale-105' 
                                                                : 'border-white bg-white text-gray-600 hover:border-gray-200'
                                                        }`}
                                                        style={isSelected ? { backgroundColor: cor1 } : undefined}
                                                    >
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                                            {formatWeekDay(d)}
                                                        </span>
                                                        <span className="text-2xl font-bold">{formatDayNum(d)}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Passo 2: Horário */}
                                    {bookingDate && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                <Clock size={16} style={{ color: cor1 }} /> 
                                                Horários Disponíveis
                                            </label>
                                            
                                            {loadingSlots ? (
                                                <div className="py-8 flex justify-center">
                                                    <Loader2 size={24} className="animate-spin text-gray-400" />
                                                </div>
                                            ) : availableSlots.length === 0 ? (
                                                <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-sm text-center border border-orange-100">
                                                    Poxa, nenhum horário livre neste dia. Tente outra data!
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                                    {availableSlots.map(slot => (
                                                        <button
                                                            key={slot}
                                                            onClick={() => setSelectedSlot(slot)}
                                                            className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                                                                selectedSlot === slot
                                                                    ? 'border-transparent text-white shadow-sm'
                                                                    : 'border-white bg-white text-gray-600 hover:border-gray-200'
                                                            }`}
                                                            style={selectedSlot === slot ? { backgroundColor: cor1 } : undefined}
                                                        >
                                                            {slot}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Passo 3: Dados Pessoais */}
                                    {selectedSlot && (
                                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Seu Nome</label>
                                                    <input 
                                                        type="text" 
                                                        value={patientName}
                                                        onChange={e => setPatientName(e.target.value)}
                                                        className="w-full mt-1 px-4 py-3.5 bg-white border border-gray-100 focus:border-gray-300 rounded-xl outline-none text-gray-800 font-medium transition-colors"
                                                        placeholder="Ex: Maria Silva"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">WhatsApp</label>
                                                    <input 
                                                        type="tel" 
                                                        value={patientPhone}
                                                        onChange={e => setPatientPhone(e.target.value)}
                                                        className="w-full mt-1 px-4 py-3.5 bg-white border border-gray-100 focus:border-gray-300 rounded-xl outline-none text-gray-800 font-medium transition-colors"
                                                        placeholder="(11) 99999-9999"
                                                    />
                                                </div>
                                            </div>

                                            {bookingStatus === 'error' && (
                                                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-medium border border-red-100">
                                                    Ocorreu um erro ao salvar o agendamento. Tente novamente.
                                                </div>
                                            )}

                                            <button 
                                                onClick={handleBookingSubmit}
                                                disabled={!patientName || !patientPhone || bookingStatus === 'loading'}
                                                className="w-full py-4 rounded-xl text-white font-bold text-[15px] shadow-lg shadow-black/5 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 mt-6"
                                                style={{ backgroundColor: cor1 }}
                                            >
                                                {bookingStatus === 'loading' ? (
                                                    <Loader2 size={20} className="animate-spin" />
                                                ) : (
                                                    `Confirmar Reserva às ${selectedSlot}`
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
