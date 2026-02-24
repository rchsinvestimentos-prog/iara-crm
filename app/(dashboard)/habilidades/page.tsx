'use client'

import {
    MessageSquare,
    Mic,
    Calendar,
    UserCheck,
    BarChart3,
    Instagram,
    FileText,
    Camera,
    Paintbrush,
    Palette,
    Video,
    Wand2,
    Lock,
    Check,
} from 'lucide-react'

const planoAtual = 1 // nível atual da cliente — vem do banco

interface Skill {
    nome: string
    descricao: string
    icon: React.ReactNode
    nivel: number
}

const habilidades: { titulo: string; nivel: number; preco: string; cor: string; skills: Skill[] }[] = [
    {
        titulo: 'Secretária',
        nivel: 1,
        preco: 'R$ 97/mês',
        cor: '#06D6A0',
        skills: [
            { nome: 'Atendimento por Texto', descricao: 'Responde clientes via WhatsApp', icon: <MessageSquare size={20} />, nivel: 1 },
            { nome: 'Atendimento por Áudio', descricao: 'Transcreve e responde áudios', icon: <Mic size={20} />, nivel: 1 },
            { nome: 'Agendamento Automático', descricao: 'Agenda no Google Calendar', icon: <Calendar size={20} />, nivel: 1 },
            { nome: 'Follow-up', descricao: 'Lembra 24h e 2h antes', icon: <UserCheck size={20} />, nivel: 1 },
        ],
    },
    {
        titulo: 'Estrategista',
        nivel: 2,
        preco: 'R$ 197/mês',
        cor: '#F59E0B',
        skills: [
            { nome: 'Roteiro de Reels', descricao: 'Gera roteiros para Instagram', icon: <FileText size={20} />, nivel: 2 },
            { nome: 'Plano de Marketing', descricao: 'Estratégias personalizadas', icon: <BarChart3 size={20} />, nivel: 2 },
            { nome: 'Análise do Instagram', descricao: 'Analisa perfil e métricas', icon: <Instagram size={20} />, nivel: 2 },
        ],
    },
    {
        titulo: 'Designer',
        nivel: 3,
        preco: 'R$ 297/mês',
        cor: '#D99773',
        skills: [
            { nome: 'Avatar Fotorrealista', descricao: 'Book profissional com IA', icon: <Camera size={20} />, nivel: 3 },
            { nome: 'Posts Carrossel', descricao: 'Monta posts para Instagram', icon: <Paintbrush size={20} />, nivel: 3 },
            { nome: 'Logo + Manual de Marca', descricao: 'Identidade visual completa', icon: <Palette size={20} />, nivel: 3 },
        ],
    },
    {
        titulo: 'Audiovisual',
        nivel: 4,
        preco: 'R$ 497/mês',
        cor: '#0F4C61',
        skills: [
            { nome: 'Vídeo com Avatar', descricao: 'Gera vídeos via HeyGen', icon: <Video size={20} />, nivel: 4 },
            { nome: 'Voz Clonada', descricao: 'Sua voz via ElevenLabs', icon: <Mic size={20} />, nivel: 4 },
            { nome: 'Editor de Vídeo', descricao: 'Edições minimalistas', icon: <Wand2 size={20} />, nivel: 4 },
        ],
    },
]

export default function HabilidadesPage() {
    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="title-serif text-2xl">Habilidades da IARA</h1>
                <p className="text-acinzentado text-sm mt-1">
                    Sua IARA é <span className="font-semibold text-terracota">Nível {planoAtual}</span> — desbloqueie novas habilidades fazendo upgrade
                </p>
            </div>

            <div className="space-y-8">
                {habilidades.map((grupo) => {
                    const desbloqueado = planoAtual >= grupo.nivel
                    return (
                        <div key={grupo.nivel}>
                            {/* Cabeçalho do nível */}
                            <div className="flex items-center gap-3 mb-4">
                                <div
                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: desbloqueado ? grupo.cor : '#CBD5E1' }}
                                >
                                    {grupo.nivel}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-petroleo">
                                        IARA {grupo.titulo}
                                    </h2>
                                    <p className="text-xs text-acinzentado">{grupo.preco}</p>
                                </div>
                                {desbloqueado ? (
                                    <span className="badge badge-success ml-auto">
                                        <Check size={14} /> Ativo
                                    </span>
                                ) : (
                                    <button className="btn-primary text-xs ml-auto py-2 px-4">
                                        Fazer Upgrade
                                    </button>
                                )}
                            </div>

                            {/* Skills Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {grupo.skills.map((skill) => {
                                    const habilitada = planoAtual >= skill.nivel
                                    return (
                                        <button
                                            key={skill.nome}
                                            disabled={!habilitada}
                                            className={`glass-card p-5 text-left transition-all ${habilitada
                                                    ? 'cursor-pointer hover:border-terracota/30'
                                                    : 'opacity-50 cursor-not-allowed !transform-none'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${habilitada ? 'bg-terracota/15 text-terracota' : 'bg-gray-200 text-gray-400'
                                                        }`}
                                                >
                                                    {habilitada ? skill.icon : <Lock size={18} />}
                                                </div>
                                                <span className="font-semibold text-sm text-petroleo">{skill.nome}</span>
                                            </div>
                                            <p className="text-xs text-acinzentado">{skill.descricao}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
