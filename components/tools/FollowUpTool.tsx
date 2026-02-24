'use client'

import { useState } from 'react'
import { UserCheck, ToggleLeft, ToggleRight, Clock, MessageSquare, Save } from 'lucide-react'

interface FollowUp {
    id: string
    nome: string
    descricao: string
    quando: string
    mensagemExemplo: string
    ativo: boolean
}

const followUpsDefault: FollowUp[] = [
    {
        id: 'lembrete_24h',
        nome: 'Lembrete 24h antes',
        descricao: 'Envia mensagem lembrando do agendamento 24 horas antes',
        quando: '24h antes do horário',
        mensagemExemplo: 'Oi Maria! 💜 Passando pra lembrar que amanhã às 14h tem seu horário de micro! Confirma pra mim?',
        ativo: true,
    },
    {
        id: 'lembrete_2h',
        nome: 'Lembrete 2h antes',
        descricao: 'Envia mensagem 2 horas antes com endereço',
        quando: '2h antes do horário',
        mensagemExemplo: 'Maria! Daqui 2h é seu horário! 📍 Te espero na Rua das Flores, 123. Já tá a caminho? 😊',
        ativo: true,
    },
    {
        id: 'pos_atendimento',
        nome: 'Pós-atendimento',
        descricao: 'Envia mensagem 24h após o procedimento perguntando como está',
        quando: '24h após o atendimento',
        mensagemExemplo: 'Oi Maria! Tudo bem? Como ficou sua sobrancelha? Ta amando? 😍 Lembra dos cuidados que a Dra passou!',
        ativo: true,
    },
    {
        id: 'avaliacao',
        nome: 'Pedido de avaliação',
        descricao: 'Pede para a cliente avaliar o atendimento no Google',
        quando: '3 dias após o atendimento',
        mensagemExemplo: 'Maria! Você ficou satisfeita com o resultado? 🌟 Se sim, adoraríamos uma avaliação no Google! Link: [link]',
        ativo: false,
    },
    {
        id: 'recuperar_lead',
        nome: 'Recuperar lead frio',
        descricao: 'Manda mensagem para quem perguntou preço mas não agendou (24h depois)',
        quando: '24h após a última mensagem sem agendamento',
        mensagemExemplo: 'Oi sumida! 🙈 A Dra liberou um encaixe especial pra amanhã. Quer aproveitar?',
        ativo: true,
    },
    {
        id: 'falta',
        nome: 'Follow-up de falta',
        descricao: 'Cliente não compareceu ao agendamento, IARA oferece reagendamento',
        quando: '1h após horário marcado (se não compareceu)',
        mensagemExemplo: 'Oi Maria! Tudo bem? Notei que não conseguiu vir hoje. Quer que eu remarque pra outro dia? 😊',
        ativo: true,
    },
    {
        id: 'retoque',
        nome: 'Lembrete de retoque',
        descricao: 'Avisa quando está chegando perto do prazo de retoque do procedimento',
        quando: '30 dias antes do vencimento do retoque',
        mensagemExemplo: 'Oi Maria! 💜 Já faz quase 1 ano da sua micro! Tá na hora do retoque pra ficar sempre perfeita. Quer agendar?',
        ativo: false,
    },
    {
        id: 'aniversario',
        nome: 'Parabéns de aniversário',
        descricao: 'IARA manda mensagem de aniversário para a cliente',
        quando: 'No dia do aniversário (se cadastrado)',
        mensagemExemplo: 'Feliz aniversário, Maria! 🎂💜 Que esse dia seja especial! Temos um presentinho pra você...',
        ativo: false,
    },
    {
        id: 'bom_dia_dra',
        nome: 'Relatório matinal (para a Dra)',
        descricao: 'IARA manda resumo dos agendamentos do dia no WhatsApp da Dra',
        quando: '07:30 da manhã',
        mensagemExemplo: 'Bom dia Dra! ☀️ Hoje temos 5 atendimentos. O primeiro é às 9h (Maria - Micro). Sua agenda está ótima!',
        ativo: true,
    },
]

export default function FollowUpTool() {
    const [followUps, setFollowUps] = useState(followUpsDefault)

    const toggleFollowUp = (id: string) => {
        setFollowUps(prev =>
            prev.map(f => f.id === id ? { ...f, ativo: !f.ativo } : f)
        )
    }

    const ativos = followUps.filter(f => f.ativo).length

    return (
        <div className="space-y-6">
            {/* Resumo */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-petroleo flex items-center gap-2">
                            <UserCheck size={16} className="text-terracota" />
                            Follow-ups Automáticos
                        </h3>
                        <p className="text-xs text-acinzentado mt-1">
                            A IARA executa esses follow-ups automaticamente. Ative ou desative conforme sua preferência.
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-terracota">{ativos}</p>
                        <p className="text-xs text-acinzentado">de {followUps.length} ativos</p>
                    </div>
                </div>
            </div>

            {/* Lista de follow-ups */}
            <div className="space-y-3">
                {followUps.map((fu) => (
                    <div
                        key={fu.id}
                        className={`glass-card p-5 transition-all ${fu.ativo ? '' : 'opacity-60'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`font-semibold text-sm ${fu.ativo ? 'text-petroleo' : 'text-gray-400'}`}>
                                        {fu.nome}
                                    </h4>
                                    <span className={`badge text-xs ${fu.ativo ? 'badge-success' : 'bg-gray-100 text-gray-400'}`}>
                                        {fu.ativo ? 'Ativo' : 'Desativado'}
                                    </span>
                                </div>
                                <p className="text-xs text-acinzentado mb-2">{fu.descricao}</p>
                                <div className="flex items-center gap-1 text-xs text-acinzentado mb-3">
                                    <Clock size={11} />
                                    <span>Quando: <strong>{fu.quando}</strong></span>
                                </div>

                                {/* Exemplo de mensagem */}
                                <div className="p-3 bg-glacial rounded-xl">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <MessageSquare size={11} className="text-terracota" />
                                        <span className="text-xs font-medium text-petroleo">Exemplo de mensagem:</span>
                                    </div>
                                    <p className="text-xs text-acinzentado italic">"{fu.mensagemExemplo}"</p>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleFollowUp(fu.id)}
                                className="flex-shrink-0 mt-1"
                            >
                                {fu.ativo ? (
                                    <ToggleRight size={36} className="text-green-500" />
                                ) : (
                                    <ToggleLeft size={36} className="text-gray-300" />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Salvar */}
            <button className="btn-primary flex items-center gap-2 w-full justify-center">
                <Save size={18} /> Salvar Preferências
            </button>
        </div>
    )
}
