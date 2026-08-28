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

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import SimulatorDrawer from './tools/SimulatorDrawer'

export default function SimuladorFlutuante() {
    const [aberto, setAberto] = useState(false)

    // O botão usa o nome que a clínica deu à assistente. Se ela batizou de
    // "Nicole", o menu e o botão precisam dizer Nicole — chamar de IARA no
    // botão e de Nicole no resto do painel confunde a profissional.
    const [nomeIA, setNomeIA] = useState('')

    useEffect(() => {
        fetch('/api/clinica')
            .then(r => r.json())
            .then(d => { if (d?.nomeAssistente) setNomeIA(d.nomeAssistente) })
            .catch(() => { })
    }, [])

    return (
        <>
            {!aberto && (
                <button
                    onClick={() => setAberto(true)}
                    aria-label={`Testar ${nomeIA || 'a IARA'}`}
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
                    <span className="text-[13px] font-semibold">Testar {nomeIA || 'a IARA'}</span>
                </button>
            )}

            <SimulatorDrawer isOpen={aberto} onClose={() => setAberto(false)} nomeIA={nomeIA} />
        </>
    )
}
