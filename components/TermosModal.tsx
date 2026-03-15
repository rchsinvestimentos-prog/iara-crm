'use client'

import { useState } from 'react'
import { Shield, CheckCircle, Loader2 } from 'lucide-react'

interface TermosModalProps {
    tipo: 'termos_uso' | 'pos_procedimento'
    onAceito: () => void
}

const TEXTOS = {
    termos_uso: {
        titulo: 'Termos de Uso — IARA',
        conteudo: `⚠️ A IARA é uma Inteligência Artificial. Como toda IA, ela pode cometer erros.

A IARA NÃO recomenda, sugere ou prescreve nenhum tipo de procedimento, tratamento, medicamento ou conduta clínica. Ela apenas repassa as informações que VOCÊ, profissional, cadastrar no sistema.

Ao utilizar a plataforma IARA, você declara estar ciente e de acordo com os seguintes termos:

1. NATUREZA DO SERVIÇO: A IARA é uma ferramenta de automação de atendimento via WhatsApp. Ela NÃO é uma profissional de saúde, médica, esteticista ou consultora.

2. RESPONSABILIDADE DAS INFORMAÇÕES: Todas as informações cadastradas no sistema (procedimentos, preços, orientações de pós-procedimento, respostas personalizadas) são de responsabilidade exclusiva da profissional que as cadastrou.

3. LIMITAÇÃO DE RESPONSABILIDADE: A Belivv Company, desenvolvedora da IARA, não se responsabiliza por:
   - Orientações incorretas cadastradas pelo usuário
   - Uso indevido das funcionalidades da plataforma
   - Danos decorrentes de informações incorretas fornecidas pela profissional
   - Decisões de pacientes baseadas em informações cadastradas pelo usuário

4. DADOS PESSOAIS (LGPD): Os dados de pacientes/clientes processados pela IARA são armazenados em conformidade com a Lei Geral de Proteção de Dados. O usuário é o controlador dos dados de seus pacientes.

5. CANCELAMENTO: O serviço pode ser cancelado a qualquer momento. Após cancelamento, os dados serão mantidos por 90 dias antes da exclusão definitiva.`,
        botao: 'Li e aceito os Termos de Uso',
    },
    pos_procedimento: {
        titulo: 'Disclaimer — Orientações de Pós-Procedimento',
        conteudo: `DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA

Ao ativar o envio de orientações de pós-procedimento pela IARA, eu declaro que:

1. Sou a responsável técnica por TODAS as orientações cadastradas neste sistema.

2. A IARA apenas repassa as mensagens que EU cadastrei e NÃO recomenda, sugere ou prescreve nenhum tipo de tratamento, procedimento ou cuidado por conta própria.

3. Revisarei periodicamente as orientações cadastradas para garantir que estejam atualizadas e corretas.

4. Compreendo que a Belivv Company NÃO se responsabiliza pela adequação, precisão ou segurança das orientações que eu cadastrar.

5. Estou ciente de que sou a única responsável por quaisquer consequências decorrentes das orientações repassadas pela IARA aos meus pacientes/clientes.`,
        botao: 'Declaro que sou a responsável técnica',
    },
}

export default function TermosModal({ tipo, onAceito }: TermosModalProps) {
    const [nome, setNome] = useState('')
    const [registro, setRegistro] = useState('')
    const [checked, setChecked] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const texto = TEXTOS[tipo]

    async function handleAceitar() {
        if (!nome.trim() || !checked) return
        setSaving(true)

        try {
            const res = await fetch('/api/disclaimer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo,
                    nomeCompleto: nome,
                    registroProfissional: registro || undefined,
                }),
            })

            if (res.ok) {
                setSaved(true)
                setTimeout(() => onAceito(), 1500)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
                        <Shield size={20} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{texto.titulo}</h2>
                </div>

                {/* Conteúdo */}
                <div
                    className="max-h-64 overflow-y-auto rounded-xl p-4 text-[12px] leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                >
                    {texto.conteudo}
                </div>

                {/* Nome */}
                <div className="space-y-2">
                    <input
                        type="text"
                        placeholder="Seu nome completo *"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                    />
                    {tipo === 'pos_procedimento' && (
                        <input
                            type="text"
                            placeholder="Registro profissional (CRM/CREFITO/CRO)"
                            value={registro}
                            onChange={(e) => setRegistro(e.target.value)}
                            className="w-full rounded-xl px-4 py-3 text-[13px] outline-none"
                            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                        />
                    )}
                </div>

                {/* Checkbox */}
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setChecked(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#D99773] rounded"
                    />
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                        {tipo === 'termos_uso'
                            ? 'Li e concordo com todos os termos acima'
                            : 'Declaro que sou a responsável técnica e estou ciente da minha responsabilidade'}
                    </span>
                </label>

                {/* Botão */}
                <button
                    onClick={handleAceitar}
                    disabled={!nome.trim() || !checked || saving}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40"
                    style={{
                        background: saved ? '#06D6A0' : 'linear-gradient(135deg, #D99773, #C07A55)',
                        color: 'white',
                    }}
                >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Shield size={15} />}
                    {saving ? 'Salvando...' : saved ? 'Aceito! ✅' : texto.botao}
                </button>
            </div>
        </div>
    )
}
