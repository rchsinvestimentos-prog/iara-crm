'use client'

import { useState } from 'react'
import { Building2, Phone, Award, Save, Plus, Trash2, Edit3, QrCode, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface Procedimento {
    id: string
    nome: string
    valor: number
    desconto: number
    parcelas: string
    duracao: string
}

const procedimentosMock: Procedimento[] = [
    { id: '1', nome: 'Micropigmentação Fio a Fio', valor: 497, desconto: 10, parcelas: '3x sem juros', duracao: '2h' },
    { id: '2', nome: 'Sombreado', valor: 397, desconto: 20, parcelas: '3x sem juros', duracao: '1h30' },
    { id: '3', nome: 'Lip Blush (Lábios)', valor: 597, desconto: 0, parcelas: '5x sem juros', duracao: '2h30' },
]

export default function ConfiguracoesTool() {
    const [nomeClinica, setNomeClinica] = useState('Studio Ana Silva')
    const [whatsappClinica, setWhatsappClinica] = useState('41999887766')
    const [whatsappPessoal, setWhatsappPessoal] = useState('41988776655')
    const [diferenciais, setDiferenciais] = useState('10 anos de experiência, especialização internacional em micropigmentação, uso de pigmentos premium importados, atendimento humanizado e personalizado.')
    const [statusWhatsApp, setStatusWhatsApp] = useState<'conectado' | 'desconectado'>('conectado')

    // Procedimentos
    const [procedimentos, setProcedimentos] = useState(procedimentosMock)
    const [editando, setEditando] = useState<string | null>(null)
    const [novoProc, setNovoProc] = useState(false)
    const [formProc, setFormProc] = useState<Procedimento>({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' })

    const salvarProc = () => {
        if (!formProc.nome.trim()) return
        if (editando) {
            setProcedimentos(prev => prev.map(p => p.id === editando ? { ...formProc, id: editando } : p))
        } else {
            setProcedimentos(prev => [...prev, { ...formProc, id: Date.now().toString() }])
        }
        setEditando(null)
        setNovoProc(false)
        setFormProc({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' })
    }

    const excluirProc = (id: string) => {
        setProcedimentos(prev => prev.filter(p => p.id !== id))
    }

    const editarProc = (p: Procedimento) => {
        setEditando(p.id)
        setFormProc(p)
        setNovoProc(true)
    }

    return (
        <div className="space-y-6">
            {/* Dados da Clínica */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                    <Building2 size={15} className="text-[#D99773]" />
                    Dados da Clínica
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-[12px] font-medium text-gray-600 block mb-1">Nome da Clínica</label>
                        <input className="w-full px-3 py-2 text-[13px] rounded-xl border border-gray-200 focus:border-[#D99773] focus:outline-none transition-colors" value={nomeClinica} onChange={(e) => setNomeClinica(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[12px] font-medium text-gray-600 block mb-1">WhatsApp da Clínica</label>
                            <input className="w-full px-3 py-2 text-[13px] rounded-xl border border-gray-200 focus:border-[#D99773] focus:outline-none transition-colors" value={whatsappClinica} onChange={(e) => setWhatsappClinica(e.target.value)} placeholder="41999999999" />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-gray-600 block mb-1">WhatsApp Pessoal</label>
                            <input className="w-full px-3 py-2 text-[13px] rounded-xl border border-gray-200 focus:border-[#D99773] focus:outline-none transition-colors" value={whatsappPessoal} onChange={(e) => setWhatsappPessoal(e.target.value)} placeholder="41988888888" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Status WhatsApp */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                    <Phone size={15} className="text-[#D99773]" />
                    Conexão WhatsApp
                </h3>
                <div className={`flex items-center justify-between p-4 rounded-xl ${statusWhatsApp === 'conectado' ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3">
                        {statusWhatsApp === 'conectado' ? (
                            <Wifi size={18} className="text-green-500" />
                        ) : (
                            <WifiOff size={18} className="text-red-500" />
                        )}
                        <div>
                            <p className="text-[12px] font-semibold text-gray-700">
                                {statusWhatsApp === 'conectado' ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                            </p>
                            <p className="text-[10px] text-gray-400">
                                {statusWhatsApp === 'conectado' ? `Instância ativa • ${whatsappClinica}` : 'Escaneie o QR Code para reconectar'}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {statusWhatsApp === 'desconectado' && (
                            <button className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5">
                                <QrCode size={12} /> QR Code
                            </button>
                        )}
                        <button
                            onClick={() => setStatusWhatsApp(statusWhatsApp === 'conectado' ? 'desconectado' : 'conectado')}
                            className="text-[11px] font-medium px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw size={12} /> {statusWhatsApp === 'conectado' ? 'Testar' : 'Reconectar'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Diferenciais */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-2">
                    <Award size={15} className="text-[#D99773]" />
                    Diferenciais da Clínica
                </h3>
                <p className="text-[10px] text-gray-400 mb-3">A IARA usa esses diferenciais para convencer as clientes a agendarem</p>
                <textarea
                    className="w-full px-3 py-2 text-[13px] rounded-xl border border-gray-200 focus:border-[#D99773] focus:outline-none transition-colors resize-none h-24"
                    value={diferenciais}
                    onChange={(e) => setDiferenciais(e.target.value)}
                    placeholder="Ex: 10 anos de experiência, especialização internacional, uso de tecnologia exclusiva..."
                />
            </div>

            {/* Procedimentos CRUD */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61]">💉 Procedimentos Cadastrados</h3>
                    <button
                        onClick={() => { setNovoProc(true); setEditando(null); setFormProc({ id: '', nome: '', valor: 0, desconto: 0, parcelas: '', duracao: '' }) }}
                        className="text-[11px] font-medium px-3 py-1.5 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5"
                    >
                        <Plus size={12} /> Adicionar
                    </button>
                </div>

                {/* Form novo/editar */}
                {novoProc && (
                    <div className="p-4 bg-gray-50 rounded-xl mb-4 space-y-3">
                        <p className="text-[11px] font-semibold text-[#0F4C61] uppercase">{editando ? 'Editar' : 'Novo'} Procedimento</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[11px] text-gray-500 block mb-1">Nome</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 focus:border-[#D99773] focus:outline-none" value={formProc.nome} onChange={(e) => setFormProc({ ...formProc, nome: e.target.value })} placeholder="Ex: Micropigmentação Sobrancelhas" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 block mb-1">Valor (R$)</label>
                                <input type="number" className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 focus:border-[#D99773] focus:outline-none" value={formProc.valor || ''} onChange={(e) => setFormProc({ ...formProc, valor: Number(e.target.value) })} placeholder="497" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 block mb-1">Duração</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 focus:border-[#D99773] focus:outline-none" value={formProc.duracao} onChange={(e) => setFormProc({ ...formProc, duracao: e.target.value })} placeholder="1h30" />
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 block mb-1">Desconto máx. (%)</label>
                                <select className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 focus:border-[#D99773] focus:outline-none bg-white" value={formProc.desconto} onChange={(e) => setFormProc({ ...formProc, desconto: Number(e.target.value) })}>
                                    <option value={0}>Sem desconto</option>
                                    <option value={10}>10%</option>
                                    <option value={20}>20%</option>
                                    <option value={30}>30%</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] text-gray-500 block mb-1">Parcelas</label>
                                <input className="w-full px-3 py-2 text-[12px] rounded-lg border border-gray-200 focus:border-[#D99773] focus:outline-none" value={formProc.parcelas} onChange={(e) => setFormProc({ ...formProc, parcelas: e.target.value })} placeholder="3x sem juros" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={salvarProc} className="text-[11px] font-medium px-4 py-2 bg-[#0F4C61] text-white rounded-lg flex items-center gap-1.5">
                                <Save size={12} /> Salvar
                            </button>
                            <button onClick={() => { setNovoProc(false); setEditando(null) }} className="text-[11px] text-gray-400 hover:text-gray-600">
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista */}
                <div className="space-y-2">
                    {procedimentos.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-gray-700">{p.nome}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[11px] font-semibold text-[#0F4C61]">R$ {p.valor}</span>
                                    <span className="text-[10px] text-gray-400">⏱ {p.duracao}</span>
                                    {p.desconto > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">-{p.desconto}%</span>}
                                    <span className="text-[10px] text-gray-400">💳 {p.parcelas}</span>
                                </div>
                            </div>
                            <button onClick={() => editarProc(p)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
                                <Edit3 size={13} className="text-gray-400" />
                            </button>
                            <button onClick={() => excluirProc(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                <Trash2 size={13} className="text-gray-300 hover:text-red-400" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Salvar */}
            <button className="w-full py-3 bg-[#0F4C61] text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#0F4C61]/90 transition-colors">
                <Save size={16} /> Salvar Todas as Configurações
            </button>
        </div>
    )
}
