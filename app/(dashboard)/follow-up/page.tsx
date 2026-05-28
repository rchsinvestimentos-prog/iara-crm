'use client'

import { useEffect, useState } from 'react'
import { 
    Clock, Save, ToggleLeft, ToggleRight, MessageSquare, HelpCircle,
    Crown, Sparkles, Star, Gem, Check, ArrowRight, Loader2, Play
} from 'lucide-react'
import Link from 'next/link'

interface FollowUpConfig {
    id: string
    tipo: string
    ativo: boolean
    mensagem: string
    diasDelay: number | null
    procedimentoIds: number[]
}

interface Procedimento {
    id: number
    nome: string
}

const CAMPAIGN_INFO: Record<string, { nome: string; descricao: string; quando: string }> = {
    'pix_agendamento': {
        nome: 'Envio de Copia e Cola PIX 💸',
        descricao: 'Envia o código de pagamento ou chave PIX síncronamente logo após a reserva do agendamento.',
        quando: 'Imediatamente após agendar'
    },
    'anamnese_24h': {
        nome: 'Envio de Ficha de Anamnese 🩺',
        descricao: 'Envia o link da ficha de anamnese digital correspondente para a cliente responder e assinar.',
        quando: '24 horas antes do horário'
    },
    'lembrete_dia': {
        nome: 'Lembrete do Atendimento ⏰',
        descricao: 'Lembrete contendo hora marcada e link do Google Maps para traçar rotas de rota.',
        quando: 'No dia do atendimento (08:00)'
    },
    'pos_24h': {
        nome: 'Satisfação & Google Review ⭐',
        descricao: 'Mensagem de pós-venda perguntando como foi a sessão e link direto para avaliação automática no Google.',
        quando: '24 horas depois do procedimento'
    },
    'retorno_30d': {
        nome: 'Lembrete de Retorno (Re-engajamento) 🔄',
        descricao: 'Filtra os contatos e avisa que o prazo de retorno ou manutenção está próximo. Permite escolher o prazo em dias e quais procedimentos cadastrados disparam esta mensagem.',
        quando: 'Prazo customizável em dias'
    },
    'pos_3meses': {
        nome: 'Acompanhamento Estético (3 Meses) 💜',
        descricao: 'Mensagem amigável para monitorar o resultado estético de médio prazo.',
        quando: '3 meses depois do atendimento'
    },
    'pos_6meses': {
        nome: 'Reengajamento Semestral 🌟',
        descricao: 'Manda mensagem convidando para renovação de sobrancelha ou nova consulta.',
        quando: '6 meses depois do atendimento'
    }
}

export default function FollowUpPage() {
    const [configs, setConfigs] = useState<FollowUpConfig[]>([])
    const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
    const [nivelPlano, setNivelPlano] = useState(1)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Upgrade modal
    const [showUpgradeModal, setShowUpgradeModal] = useState(false)

    const loadData = async () => {
        setLoading(true)
        try {
            const [resFollow, resProcs] = await Promise.all([
                fetch('/api/follow-up'),
                fetch('/api/procedimentos')
            ])
            const dataFollow = await resFollow.json()
            const dataProcs = await resProcs.json()

            if (dataFollow.configs) setConfigs(dataFollow.configs)
            if (dataFollow.nivelPlano) setNivelPlano(dataFollow.nivelPlano)
            if (Array.isArray(dataProcs)) setProcedimentos(dataProcs)
        } catch (err) {
            console.error('Erro ao carregar dados:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleToggle = (tipo: string) => {
        if (nivelPlano < 2) {
            setShowUpgradeModal(true)
            return
        }

        setConfigs(prev => 
            prev.map(c => c.tipo === tipo ? { ...c, ativo: !c.ativo } : c)
        )
    }

    const handleMessageChange = (tipo: string, msg: string) => {
        if (nivelPlano < 2) return
        setConfigs(prev => 
            prev.map(c => c.tipo === tipo ? { ...c, mensagem: msg } : c)
        )
    }

    const handleDelayChange = (tipo: string, delay: number) => {
        if (nivelPlano < 2) return
        setConfigs(prev => 
            prev.map(c => c.tipo === tipo ? { ...c, diasDelay: delay } : c)
        )
    }

    const handleProcToggle = (tipo: string, procId: number) => {
        if (nivelPlano < 2) return
        setConfigs(prev => 
            prev.map(c => {
                if (c.tipo !== tipo) return c
                const ids = c.procedimentoIds || []
                const newIds = ids.includes(procId) ? ids.filter(id => id !== procId) : [...ids, procId]
                return { ...c, procedimentoIds: newIds }
            })
        )
    }

    const handleSave = async () => {
        if (nivelPlano < 2) {
            setShowUpgradeModal(true)
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/follow-up', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs })
            })

            if (res.ok) {
                alert('Preferências salvas com sucesso!')
                loadData()
            } else {
                alert('Erro ao salvar configurações.')
            }
        } catch {
            alert('Erro de conexão ao salvar.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto animate-fade-in text-[11px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-petroleo dark:text-white flex items-center gap-2">
                        <Clock className="text-terracota" />
                        Follow-Up Automático 🔄
                    </h1>
                    <p className="text-xs text-acinzentado mt-1">
                        Configure réguas de relacionamento inteligentes baseadas em tempo. A IARA dispara tudo síncronamente via WhatsApp.
                    </p>
                </div>
                
                {nivelPlano < 2 && (
                    <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold animate-pulse-soft">
                        <Crown size={14} />
                        <span>Visualização Limitada (Upgrade Necessário)</span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-10 h-10 border-4 border-[#D99773] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs text-acinzentado">Carregando régua de follow-up...</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Informações Planos */}
                    <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-dashed" style={{ borderColor: 'var(--border-hover)' }}>
                        <div className="flex-1">
                            <h3 className="font-bold text-sm text-petroleo dark:text-white flex items-center gap-1.5 mb-1.5">
                                <Sparkles size={16} className="text-terracota" /> Automação de CRM de Alto Valor
                            </h3>
                            <p className="text-acinzentado leading-relaxed">
                                Manter contato pós-procedimento aumenta a retenção de pacientes em até <strong>75%</strong>. A IARA lê a agenda de procedimentos e dispara mensagens no momento perfeito, coletando feedbacks, PIX de sinal e agendando retornos.
                            </p>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 bg-petroleo/5 dark:bg-white/5 rounded-2xl w-full md:w-44 border">
                            <p className="text-gray-400">Total de Campanhas:</p>
                            <p className="text-2xl font-bold text-terracota mt-0.5">{configs.filter(c => c.ativo).length} de {configs.length}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Ativadas</p>
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="space-y-4">
                        {configs.map(c => {
                            const info = CAMPAIGN_INFO[c.tipo] || { nome: c.tipo, descricao: '', quando: '' }
                            const isLocked = nivelPlano < 2
                            const isSelected = c.ativo

                            return (
                                <div 
                                    key={c.id} 
                                    className={`glass-card p-5 transition-all duration-300 ${isSelected ? '' : 'opacity-65 bg-gray-50/10'}`}
                                >
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex-1 space-y-3.5">
                                            {/* Título & Descrição */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-sm text-petroleo dark:text-white">{info.nome}</h3>
                                                    <span className={`badge text-[9px] py-0.5 ${isSelected ? 'badge-success' : 'bg-gray-100 text-gray-400 dark:bg-white/5'}`}>
                                                        {isSelected ? 'Ativa' : 'Inativa'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 leading-relaxed">{info.descricao}</p>
                                            </div>

                                            {/* Delay Config (exclusivo para Retorno_30d) */}
                                            {c.tipo === 'retorno_30d' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border" style={{ borderColor: 'var(--border-default)' }}>
                                                    <div>
                                                        <label className="block text-gray-500 font-bold mb-1.5">Enviar após quantos dias do atendimento?</label>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number"
                                                                value={c.diasDelay || 30}
                                                                disabled={isLocked}
                                                                onChange={(e) => handleDelayChange(c.tipo, Number(e.target.value))}
                                                                className="input-field py-1 px-3 w-20 text-center"
                                                            />
                                                            <span className="text-acinzentado">dias</span>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-gray-500 font-bold mb-1.5">Gatilho ativo para quais procedimentos?</label>
                                                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                                            {procedimentos.length === 0 ? (
                                                                <span className="text-[10px] text-gray-400 italic">Cadastre procedimentos na aba Avançado</span>
                                                            ) : (
                                                                procedimentos.map(p => {
                                                                    const pSelected = c.procedimentoIds?.includes(p.id)
                                                                    return (
                                                                        <button
                                                                            key={p.id}
                                                                            type="button"
                                                                            disabled={isLocked}
                                                                            onClick={() => handleProcToggle(c.tipo, p.id)}
                                                                            className={`px-2 py-1 rounded text-[9px] font-semibold border cursor-pointer ${
                                                                                pSelected 
                                                                                    ? 'bg-terracota border-terracota text-white' 
                                                                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 hover:opacity-85'
                                                                            }`}
                                                                        >
                                                                            {p.nome}
                                                                        </button>
                                                                    )
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Customização de texto */}
                                            <div>
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
                                                    <MessageSquare size={12} className="text-terracota" />
                                                    <span className="font-bold uppercase tracking-wider">Configuração da Mensagem WhatsApp:</span>
                                                </div>
                                                <textarea
                                                    value={c.mensagem}
                                                    disabled={isLocked}
                                                    onChange={(e) => handleMessageChange(c.tipo, e.target.value)}
                                                    rows={3}
                                                    className="input-field text-[11px] leading-relaxed"
                                                    placeholder="Digite o texto de envio da IARA..."
                                                />
                                                
                                                {/* Placeholders baseados no tipo */}
                                                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[9px] text-acinzentado">
                                                    <span>Placeholders permitidos:</span>
                                                    <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{nome_cliente}"}</span>
                                                    {c.tipo === 'lembrete_dia' && (
                                                        <>
                                                            <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{horario}"}</span>
                                                            <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{endereco_clinica}"}</span>
                                                            <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{link_maps}"}</span>
                                                        </>
                                                    )}
                                                    {c.tipo === 'pix_agendamento' && (
                                                        <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{codigo_pix}"}</span>
                                                    )}
                                                    {c.tipo === 'anamnese_24h' && (
                                                        <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{link_anamnese}"}</span>
                                                    )}
                                                    {c.tipo === 'pos_24h' && (
                                                        <span className="font-mono bg-petroleo/5 dark:bg-white/5 px-1 py-0.2 rounded font-bold">{"{link_avaliacao_google}"}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Informações extras */}
                                            <div className="text-[10px] text-gray-500">
                                                Gatilho de Disparo: <strong>{info.quando}</strong>
                                            </div>
                                        </div>

                                        {/* Toggle */}
                                        <button 
                                            onClick={() => handleToggle(c.tipo)} 
                                            className="flex-shrink-0 cursor-pointer p-1"
                                        >
                                            {c.ativo ? (
                                                <ToggleRight size={38} className="text-green-500" />
                                            ) : (
                                                <ToggleLeft size={38} className="text-gray-300 dark:text-white/10" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Salvar */}
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="btn-primary w-full py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Salvar Preferências
                    </button>
                </div>
            )}

            {/* ====== MODAL DE UPGRADE PRO PREMIUM (PLANO 1 LOCK) ====== */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div 
                        className="glass-card w-full max-w-md p-8 text-center relative overflow-hidden border border-amber-500/30"
                        style={{ boxShadow: '0 20px 50px rgba(217,151,115,0.15)' }}
                    >
                        {/* Glow effect */}
                        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#D99773] to-transparent animate-pulse" />

                        {/* Pulsing premium icon */}
                        <div className="w-16 h-16 mx-auto rounded-full bg-[#D99773]/10 flex items-center justify-center mb-5 animate-bounce">
                            <Crown size={30} className="text-[#D99773]" />
                        </div>

                        <h2 className="text-lg font-bold text-petroleo dark:text-white mb-2">Funcionalidade Exclusiva do Plano Pro ⚡</h2>
                        <p className="text-xs text-acinzentado leading-relaxed mb-6">
                            A régua de <strong>Follow-Up Automático</strong> da IARA é uma ferramenta avançada disponível a partir do <strong>Plano Pro</strong>. Automatize cobranças de PIX, lembretes de prontuários de anamnese, acompanhamento semestral e multiplique seus retornos estéticos!
                        </p>

                        {/* Comparativo simples */}
                        <div className="bg-petroleo/5 dark:bg-white/5 p-4 rounded-2xl mb-6 text-left space-y-2 border">
                            <div className="flex items-center gap-2 text-gray-500">
                                <Check size={14} className="text-gray-400" />
                                <span>Plano Essencial: WhatsApp IA síncrono (texto e áudio)</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#D99773] font-bold">
                                <Crown size={14} className="text-[#D99773] animate-pulse" />
                                <span>Plano Pro: Réguas automáticas síncronas + Instagram DM</span>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-2">
                            <Link 
                                href="/plano"
                                className="w-full py-3 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01]"
                                style={{
                                    background: 'linear-gradient(135deg, #D99773 0%, #C07A55 100%)',
                                    boxShadow: '0 4px 20px rgba(217,151,115,0.3)'
                                }}
                            >
                                Fazer Upgrade Agora <ArrowRight size={13} />
                            </Link>
                            <button 
                                onClick={() => setShowUpgradeModal(false)}
                                className="btn-secondary py-2.5 text-xs"
                            >
                                Continuar Navegando
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
