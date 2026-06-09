'use client'

import React from 'react'
import { X, ShieldCheck, Printer, FileText, CheckCircle2 } from 'lucide-react'

interface FichaData {
    id: string
    titulo: string
    dataAssinatura: string
    ipOrigem: string
    userAgent: string
    hashIntegridade: string
    assinaturaPng: string
    respostas: any
}

interface CertificadoAssinaturaProps {
    ficha: FichaData
    onClose: () => void
}

export default function CertificadoAssinatura({ ficha, onClose }: CertificadoAssinaturaProps) {
    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4 print:p-0 print:bg-white print:block">
            <div className="bg-white dark:bg-[#0B0F19] print:dark:bg-white text-petroleo dark:text-gray-200 print:text-black w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative border dark:border-white/10 print:border-none print:shadow-none print:max-w-none print:max-h-none flex flex-col">
                
                {/* Header Actions (hidden on print) */}
                <div className="sticky top-0 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md p-4 border-b dark:border-white/10 flex justify-between items-center print:hidden z-10 rounded-t-2xl">
                    <h2 className="font-bold flex items-center gap-2">
                        <FileText className="text-terracota" /> Ficha de Anamnese
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrint} className="btn-secondary py-1 px-3 text-xs flex items-center gap-2">
                            <Printer size={14} /> Imprimir / PDF
                        </button>
                        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div className="p-8 space-y-8 print:p-0">
                    <div className="text-center space-y-2 border-b pb-6 dark:border-white/10">
                        <h1 className="text-2xl font-bold uppercase tracking-wider">{ficha.titulo}</h1>
                        <p className="text-sm text-gray-500 print:text-gray-700">Preenchido em: {new Date(ficha.dataAssinatura).toLocaleString('pt-BR')}</p>
                    </div>

                    {/* Respostas da Ficha */}
                    <div className="space-y-6">
                        {Object.entries(ficha.respostas || {}).map(([perguntaId, resposta]: [string, any]) => (
                            <div key={perguntaId} className="bg-gray-50 dark:bg-white/5 print:bg-white p-4 rounded-xl border dark:border-white/10">
                                <h3 className="font-bold text-sm mb-1">{perguntaId}</h3>
                                <p className="text-sm text-gray-700 dark:text-gray-300 print:text-black">{Array.isArray(resposta) ? resposta.join(', ') : resposta}</p>
                            </div>
                        ))}
                    </div>

                    {/* Certificado de Assinatura Eletrônica */}
                    <div className="mt-12 border-2 border-[#D99773] rounded-2xl p-6 relative bg-orange-50/30 dark:bg-[#D99773]/5 print:bg-white break-inside-avoid">
                        <div className="absolute -top-3 left-6 bg-white dark:bg-[#0B0F19] print:bg-white px-2 flex items-center gap-1 text-[#D99773] font-bold text-sm">
                            <ShieldCheck size={16} /> Certificado de Validade Jurídica
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400 print:text-gray-800">
                                <div>
                                    <span className="font-bold block text-petroleo dark:text-gray-200 print:text-black">Data e Hora da Assinatura:</span>
                                    {new Date(ficha.dataAssinatura).toLocaleString('pt-BR')}
                                </div>
                                <div>
                                    <span className="font-bold block text-petroleo dark:text-gray-200 print:text-black">Endereço IP de Origem:</span>
                                    {ficha.ipOrigem}
                                </div>
                                <div>
                                    <span className="font-bold block text-petroleo dark:text-gray-200 print:text-black">Dispositivo (User Agent):</span>
                                    <span className="break-words">{ficha.userAgent}</span>
                                </div>
                                <div>
                                    <span className="font-bold block text-petroleo dark:text-gray-200 print:text-black">Hash de Integridade (SHA-256):</span>
                                    <span className="font-mono text-[10px] break-all bg-gray-100 dark:bg-black/50 print:bg-gray-100 p-1 rounded inline-block mt-1">
                                        {ficha.hashIntegridade}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center border-l dark:border-white/10 print:border-gray-200 pl-6">
                                <span className="font-bold text-sm mb-2 text-petroleo dark:text-gray-200 print:text-black">Assinatura Digital</span>
                                {ficha.assinaturaPng ? (
                                    <img src={ficha.assinaturaPng} alt="Assinatura" className="max-h-24 object-contain filter dark:invert print:invert-0" />
                                ) : (
                                    <div className="h-24 flex items-center justify-center text-gray-400 italic text-xs">Sem rubrica</div>
                                )}
                                <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 dark:bg-green-500/10 print:bg-white px-3 py-1 rounded-full border border-green-200 dark:border-green-500/30">
                                    <CheckCircle2 size={12} /> Autenticado
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 print:text-gray-500 mt-6 text-center leading-relaxed">
                            Este documento foi assinado eletronicamente. As evidências técnicas coletadas (IP, Data, Geometria da Assinatura e Criptografia Hash) garantem sua integridade e autoria, possuindo validade jurídica conforme a legislação vigente sobre assinaturas eletrônicas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
