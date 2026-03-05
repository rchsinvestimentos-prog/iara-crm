'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Shield, FileText, Lock, CheckCircle2 } from 'lucide-react'

interface TermosModalProps {
    onAccept: () => void
    nomeClinica?: string
}

export default function TermosModal({ onAccept, nomeClinica }: TermosModalProps) {
    const [aceitouTermos, setAceitouTermos] = useState(false)
    const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleAccept = async () => {
        if (!aceitouTermos || !aceitouPrivacidade) return
        setSaving(true)
        try {
            await fetch('/api/clinica', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aceiteTermos: new Date().toISOString() }),
            })
            onAccept()
        } catch {
            alert('Erro ao salvar. Tente novamente.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--bg-card, #1a1f2e)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Header */}
                <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#0F4C61] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#D99773]/20">
                        <Shield size={24} className="text-white" />
                    </div>
                    <h2 className="text-[16px] font-bold" style={{ color: 'var(--text-primary, #fff)' }}>
                        Bem-vinda ao Painel IARA! 🎉
                    </h2>
                    <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted, #6B7280)' }}>
                        {nomeClinica ? `${nomeClinica}, antes` : 'Antes'} de começar, leia e aceite nossos termos.
                    </p>
                </div>

                {/* Info Cards */}
                <div className="space-y-3 mb-5">
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))' }}>
                        <FileText size={16} className="text-[#D99773] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary, #fff)' }}>A IARA é uma Inteligência Artificial</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted, #6B7280)' }}>Ela pode cometer erros e não substitui o julgamento profissional</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle, rgba(255,255,255,0.03))' }}>
                        <Lock size={16} className="text-[#0F4C61] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary, #fff)' }}>Todas as conversas são armazenadas</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted, #6B7280)' }}>Para segurança, qualidade e resolução de disputas</p>
                        </div>
                    </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 mb-5">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={aceitouTermos}
                            onChange={e => setAceitouTermos(e.target.checked)}
                            className="mt-0.5 rounded"
                        />
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary, #9CA3AF)' }}>
                            Li e aceito os <Link href="/termos" target="_blank" className="text-[#D99773] underline hover:opacity-80">Termos de Uso</Link>
                        </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={aceitouPrivacidade}
                            onChange={e => setAceitouPrivacidade(e.target.checked)}
                            className="mt-0.5 rounded"
                        />
                        <span className="text-[11px]" style={{ color: 'var(--text-secondary, #9CA3AF)' }}>
                            Li e aceito a <Link href="/privacidade" target="_blank" className="text-[#D99773] underline hover:opacity-80">Política de Privacidade</Link>
                        </span>
                    </label>
                </div>

                {/* Button */}
                <button
                    onClick={handleAccept}
                    disabled={!aceitouTermos || !aceitouPrivacidade || saving}
                    className={`w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${aceitouTermos && aceitouPrivacidade
                        ? 'bg-gradient-to-r from-[#D99773] to-[#0F4C61] text-white shadow-lg shadow-[#D99773]/20 hover:opacity-90'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {saving ? (
                        'Salvando...'
                    ) : (
                        <>
                            <CheckCircle2 size={16} />
                            Aceitar e Começar
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
