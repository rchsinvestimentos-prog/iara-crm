'use client'

import { useState, useEffect } from 'react'

// ========== Types ==========

interface Procedimento {
    id: number; nome: string; valor: number; duracao: number | null
    desconto: number; parcelas: number | null; descricao: string | null
    posProcedimento: string | null
}

interface CursoAPI {
    id: string; nome: string; modalidade: string; valor: number
    duracao: string | null; vagas: number | null; desconto: number
    parcelas: string | null; descricao: string | null; link: string | null
}

interface RedesSociais { instagram?: string; tiktok?: string; youtube?: string; linkedin?: string }

interface Profissional {
    id: string; nome: string; tratamento: string | null
    bio: string | null; especialidade: string | null; diferenciais: string | null
    whatsapp: string | null; cursos: any; redesSociais: RedesSociais | null
    horarioSemana: string | null; almocoSemana: string | null
    atendeSabado: boolean | null; horarioSabado: string | null
    atendeDomingo: boolean | null; horarioDomingo: string | null
    intervaloAtendimento: number | null; ausencias: any[]
    linkAgendamento: string | null; fotoUrl: string | null
    chavePix: string | null; linkPagamento: string | null
    isDono: boolean; ativo: boolean; ordem: number
    procedimentos: Procedimento[]
}

const TRATAMENTOS = [
    { value: '', label: 'Selecione...' },
    { value: 'Dra.', label: 'Dra.' },
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Nutri', label: 'Nutri' },
    { value: 'nome', label: 'Pelo nome' },
    { value: 'outro', label: 'Outro (especifique no nome)' },
]

const emptyProc = { id: 0, nome: '', valor: 0, desconto: 0, parcelas: null as number | null, duracao: null as number | null, descricao: null as string | null, posProcedimento: null as string | null }
const emptyCurso: CursoAPI = { id: '', nome: '', modalidade: 'presencial', valor: 0, duracao: '', vagas: null, desconto: 0, parcelas: '', descricao: '', link: '' }

// ========== Component ==========

export default function ProfissionaisPage() {
    const [profissionais, setProfissionais] = useState<Profissional[]>([])
    const [loading, setLoading] = useState(true)
    const [max, setMax] = useState(1)
    const [nivel, setNivel] = useState(1)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Form fields
    const [nome, setNome] = useState('')
    const [tratamento, setTratamento] = useState('')
    const [especialidade, setEspecialidade] = useState('')
    const [whatsapp, setWhatsapp] = useState('')
    const [bio, setBio] = useState('')
    const [diferenciais, setDiferenciais] = useState('')
    const [fotoUrl, setFotoUrl] = useState('')
    const [redesSociais, setRedesSociais] = useState<RedesSociais>({})
    const [horarioSemana, setHorarioSemana] = useState('')
    const [almocoSemana, setAlmocoSemana] = useState('')
    const [atendeSabado, setAtendeSabado] = useState(false)
    const [horarioSabado, setHorarioSabado] = useState('')
    const [atendeDomingo, setAtendeDomingo] = useState(false)
    const [horarioDomingo, setHorarioDomingo] = useState('')
    const [intervaloAtendimento, setIntervaloAtendimento] = useState(15)
    const [linkAgendamento, setLinkAgendamento] = useState('')
    const [chavePix, setChavePix] = useState('')
    const [linkPagamento, setLinkPagamento] = useState('')

    // Procedimentos inline CRUD
    const [novoProc, setNovoProc] = useState(false)
    const [editandoProc, setEditandoProc] = useState<number | null>(null)
    const [formProc, setFormProc] = useState(emptyProc)
    const [savingProc, setSavingProc] = useState(false)

    // Cursos inline CRUD
    const [cursos, setCursos] = useState<CursoAPI[]>([])
    const [novoCurso, setNovoCurso] = useState(false)
    const [editandoCurso, setEditandoCurso] = useState<string | null>(null)
    const [formCurso, setFormCurso] = useState<CursoAPI>(emptyCurso)
    const [savingCurso, setSavingCurso] = useState(false)

    // Expanded card
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

    function resetForm() {
        setNome(''); setTratamento(''); setEspecialidade(''); setWhatsapp('')
        setBio(''); setDiferenciais(''); setFotoUrl(''); setRedesSociais({})
        setHorarioSemana(''); setAlmocoSemana('')
        setAtendeSabado(false); setHorarioSabado('')
        setAtendeDomingo(false); setHorarioDomingo('')
        setIntervaloAtendimento(15)
        setLinkAgendamento(''); setChavePix(''); setLinkPagamento('')
        setCursos([]); setNovoProc(false); setEditandoProc(null); setNovoCurso(false); setEditandoCurso(null)
    }

    function abrirForm(prof?: Profissional) {
        if (prof) {
            setEditId(prof.id)
            setNome(prof.nome); setTratamento(prof.tratamento || '')
            setEspecialidade(prof.especialidade || ''); setWhatsapp(prof.whatsapp || '')
            setBio(prof.bio || ''); setDiferenciais(prof.diferenciais || '')
            setFotoUrl(prof.fotoUrl || '')
            setRedesSociais(prof.redesSociais && typeof prof.redesSociais === 'object' ? prof.redesSociais : {})
            setHorarioSemana(prof.horarioSemana || ''); setAlmocoSemana(prof.almocoSemana || '')
            setAtendeSabado(prof.atendeSabado || false); setHorarioSabado(prof.horarioSabado || '')
            setAtendeDomingo(prof.atendeDomingo || false); setHorarioDomingo(prof.horarioDomingo || '')
            setIntervaloAtendimento(prof.intervaloAtendimento || 15)
            setLinkAgendamento(prof.linkAgendamento || '')
            setChavePix(prof.chavePix || ''); setLinkPagamento(prof.linkPagamento || '')
            setCursos([])
            // Load cursos from API
            fetch(`/api/cursos?profissionalId=${prof.id}`).then(r => r.json()).then(d => { if (Array.isArray(d)) setCursos(d) }).catch(() => {})
        } else {
            setEditId(null)
            resetForm()
        }
        setShowForm(true)
    }

    async function salvarDados(closeAfter = false) {
        if (!nome.trim()) { alert('Nome é obrigatório'); return }
        setSaving(true)
        try {
            const method = editId ? 'PUT' : 'POST'
            const body = {
                ...(editId ? { id: editId } : {}),
                nome, tratamento, especialidade, whatsapp, bio, diferenciais, fotoUrl,
                redesSociais, horarioSemana, almocoSemana, atendeSabado, horarioSabado,
                atendeDomingo, horarioDomingo, intervaloAtendimento,
                linkAgendamento, chavePix, linkPagamento, cursos: [],
            }
            const res = await fetch('/api/clinica/profissionais', {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
            })
            if (!res.ok) { const err = await res.json(); alert(err.error || 'Erro'); setSaving(false); return }
            
            // Se era novo, agora virou edição (manter form aberto)
            const result = await res.clone().json().catch(() => null)
            if (!editId && result?.id) {
                setEditId(result.id)
            }
            
            if (closeAfter) {
                setShowForm(false); resetForm()
            } else {
                // Feedback visual rápido
                alert('✅ Salvo com sucesso!')
            }
            fetchEquipe()
        } catch { alert('Erro de conexão') }
        setSaving(false)
    }

    async function remover(id: string) {
        if (!confirm('Deseja remover este profissional?')) return
        await fetch(`/api/clinica/profissionais?id=${id}`, { method: 'DELETE' })
        fetchEquipe()
    }

    // ===== Procedimento CRUD =====
    async function salvarProc() {
        if (!formProc.nome.trim()) return
        setSavingProc(true)
        try {
            const method = editandoProc ? 'PUT' : 'POST'
            const payload = {
                ...(editandoProc ? { id: editandoProc } : {}),
                nome: formProc.nome,
                valor: Number(formProc.valor) || 0,
                desconto: Number(formProc.desconto) || 0,
                parcelas: formProc.parcelas ? Number(formProc.parcelas) : null,
                duracao: formProc.duracao ? Number(formProc.duracao) : 0,
                descricao: formProc.descricao || null,
                posProcedimento: formProc.posProcedimento || null,
            }
            const res = await fetch('/api/procedimentos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            if (res.ok) { setEditandoProc(null); setNovoProc(false); setFormProc(emptyProc); fetchEquipe() }
            else { const e = await res.json().catch(() => ({})); alert(`Erro: ${e?.error || res.statusText}`) }
        } catch { alert('Erro de conexão') }
        setSavingProc(false)
    }

    async function excluirProc(id: number) {
        if (!confirm('Excluir este procedimento?')) return
        try { await fetch(`/api/procedimentos?id=${id}`, { method: 'DELETE' }); fetchEquipe() } catch {}
    }

    function editarProc(p: Procedimento) {
        setEditandoProc(p.id)
        setFormProc({ ...p, parcelas: p.parcelas, duracao: p.duracao, descricao: p.descricao || '', posProcedimento: p.posProcedimento || '' })
        setNovoProc(true)
    }

    // ===== Curso CRUD =====
    async function salvarCurso() {
        if (!formCurso.nome.trim()) return
        setSavingCurso(true)
        try {
            const method = editandoCurso ? 'PUT' : 'POST'
            const body = { ...(editandoCurso ? { id: editandoCurso } : {}), nome: formCurso.nome, modalidade: formCurso.modalidade, valor: formCurso.valor, duracao: formCurso.duracao || null, vagas: formCurso.vagas, desconto: formCurso.desconto, parcelas: formCurso.parcelas || null, descricao: formCurso.descricao || null, link: formCurso.link || null }
            const res = await fetch('/api/cursos', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            if (res.ok) { const r2 = await fetch('/api/cursos'); if (r2.ok) setCursos(await r2.json()); setNovoCurso(false); setEditandoCurso(null); setFormCurso(emptyCurso) }
            else { const e = await res.json().catch(() => ({})); alert(`Erro: ${e?.error || res.statusText}`) }
        } catch { alert('Erro de conexão') }
        setSavingCurso(false)
    }

    async function excluirCurso(id: string) {
        if (!confirm('Excluir este curso?')) return
        try { await fetch(`/api/cursos?id=${id}`, { method: 'DELETE' }); setCursos(prev => prev.filter(c => c.id !== id)) } catch {}
    }

    function editarCurso(c: CursoAPI) {
        setEditandoCurso(c.id)
        setFormCurso({ ...c, parcelas: c.parcelas || '', duracao: c.duracao || '', descricao: c.descricao || '', link: c.link || '' })
        setNovoCurso(true)
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
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F4C61' }}>👩‍⚕️ Profissionais</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>{profissionais.length} de {max} profissional(is) · Plano {nivel}</p>
                </div>
                {profissionais.length < max && <button onClick={() => abrirForm()} style={btnPrimary}>+ Adicionar</button>}
            </div>

            {/* Lista vazia */}
            {profissionais.length === 0 && !showForm && (
                <div style={{ background: '#fff', borderRadius: 20, padding: '40px 24px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>👩‍⚕️</div>
                    <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 18 }}>Cadastre seus profissionais</h3>
                    <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                        Cadastre você e sua equipe. Cada profissional terá seus próprios procedimentos, cursos, horários e link de agendamento.
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
                            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                {prof.procedimentos?.length > 0 && <span style={badgeStyle}>📋 {prof.procedimentos.length} proc.</span>}
                                {prof.linkAgendamento && <span style={badgeStyle}>🔗 Link ativo</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => setExpandedId(expandedId === prof.id ? null : prof.id)} style={btnOutlineSmall}>{expandedId === prof.id ? '▲' : '▼'}</button>
                            <button onClick={(e) => { e.stopPropagation(); abrirForm(prof) }} style={{ ...btnOutlineSmall, border: '1px solid rgba(15,76,97,0.15)', padding: '8px 14px' }} title="Editar profissional">✏️</button>
                        </div>
                    </div>

                    {expandedId === prof.id && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                            {prof.bio && <DetailBlock label="Bio">{prof.bio}</DetailBlock>}
                            {prof.diferenciais && <DetailBlock label="Diferenciais">{prof.diferenciais}</DetailBlock>}
                            {prof.whatsapp && <DetailBlock label="WhatsApp">📱 {prof.whatsapp}</DetailBlock>}
                            {prof.horarioSemana && <DetailBlock label="Horários">🕐 Semana: {prof.horarioSemana}{prof.almocoSemana && ` (almoço: ${prof.almocoSemana})`}</DetailBlock>}
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
                            {prof.redesSociais && Object.values(prof.redesSociais).some(v => v) && (
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                    {prof.redesSociais.instagram && <span style={badgeStyle}>📸 @{prof.redesSociais.instagram}</span>}
                                    {prof.redesSociais.tiktok && <span style={badgeStyle}>🎵 @{prof.redesSociais.tiktok}</span>}
                                </div>
                            )}
                            {!prof.isDono && <button onClick={() => remover(prof.id)} style={{ background: 'none', border: '1px solid rgba(220,50,50,0.2)', borderRadius: 10, padding: '6px 16px', cursor: 'pointer', fontSize: 12, color: '#dc2626', marginTop: 8 }}>🗑 Remover</button>}
                        </div>
                    )}
                </div>
            ))}

            {/* Limite atingido */}
            {profissionais.length >= max && (
                <div style={{ background: 'rgba(217,151,115,0.08)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(217,151,115,0.2)', marginBottom: 14, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#C07A55', fontWeight: 600, marginBottom: 4 }}>Limite atingido ({profissionais.length}/{max})</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Faça <a href="/plano" style={{ color: '#D99773', fontWeight: 600 }}>upgrade do plano</a> para adicionar mais</p>
                </div>
            )}

            {/* ========== FORMULÁRIO - SEÇÕES VERTICAIS ========== */}
            {showForm && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F4C61' }}>{editId ? '✏️ Editar Profissional' : '➕ Novo Profissional'}</h3>
                        <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </div>

                    {/* ===== 1. DADOS BÁSICOS ===== */}
                    <Section title="👤 Dados Básicos" onSave={() => salvarDados(false)} saving={saving}>
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div><label style={labelStyle}>Nome completo *</label><input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" style={inputStyle} /></div>
                            <div><label style={labelStyle}>Como gostaria de ser chamada?</label><select value={tratamento} onChange={e => setTratamento(e.target.value)} style={inputStyle}>{TRATAMENTOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select><span style={hintStyle}>A IARA usará este tratamento ao se referir ao profissional</span></div>
                            <div><label style={labelStyle}>Especialidade</label><input value={especialidade} onChange={e => setEspecialidade(e.target.value)} placeholder="Ex: Harmonização Facial" style={inputStyle} /></div>
                            <div><label style={labelStyle}>WhatsApp pessoal</label><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" style={inputStyle} /><span style={hintStyle}>Para receber notificações de agendamentos</span></div>
                        </div>
                    </Section>

                    {/* ===== 2. PERFIL ===== */}
                    <Section title="📝 Perfil & Diferenciais" onSave={() => salvarDados(false)} saving={saving}>
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div><label style={labelStyle}>Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Fale sobre experiência e formação..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                            <div><label style={labelStyle}>Diferenciais</label><textarea value={diferenciais} onChange={e => setDiferenciais(e.target.value)} placeholder="Técnicas exclusivas, certificações especiais..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                            <div><label style={labelStyle}>URL da foto</label><input value={fotoUrl} onChange={e => setFotoUrl(e.target.value)} placeholder="https://..." style={inputStyle} /></div>
                        </div>
                    </Section>

                    {/* ===== 3. PROCEDIMENTOS (CRUD inline) ===== */}
                    <Section title="💉 Procedimentos" extra={
                        <button onClick={() => { setNovoProc(true); setEditandoProc(null); setFormProc(emptyProc) }} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', background: '#0F4C61', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>+ Adicionar</button>
                    }>
                        {novoProc && (
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#0F4C61', margin: '0 0 12px', textTransform: 'uppercase' }}>{editandoProc ? 'Editar' : 'Novo'} Procedimento</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Nome</label><input style={inputStyle} value={formProc.nome} onChange={e => setFormProc({ ...formProc, nome: e.target.value })} placeholder="Ex: Micropigmentação" /></div>
                                    <div><label style={labelStyle}>Valor (R$)</label><input type="number" style={inputStyle} value={formProc.valor || ''} onChange={e => setFormProc({ ...formProc, valor: Number(e.target.value) })} /></div>
                                    <div><label style={labelStyle}>Duração (min)</label><input type="number" style={inputStyle} value={formProc.duracao || ''} onChange={e => setFormProc({ ...formProc, duracao: Number(e.target.value) || null })} /></div>
                                    <div><label style={labelStyle}>Desconto máx. (%)</label><select style={inputStyle} value={formProc.desconto} onChange={e => setFormProc({ ...formProc, desconto: Number(e.target.value) })}><option value={0}>Sem desconto</option><option value={10}>10%</option><option value={20}>20%</option><option value={30}>30%</option></select></div>
                                    <div><label style={labelStyle}>Parcelas</label><input type="number" style={inputStyle} value={formProc.parcelas || ''} onChange={e => setFormProc({ ...formProc, parcelas: e.target.value ? Number(e.target.value) : null })} placeholder="12" /></div>
                                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>📋 Mais informações <span style={{ fontSize: 10, color: '#94a3b8' }}>(ajuda a IARA)</span></label><textarea style={{ ...inputStyle, resize: 'none', height: 60 }} value={formProc.descricao || ''} onChange={e => setFormProc({ ...formProc, descricao: e.target.value })} placeholder="Detalhes do procedimento..." /></div>
                                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>🩹 Pós-procedimento <span style={{ fontSize: 10, color: '#94a3b8' }}>(cuidados após)</span></label><textarea style={{ ...inputStyle, resize: 'none', height: 60 }} value={formProc.posProcedimento || ''} onChange={e => setFormProc({ ...formProc, posProcedimento: e.target.value })} placeholder="Evitar sol, não molhar por 24h..." /></div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                    <button onClick={salvarProc} disabled={savingProc} style={{ ...btnPrimary, fontSize: 13, padding: '8px 20px', opacity: savingProc ? 0.6 : 1 }}>{savingProc ? '⏳' : '💾'} Salvar</button>
                                    <button onClick={() => { setNovoProc(false); setEditandoProc(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>Cancelar</button>
                                </div>
                            </div>
                        )}
                        {editId ? (() => {
                            const prof = profissionais.find(p => p.id === editId)
                            if (!prof?.procedimentos?.length) return <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nenhum procedimento cadastrado</p>
                            return prof.procedimentos.map(p => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{p.nome}</p>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                                            <span style={{ fontWeight: 600, color: '#0F4C61' }}>R$ {Number(p.valor).toFixed(2)}</span>
                                            {p.duracao && <span>⏱ {p.duracao}min</span>}
                                            {Number(p.desconto) > 0 && <span style={{ color: '#16a34a' }}>-{p.desconto}%</span>}
                                            {p.parcelas && <span>💳 {p.parcelas}x</span>}
                                        </div>
                                        {p.posProcedimento && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>🩹 {p.posProcedimento}</p>}
                                    </div>
                                    <button onClick={() => editarProc(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>✏️</button>
                                    <button onClick={() => excluirProc(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626' }}>🗑</button>
                                </div>
                            ))
                        })() : <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 16 }}>Salve o profissional primeiro para adicionar procedimentos</p>}
                    </Section>

                    {/* ===== 4. CURSOS (CRUD inline) ===== */}
                    <Section title="🎓 Cursos" extra={
                        <button onClick={() => { setNovoCurso(true); setEditandoCurso(null); setFormCurso(emptyCurso) }} style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', background: '#0F4C61', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>+ Adicionar</button>
                    }>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>Cadastre cursos que este profissional oferece (a IARA divulga para as clientes)</p>
                        {novoCurso && (
                            <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#0F4C61', margin: '0 0 12px', textTransform: 'uppercase' }}>{editandoCurso ? 'Editar' : 'Novo'} Curso</p>
                                <div style={{ display: 'grid', gap: 10 }}>
                                    <div><label style={labelStyle}>Nome do Curso</label><input style={inputStyle} value={formCurso.nome} onChange={e => setFormCurso({ ...formCurso, nome: e.target.value })} placeholder="Ex: Curso de Micropigmentação Labial" /></div>
                                    <div><label style={labelStyle}>Modalidade</label><div style={{ display: 'flex', gap: 8 }}>
                                        {['presencial', 'online', 'hibrido'].map(m => (
                                            <button key={m} onClick={() => setFormCurso({ ...formCurso, modalidade: m })} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: formCurso.modalidade === m ? '1px solid rgba(217,151,115,0.3)' : '1px solid #e2e8f0', background: formCurso.modalidade === m ? 'rgba(217,151,115,0.1)' : '#fff', color: formCurso.modalidade === m ? '#C07A55' : '#64748b' }}>{m === 'hibrido' ? 'Híbrido' : m.charAt(0).toUpperCase() + m.slice(1)}</button>
                                        ))}
                                    </div></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                        <div><label style={labelStyle}>Valor (R$)</label><input type="number" style={inputStyle} value={formCurso.valor || ''} onChange={e => setFormCurso({ ...formCurso, valor: Number(e.target.value) })} /></div>
                                        <div><label style={labelStyle}>Duração</label><input style={inputStyle} value={formCurso.duracao || ''} onChange={e => setFormCurso({ ...formCurso, duracao: e.target.value })} placeholder="3 dias" /></div>
                                        <div><label style={labelStyle}>Vagas</label><input type="number" style={inputStyle} value={formCurso.vagas ?? ''} onChange={e => setFormCurso({ ...formCurso, vagas: e.target.value ? Number(e.target.value) : null })} /></div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div><label style={labelStyle}>Desconto máx. (%)</label><select style={inputStyle} value={formCurso.desconto} onChange={e => setFormCurso({ ...formCurso, desconto: Number(e.target.value) })}><option value={0}>Sem desconto</option><option value={10}>10%</option><option value={20}>20%</option><option value={30}>30%</option></select></div>
                                        <div><label style={labelStyle}>Parcelas</label><input style={inputStyle} value={formCurso.parcelas || ''} onChange={e => setFormCurso({ ...formCurso, parcelas: e.target.value })} placeholder="10x sem juros" /></div>
                                    </div>
                                    <div><label style={labelStyle}>Descrição detalhada</label><textarea style={{ ...inputStyle, resize: 'none', height: 70 }} value={formCurso.descricao || ''} onChange={e => setFormCurso({ ...formCurso, descricao: e.target.value })} placeholder="Detalhes do curso..." /></div>
                                    <div><label style={labelStyle}>🔗 Página de Vendas <span style={{ fontSize: 10, color: '#94a3b8' }}>(opcional)</span></label><input style={inputStyle} value={formCurso.link || ''} onChange={e => setFormCurso({ ...formCurso, link: e.target.value })} placeholder="https://..." /></div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                    <button onClick={salvarCurso} disabled={savingCurso} style={{ ...btnPrimary, fontSize: 13, padding: '8px 20px', opacity: savingCurso ? 0.6 : 1 }}>{savingCurso ? '⏳' : '💾'} Salvar</button>
                                    <button onClick={() => { setNovoCurso(false); setEditandoCurso(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8' }}>Cancelar</button>
                                </div>
                            </div>
                        )}
                        {cursos.length === 0 && !novoCurso ? (
                            <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', padding: 16 }}>Nenhum curso cadastrado</p>
                        ) : cursos.map(c => (
                            <div key={c.id} style={{ display: 'flex', alignItems: 'start', gap: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 6, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{c.nome}</p>
                                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: c.modalidade === 'presencial' ? 'rgba(59,130,246,0.1)' : c.modalidade === 'online' ? 'rgba(147,51,234,0.1)' : 'rgba(245,158,11,0.1)', color: c.modalidade === 'presencial' ? '#3b82f6' : c.modalidade === 'online' ? '#9333ea' : '#f59e0b' }}>{c.modalidade === 'hibrido' ? 'Híbrido' : c.modalidade}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                                        <span style={{ fontWeight: 600, color: '#0F4C61' }}>R$ {c.valor}</span>
                                        {c.duracao && <span>⏱ {c.duracao}</span>}
                                        {c.vagas && <span>👥 {c.vagas} vagas</span>}
                                        {c.desconto > 0 && <span style={{ color: '#16a34a' }}>-{c.desconto}%</span>}
                                    </div>
                                </div>
                                <button onClick={() => editarCurso(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>✏️</button>
                                <button onClick={() => excluirCurso(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626' }}>🗑</button>
                            </div>
                        ))}
                    </Section>

                    {/* ===== 5. HORÁRIOS ===== */}
                    <Section title="⏰ Horários de Atendimento" onSave={() => salvarDados(false)} saving={saving}>
                        <span style={hintStyle}>Se não preencher, usará os horários da clínica</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            <div><label style={labelStyle}>Semana</label><input value={horarioSemana} onChange={e => setHorarioSemana(e.target.value)} placeholder="08:00 às 18:00" style={inputStyle} /></div>
                            <div><label style={labelStyle}>Almoço</label><input value={almocoSemana} onChange={e => setAlmocoSemana(e.target.value)} placeholder="12:00 às 13:00" style={inputStyle} /></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}><input type="checkbox" checked={atendeSabado} onChange={e => setAtendeSabado(e.target.checked)} /> Sábado</label>
                            {atendeSabado && <input value={horarioSabado} onChange={e => setHorarioSabado(e.target.value)} placeholder="08:00 às 12:00" style={{ ...inputStyle, width: 160 }} />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}><input type="checkbox" checked={atendeDomingo} onChange={e => setAtendeDomingo(e.target.checked)} /> Domingo</label>
                            {atendeDomingo && <input value={horarioDomingo} onChange={e => setHorarioDomingo(e.target.value)} placeholder="08:00 às 12:00" style={{ ...inputStyle, width: 160 }} />}
                        </div>
                        <div style={{ marginTop: 12 }}><label style={labelStyle}>Intervalo entre consultas (min)</label><input type="number" value={intervaloAtendimento} onChange={e => setIntervaloAtendimento(Number(e.target.value))} min={5} max={120} style={{ ...inputStyle, width: 100 }} /></div>
                    </Section>

                    {/* ===== 6. PAGAMENTO ===== */}
                    <Section title="💰 Pagamento" onSave={() => salvarDados(false)} saving={saving}>
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div><label style={labelStyle}>Chave PIX</label><input value={chavePix} onChange={e => setChavePix(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" style={inputStyle} /><span style={hintStyle}>Exibida para clientes ao agendar com taxa de confirmação</span></div>
                            <div><label style={labelStyle}>Link de pagamento</label><input value={linkPagamento} onChange={e => setLinkPagamento(e.target.value)} placeholder="https://pay.mercadopago.com/..." style={inputStyle} /><span style={hintStyle}>Link externo (Mercado Pago, PagSeguro, etc.)</span></div>
                        </div>
                    </Section>

                    {/* ===== 7. LINKS & REDES ===== */}
                    <Section title="🔗 Links & Redes Sociais" onSave={() => salvarDados(false)} saving={saving}>
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div><label style={labelStyle}>Slug do link de agendamento</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ background: '#f1f5f9', padding: '10px 12px', borderRadius: '10px 0 0 10px', border: '1px solid #e2e8f0', borderRight: 'none', fontSize: 13, color: '#64748b' }}>/agendar/</span>
                                    <input value={linkAgendamento} onChange={e => setLinkAgendamento(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="dra-maria" style={{ ...inputStyle, borderRadius: '0 10px 10px 0' }} />
                                </div>
                                <span style={hintStyle}>Link público para clientes agendarem diretamente</span>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                                <label style={{ ...labelStyle, fontSize: 14, color: '#0F4C61' }}>📱 Redes Sociais</label>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div><label style={labelStyle}>📸 Instagram</label><input value={redesSociais.instagram || ''} onChange={e => setRedesSociais({ ...redesSociais, instagram: e.target.value })} placeholder="@clinica" style={inputStyle} /></div>
                                <div><label style={labelStyle}>🎵 TikTok</label><input value={redesSociais.tiktok || ''} onChange={e => setRedesSociais({ ...redesSociais, tiktok: e.target.value })} placeholder="@clinica" style={inputStyle} /></div>
                                <div><label style={labelStyle}>▶️ YouTube</label><input value={redesSociais.youtube || ''} onChange={e => setRedesSociais({ ...redesSociais, youtube: e.target.value })} placeholder="canal" style={inputStyle} /></div>
                                <div><label style={labelStyle}>💼 LinkedIn</label><input value={redesSociais.linkedin || ''} onChange={e => setRedesSociais({ ...redesSociais, linkedin: e.target.value })} placeholder="perfil" style={inputStyle} /></div>
                            </div>
                        </div>
                    </Section>

                    {/* Botão global salvar */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button onClick={() => salvarDados(true)} disabled={saving} style={{ ...btnPrimary, flex: 1, padding: '14px', fontSize: 16, opacity: saving ? 0.6 : 1 }}>{saving ? '⏳ Salvando...' : editId ? '💾 Salvar e fechar' : '✅ Adicionar profissional'}</button>
                        <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 20px', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>Cancelar</button>
                    </div>
                </div>
            )}

            {/* Dica */}
            <div style={{ background: 'rgba(15,76,97,0.04)', borderRadius: 16, padding: '18px 22px', border: '1px solid rgba(15,76,97,0.1)', marginTop: 8 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#0F4C61', fontWeight: 600, marginBottom: 6 }}>💡 Como funciona</p>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    Cadastre você (dona) e sua equipe. Cada profissional tem seus procedimentos, cursos, horários e link de agendamento.
                    A IARA direciona clientes para o profissional certo baseado no procedimento desejado.
                </p>
            </div>
        </div>
    )
}

// ========== Sub-components ==========

function Section({ title, children, onSave, saving, extra }: { title: string; children: React.ReactNode; onSave?: () => void; saving?: boolean; extra?: React.ReactNode }) {
    return (
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 24px', border: '1px solid #e2e8f0', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F4C61' }}>{title}</h4>
                {extra}
            </div>
            {children}
            {onSave && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={onSave} disabled={saving} style={{ ...btnPrimarySm, opacity: saving ? 0.6 : 1 }}>{saving ? '⏳ Salvando...' : '💾 Salvar'}</button>
                </div>
            )}
        </div>
    )
}

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
const btnPrimarySm: React.CSSProperties = { background: 'linear-gradient(135deg, #0F4C61, #1a6b84)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }
const btnOutlineSmall: React.CSSProperties = { background: 'rgba(15,76,97,0.06)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#0F4C61', fontWeight: 500 }
const badgeStyle: React.CSSProperties = { fontSize: 11, background: 'rgba(15,76,97,0.06)', color: '#0F4C61', padding: '3px 8px', borderRadius: 6 }
