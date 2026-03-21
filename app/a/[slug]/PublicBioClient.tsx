'use client'

import {
    Instagram, ExternalLink, MapPin, MessageCircle,
    Stethoscope, BookOpen, Package, Tag, Check,
    Percent, DollarSign, Clock, Monitor, MapPinned,
    ChevronDown, ChevronUp, Users as UsersIcon
} from 'lucide-react'
import { useState } from 'react'

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
    nome, tratamento, especialidade, bio, fotoUrl, whatsapp,
    linkConfig, nomeClinica, procedimentos, cursos, combos, promocoes
}: Props) {
    const [expandedProc, setExpandedProc] = useState<number | null>(null)
    const [expandedCombo, setExpandedCombo] = useState<string | null>(null)

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

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#f8f6f3' }}>
            {/* Profile Header — Instagram style */}
            <div className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0" style={{
                    background: `linear-gradient(135deg, ${cor2} 0%, ${cor1}40 100%)`
                }} />
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(circle at 50% 120%, rgba(255,255,255,0.08) 0%, transparent 60%)'
                }} />

                <div className="relative pt-12 pb-8 px-6 flex flex-col items-center text-center">
                    {/* Avatar */}
                    {fotoUrl ? (
                        <div className="relative mb-4">
                            <div className="w-28 h-28 rounded-full p-[3px]" style={{
                                background: `linear-gradient(135deg, ${cor1}, ${cor1}80, ${cor1}40)`
                            }}>
                                <img src={fotoUrl} alt={nome}
                                    className="w-full h-full rounded-full object-cover border-3 border-white"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="w-28 h-28 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: `${cor1}20` }}>
                            <span className="text-5xl">👩‍⚕️</span>
                        </div>
                    )}

                    <h1 className="text-2xl font-bold text-white drop-shadow-sm">{displayName}</h1>
                    {especialidade && (
                        <p className="text-sm text-white/70 mt-1 font-medium">{especialidade}</p>
                    )}
                    {bio && (
                        <p className="text-sm text-white/60 mt-3 max-w-xs leading-relaxed">{bio}</p>
                    )}

                    {/* Social icons */}
                    {hasSocials && (
                        <div className="flex gap-4 mt-4">
                            {linkConfig.instagram && (
                                <a href={`https://instagram.com/${linkConfig.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-110">
                                    <Instagram size={18} className="text-white" />
                                </a>
                            )}
                            {linkConfig.tiktok && (
                                <a href={`https://tiktok.com/@${linkConfig.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-110">
                                    <span className="text-white text-lg font-bold">T</span>
                                </a>
                            )}
                            {linkConfig.youtube && (
                                <a href={linkConfig.youtube} target="_blank" rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all hover:scale-110">
                                    <span className="text-white text-sm font-bold">▶</span>
                                </a>
                            )}
                        </div>
                    )}

                    {/* Address */}
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

                {/* 🔥 Promoções ativas */}
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
                                            {p.tipo_desconto === 'percentual'
                                                ? `${p.valor_desconto}% OFF`
                                                : `R$${p.valor_desconto} OFF`
                                            }
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                                        <span>Até {formatDate(p.data_fim)}</span>
                                        {p.procedimentos.length > 0 && (
                                            <span>• {p.procedimentos.join(', ')}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 💉 Procedimentos */}
                {procedimentos.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Stethoscope size={16} style={{ color: cor1 }} />
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Procedimentos</h2>
                        </div>
                        <div className="space-y-2">
                            {procedimentos.map(p => (
                                <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between p-4 cursor-pointer"
                                        onClick={() => setExpandedProc(expandedProc === p.id ? null : p.id)}>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-800 text-sm">{p.nome}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                {p.valor > 0 && (
                                                    <span className="text-xs font-semibold" style={{ color: cor1 }}>
                                                        R$ {p.valor.toFixed(2)}
                                                        {p.desconto > 0 && (
                                                            <span className="text-green-500 ml-1 text-[10px]">
                                                                (-R$ {p.desconto.toFixed(2)})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {p.duracao && (
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                                        <Clock size={10} /> {p.duracao}min
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {p.descricao && (
                                            expandedProc === p.id
                                                ? <ChevronUp size={16} className="text-gray-300" />
                                                : <ChevronDown size={16} className="text-gray-300" />
                                        )}
                                    </div>
                                    {expandedProc === p.id && p.descricao && (
                                        <div className="px-4 pb-3 text-xs text-gray-400 border-t border-gray-50 pt-2">
                                            {p.descricao}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 📦 Combos */}
                {combos.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Package size={16} style={{ color: cor1 }} />
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Combos</h2>
                        </div>
                        <div className="space-y-2">
                            {combos.map(c => (
                                <div key={c.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between p-4 cursor-pointer"
                                        onClick={() => setExpandedCombo(expandedCombo === c.id ? null : c.id)}>
                                        <div>
                                            <h3 className="font-medium text-gray-800 text-sm">{c.nome}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400 line-through">R$ {c.valor_original.toFixed(2)}</span>
                                                <span className="text-sm font-bold" style={{ color: cor1 }}>R$ {c.valor_combo.toFixed(2)}</span>
                                                {economia(c.valor_original, c.valor_combo) > 0 && (
                                                    <span className="bg-green-50 text-green-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                                                        -{economia(c.valor_original, c.valor_combo)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {c.procedimentos.length > 0 && (
                                            expandedCombo === c.id
                                                ? <ChevronUp size={16} className="text-gray-300" />
                                                : <ChevronDown size={16} className="text-gray-300" />
                                        )}
                                    </div>
                                    {expandedCombo === c.id && (
                                        <div className="px-4 pb-3 border-t border-gray-50 pt-2">
                                            {c.descricao && <p className="text-xs text-gray-400 mb-2">{c.descricao}</p>}
                                            {c.procedimentos.length > 0 && (
                                                <ul className="space-y-1">
                                                    {c.procedimentos.map((nome, i) => (
                                                        <li key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                                                            <Check size={10} style={{ color: cor1 }} /> {nome}
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

                {/* 📚 Cursos */}
                {cursos.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <BookOpen size={16} style={{ color: cor1 }} />
                            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Cursos</h2>
                        </div>
                        <div className="space-y-2">
                            {cursos.map(c => (
                                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-gray-800 text-sm">{c.nome}</h3>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.modalidade === 'online'
                                                    ? 'bg-blue-50 text-blue-500'
                                                    : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    {c.modalidade === 'online' ? '🖥 Online' : '📍 Presencial'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                                {c.valor > 0 && (
                                                    <span className="text-xs font-semibold" style={{ color: cor1 }}>
                                                        R$ {c.valor.toFixed(2)}
                                                        {c.desconto > 0 && <span className="text-green-500 ml-1">({c.desconto}% off)</span>}
                                                    </span>
                                                )}
                                                {c.duracao && <span className="text-[11px] text-gray-400">{c.duracao}</span>}
                                                {c.vagas && (
                                                    <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                                                        <UsersIcon size={10} /> {c.vagas} vagas
                                                    </span>
                                                )}
                                            </div>
                                            {c.descricao && <p className="text-xs text-gray-400 mt-2">{c.descricao}</p>}
                                        </div>
                                    </div>
                                    {c.link && (
                                        <a href={c.link} target="_blank" rel="noopener noreferrer"
                                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                                            style={{ backgroundColor: cor1 }}>
                                            <ExternalLink size={12} /> Inscreva-se
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <div className="text-center pt-4 pb-2">
                    {nomeClinica && <p className="text-xs text-gray-300">{nomeClinica}</p>}
                    <p className="text-[10px] text-gray-300 mt-1">
                        Powered by <strong className="font-semibold">IARA</strong>
                    </p>
                </div>
            </div>

            {/* Floating CTA — WhatsApp */}
            {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold text-sm transition-all hover:scale-105 active:scale-95"
                    style={{
                        backgroundColor: cor1,
                        boxShadow: `0 8px 32px ${cor1}50`
                    }}>
                    <MessageCircle size={20} />
                    Agendar por WhatsApp
                </a>
            )}
        </div>
    )
}
