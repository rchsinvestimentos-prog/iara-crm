'use client'

import { useState, useEffect } from 'react'

// ========== Types ==========

interface Profissional {
    id: string; nome: string; tratamento: string | null
    bio: string | null; especialidade: string | null; diferenciais: string | null
    whatsapp: string | null; fotoUrl: string | null
    isDono: boolean; ativo: boolean; ordem: number
    procedimentos: { id: number; nome: string; valor: number; duracao: number | null }[]
}

const TRATAMENTOS = [
    { value: '', label: 'Selecione...' },
    { value: 'Dra.', label: 'Dra.' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Nutri', label: 'Nutri' },
    { value: 'nome', label: 'Pelo nome' },
    { value: 'outro', label: 'Outro (especifique no nome)' },
]

// ========== Component ==========

export default function ProfissionaisPage() {
    const [profissionais, setProfissionais] = useState<Profissional[]>([])
    const [loading, setLoading] = useState(true)
    const [max, setMax] = useState(1)
    const [nivel, setNivel] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Form fields (simplificado)
    const [nome, setNome] = useState('')
    const [tratamento, setTratamento] = useState('')
    const [especialidade, setEspecialidade] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [bio, setBio] = useState('')
    const [diferenciais, setDiferenciais] = useState('')
    const [fotoUrl, setFotoUrl] = useState('')

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

    function resetForm() {
        setNome(''); setTratamento(''); setEspecialidade(''); setWhatsapp('')
        setBio(''); setDiferenciais(''); setFotoUrl('')
    }

    function abrirForm(prof?: Profissional) {
        if (prof) {
            setEditId(prof.id)
            setNome(prof.nome); setTratamento(prof.tratamento || '')
            setEspecialidade(prof.especialidade || ''); setWhatsapp(prof.whatsapp || '')
            setBio(prof.bio || ''); setDiferenciais(prof.diferenciais || '')
            setFotoUrl(prof.fotoUrl || '')
        } else {
            setEditId(null)
            resetForm()
        }
        setShowForm(true)
    }

    async function salvarDados() {
        if (!nome.trim()) { alert('Nome é obrigatório'); return }
        setSaving(true)
        try {
            const method = editId ? 'PUT' : 'POST'
            const body = {
                ...(editId ? { id: editId } : {}),
                nome, tratamento, especialidade, whatsapp, bio, diferenciais, fotoUrl,
            }
            const res = await fetch('/api/clinica/profissionais', {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            })
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Erro'); setSaving(false); return }
            
            setShowForm(false); resetForm()
            fetchEquipe()
        } catch { alert('Erro de conexão') }
        setSaving(false)
    }

    async function remover(id: string) {
        if (!confirm('Deseja remover este profissional?')) return
        await fetch(`/api/clinica/profissionais?id=${id}`, { method: 'DELETE' })
        fetchEquipe()
    }

    // ===== Loading =====
    if (loading) return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ color: '#64748b', fontSize: 15 }}>Carregando profissionais...</p>
        </div>
    )

    // ===== Render =====
    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F4C61' }}>👩‍⚕️ Equipe</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
                        {profissionais.length} profissional(is) cadastrado(s)
                    </p>
                </div>
                <button onClick={() => abrirForm()} style={btnPrimary}>+ Adicionar</button>
            </div>

            {/* Dica no topo */}
            <div style={{ background: 'rgba(217,151,115,0.06)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(217,151,115,0.15)', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    💡 Cadastre os profissionais da sua clínica aqui. Depois, vá em <strong style={{ color: '#0F4C61' }}>Meus Procedimentos</strong> e vincule cada procedimento aos profissionais que o realizam. A IARA usará essas informações para direcionar clientes!
                </p>
            </div>

            {/* Lista vazia */}
            {profissionais.length === 0 && !showForm && (
                <div style={{ background: '#fff', borderRadius: 20, padding: '40px 24px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👩‍⚕️</div>
                    <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 18 }}>Cadastre seus profissionais</h3>
                    <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                        Cadastre você e sua equipe. Cada profissional poderá ser vinculado aos procedimentos que realiza.
                    </p>
                    <button onClick={() => abrirForm()} style={{ ...btnPrimary, padding: '12px 28px', fontSize: 15 }}>Começar cadastro</button>
                </div>
            )}

            {/* ========== Cards ========== */}
            {profissionais.map(prof => (
                <div key={prof.id} style={{ background: '#fff', borderRadius: 18, padding: '20px 24px', border: `1px solid ${prof.isDono ? 'rgba(15,76,97,0.2)' : '#e2e8f0'}`, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', opacity: prof.ativo ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: prof.isDono ? 'linear-gradient(135deg, #D99773, #C07A55)' : 'linear-gradient(135deg, #0F4C61, #1a6b84)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0, backgroundImage: prof.fotoUrl ? `url(${prof.fotoUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                            {!prof.fotoUrl && prof.nome.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {prof.tratamento && prof.tratamento !== 'nome' && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(15,76,97,0.1)', color: '#0F4C61', padding: '2px 6px', borderRadius: 4 }}>{prof.tratamento}</span>}
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{prof.nome}</span>
                                {prof.isDono && <span style={{ fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg, #D99773, #C07A55)', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>Titular</span>}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>{prof.especialidade || (prof.procedimentos?.length ? `${prof.procedimentos.length} procedimento(s)` : 'Sem especialidade')}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => setExpandedId(expandedId === prof.id ? null : prof.id)} style={btnOutlineSmall}>{expandedId === prof.id ? '▲' : '▼'}</button>
                            <button onClick={() => abrirForm(prof)} style={{ ...btnOutlineSmall, border: '1px solid rgba(15,76,97,0.15)', padding: '8px 14px' }} title="Editar profissional">✏️</button>
                        </div>
                    </div>

                    {expandedId === prof.id && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                            {prof.bio && <DetailBlock label="Bio">{prof.bio}</DetailBlock>}
                            {prof.diferenciais && <DetailBlock label="Diferenciais">{prof.diferenciais}</DetailBlock>}
                            {prof.whatsapp && <DetailBlock label="WhatsApp">📱 {prof.whatsapp}</DetailBlock>}
                            {prof.procedimentos?.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Procedimentos</span>
                                    <div style={{ marginTop: 6 }}>{prof.procedimentos.map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, marginBottom: 4, background: 'rgba(15,76,97,0.04)' }}>
                                            <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{p.nome}</span>
                                            <span style={{ fontSize: 12, color: '#0F4C61', fontWeight: 600 }}>R$ {Number(p.valor).toFixed(2)}{p.duracao ? ` · ${p.duracao}min` : ''}</span>
                                        </div>
                                    ))}</div>
                                </div>
                            )}
                            {!prof.isDono && <button onClick={() => remover(prof.id)} style={{ background: 'none', border: '1px solid rgba(220,50,50,0.2)', borderRadius: 10, padding: '6px 16px', cursor: 'pointer', fontSize: 12, color: '#dc2626', marginTop: 8 }}>🗑 Remover</button>}
                        </div>
                    )}
                </div>
            ))}

            {/* ========== FORMULÁRIO SIMPLIFICADO ========== */}
            {showForm && (
                <div style={{ background: '#fff', borderRadius: 18, padding: '24px', border: '1px solid #e2e8f0', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F4C61' }}>{editId ? '✏️ Editar Profissional' : '➕ Novo Profissional'}</h3>
                        <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </div>

                    <div style={{ display: 'grid', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Nome completo *</label>
                                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Tratamento</label>
                                <select value={tratamento} onChange={e => setTratamento(e.target.value)} style={inputStyle}>
                                    {TRATAMENTOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Especialidade</label>
                            <input value={especialidade} onChange={e => setEspecialidade(e.target.value)} placeholder="Ex: Harmonização Facial" style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>WhatsApp</label>
                            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" style={inputStyle} />
                            <span style={hintStyle}>Para contato interno apenas (a IARA NÃO envia links de acesso)</span>
                        </div>
                        <div>
                            <label style={labelStyle}>Bio</label>
                            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Fale sobre experiência e formação..." rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
                        </div>
                        <div>
                            <label style={labelStyle}>Diferenciais</label>
                            <textarea value={diferenciais} onChange={e => setDiferenciais(e.target.value)} placeholder="Técnicas exclusivas, certificações especiais..." rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
                        </div>
                        <div>
                            <label style={labelStyle}>📸 Foto do profissional</label>
                            {fotoUrl && <div style={{ marginBottom: 10 }}><img src={fotoUrl} alt="Foto" style={{ width: 80, height: 80, borderRadius: 14, objectFit: 'cover' as const, border: '2px solid #e2e8f0' }} /></div>}
                            <input type="file" accept="image/*" onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const fd = new FormData()
                                fd.append('file', file)
                                fd.append('tipo', 'foto')
                                try {
                                    const res = await fetch('/api/midia/upload', { method: 'POST', body: fd })
                                    const data = await res.json()
                                    if (data.url) { setFotoUrl(data.url); alert('✅ Foto enviada!') }
                                    else { alert(data.error || 'Erro no upload') }
                                } catch { alert('Erro ao enviar foto') }
                            }} style={{ fontSize: 13, color: '#475569' }} />
                        </div>
                    </div>

                    {/* Botões */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                        <button onClick={salvarDados} disabled={saving} style={{ ...btnPrimary, flex: 1, padding: '14px', fontSize: 16, opacity: saving ? 0.6 : 1 }}>{saving ? '⏳ Salvando...' : editId ? '💾 Salvar' : '✅ Adicionar'}</button>
                        <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 20px', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ========== Sub-components ==========

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{label}</span>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{children}</p>
        </div>
    )
}

// ========== Styles ==========

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }
const hintStyle: React.CSSProperties = { fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 4 }
const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg, #0F4C61, #1a6b84)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }
const btnOutlineSmall: React.CSSProperties = { background: 'rgba(15,76,97,0.06)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#0F4C61', fontWeight: 500 }
