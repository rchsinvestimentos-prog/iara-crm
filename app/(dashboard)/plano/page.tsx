'use client'

import { useEffect, useState } from 'react'
import { PLANO_UNICO, PLANO_UNICO_CHAVE, PACOTES, INSTAGRAM_HABILITADO } from '@/lib/planos'
import { CARENCIA_PAGAMENTO_DIAS, diasPendente } from '@/lib/pagamentos/pendencia'
import CheckoutModal from '@/components/CheckoutModal'
import { Check, Loader2, Smartphone, Plus, Crown, Mic, AlertTriangle } from 'lucide-react'

// Plano único desde 10/11/2026. A Hotmart não aparece aqui: ela fica só para
// as vendas dos afiliados, que chegam pelo link deles.
const COR = '#D99773'

const DESTAQUES: string[] = [
    'WhatsApp com IA 24h (texto e áudio)',
    `${PLANO_UNICO.whatsapps} WhatsApps conectados`,
    'Agendamento automático',
    'Follow-ups inteligentes',
    'Promoções e combos',
    'CRM com funil e contatos',
    'Ficha de anamnese assinada',
    'Ficha da paciente com fotos',
    '4 idiomas',
    'Equipe com vários profissionais',
    'Multi-clínica',
    INSTAGRAM_HABILITADO ? 'Instagram DM com IA' : 'Instagram DM com IA (em breve)',
    'Prioridade no atendimento',
]

const plano = {
    chave: PLANO_UNICO_CHAVE,
    nome: PLANO_UNICO.nome,
    nivel: PLANO_UNICO.nivel,
    creditos: PLANO_UNICO.creditos,
    cor: COR,
    icon: Crown,
    features: DESTAQUES,
    precos: { BRL: PLANO_UNICO.precos.brl, USD: PLANO_UNICO.precos.usd, EUR: PLANO_UNICO.precos.eur },
}
const vozRealista = PACOTES.voz_realista

interface StatsData {
    creditosRestantes: number
    plano: number
    nomeClinica: string
    nomeIA: string
}

export default function PlanoPage() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [moeda, setMoeda] = useState<'USD' | 'EUR' | 'BRL'>('USD')
    const [simbolo, setSimbolo] = useState('$')
    const [comprando, setComprando] = useState(false)
    const [comprandoPlano, setComprandoPlano] = useState(false)
    // Pendência de pagamento e PIX liberado (lib/pagamentos/pendencia.ts)
    const [pix, setPix] = useState<{ liberado: boolean; valor?: number; diasPendente: number | null }>({ liberado: false, diasPendente: null })
    const [comprandoVoz, setComprandoVoz] = useState(false)
    // null = ainda não sei. Só mostra "Adicionar" quando a resposta disser
    // que não tem: mostrar antes faria quem já pagou pagar de novo.
    const [temVozRealista, setTemVozRealista] = useState<boolean | null>(null)
    const [contaAtiva, setContaAtiva] = useState(true)

    const conferirVozRealista = () => {
        fetch('/api/clinica')
            .then(r => {
                if (!r.ok) throw new Error(`/api/clinica respondeu ${r.status}`)
                return r.json()
            })
            .then(data => {
                const cfg = data?.configuracoes || {}
                setContaAtiva(data?.status === 'ativo')
                setTemVozRealista(!!cfg.pacote_voz_realista)
                const valor = Number(cfg.pix_valor)
                setPix({
                    liberado: cfg.pix_liberado === true,
                    valor: Number.isFinite(valor) && valor > 0 ? valor : undefined,
                    diasPendente: diasPendente(cfg),
                })
            })
            .catch(err => {
                console.error('[Plano] Não consegui conferir o pacote de voz:', err)
                setTemVozRealista(null)
            })
    }

    useEffect(() => {
        fetch('/api/stats')
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false))

        // Detect currency from clinic country
        fetch('/api/clinica')
            .then(r => r.json())
            .then(data => {
                const pais = data?.pais || 'US'
                if (pais === 'BR') { setMoeda('BRL'); setSimbolo('R$') }
                else if (['PT', 'ES'].includes(pais)) { setMoeda('EUR'); setSimbolo('€') }
                else { setMoeda('USD'); setSimbolo('$') }
            })
            .catch(() => { })

        conferirVozRealista()
    }, [])

    // Tem o plano quando a conta está ativa no nível do plano único.
    const temPlano = contaAtiva && (stats?.plano ?? 0) >= plano.nivel
    const creditosMensais = plano.creditos
    const creditosRestantes = stats?.creditosRestantes ?? 0
    const creditosTotal = Math.max(creditosMensais, creditosRestantes)
    const creditosUsados = Math.max(0, creditosTotal - creditosRestantes)
    const percentUsado = creditosTotal > 0 ? Math.min(100, Math.max(0, (creditosUsados / creditosTotal) * 100)) : 0

    const precoInstanciaExtra = Math.ceil(plano.precos[moeda] / 2)

    const handleComprarInstancia = async () => {
        setComprando(true)
        try {
            const res = await fetch('/api/instancias/comprar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moeda }),
            })
            const data = await res.json()
            if (data?.checkoutUrl) {
                window.open(data.checkoutUrl, '_blank')
            } else {
                alert('Link de pagamento em breve. Entre em contato com o suporte.')
            }
        } catch {
            alert('Erro ao processar. Tente novamente.')
        } finally {
            setComprando(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center animate-fade-in">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Plano & Créditos
                </h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    Um plano só, com tudo liberado para a sua clínica crescer com a {stats?.nomeIA || 'IARA'}
                </p>
            </div>

            {/* Uso atual */}
            <div className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-[#D99773]" />
                        <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>Carregando dados...</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                Plano: <span className="font-bold" style={{ color: plano.cor }}>{temPlano ? plano.nome : 'sem plano ativo'}</span>
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                {stats?.creditosRestantes ?? 0} créditos restantes
                            </p>
                        </div>
                        <div className="w-56">
                            <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                                <span>{creditosUsados} usados</span>
                                <span>{creditosTotal} total</span>
                            </div>
                            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${percentUsado}%`,
                                        background: percentUsado > 80
                                            ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                                            : `linear-gradient(90deg, ${plano.cor}, ${plano.cor}CC)`,
                                    }}
                                />
                            </div>
                            {percentUsado > 80 && (
                                <p className="text-[10px] text-red-500 mt-1">⚠️ Créditos acabando!</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Pagamento pendente: cartão falhou ou assinatura cancelada. */}
            {pix.diasPendente !== null && (
                <div className="rounded-2xl p-4 flex items-start gap-3 animate-fade-in" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        <p className="font-semibold">O pagamento do seu plano não foi concluído.</p>
                        <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {pix.diasPendente >= CARENCIA_PAGAMENTO_DIAS
                                ? 'A IARA parou de responder as pacientes. Pague abaixo para ela voltar na hora.'
                                : `A IARA continua atendendo por mais ${CARENCIA_PAGAMENTO_DIAS - pix.diasPendente} dia(s). Pague abaixo para não interromper.`}
                        </p>
                    </div>
                </div>
            )}

            {/* Um card só, centralizado: o Black é o único plano à venda. */}
            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                {[plano].map((plano, i) => {
                    const isAtual = temPlano
                    const preco = plano.precos[moeda]

                    return (
                        <div
                            key={plano.nome}
                            className="group relative backdrop-blur-xl rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1 overflow-hidden animate-fade-in h-full flex flex-col"
                            style={{
                                animationDelay: `${i * 0.1}s`,
                                backgroundColor: 'var(--bg-card)',
                                border: `2px solid ${plano.cor}${isAtual ? '' : '60'}`,
                            }}
                        >
                            {/* Glow */}
                            <div
                                className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: `linear-gradient(90deg, transparent, ${plano.cor}, transparent)` }}
                            />

                            {isAtual && (
                                <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: `${plano.cor}20`, color: plano.cor }}>
                                    Seu plano ✓
                                </div>
                            )}

                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${plano.cor}15` }}>
                                <plano.icon size={22} style={{ color: plano.cor }} />
                            </div>

                            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{plano.nome}</h3>
                            <div className="flex items-baseline gap-1 mb-5">
                                <span className="text-3xl font-bold" style={{ color: plano.cor }}>{simbolo}{preco}</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/mês</span>
                            </div>

                            <p className="text-[11px] mb-5 px-2 py-1 rounded-md inline-block" style={{ backgroundColor: `${plano.cor}10`, color: plano.cor }}>
                                {plano.creditos.toLocaleString()} msgs/mês
                            </p>

                            <ul className="space-y-2.5 mb-8 flex-1">
                                {plano.features.map((f, j) => (
                                    <li key={j} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                                        <Check size={14} className="flex-shrink-0 mt-0.5" style={{ color: plano.cor }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* Com o PIX liberado (atraso ou acordo) quem já tem o plano
                                precisa de um botão para pagar; sem isso via só "Plano atual". */}
                            {isAtual && !pix.liberado ? (
                                <button className="w-full py-3 rounded-xl text-sm font-medium border transition-all" style={{ borderColor: plano.cor, color: plano.cor }} disabled>
                                    Plano atual ✓
                                </button>
                            ) : (
                                <button
                                    onClick={() => setComprandoPlano(true)}
                                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
                                    style={{
                                        background: `linear-gradient(135deg, ${plano.cor}, ${plano.cor}CC)`,
                                        boxShadow: `0 4px 20px ${plano.cor}30`,
                                    }}
                                >
                                    {isAtual ? 'Pagar agora' : `Assinar a ${plano.nome}`}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Upgrade de voz — vale para qualquer plano. Quem já tem o pacote
                vê "Ativo" (configuracoes.pacote_voz_realista, o mesmo que a aba
                Voz e lib/engine/audio.ts consultam). */}
            <div className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#D99773]/10 flex items-center justify-center flex-shrink-0">
                        <Mic size={22} className="text-[#D99773]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                            Upgrade: {vozRealista.nome}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {vozRealista.resumo}
                        </p>
                        <ul className="mt-2 space-y-1">
                            {vozRealista.beneficios.map((b, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                                    <Check size={12} className="flex-shrink-0 mt-0.5 text-[#D99773]" />
                                    {b}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                        <p className="text-xl font-bold text-[#D99773]">R${vozRealista.preco}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mês</span></p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Somado ao plano</p>
                    </div>
                    {temVozRealista === null ? (
                        <button className="px-5 py-2.5 rounded-xl text-sm font-medium border flex-shrink-0 opacity-60 flex items-center justify-center gap-1.5" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)' }} disabled>
                            <Loader2 size={14} className="animate-spin" />
                            Verificando...
                        </button>
                    ) : temVozRealista ? (
                        <button className="px-5 py-2.5 rounded-xl text-sm font-medium border flex-shrink-0" style={{ borderColor: '#D99773', color: '#D99773' }} disabled>
                            Ativo ✓
                        </button>
                    ) : (
                        <button
                            onClick={() => setComprandoVoz(true)}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5 flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #D99773, #C07A55)', boxShadow: '0 4px 20px rgba(217,151,115,0.3)' }}
                        >
                            <Plus size={14} />
                            Adicionar
                        </button>
                    )}
                </div>
            </div>

            {/* Instância Extra WhatsApp */}
            <div className="backdrop-blur-xl rounded-2xl p-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone size={22} className="text-green-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>
                            Instância Extra de WhatsApp
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Conecte mais um número de WhatsApp à sua IARA. Ideal para filiais ou números diferentes.
                        </p>
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                        <p className="text-xl font-bold text-green-500">{simbolo}{precoInstanciaExtra}<span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/mês</span></p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Metade do seu plano</p>
                    </div>
                    <button
                        onClick={handleComprarInstancia}
                        disabled={comprando}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                        style={{ boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
                    >
                        {comprando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Adicionar
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="rounded-xl p-4 text-center animate-fade-in" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    🔒 Cartão de crédito pela <strong style={{ color: 'var(--text-secondary)' }}>Assiny</strong>, com cobrança automática • 7 dias de garantia •{' '}
                    <a href="#" className="text-[#D99773] hover:text-[#E8B89A] transition-colors">Fale conosco</a>
                </p>
            </div>

            {comprandoPlano && (
                <CheckoutModal
                    aberto={true}
                    onClose={() => { setComprandoPlano(false); conferirVozRealista() }}
                    tipo="plano"
                    item={plano.chave}
                    nome={plano.nome}
                    preco={plano.precos.BRL}
                    pixLiberado={pix.liberado}
                    precoPix={pix.valor}
                />
            )}

            {comprandoVoz && (
                <CheckoutModal
                    aberto={true}
                    onClose={() => { setComprandoVoz(false); conferirVozRealista() }}
                    tipo="pacote"
                    item="voz_realista"
                    nome={vozRealista.nome}
                    preco={vozRealista.preco}
                    pixLiberado={pix.liberado}
                />
            )}
        </div>
    )
}
