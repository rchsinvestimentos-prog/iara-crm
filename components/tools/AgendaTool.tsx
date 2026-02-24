'use client'

import { useState } from 'react'
import { Calendar, Plus, Clock, Settings, ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react'

// Mock data
const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const compromissos = [
    { id: 1, nome: 'Maria Santos', proc: 'Micro Fio a Fio', data: '2026-02-24', hora: '14:00', duracao: '2h30', status: 'confirmado' },
    { id: 2, nome: 'Ana Costa', proc: 'Sombreado', data: '2026-02-24', hora: '16:30', duracao: '2h', status: 'pendente' },
    { id: 3, nome: 'Julia Mendes', proc: 'Lábios', data: '2026-02-25', hora: '09:00', duracao: '1h30', status: 'confirmado' },
    { id: 4, nome: 'Carla Lima', proc: 'Retoque', data: '2026-02-25', hora: '11:00', duracao: '1h', status: 'confirmado' },
    { id: 5, nome: 'Fernanda Rocha', proc: 'Micro Fio a Fio', data: '2026-02-26', hora: '10:00', duracao: '2h30', status: 'pendente' },
]

export default function AgendaTool() {
    const [duracaoPadrao, setDuracaoPadrao] = useState(30)
    const [intervalo, setIntervalo] = useState(15)
    const [antecedenciaMin, setAntecedenciaMin] = useState(2)
    const [antecedenciaMax, setAntecedenciaMax] = useState(30)
    const [aceitaSabado, setAceitaSabado] = useState(true)
    const [aceitaDomingo, setAceitaDomingo] = useState(false)
    const [aceitaFeriado, setAceitaFeriado] = useState(false)
    const [horInicio, setHorInicio] = useState('09:00')
    const [horFim, setHorFim] = useState('18:00')
    const [almocoSemana, setAlmocoSemana] = useState(true)
    const [almocoInicio, setAlmocoInicio] = useState('12:00')
    const [almocoFim, setAlmocoFim] = useState('13:00')
    const [sabInicio, setSabInicio] = useState('09:00')
    const [sabFim, setSabFim] = useState('13:00')
    const [almocoSab, setAlmocoSab] = useState(false)
    const [almocoSabInicio, setAlmocoSabInicio] = useState('12:00')
    const [almocoSabFim, setAlmocoSabFim] = useState('13:00')
    const [domInicio, setDomInicio] = useState('09:00')
    const [domFim, setDomFim] = useState('13:00')
    const [ferInicio, setFerInicio] = useState('09:00')
    const [ferFim, setFerFim] = useState('13:00')
    const [configAberta, setConfigAberta] = useState(false)

    const statusCor: Record<string, string> = {
        confirmado: 'badge-success',
        pendente: 'badge-warning',
        cancelado: 'badge-danger',
    }

    return (
        <div className="space-y-6">
            {/* Header com botões */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button className="w-8 h-8 rounded-full bg-glacial flex items-center justify-center hover:bg-verde-agua transition-colors">
                        <ChevronLeft size={16} className="text-petroleo" />
                    </button>
                    <h3 className="font-semibold text-petroleo">Fevereiro 2026</h3>
                    <button className="w-8 h-8 rounded-full bg-glacial flex items-center justify-center hover:bg-verde-agua transition-colors">
                        <ChevronRight size={16} className="text-petroleo" />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setConfigAberta(!configAberta)}
                        className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1 ${configAberta ? '!bg-terracota !text-white' : ''}`}
                    >
                        <Settings size={14} /> Configurar
                    </button>
                    <button className="btn-primary text-xs py-2 px-3 flex items-center gap-1">
                        <Plus size={14} /> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* Configurações da agenda */}
            {configAberta && (
                <div className="glass-card p-6 animate-fade-in">
                    <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                        <Settings size={16} className="text-terracota" />
                        Configurações da Agenda
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-petroleo mb-1.5 block">Duração padrão (min)</label>
                            <input type="number" className="input-field" value={duracaoPadrao} onChange={(e) => setDuracaoPadrao(Number(e.target.value))} />
                            <p className="text-xs text-acinzentado mt-1">Tempo padrão de cada atendimento</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-petroleo mb-1.5 block">Intervalo entre atendimentos (min)</label>
                            <input type="number" className="input-field" value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))} />
                            <p className="text-xs text-acinzentado mt-1">Tempo de descanso entre clientes</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-petroleo mb-1.5 block">Antecedência mínima (horas)</label>
                            <input type="number" className="input-field" value={antecedenciaMin} onChange={(e) => setAntecedenciaMin(Number(e.target.value))} />
                            <p className="text-xs text-acinzentado mt-1">Não agendar com menos de X horas</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-petroleo mb-1.5 block">Antecedência máxima (dias)</label>
                            <input type="number" className="input-field" value={antecedenciaMax} onChange={(e) => setAntecedenciaMax(Number(e.target.value))} />
                            <p className="text-xs text-acinzentado mt-1">Agendar até X dias no futuro</p>
                        </div>
                    </div>

                    {/* Horários por dia */}
                    <div className="mt-5 pt-4 border-t border-gray-200/50">
                        <h4 className="text-sm font-semibold text-petroleo mb-3">🕐 Horários de Funcionamento</h4>
                        <div className="space-y-3">
                            {/* Seg-Sex */}
                            <div className="p-3 bg-glacial rounded-xl">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-petroleo">Segunda a Sexta</span>
                                    <div className="flex gap-2 items-center">
                                        <input type="time" className="input-field w-28 !py-1.5 text-xs" value={horInicio} onChange={(e) => setHorInicio(e.target.value)} />
                                        <span className="text-acinzentado text-xs">até</span>
                                        <input type="time" className="input-field w-28 !py-1.5 text-xs" value={horFim} onChange={(e) => setHorFim(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <input type="checkbox" checked={almocoSemana} onChange={() => setAlmocoSemana(!almocoSemana)} className="w-3.5 h-3.5 accent-terracota" />
                                    <span className="text-xs text-acinzentado">Pausa para almoço</span>
                                    {almocoSemana && (
                                        <div className="flex gap-2 items-center ml-auto">
                                            <input type="time" className="input-field w-24 !py-1 text-xs" value={almocoInicio} onChange={(e) => setAlmocoInicio(e.target.value)} />
                                            <span className="text-acinzentado text-xs">—</span>
                                            <input type="time" className="input-field w-24 !py-1 text-xs" value={almocoFim} onChange={(e) => setAlmocoFim(e.target.value)} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sábado */}
                            <div className="p-3 bg-glacial rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={aceitaSabado} onChange={() => setAceitaSabado(!aceitaSabado)} className="w-3.5 h-3.5 accent-terracota" />
                                        <span className="text-sm font-medium text-petroleo">Sábado</span>
                                    </div>
                                    {aceitaSabado && (
                                        <div className="flex gap-2 items-center">
                                            <input type="time" className="input-field w-28 !py-1.5 text-xs" value={sabInicio} onChange={(e) => setSabInicio(e.target.value)} />
                                            <span className="text-acinzentado text-xs">até</span>
                                            <input type="time" className="input-field w-28 !py-1.5 text-xs" value={sabFim} onChange={(e) => setSabFim(e.target.value)} />
                                        </div>
                                    )}
                                    {!aceitaSabado && <span className="text-xs text-acinzentado">Desativado</span>}
                                </div>
                                {aceitaSabado && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <input type="checkbox" checked={almocoSab} onChange={() => setAlmocoSab(!almocoSab)} className="w-3.5 h-3.5 accent-terracota" />
                                        <span className="text-xs text-acinzentado">Pausa para almoço</span>
                                        {almocoSab && (
                                            <div className="flex gap-2 items-center ml-auto">
                                                <input type="time" className="input-field w-24 !py-1 text-xs" value={almocoSabInicio} onChange={(e) => setAlmocoSabInicio(e.target.value)} />
                                                <span className="text-acinzentado text-xs">—</span>
                                                <input type="time" className="input-field w-24 !py-1 text-xs" value={almocoSabFim} onChange={(e) => setAlmocoSabFim(e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Domingo */}
                            <div className="p-3 bg-glacial rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={aceitaDomingo} onChange={() => setAceitaDomingo(!aceitaDomingo)} className="w-3.5 h-3.5 accent-terracota" />
                                        <span className="text-sm font-medium text-petroleo">Domingo</span>
                                    </div>
                                    {aceitaDomingo && (
                                        <div className="flex gap-2 items-center">
                                            <input type="time" className="input-field w-28 !py-1.5 text-xs" value={domInicio} onChange={(e) => setDomInicio(e.target.value)} />
                                            <span className="text-acinzentado text-xs">até</span>
                                            <input type="time" className="input-field w-28 !py-1.5 text-xs" value={domFim} onChange={(e) => setDomFim(e.target.value)} />
                                        </div>
                                    )}
                                    {!aceitaDomingo && <span className="text-xs text-acinzentado">Desativado</span>}
                                </div>
                            </div>

                            {/* Feriados */}
                            <div className="p-3 bg-glacial rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={aceitaFeriado} onChange={() => setAceitaFeriado(!aceitaFeriado)} className="w-3.5 h-3.5 accent-terracota" />
                                        <span className="text-sm font-medium text-petroleo">Feriados</span>
                                    </div>
                                    {aceitaFeriado && (
                                        <div className="flex gap-2 items-center">
                                            <input type="time" className="input-field w-28 !py-1.5 text-xs" value={ferInicio} onChange={(e) => setFerInicio(e.target.value)} />
                                            <span className="text-acinzentado text-xs">até</span>
                                            <input type="time" className="input-field w-28 !py-1.5 text-xs" value={ferFim} onChange={(e) => setFerFim(e.target.value)} />
                                        </div>
                                    )}
                                    {!aceitaFeriado && <span className="text-xs text-acinzentado">Desativado</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button className="btn-primary text-sm mt-4 flex items-center gap-2">
                        Salvar Configurações
                    </button>
                </div>
            )}

            {/* Mini calendário semanal */}
            <div className="glass-card p-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {diasSemana.map((dia, i) => (
                        <div key={dia} className="text-center">
                            <p className="text-xs text-acinzentado font-medium mb-1">{dia}</p>
                            <button className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center text-sm font-medium transition-colors ${i === 0 ? 'bg-terracota text-white' : 'hover:bg-glacial text-petroleo'
                                }`}>
                                {24 + i}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lista de compromissos */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-petroleo mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-terracota" />
                    Próximos Compromissos
                </h3>
                <div className="space-y-3">
                    {compromissos.map((comp) => (
                        <div key={comp.id} className="flex items-center justify-between p-4 bg-glacial rounded-2xl hover:bg-verde-agua/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-center min-w-[50px]">
                                    <p className="text-lg font-bold text-petroleo">{comp.data.split('-')[2]}</p>
                                    <p className="text-xs text-acinzentado">{comp.data === '2026-02-24' ? 'Hoje' : comp.data === '2026-02-25' ? 'Amanhã' : 'Qua'}</p>
                                </div>
                                <div className="w-px h-10 bg-terracota/30" />
                                <div>
                                    <p className="font-semibold text-petroleo text-sm">{comp.nome}</p>
                                    <p className="text-xs text-acinzentado flex items-center gap-2">
                                        <span>{comp.proc}</span>
                                        <span>•</span>
                                        <Clock size={10} /> {comp.hora} ({comp.duracao})
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`badge ${statusCor[comp.status]}`}>{comp.status}</span>
                                <button className="p-1.5 hover:bg-white rounded-lg transition-colors">
                                    <Edit2 size={14} className="text-acinzentado" />
                                </button>
                                <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={14} className="text-red-400" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
