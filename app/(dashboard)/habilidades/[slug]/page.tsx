'use client'

import { useParams, useRouter } from 'next/navigation'
import { Lock, Play, ArrowUpRight, ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ReactNode, useState, useEffect } from 'react'

// Tool components (lazy loaded)
const PostsTool = dynamic(() => import('@/components/tools/PostsTool'))
const AvatarTool = dynamic(() => import('@/components/tools/AvatarTool'))
const RoteirosTool = dynamic(() => import('@/components/tools/RoteirosTool'))
const AtendimentoTool = dynamic(() => import('@/components/tools/AtendimentoTool'))
const AgendaTool = dynamic(() => import('@/components/tools/AgendaTool'))
const FollowUpTool = dynamic(() => import('@/components/tools/FollowUpTool'))
const MarketingTool = dynamic(() => import('@/components/tools/MarketingTool'))
const InstagramTool = dynamic(() => import('@/components/tools/InstagramTool'))
const MarcaTool = dynamic(() => import('@/components/tools/MarcaTool'))
const VozTool = dynamic(() => import('@/components/tools/VozTool'))
const EditorTool = dynamic(() => import('@/components/tools/EditorTool'))
const CollagemTool = dynamic(() => import('@/components/tools/CollagemTool'))

// Dados das habilidades
const skillsData: Record<string, {
    nome: string
    descricao: string
    nivel: number
    planoNome: string
    beneficios: string[]
    videoUrl?: string
    tool?: () => ReactNode
}> = {
    // === NÍVEL 1 — Essencial ===
    'atendimento': {
        nome: 'Atendimento por Texto e Áudio',
        descricao: 'A IARA atende suas clientes no WhatsApp, responde perguntas sobre procedimentos, preços e disponibilidade.',
        nivel: 1, planoNome: 'Essencial',
        beneficios: ['Respostas em menos de 1 segundo', 'Transcrição de áudios automática', 'Vendas com técnica de 7 passos', 'Funciona 24 horas'],
        tool: () => <AtendimentoTool />,
    },
    'agendamento': {
        nome: 'Agenda',
        descricao: 'Gerencie seus compromissos, configure horários e a IARA agenda automaticamente pra você.',
        nivel: 1, planoNome: 'Essencial',
        beneficios: ['Integração Google Calendar', 'Propõe 2 opções de horário', 'Lembrete automático 24h antes', 'Reagendamento automático'],
        tool: () => <AgendaTool />,
    },
    'follow-up': {
        nome: 'Follow-up Automático',
        descricao: 'A IARA envia lembretes antes dos agendamentos e recupera leads que pararam de responder.',
        nivel: 1, planoNome: 'Essencial',
        beneficios: ['Lembrete 24h e 2h antes', 'Recuperação de leads frios', 'Confirmação de presença', 'Reagendamento se não comparecer'],
        tool: () => <FollowUpTool />,
    },
    'voz': {
        nome: 'Voz da IARA',
        descricao: 'Configure a voz da IARA. No Essencial usa OpenAI. No Premium, clone sua própria voz com ElevenLabs.',
        nivel: 1, planoNome: 'Essencial',
        beneficios: ['Áudios naturais no WhatsApp', 'Plano Essencial: voz OpenAI', 'Plano Premium: clone sua voz', 'Integração ElevenLabs (Premium)'],
        tool: () => <VozTool />,
    },
    // === NÍVEL 2 — Premium ===
    'instagram': {
        nome: 'Instagram',
        descricao: 'A IARA responde DMs e comentários do Instagram da sua clínica. Atua como vendedora ativa.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Responde DMs automaticamente', 'Responde comentários com palavras-chave', 'Inicia conversa no WhatsApp', 'Venda ativa estilo "vendedora"'],
        tool: () => <InstagramTool />,
    },
    'marketing': {
        nome: 'Plano de Marketing',
        descricao: 'A IARA monta um plano de marketing mensal personalizado para sua clínica, com calendário de conteúdo.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Calendário de conteúdo mensal', 'Estratégias de captação', 'Análise de concorrência', 'Datas comemorativas'],
        tool: () => <MarketingTool />,
    },
    'roteiros': {
        nome: 'Roteiros',
        descricao: 'A IARA cria roteiros profissionais para seus Reels no Instagram, baseados nos seus procedimentos e tom de voz.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Roteiros personalizados', 'Baseado nos seus procedimentos', 'Trends do momento', 'Hooks que vendem'],
        tool: () => <RoteirosTool />,
    },
    'avatar': {
        nome: 'Fotos com IA',
        descricao: 'A IARA cria fotos profissionais suas usando IA, perfeitas para posts e anúncios.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Book profissional com IA', 'Diversas poses e cenários', 'Qualidade de estúdio', 'Ilimitado dentro do plano'],
        tool: () => <AvatarTool />,
    },
    'posts': {
        nome: 'Posts e Carrosséis',
        descricao: 'A IARA monta posts e carrosséis prontos para publicar no Instagram da sua clínica.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Posts prontos para publicar', 'Carrosséis educativos', 'Identidade visual consistente', 'Textos persuasivos'],
        tool: () => <PostsTool />,
    },
    'colagem': {
        nome: 'Antes & Depois',
        descricao: 'Monte colagens de antes e depois dos seus procedimentos com a logo da clínica. Pronto para postar.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['6 templates sofisticados', '4 formatos (Feed, Portrait, Wide, Reels)', 'Logo da clínica com transparência', 'Download em PNG alta qualidade'],
        tool: () => <CollagemTool />,
    },
    'marca': {
        nome: 'Logo & Manual de Marca',
        descricao: 'A IARA cria sua identidade visual completa: logo, paleta de cores, fontes e manual de marca.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Logo profissional', 'Paleta de cores', 'Manual de marca completo', 'Aplicações em redes sociais'],
        tool: () => <MarcaTool />,
    },
    'editor': {
        nome: 'Editor de Texto',
        descricao: 'A IARA ajuda a criar e editar legendas, textos e descrições para suas redes sociais.',
        nivel: 2, planoNome: 'Premium',
        beneficios: ['Legendas otimizadas', 'Textos persuasivos', 'Hashtags estratégicas', 'Tom de voz consistente'],
        tool: () => <EditorTool />,
    },
}

export default function HabilidadePage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    const skill = skillsData[slug]
    const [planoAtual, setPlanoAtual] = useState(1)

    useEffect(() => {
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                if (data?.nivel) setPlanoAtual(Math.min(2, Number(data.nivel)))
            })
            .catch(() => { })
    }, [])

    if (!skill) {
        return (
            <div className="animate-fade-in flex items-center justify-center h-96">
                <div className="text-center">
                    <p className="text-acinzentado">Habilidade não encontrada</p>
                    <Link href="/dashboard" className="text-terracota font-semibold mt-2 block">Voltar ao Dashboard</Link>
                </div>
            </div>
        )
    }

    const desbloqueada = planoAtual >= skill.nivel

    return (
        <div className="animate-fade-in max-w-5xl">
            {/* Voltar */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-acinzentado hover:text-petroleo text-sm mb-6 transition-colors"
            >
                <ArrowLeft size={16} /> Voltar
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <h1 className="title-serif text-2xl">{skill.nome}</h1>
                {desbloqueada ? (
                    <span className="badge badge-success">✅ Ativo</span>
                ) : (
                    <span className="badge badge-warning">
                        <Lock size={12} /> {skill.planoNome}
                    </span>
                )}
            </div>

            {desbloqueada && skill.tool ? (
                skill.tool()
            ) : (
                <>
                    <p className="text-acinzentado leading-relaxed mb-8">{skill.descricao}</p>

                    {/* Vídeo Demo */}
                    <div className="glass-card overflow-hidden mb-8">
                        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            {skill.videoUrl ? (
                                <iframe
                                    className="absolute inset-0 w-full h-full"
                                    src={skill.videoUrl}
                                    title={`Demo: ${skill.nome}`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-petroleo/5 to-terracota/10 flex flex-col items-center justify-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-terracota/20 flex items-center justify-center">
                                        <Play size={36} className="text-terracota ml-1" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-petroleo">Vídeo demonstrativo</p>
                                        <p className="text-sm text-acinzentado mt-1">Veja como funciona o {skill.nome}</p>
                                    </div>
                                    <p className="text-xs text-acinzentado/60 mt-2">📹 Em breve — vídeo sendo preparado</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Benefícios */}
                    <div className="glass-card p-6 mb-8">
                        <h3 className="font-semibold text-petroleo mb-4">O que você ganha com essa habilidade</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {skill.beneficios.map((b, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-glacial rounded-xl">
                                    <div className="w-6 h-6 rounded-full bg-verde-agua flex items-center justify-center flex-shrink-0">
                                        <Check size={14} className="text-green-600" />
                                    </div>
                                    <span className="text-sm text-petroleo">{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA */}
                    {desbloqueada ? (
                        <div className="glass-card p-6 text-center">
                            <p className="text-green-600 font-semibold mb-2">🎉 Essa habilidade está ativa!</p>
                            <p className="text-sm text-acinzentado">A IARA já está usando essa funcionalidade.</p>
                        </div>
                    ) : (
                        <div className="glass-card p-8 text-center bg-gradient-to-r from-terracota/5 to-terracota/10">
                            <h3 className="title-serif text-xl mb-2">Desbloqueie essa habilidade</h3>
                            <p className="text-acinzentado mb-4">
                                Faça upgrade para o plano <strong className="text-petroleo">{skill.planoNome}</strong>
                            </p>
                            <Link href="/plano" className="btn-primary inline-flex items-center gap-2">
                                Fazer Upgrade <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

