'use client'

import { useState, useEffect } from 'react'

// ========== Types ==========

interface Procedimento {
    id: number; nome: string; valor: number; duracao: number | null
    desconto: number; parcelas: number | null; descricao: string | null
    posProcedimento: string | null
}

interface Curso { nome: string; instituicao: string; ano: string }
interface RedesSociais { instagram?: string; tiktok?: string; youtube?: string; linkedin?: string }

interface Profissional {
    id: string; nome: string; tratamento: string | null
    bio: string | null; especialidade: string | null; diferenciais: string | null
    whatsapp: string | null; cursos: Curso[]; redesSociais: RedesSociais | null
    horarioSemana: string | null; almocoSemana: string | null
    atendeSabado: boolean | null; horarioSabado: string | null
    atendeDomingo: boolean | null; horarioDomingo: string | null
    intervaloAtendimento: number | null; ausencias: any[]
    linkAgendamento: string | null; fotoUrl: string | null
    chavePix: string | null; linkPagamento: string | null
    isDono: boolean; ativo: boolean; ordem: number
    procedimentos: Procedimento[]
}

interface FormData {
    nome: string; tratamento: string; especialidade: string; whatsapp: string
    bio: string; diferenciais: string; fotoUrl: string
    cursos: Curso[]; redesSociais: RedesSociais
    horarioSemana: string; almocoSemana: string
    atendeSabado: boolean; horarioSabado: string
    atendeDomingo: boolean; horarioDomingo: string
    intervaloAtendimento: number
    linkAgendamento: string; chavePix: string; linkPagamento: string
}

const emptyForm: FormData = {
    nome: '', tratamento: '', especialidade: '', whatsapp: '',
    bio: '', diferenciais: '', fotoUrl: '',
    cursos: [], redesSociais: {},
    horarioSemana: '', almocoSemana: '',
    atendeSabado: false, horarioSabado: '',
    atendeDomingo: false, horarioDomingo: '',
    intervaloAtendimento: 15,
    linkAgendamento: '', chavePix: '', linkPagamento: '',
}

const TRATAMENTOS = [
    { value: '', label: 'Selecione...' },
    { value: 'Dra.', label: 'Dra.' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Nutri', label: 'Nutri' },
    { value: 'nome', label: 'Pelo nome' },
    { value: 'outro', label: 'Outro (especifique no nome)' },
]

type Secao = 'dados' | 'perfil' | 'procedimentos' | 'cursos' | 'horarios' | 'pagamento' | 'links'

const SECOES: { key: Secao; icon: string; label: string }[] = [
    { key: 'dados', icon: '👤', label: 'Dados Básicos' },
    { key: 'perfil', icon: '📝', label: 'Perfil' },
    { key: 'procedimentos', icon: '📋', label: 'Procedimentos' },
    { key: 'cursos', icon: '🎓', label: 'Cursos' },
    { key: 'horarios', icon: '⏰', label: 'Horários' },
    { key: 'pagamento', icon: '💰', label: 'Pagamento' },
    { key: 'links', icon: '🔗', label: 'Links & Redes' },
]

// ========== Component ==========

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
    const [secaoAtiva, setSecaoAtiva] = useState<Secao>('dados')

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
                nome: prof.nome, tratamento: prof.tratamento || '',
                especialidade: prof.especialidade || '', whatsapp: prof.whatsapp || '',
                bio: prof.bio || '', diferenciais: prof.diferenciais || '',
                fotoUrl: prof.fotoUrl || '',
                cursos: Array.isArray(prof.cursos) ? prof.cursos : [],
                redesSociais: (prof.redesSociais && typeof prof.redesSociais === 'object') ? prof.redesSociais : {},
                horarioSemana: prof.horarioSemana || '', almocoSemana: prof.almocoSemana || '',
                atendeSabado: prof.atendeSabado || false, horarioSabado: prof.horarioSabado || '',
                atendeDomingo: prof.atendeDomingo || false, horarioDomingo: prof.horarioDomingo || '',
                intervaloAtendimento: prof.intervaloAtendimento || 15,
                linkAgendamento: prof.linkAgendamento || '',
                chavePix: prof.chavePix || '', linkPagamento: prof.linkPagamento || '',
            })
        } else {
            setEditId(null)
            setForm(emptyForm)
        }
        setSecaoAtiva('dados')
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

    // ===== Curso helpers =====
    function addCurso() {
        setForm({ ...form, cursos: [...form.cursos, { nome: '', instituicao: '', ano: '' }] })
    }
    function updateCurso(i: number, field: keyof Curso, val: string) {
        const c = [...form.cursos]; c[i] = { ...c[i], [field]: val }
        setForm({ ...form, cursos: c })
    }
    function removeCurso(i: number) {
        setForm({ ...form, cursos: form.cursos.filter((_, idx) => idx !== i) })
    }

    // ===== Redes helper =====
    function setRede(key: keyof RedesSociais, val: string) {
        setForm({ ...form, redesSociais: { ...form.redesSociais, [key]: val } })
    }

    // ===== Loading =====
    if (loading) {
        return (
            <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ color: '#64748b', fontSize: 15 }}>Carregando equipe...</p>
            </div>
        )
    }

    // ===== Render =====
    return (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
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
                    <button onClick={() => abrirForm()} style={btnPrimary}>+ Adicionar</button>
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
                    <button onClick={() => abrirForm()} style={{ ...btnPrimary, padding: '12px 28px', fontSize: 15 }}>
                        Começar cadastro
                    </button>
                </div>
            )}

            {/* ========== Cards ========== */}
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
                            backgroundImage: prof.fotoUrl ? `url(${prof.fotoUrl})` : undefined,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                        }}>
                            {!prof.fotoUrl && prof.nome.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {prof.tratamento && prof.tratamento !== 'nome' && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, background: 'rgba(15,76,97,0.1)',
                                        color: '#0F4C61', padding: '2px 6px', borderRadius: 4,
                                    }}>{prof.tratamento}</span>
                                )}
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{prof.nome}</span>
                                {prof.isDono && (
                                    <span style={{
                                        fontSize: 10, fontWeight: 700, background: 'linear-gradient(135deg, #D99773, #C07A55)',
                                        color: '#fff', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase',
                                    }}>Titular</span>
                                )}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {prof.especialidade || (prof.procedimentos?.length
                                    ? `${prof.procedimentos.length} procedimento(s)`
                                    : 'Sem especialidade definida'
                                )}
                            </p>
                            {/* Mini counters */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                {prof.procedimentos?.length > 0 && (
                                    <span style={badgeStyle}>📋 {prof.procedimentos.length} proc.</span>
                                )}
                                {Array.isArray(prof.cursos) && prof.cursos.length > 0 && (
                                    <span style={badgeStyle}>🎓 {prof.cursos.length} curso(s)</span>
                                )}
                                {prof.linkAgendamento && (
                                    <span style={badgeStyle}>🔗 Link ativo</span>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => setExpandedId(expandedId === prof.id ? null : prof.id)}
                                style={btnOutlineSmall}>
                                {expandedId === prof.id ? '▲' : '▼'}
                            </button>
                            <button onClick={() => abrirForm(prof)} style={btnOutlineSmall}>✏️</button>
                        </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {expandedId === prof.id && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                            {prof.bio && (
                                <DetailBlock label="Bio">{prof.bio}</DetailBlock>
                            )}
                            {prof.diferenciais && (
                                <DetailBlock label="Diferenciais">{prof.diferenciais}</DetailBlock>
                            )}
                            {prof.whatsapp && (
                                <DetailBlock label="WhatsApp">📱 {prof.whatsapp}</DetailBlock>
                            )}
                            {prof.horarioSemana && (
                                <DetailBlock label="Horários">
                                    🕐 Semana: {prof.horarioSemana}
                                    {prof.almocoSemana && ` (almoço: ${prof.almocoSemana})`}
                                    {prof.atendeSabado && prof.horarioSabado && (
                                        <span style={{ display: 'block', fontSize: 13, color: '#64748b', marginTop: 2 }}>
                                            Sábado: {prof.horarioSabado}
                                        </span>
                                    )}
                                </DetailBlock>
                            )}
                            {prof.procedimentos?.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Procedimentos</span>
                                    <div style={{ marginTop: 6 }}>
                                        {prof.procedimentos.map(p => (
                                            <div key={p.id} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '6px 10px', borderRadius: 8, marginBottom: 4,
                                                background: 'rgba(15,76,97,0.04)',
                                            }}>
                                                <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{p.nome}</span>
                                                <span style={{ fontSize: 12, color: '#0F4C61', fontWeight: 600 }}>
                                                    R$ {Number(p.valor).toFixed(2)}
                                                    {p.duracao ? ` · ${p.duracao}min` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {Array.isArray(prof.cursos) && prof.cursos.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Cursos</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                        {prof.cursos.map((c: Curso, i: number) => (
                                            <span key={i} style={{
                                                fontSize: 12, background: 'rgba(217,151,115,0.1)',
                                                color: '#C07A55', padding: '4px 10px', borderRadius: 8,
                                            }}>🎓 {c.nome}{c.ano ? ` (${c.ano})` : ''}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {prof.redesSociais && Object.values(prof.redesSociais).some(v => v) && (
                                <div style={{ marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Redes Sociais</span>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                        {prof.redesSociais.instagram && <span style={badgeStyle}>📸 @{prof.redesSociais.instagram}</span>}
                                        {prof.redesSociais.tiktok && <span style={badgeStyle}>🎵 @{prof.redesSociais.tiktok}</span>}
                                        {prof.redesSociais.youtube && <span style={badgeStyle}>▶️ {prof.redesSociais.youtube}</span>}
                                        {prof.redesSociais.linkedin && <span style={badgeStyle}>💼 {prof.redesSociais.linkedin}</span>}
                                    </div>
                                </div>
                            )}
                            {prof.chavePix && (
                                <DetailBlock label="PIX">🔑 {prof.chavePix}</DetailBlock>
                            )}
                            {prof.linkAgendamento && (
                                <DetailBlock label="Link Agendamento">
                                    🔗 /agendar/{prof.linkAgendamento}
                                </DetailBlock>
                            )}
                            {!prof.isDono && (
                                <button onClick={() => remover(prof.id)} style={{
                                    background: 'none', border: '1px solid rgba(220,50,50,0.2)',
                                    borderRadius: 10, padding: '6px 16px', cursor: 'pointer',
                                    fontSize: 12, color: '#dc2626', marginTop: 8,
                                }}>🗑 Remover da equipe</button>
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
                        Faça <a href="/plano" style={{ color: '#D99773', fontWeight: 600 }}>upgrade do plano</a> para adicionar mais
                    </p>
                </div>
            )}

            {/* ========== FORMULÁRIO COMPLETO ========== */}
            {showForm && (
                <div style={{
                    background: '#fff', borderRadius: 20, padding: '24px',
                    border: '2px solid #0F4C61', marginBottom: 16,
                    boxShadow: '0 4px 16px rgba(15,76,97,0.12)',
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F4C61' }}>
                            {editId ? '✏️ Editar Profissional' : '➕ Novo Profissional'}
                        </h3>
                        <button onClick={() => setShowForm(false)}
                            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </div>

                    {/* Tabs de seção */}
                    <div style={{
                        display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 20,
                        paddingBottom: 4, borderBottom: '1px solid #f1f5f9',
                    }}>
                        {SECOES.map(s => (
                            <button key={s.key} onClick={() => setSecaoAtiva(s.key)}
                                style={{
                                    background: secaoAtiva === s.key ? 'rgba(15,76,97,0.1)' : 'transparent',
                                    border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                                    fontSize: 12, fontWeight: secaoAtiva === s.key ? 700 : 500,
                                    color: secaoAtiva === s.key ? '#0F4C61' : '#94a3b8',
                                    whiteSpace: 'nowrap', transition: 'all 0.15s',
                                }}>
                                {s.icon} {s.label}
                            </button>
                        ))}
                    </div>

                    {/* ===== SEÇÃO: Dados Básicos ===== */}
                    {secaoAtiva === 'dados' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Nome completo *</label>
                                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                                    placeholder="Ex: Maria Silva" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Como gostaria de ser chamada?</label>
                                <select value={form.tratamento} onChange={e => setForm({ ...form, tratamento: e.target.value })}
                                    style={inputStyle}>
                                    {TRATAMENTOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                                <span style={hintStyle}>
                                    A IARA usará este tratamento ao se referir ao profissional
                                </span>
                            </div>
                            <div>
                                <label style={labelStyle}>Especialidade</label>
                                <input value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                                    placeholder="Ex: Harmonização Facial, Botox" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>WhatsApp pessoal</label>
                                <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })}
                                    placeholder="(11) 99999-9999" style={inputStyle} />
                                <span style={hintStyle}>Para receber notificações de agendamentos e alertas</span>
                            </div>
                        </div>
                    )}

                    {/* ===== SEÇÃO: Perfil ===== */}
                    {secaoAtiva === 'perfil' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Bio</label>
                                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                                    placeholder="Fale sobre experiência e formação..."
                                    rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Diferenciais</label>
                                <textarea value={form.diferenciais} onChange={e => setForm({ ...form, diferenciais: e.target.value })}
                                    placeholder="O que torna esta profissional única? Técnicas exclusivas, certificações especiais..."
                                    rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                            </div>
                            <div>
                                <label style={labelStyle}>URL da foto</label>
                                <input value={form.fotoUrl} onChange={e => setForm({ ...form, fotoUrl: e.target.value })}
                                    placeholder="https://..." style={inputStyle} />
                                <span style={hintStyle}>A foto aparecerá no perfil público e na agenda</span>
                            </div>
                        </div>
                    )}

                    {/* ===== SEÇÃO: Procedimentos ===== */}
                    {secaoAtiva === 'procedimentos' && (
                        <div>
                            <div style={{
                                background: 'rgba(15,76,97,0.04)', borderRadius: 12, padding: '14px 18px',
                                border: '1px solid rgba(15,76,97,0.1)', marginBottom: 16,
                            }}>
                                <p style={{ margin: 0, fontSize: 13, color: '#0F4C61', lineHeight: 1.6 }}>
                                    📋 Os procedimentos são cadastrados em <strong>Configurações → Procedimentos</strong> e
                                    vinculados a este profissional. Aqui você pode ver os procedimentos já vinculados.
                                </p>
                            </div>
                            {editId ? (
                                <div>
                                    {(() => {
                                        const prof = profissionais.find(p => p.id === editId)
                                        if (!prof?.procedimentos?.length) return (
                                            <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                                                Nenhum procedimento vinculado ainda.
                                            </p>
                                        )
                                        return prof.procedimentos.map(p => (
                                            <div key={p.id} style={{
                                                background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                                                border: '1px solid #e2e8f0', marginBottom: 8,
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{p.nome}</span>
                                                    <span style={{ fontSize: 13, color: '#0F4C61', fontWeight: 600 }}>
                                                        R$ {Number(p.valor).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: '#64748b' }}>
                                                    {p.duracao && <span>⏱ {p.duracao}min</span>}
                                                    {Number(p.desconto) > 0 && <span>💰 Desc: R$ {Number(p.desconto).toFixed(2)}</span>}
                                                    {p.parcelas && <span>💳 {p.parcelas}x</span>}
                                                </div>
                                                {p.posProcedimento && (
                                                    <div style={{
                                                        marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0',
                                                        fontSize: 12, color: '#475569', lineHeight: 1.5,
                                                    }}>
                                                        <strong>Pós-procedimento:</strong> {p.posProcedimento}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    })()}
                                </div>
                            ) : (
                                <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                                    Salve o profissional primeiro, depois vincule procedimentos em Configurações.
                                </p>
                            )}
                        </div>
                    )}

                    {/* ===== SEÇÃO: Cursos ===== */}
                    {secaoAtiva === 'cursos' && (
                        <div>
                            {form.cursos.map((c, i) => (
                                <div key={i} style={{
                                    background: '#f8fafc', borderRadius: 12, padding: '14px 16px',
                                    border: '1px solid #e2e8f0', marginBottom: 10,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>🎓 Curso {i + 1}</span>
                                        <button onClick={() => removeCurso(i)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626' }}>✕</button>
                                    </div>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        <input value={c.nome} onChange={e => updateCurso(i, 'nome', e.target.value)}
                                            placeholder="Nome do curso" style={inputStyle} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
                                            <input value={c.instituicao} onChange={e => updateCurso(i, 'instituicao', e.target.value)}
                                                placeholder="Instituição" style={inputStyle} />
                                            <input value={c.ano} onChange={e => updateCurso(i, 'ano', e.target.value)}
                                                placeholder="Ano" style={inputStyle} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addCurso} style={{
                                background: 'rgba(15,76,97,0.06)', border: '1px dashed rgba(15,76,97,0.3)',
                                borderRadius: 12, padding: '12px', cursor: 'pointer', width: '100%',
                                fontSize: 14, color: '#0F4C61', fontWeight: 500,
                            }}>+ Adicionar curso</button>
                        </div>
                    )}

                    {/* ===== SEÇÃO: Horários ===== */}
                    {secaoAtiva === 'horarios' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <span style={hintStyle}>Se não preencher, usará os horários da clínica</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Semana</label>
                                    <input value={form.horarioSemana} onChange={e => setForm({ ...form, horarioSemana: e.target.value })}
                                        placeholder="08:00 às 18:00" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Almoço</label>
                                    <input value={form.almocoSemana} onChange={e => setForm({ ...form, almocoSemana: e.target.value })}
                                        placeholder="12:00 às 13:00" style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.atendeSabado}
                                        onChange={e => setForm({ ...form, atendeSabado: e.target.checked })} /> Sábado
                                </label>
                                {form.atendeSabado && (
                                    <input value={form.horarioSabado} onChange={e => setForm({ ...form, horarioSabado: e.target.value })}
                                        placeholder="08:00 às 12:00" style={{ ...inputStyle, width: 160 }} />
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.atendeDomingo}
                                        onChange={e => setForm({ ...form, atendeDomingo: e.target.checked })} /> Domingo
                                </label>
                                {form.atendeDomingo && (
                                    <input value={form.horarioDomingo} onChange={e => setForm({ ...form, horarioDomingo: e.target.value })}
                                        placeholder="08:00 às 12:00" style={{ ...inputStyle, width: 160 }} />
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Intervalo entre consultas (min)</label>
                                <input type="number" value={form.intervaloAtendimento}
                                    onChange={e => setForm({ ...form, intervaloAtendimento: Number(e.target.value) })}
                                    min={5} max={120} style={{ ...inputStyle, width: 100 }} />
                            </div>
                        </div>
                    )}

                    {/* ===== SEÇÃO: Pagamento ===== */}
                    {secaoAtiva === 'pagamento' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Chave PIX</label>
                                <input value={form.chavePix} onChange={e => setForm({ ...form, chavePix: e.target.value })}
                                    placeholder="CPF, e-mail, telefone ou chave aleatória" style={inputStyle} />
                                <span style={hintStyle}>Exibida para clientes ao agendar com taxa de confirmação</span>
                            </div>
                            <div>
                                <label style={labelStyle}>Link de pagamento</label>
                                <input value={form.linkPagamento} onChange={e => setForm({ ...form, linkPagamento: e.target.value })}
                                    placeholder="https://pay.mercadopago.com/..." style={inputStyle} />
                                <span style={hintStyle}>Link externo para pagamento (Mercado Pago, PagSeguro, etc.)</span>
                            </div>
                        </div>
                    )}

                    {/* ===== SEÇÃO: Links & Redes ===== */}
                    {secaoAtiva === 'links' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Slug do link de agendamento</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                    <span style={{
                                        background: '#f1f5f9', padding: '10px 12px', borderRadius: '10px 0 0 10px',
                                        border: '1px solid #e2e8f0', borderRight: 'none', fontSize: 13, color: '#64748b',
                                    }}>/agendar/</span>
                                    <input value={form.linkAgendamento}
                                        onChange={e => setForm({ ...form, linkAgendamento: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        placeholder="dra-maria" style={{ ...inputStyle, borderRadius: '0 10px 10px 0' }} />
                                </div>
                                <span style={hintStyle}>Link público para clientes agendarem diretamente</span>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 4 }}>
                                <label style={{ ...labelStyle, fontSize: 14, color: '#0F4C61' }}>📱 Redes Sociais</label>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={labelStyle}>📸 Instagram</label>
                                    <input value={form.redesSociais.instagram || ''} onChange={e => setRede('instagram', e.target.value)}
                                        placeholder="@clinica" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>🎵 TikTok</label>
                                    <input value={form.redesSociais.tiktok || ''} onChange={e => setRede('tiktok', e.target.value)}
                                        placeholder="@clinica" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>▶️ YouTube</label>
                                    <input value={form.redesSociais.youtube || ''} onChange={e => setRede('youtube', e.target.value)}
                                        placeholder="canal" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>💼 LinkedIn</label>
                                    <input value={form.redesSociais.linkedin || ''} onChange={e => setRede('linkedin', e.target.value)}
                                        placeholder="perfil" style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botões */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button onClick={salvar} disabled={saving} style={{
                            ...btnPrimary, flex: 1, padding: '12px', fontSize: 15,
                            opacity: saving ? 0.6 : 1,
                        }}>
                            {saving ? '⏳ Salvando...' : editId ? '💾 Salvar alterações' : '✅ Adicionar profissional'}
                        </button>
                        <button onClick={() => setShowForm(false)} style={{
                            background: 'none', border: '1px solid #e2e8f0', borderRadius: 12,
                            padding: '12px 20px', cursor: 'pointer', fontSize: 14, color: '#64748b',
                        }}>Cancelar</button>
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
                    Cada profissional pode ter seus próprios procedimentos, horários, cursos e redes sociais.
                    A IARA direciona clientes automaticamente para o profissional certo baseado no procedimento desejado.
                    Use o <strong>link de agendamento</strong> para cada profissional compartilhar com suas clientes.
                </p>
            </div>
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

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontSize: 14, color: '#1e293b',
    background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
}

const hintStyle: React.CSSProperties = {
    fontSize: 11, color: '#94a3b8', display: 'block', marginTop: 4,
}

const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0F4C61, #1a6b84)',
    color: '#fff', border: 'none', borderRadius: 12,
    padding: '10px 22px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
}

const btnOutlineSmall: React.CSSProperties = {
    background: 'rgba(15,76,97,0.06)', border: 'none',
    borderRadius: 10, padding: '8px 12px', cursor: 'pointer',
    fontSize: 13, color: '#0F4C61', fontWeight: 500,
}

const badgeStyle: React.CSSProperties = {
    fontSize: 11, background: 'rgba(15,76,97,0.06)',
    color: '#0F4C61', padding: '3px 8px', borderRadius: 6,
}
