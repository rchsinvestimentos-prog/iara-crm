'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, MapPin, Phone, ArrowRightLeft, Crown, Check, Loader2, ArrowRight, Lock, Sparkles } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import Link from 'next/link'

interface Clinica {
  id: number
  nomeClinica: string | null
  nome: string | null
  endereco: string | null
  whatsappClinica?: string | null
}

export default function ClinicasPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [planoAtual, setPlanoAtual] = useState(1)
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [clinicaAtiva, setClinicaAtiva] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [switchingId, setSwitchingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ nomeClinica: '', endereco: '', whatsappClinica: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/clinica').then(r => r.json()),
      fetch('/api/clinicas').then(r => r.json()),
    ]).then(([clinicaData, clinicasData]) => {
      if (clinicaData?.nivel) setPlanoAtual(Math.min(3, Number(clinicaData.nivel)))
      if (clinicaData?.id) setClinicaAtiva(Number(clinicaData.id))
      if (Array.isArray(clinicasData)) setClinicas(clinicasData)
    }).finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!formData.nomeClinica.trim()) { setError('Nome da clínica é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/clinicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      setClinicas(prev => [...prev, { ...data, nome: data.nomeClinica }])
      setFormData({ nomeClinica: '', endereco: '', whatsappClinica: '' })
      setShowForm(false)
      setSuccess('Clínica criada com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSwitch = async (id: number) => {
    setSwitchingId(id)
    try {
      const res = await fetch('/api/clinicas/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicaId: id }),
      })
      if (res.ok) window.location.reload()
    } catch {} finally { setSwitchingId(null) }
  }

  const PLANO_NOMES: Record<number, string> = { 1: 'Essencial', 2: 'Pro', 3: 'Premium' }

  // ─── NÃO-PREMIUM: Página de upgrade persuasiva ───
  if (planoAtual < 3 && !loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(217,151,115,0.15), rgba(217,151,115,0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(217,151,115,0.15)',
          }}>
            <Building2 size={28} style={{ color: '#D99773' }} />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, margin: '0 0 8px',
            color: isDark ? '#fff' : '#0F4C61',
          }}>
            Multi-Clínica
          </h1>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Gerencie múltiplas unidades com um único login. 
            Cada clínica com seus próprios contatos, agenda e IARA.
          </p>
        </div>

        {/* Preview visual — cards de clínica "fake" com blur */}
        <div style={{
          position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 32,
          padding: 24,
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,76,97,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)'}`,
        }}>
          {/* Cards fake com blur */}
          <div style={{ filter: 'blur(2px)', opacity: 0.5, pointerEvents: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {['Clínica Centro', 'Clínica Barra', 'Clínica Leblon'].map((nome, i) => (
                <div key={i} style={{
                  padding: 16, borderRadius: 14,
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                  border: `1px solid ${i === 0 ? 'rgba(217,151,115,0.2)' : (isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0')}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: i === 0 ? 'linear-gradient(135deg, #D99773, #C4845F)' : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Building2 size={15} style={{ color: i === 0 ? '#fff' : '#94a3b8' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#0F4C61', margin: 0 }}>{nome}</p>
                      <p style={{ fontSize: 10, color: i === 0 ? '#22c55e' : '#94a3b8', margin: 0 }}>
                        {i === 0 ? '● Ativa' : 'Alternar'}
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={11} /> Rua Exemplo, {100 + i * 200}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lock overlay */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16,
              background: isDark ? 'rgba(30,35,50,0.9)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <Lock size={20} style={{ color: '#D99773' }} />
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <div style={{
          borderRadius: 20, padding: 28, marginBottom: 28,
          background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)'}`,
          boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Sparkles size={16} style={{ color: '#D99773' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#D99773', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              O que você desbloqueia no Premium
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[
              { icon: '🏥', title: 'Múltiplas Unidades', desc: 'Adicione até 2 clínicas com um único login' },
              { icon: '📊', title: 'Dados Separados', desc: 'Cada clínica com contatos, CRM e agenda próprios' },
              { icon: '⚡', title: 'Troca Instantânea', desc: 'Alterne entre clínicas em 1 clique, sem sair da conta' },
              { icon: '🤖', title: 'IARA por Unidade', desc: 'Configure a assistente de forma independente por clínica' },
              { icon: '📱', title: '2 WhatsApps', desc: 'Um número de WhatsApp conectado por clínica' },
              { icon: '🎙️', title: 'Voz Clonada', desc: 'Clone da sua voz com ElevenLabs incluso' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14,
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,76,97,0.02)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,76,97,0.05)'}`,
              }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#fff' : '#0F4C61', margin: '0 0 2px' }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Seu plano: <strong style={{ color: isDark ? '#fff' : '#0F4C61' }}>{PLANO_NOMES[planoAtual]}</strong>
            </span>
            <span style={{ color: '#e2e8f0' }}>→</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#D99773' }}>
              Premium: R$ 297/mês
            </span>
          </div>

          <Link
            href="/plano"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 36px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #D99773, #C4845F)',
              color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 8px 25px rgba(217,151,115,0.35)',
              transition: 'all 0.2s',
            }}
          >
            <Crown size={18} />
            Fazer Upgrade para Premium
            <ArrowRight size={18} />
          </Link>

          <p style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
            Cancele quando quiser • Sem fidelidade
          </p>
        </div>
      </div>
    )
  }

  // ─── PREMIUM: UI funcional ───
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#fff' : '#0F4C61', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={22} />
            Multi-Clínica
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            Gerencie {clinicas.length} {clinicas.length === 1 ? 'unidade' : 'unidades'} com um único login
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 12, background: 'linear-gradient(135deg, #D99773, #C4845F)',
            color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(217,151,115,0.3)',
          }}
        >
          <Plus size={16} /> Nova Clínica
        </button>
      </div>

      {/* Success */}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#22c55e',
        }}>
          <Check size={16} /> {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{
          padding: 24, borderRadius: 16, marginBottom: 24,
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,76,97,0.1)'}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#fff' : '#0F4C61', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} style={{ color: '#D99773' }} /> Nova Unidade
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { label: 'Nome da Clínica *', key: 'nomeClinica', placeholder: 'Ex: Clínica Barra' },
              { label: 'Endereço', key: 'endereco', placeholder: 'Ex: Av. das Américas, 500' },
              { label: 'WhatsApp', key: 'whatsappClinica', placeholder: 'Ex: 5521999999999' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {field.label}
                </label>
                <input
                  value={(formData as any)[field.key]}
                  onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                    color: isDark ? '#fff' : '#0F4C61', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
          {error && <p style={{ margin: '12px 0 0', fontSize: 12, color: '#ef4444' }}>⚠️ {error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              borderRadius: 10, background: '#0F4C61', color: '#fff', fontSize: 13,
              fontWeight: 600, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Criando...' : 'Criar Clínica'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }} style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
              background: 'transparent', color: '#94a3b8', cursor: 'pointer',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#D99773' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {clinicas.map((c, i) => {
            const isActive = clinicaAtiva === c.id
            const isSwitching = switchingId === c.id
            return (
              <div key={c.id} style={{
                padding: 20, borderRadius: 16, transition: 'all 0.2s',
                background: isDark
                  ? (isActive ? 'rgba(217,151,115,0.05)' : 'rgba(255,255,255,0.02)')
                  : (isActive ? 'rgba(217,151,115,0.04)' : '#fff'),
                border: `1px solid ${isActive
                  ? (isDark ? 'rgba(217,151,115,0.2)' : 'rgba(217,151,115,0.25)')
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)')}`,
                boxShadow: isActive ? '0 4px 15px rgba(217,151,115,0.1)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isActive ? 'linear-gradient(135deg, #D99773, #C4845F)' : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 4px 12px rgba(217,151,115,0.25)' : 'none',
                  }}>
                    <Building2 size={20} style={{ color: isActive ? '#fff' : '#94a3b8' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: isDark ? '#fff' : '#0F4C61' }}>
                      {c.nomeClinica || c.nome || 'Clínica'}
                    </p>
                    {isActive && (
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#D99773', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        Ativa agora
                      </span>
                    )}
                    {!isActive && i === 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>Principal</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {c.endereco && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                      <MapPin size={13} /> {c.endereco}
                    </span>
                  )}
                  {(c as any).whatsappClinica && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                      <Phone size={13} /> {(c as any).whatsappClinica}
                    </span>
                  )}
                  {!c.endereco && !(c as any).whatsappClinica && (
                    <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>Sem endereço cadastrado</span>
                  )}
                </div>

                {!isActive ? (
                  <button onClick={() => handleSwitch(c.id)} disabled={!!isSwitching} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px 16px', borderRadius: 10,
                    border: `1px solid ${isDark ? 'rgba(15,76,97,0.3)' : 'rgba(15,76,97,0.15)'}`,
                    background: isDark ? 'rgba(15,76,97,0.1)' : 'rgba(15,76,97,0.04)',
                    color: '#0F4C61', fontSize: 12, fontWeight: 600, cursor: isSwitching ? 'wait' : 'pointer',
                    opacity: isSwitching ? 0.6 : 1,
                  }}>
                    {isSwitching ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
                    {isSwitching ? 'Alternando...' : 'Alternar para esta clínica'}
                  </button>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(34,197,94,0.08)', color: '#22c55e', fontSize: 12, fontWeight: 600,
                  }}>
                    <Check size={14} /> Você está nesta clínica
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {clinicas.length <= 1 && !loading && (
        <div style={{
          marginTop: 24, padding: '16px 20px', borderRadius: 14,
          background: isDark ? 'rgba(217,151,115,0.05)' : 'rgba(217,151,115,0.04)',
          border: '1px solid rgba(217,151,115,0.15)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Crown size={18} style={{ color: '#D99773', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: isDark ? '#e2e8f0' : '#334155', lineHeight: 1.5 }}>
            <strong>Dica:</strong> Clique em &ldquo;Nova Clínica&rdquo; para adicionar outra unidade. 
            Cada clínica terá seus próprios contatos, agenda e IARA personalizada.
          </p>
        </div>
      )}
    </div>
  )
}
