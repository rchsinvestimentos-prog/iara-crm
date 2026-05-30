'use client'

import { useState } from 'react'
import { Upload, Scissors, Type, Music, Download, Play, Clock, Wand2, FileVideo } from 'lucide-react'

const videosNaFila = [
    { nome: 'Dica Micro.mp4', duracao: '1:23', status: 'pronto', progresso: 100 },
    { nome: 'Bastidores.mp4', duracao: '0:45', status: 'processando', progresso: 67 },
]

export default function EditorTool() {
    const [legendasAtivas, setLegendasAtivas] = useState(true)
    const [estiloLegenda, setEstiloLegenda] = useState('minimal')
    const [cortesIA, setCortesIA] = useState(true)
    const [musicaFundo, setMusicaFundo] = useState(false)
    const [formato, setFormato] = useState('9:16')
    const [uploading, setUploading] = useState(false)

    const handleUpload = () => {
        setUploading(true)
        setTimeout(() => setUploading(false), 2000)
    }

    return (
        <div className="space-y-6">
            {/* Upload */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] flex items-center gap-2 mb-4">
                    <Upload size={15} className="text-[#D99773]" />
                    Enviar Vídeo para Editar
                </h3>
                <div
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-[#D99773]/50 hover:bg-[#D99773]/5 transition-all"
                    onClick={handleUpload}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-[#D99773] border-t-transparent rounded-full animate-spin" />
                            <p className="text-[12px] text-gray-500">Enviando vídeo...</p>
                        </div>
                    ) : (
                        <>
                            <FileVideo size={32} className="text-gray-300 mx-auto mb-3" strokeWidth={1.2} />
                            <p className="text-[12px] font-medium text-gray-600">Arraste um vídeo ou clique para enviar</p>
                            <p className="text-[10px] text-gray-400 mt-1">MP4, MOV • Até 100MB</p>
                        </>
                    )}
                </div>
            </div>

            {/* Opções de Edição */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-4">✂️ Opções de Edição</h3>
                <div className="space-y-3">
                    {/* Legendas */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Type size={16} className="text-gray-400" />
                            <div>
                                <p className="text-[12px] font-medium text-gray-700">Legendas Automáticas</p>
                                <p className="text-[10px] text-gray-400">IA transcreve e adiciona legendas animadas</p>
                            </div>
                        </div>
                        <button onClick={() => setLegendasAtivas(!legendasAtivas)}>
                            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${legendasAtivas ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                                <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                            </div>
                        </button>
                    </div>

                    {legendasAtivas && (
                        <div className="ml-9 grid grid-cols-3 gap-2">
                            {['minimal', 'bold', 'karaoke'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setEstiloLegenda(s)}
                                    className={`p-3 rounded-xl text-center border-2 transition-all ${estiloLegenda === s ? 'border-[#D99773] bg-[#D99773]/5' : 'border-transparent bg-gray-50'
                                        }`}
                                >
                                    <p className={`text-[13px] font-bold ${s === 'bold' ? 'uppercase' : ''} ${estiloLegenda === s ? 'text-[#D99773]' : 'text-gray-500'}`}>
                                        {s === 'karaoke' ? 'Ka.ra.o.ke' : s === 'bold' ? 'BOLD' : 'Minimal'}
                                    </p>
                                    <p className="text-[9px] text-gray-400 mt-1 capitalize">{s}</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Cortes IA */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Scissors size={16} className="text-gray-400" />
                            <div>
                                <p className="text-[12px] font-medium text-gray-700">Cortes Inteligentes</p>
                                <p className="text-[10px] text-gray-400">Remove silêncios e trechos desnecessários</p>
                            </div>
                        </div>
                        <button onClick={() => setCortesIA(!cortesIA)}>
                            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${cortesIA ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                                <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                            </div>
                        </button>
                    </div>

                    {/* Música */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Music size={16} className="text-gray-400" />
                            <div>
                                <p className="text-[12px] font-medium text-gray-700">Música de Fundo</p>
                                <p className="text-[10px] text-gray-400">Adiciona trilha suave e livre de direitos</p>
                            </div>
                        </div>
                        <button onClick={() => setMusicaFundo(!musicaFundo)}>
                            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${musicaFundo ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                                <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                            </div>
                        </button>
                    </div>

                    {/* Formato */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-3">
                            <FileVideo size={16} className="text-gray-400" />
                            <p className="text-[12px] font-medium text-gray-700">Formato de Saída</p>
                        </div>
                        <div className="flex gap-1.5">
                            {['9:16', '1:1', '16:9'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFormato(f)}
                                    className={`text-[10px] font-medium px-2.5 py-1 rounded-lg transition-colors ${formato === f ? 'bg-[#0F4C61] text-white' : 'bg-gray-100 text-gray-500'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button className="w-full mt-4 py-3 bg-[#0F4C61] text-white rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[#0F4C61]/90 transition-colors">
                    <Wand2 size={16} /> Editar Vídeo
                </button>
            </div>

            {/* Fila */}
            {videosNaFila.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-[13px] font-semibold text-[#0F4C61] mb-3">📁 Fila de Edição</h3>
                    <div className="space-y-2">
                        {videosNaFila.map((v, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                <FileVideo size={16} className="text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[12px] font-medium text-gray-700 truncate">{v.nome}</p>
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0 ml-2">
                                            <Clock size={9} /> {v.duracao}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${v.status === 'pronto' ? 'bg-green-500' : 'bg-[#D99773]'}`}
                                            style={{ width: `${v.progresso}%` }}
                                        />
                                    </div>
                                </div>
                                {v.status === 'pronto' ? (
                                    <button className="text-[10px] font-medium px-2.5 py-1 bg-green-50 text-green-600 rounded-lg flex items-center gap-1">
                                        <Download size={11} /> Baixar
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-[#D99773] font-medium">{v.progresso}%</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
