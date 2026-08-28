'use client'

// ============================================
// SIMULADOR FLUTUANTE
// ============================================
// Botão fixo no canto da tela que abre o simulador de conversa de qualquer
// página do painel.
//
// Antes o simulador só existia dentro da aba Atendimento, e testar a IARA
// exigia navegar até lá ou conectar um WhatsApp de verdade. Aqui ele roda com
// a configuração salva da clínica — ou seja, exatamente como a IARA responde
// para as pacientes, com a voz e tudo.

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import SimulatorDrawer from './tools/SimulatorDrawer'

export default function SimuladorFlutuante() {
    const [aberto, setAberto] = useState(false)

    return (
        <>
            {!aberto && (
                <button
                    onClick={() => setAberto(true)}
                    aria-label="Testar a IARA"
                    className="fixed z-40 flex items-center gap-2 rounded-full shadow-lg transition-transform hover:scale-105"
                    style={{
                        right: 20,
                        bottom: 20,
                        padding: '13px 20px',
                        background: 'linear-gradient(135deg, #D99773, #C07A55)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 6px 22px rgba(192,122,85,0.38)',
                    }}
                >
                    <MessageCircle size={17} />
                    <span className="text-[13px] font-semibold">Testar a IARA</span>
                </button>
            )}

            <SimulatorDrawer isOpen={aberto} onClose={() => setAberto(false)} />
        </>
    )
}
