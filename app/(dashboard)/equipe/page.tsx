'use client'

import { useState, useEffect } from 'react'

interface Profissional {
    id: string
    nome: string
    bio: string | null
    especialidade: string | null
    whatsapp: string | null
    horarioSemana: string | null
    almocoSemana: string | null
    atendeSabado: boolean | null
    horarioSabado: string | null
    atendeDomingo: boolean | null
    horarioDomingo: string | null
    intervaloAtendimento: number | null
    ausencias: any[]
    isDono: boolean
    ativo: boolean
    ordem: number
    procedimentos: { id: number; nome: string; valor: number }[]
}

interface FormData {
    nome: string
    bio: string
    especialidade: string
    whatsapp: string
    horarioSemana: string
    almocoSemana: string
    atendeSabado: boolean
    horarioSabado: string
    atendeDomingo: boolean
    horarioDomingo: string
    intervaloAtendimento: number
}

const emptyForm: FormData = {
    nome: '', bio: '', especialidade: '', whatsapp: '',
    horarioSemana: '', almocoSemana: '',
    atendeSabado: false, horarioSabado: '',
    atendeDomingo: false, horarioDomingo: '',
    intervaloAtendimento: 15,
}

export default function EquipePage() {
    const [profissionais, setProfissionais] = useState<Profissional[]>([])
    const [loading, setLoading] = useState(true)
    const [max, setMax] = useState(1)
    const [nivel, setNivel] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState<FormData>(emptyForm)
    const [saving, setSaving] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => { fetchEquipe() }, [])

    async function fetchEquipe() {
        try {
            const res = await fetch('/api/clinica/profissionais')
            const data = await res.json()
            setProfissionais(data.profissionais || [])
            setMax(data.max || 1)
            setNivel(data.nivel || 1)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    function abrirForm(prof?: Profissional) {
        if (prof) {
            setEditId(prof.id)
            setForm({
                nome: prof.nome, bio: prof.bio || '', especialidade: prof.especialidade || '',
                whatsapp: prof.whatsapp || '',
                horarioSemana: prof.horarioSemana || '', almocoSemana: prof.almocoSemana || '',
                atendeSabado: prof.atendeSabado || false, horarioSabado: prof.horarioSabado || '',
                atendeDomingo: prof.atendeDomingo || false, horarioDomingo: prof.horarioDomingo || '',
                intervaloAtendimento: prof.intervaloAtendimento || 15,
            })
        } else {
            setEditId(null)
            setForm(emptyForm)
        }
        setShowForm(true)
    }

    async function salvar() {
        if (!form.nome.trim()) { alert('Nome é obrigatório'); return }
        setSaving(true)
        try {
            const method = editId ? 'PUT' : 'POST'
            const body = editId ? { id: editId, ...form } : form
            const res = await fetch('/api/clinica/profissionais', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (!res.ok) {
                const err = await res.json()
                alert(err.error || 'Erro ao salvar')
                setSaving(false); return
            }
            setShowForm(false)
            fetchEquipe()
        } catch { alert('Erro de conexão') }
        setSaving(false)
    }

    async function remover(id: string) {
        if (!confirm('Deseja remover este profissional da equipe?')) return
        await fetch(`/api/clinica/profissionais?id=${id}`, { method: 'DELETE' })
        fetchEquipe()
    }

    if (loading) {
        return (
            <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ color: '#64748b', fontSize: 15 }}>Carregando equipe...</p>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F4C61' }}>
                        👩‍⚕️ Equipe
                    </h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
                        {profissionais.length} de {max} profissional(is) · Plano {nivel}
                    </p>
                </div>
                {profissionais.length < max && (
                    <button
                        onClick={() => abrirForm()}
                        style={{
                            background: 'linear-gradient(135deg, #0F4C61, #1a6b84)',
                            color: '#fff', border: 'none', borderRadius: 12,
                            padding: '10px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                        }}
                    >+ Adicionar</button>
                )}
            </div>

            {/* Lista vazia */}
            {profissionais.length === 0 && !showForm && (
                <div style={{
                    background: '#fff', borderRadius: 20, padding: '40px 24px',
                    border: '1px solid #e2e8f0', textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👩‍⚕️</div>
                    <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 18 }}>Configure sua equipe</h3>
                    <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                        Cadastre você e sua equipe para a IARA saber quem faz cada procedimento,
                        direcionar clientes e agendar com a pessoa certa.
                    </p>
                    <button
                        onClick={() => abrirForm()}
                        style={{
                            background: 'linear-gradient(135deg, #0F4C61, #1a6b84)',
                            color: '#fff', border: 'none', borderRadius: 14,
                            padding: '12px 28px', cursor: 'pointer', fontWeight: 600, fontSize: 15,
                        }}
                    >Começar cadastro</button>
                </div>
            )}

            {/* Cards de profissionais */}
            {profissionais.map(prof => (
                <div key={prof.id} style={{
                    background: '#fff', borderRadius: 18, padding: '20px 24px',
                    border: `1px solid ${prof.isDono ? 'rgba(15,76,97,0.2)' : '#e2e8f0'}`,
                    marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    opacity: prof.ativo ? 1 : 0.5,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: prof.isDono
                                ? 'linear-gradient(135deg, #D99773, #C07A55)'
                                : 'linear-gradient(135deg, #0F4C61, #1a6b84)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0,
                        }}>
                            {prof.nome.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{prof.nome}</span>
                                {prof.isDono && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg, #D99773, #C07A55)',
                                        color: '#fff', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase',
                                    }}>Titular</span>
                                )}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>
                                {prof.especialidade || (prof.procedimentos?.length
                                    ? `${prof.procedimentos.length} procedimento(s)`
                                    : 'Sem especialidade definida'
                                )}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => setExpandedId(expandedId === prof.id ? null : prof.id)}
                                style={{
                                    background: 'rgba(15,76,97,0.06)', border: 'none',
                                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                    fontSize: 13, color: '#0F4C61', fontWeight: 500,
                                }}
                            >{expandedId === prof.id ? '▲ Menos' : '▼ Detalhes'}</button>
                            <button
                                onClick={() => abrirForm(prof)}
                                style={{
                                    background: 'none', border: '1px solid #e2e8f0',
                                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                    fontSize: 13, color: '#64748b'
                                }}
                            >✏️ Editar</button>
                        </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {expandedId === prof.id && (
                        <div style={{
                            marginTop: 16, paddingTop: 16,
                            borderTop: '1px solid #f1f5f9'
                        }}>
                            {prof.bio && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Bio / Diferenciais</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{prof.bio}</p>
                                </div>
                            )}
                            {prof.whatsapp && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>WhatsApp</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#334155' }}>📱 {prof.whatsapp}</p>
                                </div>
                            )}
                            {prof.horarioSemana && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Horários</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#334155' }}>
                                        🕐 Semana: {prof.horarioSemana}
                                        {prof.almocoSemana && ` (almoço: ${prof.almocoSemana})`}
                                    </p>
                                    {prof.atendeSabado && prof.horarioSabado && (
                                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                                            Sábado: {prof.horarioSabado}
                                        </p>
                                    )}
                                </div>
                            )}
                            {prof.procedimentos?.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Procedimentos</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                        {prof.procedimentos.map(p => (
                                            <span key={p.id} style={{
                                                fontSize: 12, background: 'rgba(15,76,97,0.08)',
                                                color: '#0F4C61', padding: '4px 10px', borderRadius: 8,
                                            }}>{p.nome}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!prof.isDono && (
                                <button
                                    onClick={() => remover(prof.id)}
                                    style={{
                                        background: 'none', border: '1px solid rgba(220,50,50,0.2)',
                                        borderRadius: 10, padding: '6px 16px', cursor: 'pointer',
                                        fontSize: 12, color: '#dc2626', marginTop: 8,
                                    }}
                                >🗑 Remover da equipe</button>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Limite atingido */}
            {profissionais.length >= max && (
                <div style={{
                    background: 'rgba(217,151,115,0.08)', borderRadius: 14, padding: '16px 20px',
                    border: '1px solid rgba(217,151,115,0.2)', marginBottom: 14, textAlign: 'center',
                }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#C07A55', fontWeight: 600, marginBottom: 4 }}>
                        Limite atingido ({profissionais.length}/{max})
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                        Faça <a href="/plano" style={{ color: '#D99773', fontWeight: 600 }}>upgrade do plano</a> para adicionar mais profissionais
                    </p>
                </div>
            )}

            {/* Formulário de Adicionar/Editar */}
            {showForm && (
                <div style={{
                    background: '#fff', borderRadius: 20, padding: '28px',
                    border: '2px solid #0F4C61', marginBottom: 16,
                    boxShadow: '0 4px 16px rgba(15,76,97,0.12)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F4C61' }}>
                            {editId ? '✏️ Editar Profissional' : '➕ Novo Profissional'}
                        </h3>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}
                        >✕</button>
                    </div>

                    <div style={{ display: 'grid', gap: 16 }}>
                        {/* Nome */}
                        <div>
                            <label style={labelStyle}>Nome completo *</label>
                            <input
                                value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                                placeholder="Ex: Dra. Maria Silva"
                                style={inputStyle}
                            />
                        </div>

                        {/* Especialidade */}
                        <div>
                            <label style={labelStyle}>Especialidade</label>
                            <input
                                value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                                placeholder="Ex: Harmonização Facial, Botox, Bioestimuladores"
                                style={inputStyle}
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label style={labelStyle}>Bio / Diferenciais</label>
                            <textarea
                                value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                                placeholder="Fale sobre experiência, formação e diferenciais..."
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        {/* WhatsApp */}
                        <div>
                            <label style={labelStyle}>WhatsApp pessoal</label>
                            <input
                                value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                                placeholder="(11) 99999-9999"
                                style={inputStyle}
                            />
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                A IARA envia alertas de mídia e agendamentos para este número
                            </span>
                        </div>

                        {/* Horários */}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
                            <label style={{ ...labelStyle, fontSize: 14, color: '#0F4C61' }}>⏰ Horários</label>
                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 12 }}>
                                Se não preencher, usará os horários da clínica
                            </span>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Semana</label>
                                    <input
                                        value={form.horarioSemana} onChange={e => setForm({ ...form, horarioSemana: e.target.value })}
                                        placeholder="08:00 às 18:00"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Almoço</label>
                                    <input
                                        value={form.almocoSemana} onChange={e => setForm({ ...form, almocoSemana: e.target.value })}
                                        placeholder="12:00 às 13:00"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox" checked={form.atendeSabado}
                                        onChange={e => setForm({ ...form, atendeSabado: e.target.checked })}
                                    /> Sábado
                                </label>
                                {form.atendeSabado && (
                                    <input
                                        value={form.horarioSabado} onChange={e => setForm({ ...form, horarioSabado: e.target.value })}
                                        placeholder="08:00 às 12:00" style={{ ...inputStyle, width: 160 }}
                                    />
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox" checked={form.atendeDomingo}
                                        onChange={e => setForm({ ...form, atendeDomingo: e.target.checked })}
                                    /> Domingo
                                </label>
                                {form.atendeDomingo && (
                                    <input
                                        value={form.horarioDomingo} onChange={e => setForm({ ...form, horarioDomingo: e.target.value })}
                                        placeholder="08:00 às 12:00" style={{ ...inputStyle, width: 160 }}
                                    />
                                )}
                            </div>

                            <div style={{ marginTop: 12 }}>
                                <label style={labelStyle}>Intervalo entre consultas (min)</label>
                                <input
                                    type="number" value={form.intervaloAtendimento}
                                    onChange={e => setForm({ ...form, intervaloAtendimento: Number(e.target.value) })}
                                    min={5} max={120} style={{ ...inputStyle, width: 100 }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Botões */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button
                            onClick={salvar} disabled={saving}
                            style={{
                                flex: 1, background: 'linear-gradient(135deg, #0F4C61, #1a6b84)',
                                color: '#fff', border: 'none', borderRadius: 12,
                                padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: 15,
                                opacity: saving ? 0.6 : 1,
                            }}
                        >{saving ? '⏳ Salvando...' : editId ? '💾 Salvar alterações' : '✅ Adicionar profissional'}</button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{
                                background: 'none', border: '1px solid #e2e8f0', borderRadius: 12,
                                padding: '12px 20px', cursor: 'pointer', fontSize: 14, color: '#64748b',
                            }}
                        >Cancelar</button>
                    </div>
                </div>
            )}

            {/* Dica */}
            <div style={{
                background: 'rgba(15,76,97,0.04)', borderRadius: 16, padding: '18px 22px',
                border: '1px solid rgba(15,76,97,0.1)', marginTop: 8,
            }}>
                <p style={{ margin: 0, fontSize: 14, color: '#0F4C61', fontWeight: 600, marginBottom: 6 }}>
                    💡 Como funciona
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    Cada profissional pode ter seus próprios procedimentos, horários e Google Calendar.
                    A IARA direciona clientes automaticamente para o profissional certo baseado no procedimento desejado.
                    Os procedimentos são vinculados em <strong>Configurações → Procedimentos</strong>.
                </p>
            </div>
        </div>
    )
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b',
    background: '#f8fafc', outline: 'none',
    boxSizing: 'border-box',
}
