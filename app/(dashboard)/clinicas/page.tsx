'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, MapPin, Phone, Trash2, Edit2, ArrowRightLeft, Crown, Check, Loader2 } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import UpgradeOverlay from '@/components/UpgradeOverlay'

interface Clinica {
  id: number
  nomeClinica: string | null
  nome: string | null
  endereco: string | null
  whatsappClinica?: string | null
  nivel?: number
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
    if (!formData.nomeClinica.trim()) {
      setError('Nome da clínica é obrigatório')
      return
    }
    setSaving(true)
    setError('')
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
      if (res.ok) {
        window.location.reload()
      }
    } catch {
    } finally {
      setSwitchingId(null)
    }
  }

  // Preview content para o UpgradeOverlay (mostra dados fake por baixo do blur)
  const previewContent = (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#fff' : '#0F4C61', margin: 0 }}>Multi-Clínica</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Gerencie múltiplas unidades com um único login</p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          borderRadius: 12, background: 'linear-gradient(135deg, #D99773, #C4845F)',
          color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
        }}>
          <Plus size={16} /> Nova Clínica
        </button>
      </div>

      {/* Cards fake */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {['Clínica Centro', 'Clínica Barra', 'Clínica Botafogo'].map((nome, i) => (
          <div key={i} style={{
            padding: 20, borderRadius: 16,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: i === 0 ? 'linear-gradient(135deg, #D99773, #C4845F)' : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={18} style={{ color: i === 0 ? '#fff' : '#94a3b8' }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#fff' : '#0F4C61', margin: 0 }}>{nome}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                  {i === 0 ? '● Ativa' : 'Clique para alternar'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> Rua Exemplo, {100 + i * 50}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Se não tem plano Premium, mostra preview com overlay
  if (planoAtual < 3) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
        <UpgradeOverlay
          planoAtual={planoAtual}
          planoMinimo={3}
          nomeFeature="Multi-Clínica"
          descricao="Gerencie múltiplas unidades da sua clínica com um único login. Alterne entre clínicas em um clique — cada uma com seus próprios contatos, agenda e IARA."
          beneficios={[
            'Até 2 clínicas com um único login',
            'Cada clínica com contatos e agenda próprios',
            'Alternar entre clínicas em 1 clique',
            'IARA personalizada por unidade',
            '2 WhatsApps conectados',
            'Voz clonada (ElevenLabs)',
            'Profissionais ilimitados',
          ]}
        >
          {previewContent}
        </UpgradeOverlay>
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
            boxShadow: '0 4px 15px rgba(217,151,115,0.3)', transition: 'all 0.2s',
          }}
        >
          <Plus size={16} /> Nova Clínica
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#22c55e',
        }}>
          <Check size={16} /> {success}
        </div>
      )}

      {/* Form para criar nova clínica */}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Nome da Clínica *
              </label>
              <input
                value={formData.nomeClinica}
                onChange={e => setFormData(prev => ({ ...prev, nomeClinica: e.target.value }))}
                placeholder="Ex: Clínica Barra"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: isDark ? '#fff' : '#0F4C61', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Endereço
              </label>
              <input
                value={formData.endereco}
                onChange={e => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                placeholder="Ex: Av. das Américas, 500 - Barra"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: isDark ? '#fff' : '#0F4C61', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                WhatsApp
              </label>
              <input
                value={formData.whatsappClinica}
                onChange={e => setFormData(prev => ({ ...prev, whatsappClinica: e.target.value }))}
                placeholder="Ex: 5521999999999"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', color: isDark ? '#fff' : '#0F4C61', outline: 'none',
                }}
              />
            </div>
          </div>

          {error && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#ef4444' }}>⚠️ {error}</p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={handleCreate}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                borderRadius: 10, background: '#0F4C61', color: '#fff', fontSize: 13,
                fontWeight: 600, border: 'none', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Criando...' : 'Criar Clínica'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                background: 'transparent', color: '#94a3b8', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de clínicas */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#D99773' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {clinicas.map((c, i) => {
            const isActive = clinicaAtiva === c.id
            const isSwitching = switchingId === c.id
            return (
              <div
                key={c.id}
                style={{
                  padding: 20, borderRadius: 16, transition: 'all 0.2s',
                  background: isDark
                    ? (isActive ? 'rgba(217,151,115,0.05)' : 'rgba(255,255,255,0.02)')
                    : (isActive ? 'rgba(217,151,115,0.04)' : '#fff'),
                  border: `1px solid ${isActive
                    ? (isDark ? 'rgba(217,151,115,0.2)' : 'rgba(217,151,115,0.25)')
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,76,97,0.08)')}`,
                  boxShadow: isActive ? '0 4px 15px rgba(217,151,115,0.1)' : 'none',
                }}
              >
                {/* Header do card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isActive
                      ? 'linear-gradient(135deg, #D99773, #C4845F)'
                      : (isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 4px 12px rgba(217,151,115,0.25)' : 'none',
                  }}>
                    <Building2 size={20} style={{ color: isActive ? '#fff' : '#94a3b8' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: 15, fontWeight: 600, margin: 0,
                      color: isDark ? '#fff' : '#0F4C61',
                    }}>
                      {c.nomeClinica || c.nome || 'Clínica'}
                    </p>
                    {isActive && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: '#D99773', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        Ativa agora
                      </span>
                    )}
                    {!isActive && i === 0 && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Principal</span>
                    )}
                  </div>
                </div>

                {/* Info */}
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

                {/* Ações */}
                {!isActive && (
                  <button
                    onClick={() => handleSwitch(c.id)}
                    disabled={!!isSwitching}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      width: '100%', padding: '10px 16px', borderRadius: 10,
                      border: `1px solid ${isDark ? 'rgba(15,76,97,0.3)' : 'rgba(15,76,97,0.15)'}`,
                      background: isDark ? 'rgba(15,76,97,0.1)' : 'rgba(15,76,97,0.04)',
                      color: '#0F4C61', fontSize: 12, fontWeight: 600, cursor: isSwitching ? 'wait' : 'pointer',
                      transition: 'all 0.2s', opacity: isSwitching ? 0.6 : 1,
                    }}
                  >
                    {isSwitching ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
                    {isSwitching ? 'Alternando...' : 'Alternar para esta clínica'}
                  </button>
                )}
                {isActive && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                    fontSize: 12, fontWeight: 600,
                  }}>
                    <Check size={14} /> Você está nesta clínica
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dica */}
      {clinicas.length <= 1 && !loading && (
        <div style={{
          marginTop: 24, padding: '16px 20px', borderRadius: 14,
          background: isDark ? 'rgba(217,151,115,0.05)' : 'rgba(217,151,115,0.04)',
          border: '1px solid rgba(217,151,115,0.15)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Crown size={18} style={{ color: '#D99773', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 13, color: isDark ? '#e2e8f0' : '#334155', lineHeight: 1.5 }}>
            <strong>Dica:</strong> Clique em "Nova Clínica" para adicionar outra unidade. 
            Cada clínica terá seus próprios contatos, agenda e IARA personalizada.
          </p>
        </div>
      )}
    </div>
  )
}
