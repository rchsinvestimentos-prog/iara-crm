'use client'

import { Plus, Calendar, Home, MoreHorizontal, MapPin, Phone } from 'lucide-react'

interface Props {
    nome: string
    tratamento: string | null
    especialidade: string | null
    bio: string | null
    fotoUrl: string | null
    linkConfig: {
        cor1?: string
        cor2?: string
        corTexto1?: string
        corTexto2?: string
        nomeApp?: string
        logotipoUrl?: string
        endereco?: string
    }
    nomeClinica: string
}

export default function PublicBookingClient({
    nome, tratamento, especialidade, bio, fotoUrl, linkConfig, nomeClinica
}: Props) {
    const cor1 = linkConfig.cor1 || '#D99773'
    const cor2 = linkConfig.cor2 || '#34425A'
    const corTexto1 = linkConfig.corTexto1 || '#FFFFFF'
    const corTexto2 = linkConfig.corTexto2 || '#FFFFFF'
    const nomeApp = linkConfig.nomeApp || nome
    const logo = linkConfig.logotipoUrl
    const endereco = linkConfig.endereco
    const displayName = tratamento ? `${tratamento} ${nomeApp}` : nomeApp

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="pt-8 pb-6 px-4 flex flex-col items-center">
                {logo ? (
                    <img src={logo} alt="Logo" className="w-24 h-12 object-contain mb-3" />
                ) : fotoUrl ? (
                    <img src={fotoUrl} alt={nome} className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-gray-100" />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <span className="text-3xl">👩‍⚕️</span>
                    </div>
                )}
                <h1 className="text-xl font-bold text-gray-800 text-center">{displayName}</h1>
                {especialidade && (
                    <p className="text-sm text-gray-500 mt-1">{especialidade}</p>
                )}
                {bio && (
                    <p className="text-sm text-gray-400 mt-2 text-center max-w-sm">{bio}</p>
                )}
            </header>

            {/* Action Buttons */}
            <div className="px-6 flex gap-3 mb-6">
                <button
                    className="flex-1 py-4 rounded-xl flex flex-col items-center gap-1.5 text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: cor1, color: corTexto1 }}
                >
                    <Plus size={22} />
                    AGENDAR
                </button>
                <button
                    className="flex-1 py-4 rounded-xl flex flex-col items-center gap-1.5 text-sm font-semibold shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: cor2, color: corTexto2 }}
                >
                    <Calendar size={22} />
                    RESERVAS
                </button>
            </div>

            {/* Address */}
            {endereco && (
                <div className="px-6 flex items-center gap-2 text-gray-400 text-sm mb-6">
                    <MapPin size={16} className="flex-shrink-0" />
                    <span>{endereco}</span>
                </div>
            )}

            {/* Clinic Info */}
            <div className="px-6 text-center text-xs text-gray-300 mt-auto mb-4">
                {nomeClinica && <p>{nomeClinica}</p>}
                <p className="mt-1">Powered by <strong>IARA</strong></p>
            </div>

            {/* Bottom Nav */}
            <nav className="border-t border-gray-100 py-3 px-6 flex justify-around">
                <div className="flex flex-col items-center gap-0.5 text-gray-500">
                    <Home size={20} />
                    <span className="text-[10px]">INICIO</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-gray-500">
                    <Calendar size={20} />
                    <span className="text-[10px]">RESERVAS</span>
                </div>
                <div className="flex flex-col items-center gap-0.5" style={{ color: cor1 }}>
                    <Plus size={20} />
                    <span className="text-[10px] font-semibold">AGENDAR</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 text-gray-500">
                    <MoreHorizontal size={20} />
                    <span className="text-[10px]">MAIS</span>
                </div>
            </nav>
        </div>
    )
}
