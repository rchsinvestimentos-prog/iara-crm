'use client'

import { useState, useEffect } from 'react'
import {
    Building2, MessageCircle, Clock, Scissors, Wifi,
    ChevronRight, ChevronLeft, Check, Loader2, Sparkles,
    Zap, HeartHandshake
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClinicaData {
    nomeClinica: string
    nomeDoutora: string
    tratamentoDoutora: string
    endereco: string
    nomeAssistente: string
    estiloAtendimento: 'direta' | 'consultiva'
    horarioSemana: string
    almocoSemana: string
    atendeSabado: boolean
    horarioSabado: string
    atendeDomingo: boolean
    sempreLigada: boolean
}

const STEPS = [
    { id: 'clinica', label: 'Sua Clínica', icon: Building2 },
    { id: 'estilo', label: 'Estilo IA', icon: MessageCircle },
    { id: 'horarios', label: 'Horários', icon: Clock },
    { id: 'procedimentos', label: 'Procedimentos', icon: Scissors },
    { id: 'conexao', label: 'Conectar', icon: Wifi },
]

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SetupPage() {
    const [step, setStep] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [data, setData] = useState<ClinicaData>({
        nomeClinica: '',
        nomeDoutora: '',
        tratamentoDoutora: 'Dra.',
        endereco: '',
        nomeAssistente: 'IARA',
        estiloAtendimento: 'direta',
        horarioSemana: '08:00 às 18:00',
        almocoSemana: '',
        atendeSabado: false,
        horarioSabado: '08:00 às 12:00',
        atendeDomingo: false,
        sempreLigada: true,
    })
    const [procs, setProcs] = useState<{ nome: string; valor: string; duracao: string }[]>([
        { nome: '', valor: '', duracao: '60' }
    ])

    // Carregar dados existentes
    useEffect(() => {
        fetch('/api/clinica')
            .then(r => r.json())
            .then(d => {
                if (d.nomeClinica) {
                    setData(prev => ({
                        ...prev,
                        nomeClinica: d.nomeClinica || '',
                        nomeDoutora: d.nomeDoutora || '',
                        tratamentoDoutora: d.tratamentoDoutora || 'Dra.',
                        endereco: d.endereco || '',
                        nomeAssistente: d.nomeAssistente || 'IARA',
                        estiloAtendimento: d.estiloAtendimento || 'direta',
                        horarioSemana: d.horarioSemana || '08:00 às 18:00',
                        almocoSemana: d.almocoSemana || '',
                        atendeSabado: d.atendeSabado ?? false,
                        horarioSabado: d.horarioSabado || '08:00 às 12:00',
                        atendeDomingo: d.atendeDomingo ?? false,
                        sempreLigada: d.sempreLigada ?? true,
                    }))
                }
            })
            .finally(() => setLoading(false))
    }, [])

    const update = (field: keyof ClinicaData, value: any) => {
        setData(prev => ({ ...prev, [field]: value }))
    }

    const salvarStep = async () => {
        setSaving(true)
        await fetch('/api/clinica', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        setSaving(false)
    }

    const proximo = async () => {
        if (step < 3) await salvarStep()
        if (step === 3) {
            // Salvar procedimentos
            setSaving(true)
            const validos = procs.filter(p => p.nome.trim())
            for (const proc of validos) {
                await fetch('/api/clinica/profissionais', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ procedimentos: [{ nome: proc.nome, valor: Number(proc.valor) || 0, duracao: Number(proc.duracao) || 60 }] }),
                }).catch(() => {})
            }
            await salvarStep()
            setSaving(false)
        }
        if (step < STEPS.length - 1) setStep(step + 1)
    }

    const anterior = () => { if (step > 0) setStep(step - 1) }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 size={28} className="animate-spin" style={{ color: '#D99773' }} />
            </div>
        )
    }

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    ✨ Configurar sua IARA
                </h1>
                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                    5 passos rápidos para deixar tudo pronto
                </p>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-center gap-1 mb-8">
                {STEPS.map((s, i) => {
                    const Icon = s.icon
                    const done = i < step
                    const active = i === step
                    return (
                        <div key={s.id} className="flex items-center">
                            <button
                                onClick={() => i <= step && setStep(i)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                                style={{
                                    backgroundColor: active ? 'rgba(217,151,115,0.15)' : done ? 'rgba(34,197,94,0.1)' : 'var(--bg-subtle)',
                                    border: active ? '1px solid rgba(217,151,115,0.4)' : done ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border-default)',
                                    color: active ? '#D99773' : done ? '#22c55e' : 'var(--text-muted)',
                                    cursor: i <= step ? 'pointer' : 'default',
                                }}
                            >
                                {done ? <Check size={12} /> : <Icon size={12} />}
                                <span className="hidden sm:inline">{s.label}</span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <div className="w-4 h-px mx-1" style={{ backgroundColor: done ? '#22c55e' : 'var(--border-default)' }} />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Card */}
            <div
                className="backdrop-blur-xl rounded-2xl p-8 animate-fade-in"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
                {step === 0 && <StepClinica data={data} update={update} />}
                {step === 1 && <StepEstilo data={data} update={update} />}
                {step === 2 && <StepHorarios data={data} update={update} />}
                {step === 3 && <StepProcedimentos procs={procs} setProcs={setProcs} />}
                {step === 4 && <StepConexao />}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
                <button
                    onClick={anterior}
                    disabled={step === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                        backgroundColor: 'var(--bg-subtle)',
                        color: step === 0 ? 'var(--border-default)' : 'var(--text-muted)',
                        border: '1px solid var(--border-default)',
                        cursor: step === 0 ? 'not-allowed' : 'pointer',
                    }}
                >
                    <ChevronLeft size={16} />
                    Anterior
                </button>

                {step < STEPS.length - 1 ? (
                    <button
                        onClick={proximo}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(135deg, #D99773, #C47F5E)',
                            color: '#fff',
                            boxShadow: '0 4px 16px rgba(217,151,115,0.3)',
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                        Próximo
                        <ChevronRight size={16} />
                    </button>
                ) : (
                    <a
                        href="/dashboard"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: '#fff',
                            boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                        }}
                    >
                        <Check size={16} />
                        Ir para o Painel
                    </a>
                )}
            </div>
        </div>
    )
}

// ─── Step 1: Clínica ─────────────────────────────────────────────────────────

function StepClinica({ data, update }: { data: ClinicaData; update: (k: keyof ClinicaData, v: any) => void }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Building2 size={20} style={{ color: '#D99773' }} />
                    Dados da Clínica
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Essas informações ajudam a IARA a se apresentar corretamente
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nome da Clínica *" value={data.nomeClinica} onChange={v => update('nomeClinica', v)} placeholder="Clínica Estética Beleza" />
                <Input label="Nome da Profissional" value={data.nomeDoutora} onChange={v => update('nomeDoutora', v)} placeholder="Maria Silva" />
                <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Tratamento</label>
                    <div className="flex gap-2">
                        {['Dra.', 'Dr.', 'Pelo nome'].map(t => (
                            <button
                                key={t}
                                onClick={() => update('tratamentoDoutora', t)}
                                className="flex-1 py-2 text-xs font-medium rounded-xl transition-all"
                                style={{
                                    backgroundColor: data.tratamentoDoutora === t ? 'rgba(217,151,115,0.15)' : 'var(--bg-subtle)',
                                    border: data.tratamentoDoutora === t ? '1px solid rgba(217,151,115,0.4)' : '1px solid var(--border-default)',
                                    color: data.tratamentoDoutora === t ? '#D99773' : 'var(--text-muted)',
                                }}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <Input label="Endereço" value={data.endereco} onChange={v => update('endereco', v)} placeholder="Rua das Flores, 123" />
            </div>

            <Input label="Nome da Assistente IA" value={data.nomeAssistente} onChange={v => update('nomeAssistente', v)} placeholder="IARA" helper="Esse é o nome que a IA usa ao se apresentar" />
        </div>
    )
}

// ─── Step 2: Estilo IA ─────────────────────────────────────────────────────────

function StepEstilo({ data, update }: { data: ClinicaData; update: (k: keyof ClinicaData, v: any) => void }) {
    const estilo = data.estiloAtendimento

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <MessageCircle size={20} style={{ color: '#D99773' }} />
                    Estilo de Atendimento
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Como a {data.nomeAssistente || 'IARA'} deve conversar com suas clientes?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direta */}
                <button
                    onClick={() => update('estiloAtendimento', 'direta')}
                    className="text-left p-5 rounded-2xl transition-all"
                    style={{
                        backgroundColor: estilo === 'direta' ? 'rgba(217,151,115,0.1)' : 'var(--bg-subtle)',
                        border: estilo === 'direta' ? '2px solid rgba(217,151,115,0.5)' : '1px solid var(--border-default)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={18} style={{ color: estilo === 'direta' ? '#D99773' : 'var(--text-muted)' }} />
                        <span className="text-sm font-semibold" style={{ color: estilo === 'direta' ? '#D99773' : 'var(--text-primary)' }}>
                            ⚡ Direta
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Foco máximo em agendar. Responde com preço + oferece horário. Ideal para clientes que já sabem o que querem.
                    </p>
                </button>

                {/* Consultiva */}
                <button
                    onClick={() => update('estiloAtendimento', 'consultiva')}
                    className="text-left p-5 rounded-2xl transition-all"
                    style={{
                        backgroundColor: estilo === 'consultiva' ? 'rgba(217,151,115,0.1)' : 'var(--bg-subtle)',
                        border: estilo === 'consultiva' ? '2px solid rgba(217,151,115,0.5)' : '1px solid var(--border-default)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <HeartHandshake size={18} style={{ color: estilo === 'consultiva' ? '#D99773' : 'var(--text-muted)' }} />
                        <span className="text-sm font-semibold" style={{ color: estilo === 'consultiva' ? '#D99773' : 'var(--text-primary)' }}>
                            💬 Consultiva
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Entende a necessidade primeiro, depois recomenda. Faz perguntas antes de dar preço. Ideal para clínicas premium.
                    </p>
                </button>
            </div>

            {/* Preview WhatsApp */}
            <div className="mt-6">
                <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Sparkles size={11} style={{ color: '#D99773' }} />
                    Preview — como a {data.nomeAssistente || 'IARA'} vai responder
                </p>
                <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#0B141A', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Mensagem cliente */}
                    <div className="flex justify-end">
                        <div className="max-w-[75%] px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: '#005C4B', color: '#E9EDEF' }}>
                            Oi, quanto custa a micropigmentação?
                        </div>
                    </div>
                    {/* Resposta IARA */}
                    <div className="flex justify-start">
                        <div className="max-w-[75%] px-3 py-2 rounded-xl text-xs leading-relaxed" style={{ backgroundColor: '#202C33', color: '#E9EDEF' }}>
                            {estilo === 'direta' ? (
                                <>
                                    Oi! 😊 A micropigmentação aqui com a {data.tratamentoDoutora === 'Pelo nome' ? (data.nomeDoutora?.split(' ')[0] || 'Dra') : `${data.tratamentoDoutora} ${data.nomeDoutora?.split(' ')[0] || ''}`} custa R$ 800.
                                    <br /><br />
                                    Quer agendar? Temos horários disponíveis essa semana! Prefere manhã ou tarde?
                                </>
                            ) : (
                                <>
                                    Oi! 😊 Me conta, você já fez micropigmentação antes ou seria a primeira vez?
                                    <br /><br />
                                    Pergunto pq cada caso é diferente e quero entender direitinho o que vc precisa pra te passar o melhor valor 💕
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Step 3: Horários ─────────────────────────────────────────────────────────

function StepHorarios({ data, update }: { data: ClinicaData; update: (k: keyof ClinicaData, v: any) => void }) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Clock size={20} style={{ color: '#D99773' }} />
                    Horários de Funcionamento
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    A IARA usará esses horários para agendar e informar disponibilidade
                </p>
            </div>

            <div className="space-y-4">
                <Input label="Horário de Semana" value={data.horarioSemana} onChange={v => update('horarioSemana', v)} placeholder="08:00 às 18:00" />
                <Input label="Horário de Almoço (opcional)" value={data.almocoSemana} onChange={v => update('almocoSemana', v)} placeholder="12:00 às 13:00" />

                <div className="flex items-center gap-3 py-2">
                    <Toggle checked={data.atendeSabado} onChange={v => update('atendeSabado', v)} />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Atende aos sábados</span>
                </div>
                {data.atendeSabado && (
                    <Input label="Horário de Sábado" value={data.horarioSabado} onChange={v => update('horarioSabado', v)} placeholder="08:00 às 12:00" />
                )}

                <div className="flex items-center gap-3 py-2">
                    <Toggle checked={data.atendeDomingo} onChange={v => update('atendeDomingo', v)} />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Atende aos domingos</span>
                </div>

                <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-3">
                        <Toggle checked={data.sempreLigada} onChange={v => update('sempreLigada', v)} />
                        <div>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>IARA 24/7</span>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                Responde fora do horário e avisa que a clínica está fechada
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Step 4: Procedimentos ────────────────────────────────────────────────────

function StepProcedimentos({ procs, setProcs }: {
    procs: { nome: string; valor: string; duracao: string }[]
    setProcs: (p: any) => void
}) {
    const addProc = () => setProcs([...procs, { nome: '', valor: '', duracao: '60' }])
    const updateProc = (i: number, field: string, value: string) => {
        const nova = [...procs]
        nova[i] = { ...nova[i], [field]: value }
        setProcs(nova)
    }
    const removeProc = (i: number) => setProcs(procs.filter((_: any, idx: number) => idx !== i))

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Scissors size={20} style={{ color: '#D99773' }} />
                    Procedimentos
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Cadastre os principais procedimentos. Você pode adicionar mais depois.
                </p>
            </div>

            <div className="space-y-3">
                {procs.map((p, i) => (
                    <div
                        key={i}
                        className="grid grid-cols-12 gap-3 items-end p-4 rounded-xl"
                        style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}
                    >
                        <div className="col-span-12 sm:col-span-5">
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Procedimento</label>
                            <input
                                value={p.nome}
                                onChange={e => updateProc(i, 'nome', e.target.value)}
                                placeholder="Micropigmentação de Sobrancelha"
                                className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="col-span-5 sm:col-span-3">
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
                            <input
                                type="number"
                                value={p.valor}
                                onChange={e => updateProc(i, 'valor', e.target.value)}
                                placeholder="800"
                                className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="col-span-5 sm:col-span-3">
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Duração (min)</label>
                            <input
                                type="number"
                                value={p.duracao}
                                onChange={e => updateProc(i, 'duracao', e.target.value)}
                                placeholder="60"
                                className="w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex justify-end">
                            {procs.length > 1 && (
                                <button
                                    onClick={() => removeProc(i)}
                                    className="p-2 rounded-lg text-xs hover:opacity-70"
                                    style={{ color: '#ef4444' }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addProc}
                className="w-full py-3 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px dashed var(--border-default)', color: '#D99773' }}
            >
                + Adicionar procedimento
            </button>
        </div>
    )
}

// ─── Step 5: Conexão ──────────────────────────────────────────────────────────

function StepConexao() {
    return (
        <div className="space-y-5 text-center">
            <div>
                <h2 className="text-lg font-semibold flex items-center justify-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Wifi size={20} style={{ color: '#22c55e' }} />
                    Conectar WhatsApp
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Último passo! Conecte o WhatsApp da clínica para a IARA começar a atender.
                </p>
            </div>

            <div
                className="rounded-2xl p-8 border-2 border-dashed"
                style={{ borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.05)' }}
            >
                <div className="text-center space-y-4">
                    <span style={{ fontSize: 48 }}>📱</span>
                    <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Configuração concluída!
                        </p>
                        <p className="text-xs mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            Acesse a página <strong>&quot;Conexões&quot;</strong> no menu lateral para escanear o QR Code e conectar seu WhatsApp.
                        </p>
                    </div>

                    <a
                        href="/instancias"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                        style={{
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: '#fff',
                            boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                        }}
                    >
                        <Wifi size={16} />
                        Ir para Conexões
                    </a>
                </div>
            </div>

            <div
                className="rounded-xl p-4 text-left"
                style={{ backgroundColor: 'rgba(217,151,115,0.08)', border: '1px solid rgba(217,151,115,0.15)' }}
            >
                <p className="text-xs font-medium flex items-center gap-1.5 mb-2" style={{ color: '#D99773' }}>
                    <Sparkles size={12} />
                    Dica Pro
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Depois de conectar, envie uma mensagem de teste para o WhatsApp da clínica e veja a IARA respondendo com as configurações que você acabou de fazer!
                </p>
            </div>
        </div>
    )
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Input({ label, value, onChange, placeholder, helper }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; helper?: string
}) {
    return (
        <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 text-sm rounded-xl focus:outline-none"
                style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            />
            {helper && <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{helper}</p>}
        </div>
    )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!checked)}
            className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
            style={{
                backgroundColor: checked ? '#D99773' : 'var(--bg-subtle)',
                border: `1px solid ${checked ? 'rgba(217,151,115,0.5)' : 'var(--border-default)'}`,
            }}
        >
            <div
                className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
                style={{
                    left: checked ? 22 : 3,
                    backgroundColor: checked ? '#fff' : 'var(--text-muted)',
                }}
            />
        </button>
    )
}
