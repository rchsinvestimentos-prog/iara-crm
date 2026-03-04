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

// Dados de vendas (só para skills Premium bloqueadas)
const salesData: Record<string, { headline: string; ganho: string; metrica: string; depoimento: string; autorDepo: string }> = {
    'instagram': {
        headline: 'Suas DMs do Instagram estão paradas enquanto clientes mandam mensagens e ninguém responde.',
        ganho: '+R$ 3.200/mês',
        metrica: 'Clínicas que ativaram o Instagram Bot recuperam em média 8 leads/semana que iam embora',
        depoimento: 'Ativei o bot e no primeiro mês já agendei 12 clientes que vieram do Instagram. Nunca mais perdi DM.',
        autorDepo: 'Dra. Camila — Harmonização Facial',
    },
    'marketing': {
        headline: 'Você posta quando lembra, sem estratégia. E se depara com o feed parado por semanas.',
        ganho: '+45% engajamento',
        metrica: 'Clínicas com plano de marketing têm 3x mais consistência de postagens e 45% mais engajamento',
        depoimento: 'Eu nunca sabia o que postar. Agora a IARA me manda o calendário pronto toda semana.',
        autorDepo: 'Dra. Fernanda — Estética Corporal',
    },
    'roteiros': {
        headline: 'Você sabe que precisa gravar Reels, mas fica travada sem saber o que falar.',
        ganho: '+5 Reels/semana',
        metrica: 'Profissionais que usam roteiros prontos gravam 5x mais vídeos por semana',
        depoimento: 'Em 2 minutos tenho o roteiro pronto. Gravo, posto e vou atender. Simples assim.',
        autorDepo: 'Dra. Juliana — Dermatologia Estética',
    },
    'avatar': {
        headline: 'Fotos profissionais custam R$ 800+ por sessão. E você nunca tem fotos novas para postar.',
        ganho: 'Economia de R$ 800/mês',
        metrica: 'Fotos geradas por IA ficam prontas em 30 segundos, sem sair do consultório',
        depoimento: 'Minhas pacientes perguntam qual fotógrafo eu uso. É a IA! Ninguém acredita.',
        autorDepo: 'Dra. Patrícia — Bioestimuladores',
    },
    'posts': {
        headline: 'Contratar um social media custa R$ 2.000/mês. A IARA faz o mesmo em segundos.',
        ganho: 'Economia de R$ 2.000/mês',
        metrica: 'Posts e carrosséis prontos em menos de 1 minuto, na sua identidade visual',
        depoimento: 'Demiti meu social media e uso a IARA. A qualidade é a mesma e eu economizo R$ 2 mil.',
        autorDepo: 'Dra. Renata — Lábios e Preenchimento',
    },
    'colagem': {
        headline: 'Antes e depois é o conteúdo que mais converte. Mas montar no Canva leva tempo demais.',
        ganho: '+30% conversão em posts',
        metrica: 'Posts de antes/depois geram 3x mais salvamentos e 2x mais agendamentos',
        depoimento: 'Faço a colagem em 20 segundos e já posto. Antes eu levava 15 minutos no Canva.',
        autorDepo: 'Dra. Amanda — Skincare e Peeling',
    },
    'marca': {
        headline: 'Sua clínica não tem identidade visual. Uma logo profissional custa R$ 1.500+.',
        ganho: 'Economia de R$ 1.500',
        metrica: 'Logo + manual de marca + paleta de cores gerados em menos de 5 minutos',
        depoimento: 'Criei minha logo e manual de marca em 5 minutos. Ficou mais bonito que o designer cobrou R$ 2 mil.',
        autorDepo: 'Dra. Beatriz — Clínica Nova',
    },
    'editor': {
        headline: 'Legendas ruins matam posts bons. Você escreve na correria e sabe que podia ser melhor.',
        ganho: '+60% alcance',
        metrica: 'Legendas otimizadas com hashtags estratégicas aumentam alcance em até 60%',
        depoimento: 'As legendas que a IARA faz são melhores que as minhas. E ela ainda coloca hashtags certas.',
        autorDepo: 'Dra. Vanessa — Estética Avançada',
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
    const sales = salesData[slug]

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
                /* ==========================================
                   MINI PÁGINA DE VENDAS (skill bloqueada)
                   ========================================== */
                <div className="space-y-6">
                    {/* Hero — Headline persuasiva */}
                    <div className="glass-card p-8 border-l-4 border-terracota" style={{ background: 'var(--bg-card)' }}>
                        <p className="text-lg font-semibold leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
                            {sales?.headline || skill.descricao}
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {skill.descricao}
                        </p>
                    </div>

                    {/* Métrica de impacto */}
                    {sales && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card p-6 text-center border-2 border-green-500/20 bg-green-500/5">
                                <p className="text-3xl font-bold text-green-500 mb-1">{sales.ganho}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimativa de ganho/economia</p>
                            </div>
                            <div className="glass-card p-6 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-terracota/10 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg">📊</span>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{sales.metrica}</p>
                            </div>
                        </div>
                    )}

                    {/* Vídeo Demo */}
                    <div className="glass-card overflow-hidden">
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
                                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Veja como funciona</p>
                                        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{skill.nome} em ação</p>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>📹 Vídeo em breve</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* O que você está perdendo */}
                    <div className="glass-card p-6">
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>🚀 O que você está perdendo</h3>
                        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Tudo isso fica disponível ao ativar o {skill.nome}:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {skill.beneficios.map((b, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <Check size={14} className="text-green-400" />
                                    </div>
                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Depoimento */}
                    {sales && (
                        <div className="glass-card p-6 border-l-4" style={{ borderLeftColor: 'var(--border-default)' }}>
                            <p className="text-sm italic leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                                &ldquo;{sales.depoimento}&rdquo;
                            </p>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>— {sales.autorDepo}</p>
                        </div>
                    )}

                    {/* CTA Final — Urgência + Preço */}
                    <div className="glass-card p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(217,151,115,0.08))' }}>
                        <div className="w-16 h-16 rounded-full bg-terracota/15 flex items-center justify-center mx-auto mb-4">
                            <Lock size={28} className="text-terracota" />
                        </div>
                        <h3 className="title-serif text-xl mb-2">
                            Desbloqueie o {skill.nome}
                        </h3>
                        <p className="mb-1" style={{ color: 'var(--text-muted)' }}>
                            Disponível no plano <strong style={{ color: 'var(--text-primary)' }}>{skill.planoNome}</strong>
                        </p>
                        {sales && (
                            <p className="text-sm text-green-500 font-semibold mb-4">
                                Estimativa: {sales.ganho} ao ativar essa habilidade
                            </p>
                        )}
                        <Link
                            href="/plano"
                            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-semibold transition-all hover:-translate-y-0.5"
                            style={{
                                background: 'linear-gradient(135deg, #8B5CF6, #D99773)',
                                boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
                            }}
                        >
                            Fazer Upgrade para o Premium <ArrowUpRight size={16} />
                        </Link>
                        <p className="text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
                            ✅ 7 dias de garantia • Cancele quando quiser • Sem multa
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

