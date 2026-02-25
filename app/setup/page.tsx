'use client'

import { useState } from 'react'
import { Sparkles, ArrowRight, ArrowLeft, Check, Building2, Phone, Stethoscope, Clock } from 'lucide-react'

const steps = [
    { title: 'Sua Clínica', icon: Building2, emoji: '🏥' },
    { title: 'WhatsApp', icon: Phone, emoji: '📱' },
    { title: 'Procedimentos', icon: Stethoscope, emoji: '💉' },
    { title: 'Horários', icon: Clock, emoji: '🕐' },
]

export default function SetupPage() {
    const [step, setStep] = useState(0)
    const [data, setData] = useState({
        nomeClinica: '',
        nomeDra: '',
        especialidade: '',
        whatsapp: '',
        procedimentos: [{ nome: '', valor: '', duracao: '' }],
        horaInicio: '08:00',
        horaFim: '18:00',
        diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
    })

    const addProcedimento = () => {
        setData(d => ({ ...d, procedimentos: [...d.procedimentos, { nome: '', valor: '', duracao: '' }] }))
    }

    const updateProc = (i: number, field: string, value: string) => {
        setData(d => {
            const procs = [...d.procedimentos]
            procs[i] = { ...procs[i], [field]: value }
            return { ...d, procedimentos: procs }
        })
    }

    const toggleDia = (dia: string) => {
        setData(d => ({
            ...d,
            diasSemana: d.diasSemana.includes(dia) ? d.diasSemana.filter(d2 => d2 !== dia) : [...d.diasSemana, dia]
        }))
    }

    const handleFinish = () => {
        // TODO: salvar via API + redirecionar
        window.location.href = '/dashboard'
    }

    return (
        <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="noise-overlay" />
            <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#D99773]/8 rounded-full blur-[160px] animate-float" />
            <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#0F4C61]/12 rounded-full blur-[140px] animate-float" style={{ animationDelay: '-2s' }} />

            <div className="w-full max-w-2xl relative z-10">
                {/* Progress */}
                <div className="flex items-center justify-between mb-8 px-4">
                    {steps.map((s, i) => (
                        <div key={i} className="flex items-center">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-500 ${i < step ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    i === step ? 'bg-gradient-to-br from-[#D99773] to-[#C07A55] text-white shadow-lg shadow-[#D99773]/20' :
                                        'bg-white/5 text-gray-600 border border-white/10'
                                }`}>
                                {i < step ? <Check size={16} /> : <span>{s.emoji}</span>}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`w-16 sm:w-24 h-[2px] mx-2 transition-colors duration-500 ${i < step ? 'bg-green-500/30' : 'bg-white/5'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-8 shadow-2xl animate-fade-in">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles size={20} className="text-[#D99773]" />
                        <div>
                            <h2 className="text-lg font-bold text-white">{steps[step].title}</h2>
                            <p className="text-xs text-gray-500">Passo {step + 1} de {steps.length}</p>
                        </div>
                    </div>

                    {/* Step 0: Clínica */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">Nome da clínica/studio</label>
                                <input
                                    type="text"
                                    value={data.nomeClinica}
                                    onChange={e => setData(d => ({ ...d, nomeClinica: e.target.value }))}
                                    placeholder="ex: Studio Ana Silva"
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">Seu nome</label>
                                <input
                                    type="text"
                                    value={data.nomeDra}
                                    onChange={e => setData(d => ({ ...d, nomeDra: e.target.value }))}
                                    placeholder="ex: Dra. Ana Silva"
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">Especialidade</label>
                                <input
                                    type="text"
                                    value={data.especialidade}
                                    onChange={e => setData(d => ({ ...d, especialidade: e.target.value }))}
                                    placeholder="ex: Micropigmentação, Estética"
                                    className="input-field"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 1: WhatsApp */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400 mb-4">
                                A IARA vai atender seus pacientes neste WhatsApp. Use um número exclusivo da clínica.
                            </p>
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 block">WhatsApp da Clínica</label>
                                <input
                                    type="tel"
                                    value={data.whatsapp}
                                    onChange={e => setData(d => ({ ...d, whatsapp: e.target.value }))}
                                    placeholder="(11) 99999-9999"
                                    className="input-field"
                                />
                            </div>
                            <div className="bg-[#D99773]/5 border border-[#D99773]/10 rounded-xl p-4">
                                <p className="text-xs text-[#D99773]">💡 Depois do setup, você vai escanear um QR Code para conectar o WhatsApp à IARA.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Procedimentos */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400 mb-4">
                                Cadastre os procedimentos que a IARA deve informar aos pacientes.
                            </p>
                            {data.procedimentos.map((p, i) => (
                                <div key={i} className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        value={p.nome}
                                        onChange={e => updateProc(i, 'nome', e.target.value)}
                                        placeholder="Nome"
                                        className="input-field text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={p.valor}
                                        onChange={e => updateProc(i, 'valor', e.target.value)}
                                        placeholder="R$ valor"
                                        className="input-field text-sm"
                                    />
                                    <input
                                        type="text"
                                        value={p.duracao}
                                        onChange={e => updateProc(i, 'duracao', e.target.value)}
                                        placeholder="Duração"
                                        className="input-field text-sm"
                                    />
                                </div>
                            ))}
                            <button
                                onClick={addProcedimento}
                                className="text-sm text-[#D99773] hover:text-[#E8B89A] transition-colors"
                            >
                                + Adicionar procedimento
                            </button>
                        </div>
                    )}

                    {/* Step 3: Horários */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-2 block">Início do atendimento</label>
                                    <input
                                        type="time"
                                        value={data.horaInicio}
                                        onChange={e => setData(d => ({ ...d, horaInicio: e.target.value }))}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-300 mb-2 block">Fim do atendimento</label>
                                    <input
                                        type="time"
                                        value={data.horaFim}
                                        onChange={e => setData(d => ({ ...d, horaFim: e.target.value }))}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-3 block">Dias da semana</label>
                                <div className="flex gap-2">
                                    {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(dia => (
                                        <button
                                            key={dia}
                                            onClick={() => toggleDia(dia)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium uppercase transition-all ${data.diasSemana.includes(dia)
                                                    ? 'bg-[#D99773]/20 text-[#D99773] border border-[#D99773]/30'
                                                    : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {dia}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.04]">
                        {step > 0 ? (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                            >
                                <ArrowLeft size={14} /> Voltar
                            </button>
                        ) : <div />}

                        {step < steps.length - 1 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="flex items-center gap-2 bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-[0_8px_30px_rgba(217,151,115,0.3)] hover:-translate-y-0.5"
                            >
                                Próximo <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:shadow-[0_8px_30px_rgba(34,197,94,0.3)] hover:-translate-y-0.5"
                            >
                                <Check size={14} /> Finalizar Setup
                            </button>
                        )}
                    </div>
                </div>

                {/* Skip */}
                <p className="text-center text-xs text-gray-600 mt-4">
                    <button onClick={handleFinish} className="hover:text-gray-400 transition-colors">
                        Pular e configurar depois
                    </button>
                </p>
            </div>
        </div>
    )
}
