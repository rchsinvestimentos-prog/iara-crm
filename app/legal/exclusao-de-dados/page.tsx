// Página PÚBLICA — Solicitação de Exclusão de Dados
// URL: https://app.iara.click/legal/exclusao-de-dados
// Necessária para o Meta App Review (Data Deletion Request)

'use client'

import { useState } from 'react'

export default function ExclusaoDeDados() {
    const [email, setEmail] = useState('')
    const [telefone, setTelefone] = useState('')
    const [motivo, setMotivo] = useState('')
    const [enviado, setEnviado] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        // Em produção, isso vai pro backend
        try {
            await fetch('/api/legal/exclusao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, telefone, motivo }),
            })
        } catch {}
        setEnviado(true)
    }

    return (
        <html lang="pt-BR">
            <head>
                <title>Exclusão de Dados — IARA</title>
                <meta name="description" content="Solicite a exclusão dos seus dados da plataforma IARA" />
            </head>
            <body style={{ background: '#0f0f1a', color: '#e0e0e8', fontFamily: 'system-ui, sans-serif', margin: 0, padding: '40px 20px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #D99773, #C07A55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px' }}>I</div>
                        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Exclusão de Dados — IARA</h1>
                    </div>

                    <p style={{ fontSize: '14px', lineHeight: '1.7', opacity: 0.8, marginBottom: '24px' }}>
                        Conforme a LGPD (Lei 13.709/2018), você tem o direito de solicitar a exclusão dos seus dados pessoais. 
                        Preencha o formulário abaixo e nossa equipe processará sua solicitação em até <strong>15 dias úteis</strong>.
                    </p>

                    {enviado ? (
                        <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', textAlign: 'center' }}>
                            <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>✅ Solicitação recebida!</p>
                            <p style={{ fontSize: '14px', opacity: 0.8 }}>Processaremos sua solicitação em até 15 dias úteis. Você receberá uma confirmação por email.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="seu@email.com"
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e0e0e8', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Telefone (opcional)</label>
                                <input
                                    type="text"
                                    value={telefone}
                                    onChange={e => setTelefone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e0e0e8', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Motivo (opcional)</label>
                                <textarea
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Descreva o motivo da solicitação..."
                                    rows={3}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#e0e0e8', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                            </div>
                            <button
                                type="submit"
                                style={{ padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #D99773, #C07A55)', color: 'white', fontWeight: '600', fontSize: '15px', cursor: 'pointer' }}
                            >
                                Solicitar Exclusão
                            </button>
                        </form>
                    )}

                    <div style={{ marginTop: '32px', fontSize: '12px', opacity: 0.5 }}>
                        <p>Após a exclusão, os dados não poderão ser recuperados. Dados necessários para cumprimento de obrigações legais poderão ser retidos conforme a legislação vigente.</p>
                        <p>Dúvidas: <strong>suporte@iara.click</strong></p>
                    </div>
                </div>
            </body>
        </html>
    )
}
