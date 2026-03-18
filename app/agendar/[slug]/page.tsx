'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'

/* ───────── tipos ───────── */
interface Procedimento {
  id: string; nome: string; valor: number | null; desconto: number | null; duracao: number | null; descricao: string | null
}
interface DadosProfissional {
  profissional: { id: string; nome: string; bio: string | null; especialidade: string | null; fotoUrl: string | null; chavePix: string | null; linkPagamento: string | null }
  clinica: { nome: string; logo: string | null }
  procedimentos: Procedimento[]
  horarios: { horarioSemana: string; almocoSemana: string; atendeSabado: boolean; horarioSabado: string; almocoSabado: string; atendeDomingo: boolean; horarioDomingo: string; almocoDomingo: string; intervalo: number }
  slotsOcupados: string[]
}

/* ───────── helpers ───────── */
function gerarSlots(horarioStr: string, almocoStr: string, intervalo: number = 30): string[] {
  const parseRange = (s: string) => {
    const m = s.match(/(\d{1,2}):(\d{2})\s*(?:às|a|-)\s*(\d{1,2}):(\d{2})/)
    if (!m) return null
    return { inicio: parseInt(m[1]) * 60 + parseInt(m[2]), fim: parseInt(m[3]) * 60 + parseInt(m[4]) }
  }
  const range = parseRange(horarioStr)
  if (!range) return []
  const pausa = almocoStr ? parseRange(almocoStr) : null
  const slots: string[] = []
  for (let t = range.inicio; t < range.fim; t += intervalo) {
    if (pausa && t >= pausa.inicio && t < pausa.fim) continue
    const h = String(Math.floor(t / 60)).padStart(2, '0')
    const m = String(t % 60).padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

function formatarValor(v: number | null) {
  if (!v) return ''
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/* ───────── etapas do fluxo ───────── */
type Etapa = 'procedimento' | 'data' | 'horario' | 'dados' | 'confirmacao' | 'sucesso'

export default function PageAgendarPublico() {
  const params = useParams()
  const slug = params?.slug as string

  /* estado global */
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState<DadosProfissional | null>(null)
  const [etapa, setEtapa] = useState<Etapa>('procedimento')

  /* seleções do fluxo */
  const [procSelecionado, setProcSelecionado] = useState<Procedimento | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [obs, setObs] = useState('')
  const [enviando, setEnviando] = useState(false)

  /* slots para data selecionada */
  const [slotsDisponiveis, setSlotsDisponiveis] = useState<string[]>([])
  const [slotsOcupados, setSlotsOcupados] = useState<string[]>([])

  /* ─── load inicial ─── */
  useEffect(() => {
    if (!slug) return
    fetch(`/api/agendar?slug=${slug}`)
      .then(r => { if (!r.ok) throw new Error('não encontrado'); return r.json() })
      .then(d => { setDados(d); setLoading(false) })
      .catch(() => { setErro('Profissional não encontrado'); setLoading(false) })
  }, [slug])

  /* ─── ao selecionar data, buscar slots ocupados ─── */
  const carregarSlots = useCallback(async (date: Date) => {
    if (!dados) return
    const dataStr = date.toISOString().split('T')[0]
    try {
      const r = await fetch(`/api/agendar?profissionalId=${dados.profissional.id}&data=${dataStr}`)
      const d = await r.json()
      setSlotsOcupados(d.slotsOcupados || [])
    } catch { setSlotsOcupados([]) }

    // Gera slots baseado no dia da semana
    const dow = date.getDay()
    const h = dados.horarios
    let horario = '', almoco = ''
    if (dow === 0) { horario = h.horarioDomingo; almoco = h.almocoDomingo }
    else if (dow === 6) { horario = h.horarioSabado; almoco = h.almocoSabado }
    else { horario = h.horarioSemana; almoco = h.almocoSemana }
    setSlotsDisponiveis(gerarSlots(horario, almoco, h.intervalo))
  }, [dados])

  /* ─── enviar agendamento ─── */
  const enviar = async () => {
    if (!dados || !procSelecionado || !dataSelecionada || !horarioSelecionado || !nome || !telefone) return
    setEnviando(true)
    try {
      const r = await fetch('/api/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: dados.profissional.id,
          nomePaciente: nome,
          telefone,
          procedimento: procSelecionado.nome,
          procedimentoId: procSelecionado.id,
          data: dataSelecionada.toISOString().split('T')[0],
          horario: horarioSelecionado,
          duracao: procSelecionado.duracao || 30,
          observacao: obs,
        })
      })
      if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
      setEtapa('sucesso')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro'
      alert(msg)
    } finally { setEnviando(false) }
  }

  /* ─── calendário do mês ─── */
  const [mesAtual, setMesAtual] = useState(() => { const d = new Date(); d.setDate(1); return d })

  const diasDoMes = () => {
    const y = mesAtual.getFullYear(), m = mesAtual.getMonth()
    const primeiro = new Date(y, m, 1)
    const ultimo = new Date(y, m + 1, 0)
    const dias: (Date | null)[] = []
    for (let i = 0; i < primeiro.getDay(); i++) dias.push(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(y, m, d))
    return dias
  }

  const podeSelecionar = (d: Date) => {
    if (!dados) return false
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    if (d < hoje) return false
    const dow = d.getDay()
    if (dow === 0 && !dados.horarios.atendeDomingo) return false
    if (dow === 6 && !dados.horarios.atendeSabado) return false
    return true
  }

  /* ─── render ─── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5f0' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, border: '3px solid #e8ddd4', borderTop: '3px solid #D99773', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#8c7b6b', fontSize: 14 }}>Carregando...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (erro || !dados) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5f0', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: '#333', fontSize: 20, marginBottom: 8 }}>Link não encontrado</h2>
        <p style={{ color: '#8c7b6b', fontSize: 14 }}>Verifique se o link está correto ou entre em contato com a clínica.</p>
      </div>
    </div>
  )

  const { profissional, clinica, procedimentos } = dados

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #faf5f0 0%, #f0e6da 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #D99773 0%, #c4845e 100%)',
        padding: '24px 20px 20px',
        color: 'white',
        textAlign: 'center',
      }}>
        {clinica.logo && (
          <img src={clinica.logo} alt={clinica.nome} style={{
            width: 56, height: 56, borderRadius: '50%', objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.3)', marginBottom: 8,
          }} />
        )}
        <div style={{ fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>{clinica.nome}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 2px' }}>{profissional.nome}</h1>
        {profissional.especialidade && (
          <div style={{ fontSize: 13, opacity: 0.85 }}>{profissional.especialidade}</div>
        )}
        {profissional.bio && (
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 8, maxWidth: 320, margin: '8px auto 0', lineHeight: 1.4 }}>{profissional.bio}</p>
        )}
      </div>

      {/* Progresso */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '16px 20px 8px' }}>
        {(['procedimento', 'data', 'horario', 'dados'] as Etapa[]).map((e, i) => (
          <div key={e} style={{
            height: 3, flex: 1, maxWidth: 60, borderRadius: 2,
            background: ['procedimento', 'data', 'horario', 'dados'].indexOf(etapa) >= i ? '#D99773' : '#e0d5c8',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Container */}
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '8px 16px 40px' }}>

        {/* ── ETAPA 1: Procedimento ── */}
        {etapa === 'procedimento' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 12 }}>Qual procedimento deseja?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {procedimentos.map(p => (
                <button key={p.id} onClick={() => { setProcSelecionado(p); setEtapa('data') }}
                  style={{
                    background: 'white', border: '1px solid #e8ddd4', borderRadius: 12, padding: '14px 16px',
                    textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                  onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#D99773'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e8ddd4'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#333' }}>{p.nome}</div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13, color: '#8c7b6b' }}>
                    {p.valor && <span>{formatarValor(p.valor)}</span>}
                    {p.duracao && <span>⏱ {p.duracao} min</span>}
                  </div>
                  {p.descricao && <div style={{ fontSize: 12, color: '#a89888', marginTop: 4 }}>{p.descricao}</div>}
                </button>
              ))}
              {procedimentos.length === 0 && (
                <p style={{ color: '#8c7b6b', textAlign: 'center', padding: 20 }}>Nenhum procedimento cadastrado.</p>
              )}
            </div>
          </div>
        )}

        {/* ── ETAPA 2: Data ── */}
        {etapa === 'data' && (
          <div>
            <button onClick={() => setEtapa('procedimento')} style={{ background: 'none', border: 'none', color: '#D99773', fontSize: 13, cursor: 'pointer', marginBottom: 8, padding: 0 }}>← Voltar</button>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4 }}>Escolha a data</h2>
            <p style={{ fontSize: 13, color: '#8c7b6b', marginBottom: 12 }}>{procSelecionado?.nome}</p>

            {/* Navegação mês */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button onClick={() => { const d = new Date(mesAtual); d.setMonth(d.getMonth() - 1); setMesAtual(d) }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#D99773', padding: '4px 8px' }}>‹</button>
              <span style={{ fontWeight: 600, color: '#333', fontSize: 15 }}>{MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}</span>
              <button onClick={() => { const d = new Date(mesAtual); d.setMonth(d.getMonth() + 1); setMesAtual(d) }}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#D99773', padding: '4px 8px' }}>›</button>
            </div>

            {/* Calendário */}
            <div style={{ background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#a89888', fontWeight: 600, padding: 4 }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {diasDoMes().map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} />
                  const pode = podeSelecionar(d)
                  const sel = dataSelecionada && d.toDateString() === dataSelecionada.toDateString()
                  const hoje = d.toDateString() === new Date().toDateString()
                  return (
                    <button key={d.getTime()} disabled={!pode}
                      onClick={() => { setDataSelecionada(d); carregarSlots(d); setEtapa('horario') }}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 8,
                        border: sel ? '2px solid #D99773' : hoje ? '1px solid #D99773' : '1px solid transparent',
                        background: sel ? '#D99773' : pode ? 'transparent' : '#f5f0ea',
                        color: sel ? 'white' : pode ? '#333' : '#ccc',
                        fontSize: 14, fontWeight: sel || hoje ? 700 : 400,
                        cursor: pode ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                      }}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: Horário ── */}
        {etapa === 'horario' && (
          <div>
            <button onClick={() => setEtapa('data')} style={{ background: 'none', border: 'none', color: '#D99773', fontSize: 13, cursor: 'pointer', marginBottom: 8, padding: 0 }}>← Voltar</button>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4 }}>Escolha o horário</h2>
            <p style={{ fontSize: 13, color: '#8c7b6b', marginBottom: 12 }}>
              {dataSelecionada && `${DIAS_SEMANA[dataSelecionada.getDay()]}, ${dataSelecionada.getDate()} de ${MESES[dataSelecionada.getMonth()]}`} • {procSelecionado?.nome}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {slotsDisponiveis.map(slot => {
                const ocupado = slotsOcupados.includes(slot)
                const sel = horarioSelecionado === slot
                return (
                  <button key={slot} disabled={ocupado} onClick={() => { setHorarioSelecionado(slot); setEtapa('dados') }}
                    style={{
                      padding: '12px 8px', borderRadius: 10, fontSize: 15, fontWeight: 500,
                      border: sel ? '2px solid #D99773' : '1px solid #e8ddd4',
                      background: ocupado ? '#f5f0ea' : sel ? '#FFF5EE' : 'white',
                      color: ocupado ? '#ccc' : '#333',
                      cursor: ocupado ? 'default' : 'pointer',
                      textDecoration: ocupado ? 'line-through' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {slot}
                  </button>
                )
              })}
              {slotsDisponiveis.length === 0 && (
                <p style={{ color: '#8c7b6b', textAlign: 'center', padding: 20, gridColumn: '1/-1' }}>Sem horários disponíveis nesta data.</p>
              )}
            </div>
          </div>
        )}

        {/* ── ETAPA 4: Dados ── */}
        {etapa === 'dados' && (
          <div>
            <button onClick={() => setEtapa('horario')} style={{ background: 'none', border: 'none', color: '#D99773', fontSize: 13, cursor: 'pointer', marginBottom: 8, padding: 0 }}>← Voltar</button>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4 }}>Seus dados</h2>
            <p style={{ fontSize: 13, color: '#8c7b6b', marginBottom: 16 }}>
              {procSelecionado?.nome} • {dataSelecionada && `${dataSelecionada.getDate()}/${(dataSelecionada.getMonth() + 1).toString().padStart(2, '0')}`} às {horarioSelecionado}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e8ddd4', fontSize: 15, outline: 'none', background: 'white', width: '100%', boxSizing: 'border-box' }}
              />
              <input placeholder="WhatsApp (ex: 11 99999-0000)" value={telefone} onChange={e => setTelefone(e.target.value)}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e8ddd4', fontSize: 15, outline: 'none', background: 'white', width: '100%', boxSizing: 'border-box' }}
              />
              <textarea placeholder="Observações (opcional)" value={obs} onChange={e => setObs(e.target.value)} rows={3}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid #e8ddd4', fontSize: 15, outline: 'none', background: 'white', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {/* Resumo */}
            <div style={{
              background: 'white', borderRadius: 12, padding: 16, marginTop: 16,
              border: '1px solid #e8ddd4', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 8 }}>Resumo</div>
              <div style={{ fontSize: 13, color: '#8c7b6b', lineHeight: 1.8 }}>
                <div>📋 {procSelecionado?.nome}</div>
                <div>📅 {dataSelecionada && `${dataSelecionada.getDate()}/${(dataSelecionada.getMonth() + 1).toString().padStart(2, '0')}/${dataSelecionada.getFullYear()}`} às {horarioSelecionado}</div>
                <div>👤 {profissional.nome}</div>
                {procSelecionado?.valor && <div>💰 {formatarValor(procSelecionado.valor)}</div>}
              </div>
            </div>

            {/* PIX info */}
            {(profissional.chavePix || profissional.linkPagamento) && procSelecionado?.valor && (
              <div style={{
                background: '#FFF8F0', borderRadius: 12, padding: 14, marginTop: 12,
                border: '1px solid #f0dcc8',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c4845e', marginBottom: 6 }}>💳 Taxa de confirmação</div>
                <div style={{ fontSize: 12, color: '#8c7b6b', lineHeight: 1.5 }}>
                  Para confirmar seu agendamento, realize o pagamento de <strong>{formatarValor(procSelecionado.valor)}</strong>.
                </div>
                {profissional.chavePix && (
                  <div style={{ fontSize: 12, marginTop: 6, color: '#8c7b6b' }}>
                    <strong>Chave PIX:</strong> {profissional.chavePix}
                  </div>
                )}
                {profissional.linkPagamento && (
                  <a href={profissional.linkPagamento} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-block', marginTop: 8, padding: '8px 16px', borderRadius: 8,
                      background: '#D99773', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    }}>
                    Pagar agora →
                  </a>
                )}
              </div>
            )}

            <button onClick={enviar} disabled={enviando || !nome || !telefone}
              style={{
                width: '100%', marginTop: 16, padding: '16px', borderRadius: 12,
                background: (!nome || !telefone) ? '#ccc' : 'linear-gradient(135deg, #D99773, #c4845e)',
                color: 'white', fontSize: 16, fontWeight: 700, border: 'none', cursor: (!nome || !telefone) ? 'default' : 'pointer',
                boxShadow: (!nome || !telefone) ? 'none' : '0 4px 12px rgba(217, 151, 115, 0.3)',
                transition: 'all 0.3s',
              }}
            >
              {enviando ? 'Enviando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        )}

        {/* ── ETAPA SUCESSO ── */}
        {etapa === 'sucesso' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#333', marginBottom: 8 }}>Agendamento recebido!</h2>
            <p style={{ fontSize: 14, color: '#8c7b6b', lineHeight: 1.6, maxWidth: 300, margin: '0 auto' }}>
              Você receberá uma confirmação por WhatsApp em breve.
            </p>
            <div style={{
              background: 'white', borderRadius: 12, padding: 20, marginTop: 24,
              border: '1px solid #e8ddd4', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: 14, color: '#8c7b6b', lineHeight: 2 }}>
                <div>📋 {procSelecionado?.nome}</div>
                <div>📅 {dataSelecionada && `${dataSelecionada.getDate()}/${(dataSelecionada.getMonth() + 1).toString().padStart(2, '0')}/${dataSelecionada.getFullYear()}`} às {horarioSelecionado}</div>
                <div>👤 {profissional.nome}</div>
                <div>🏥 {clinica.nome}</div>
              </div>
            </div>
            <button onClick={() => { setEtapa('procedimento'); setProcSelecionado(null); setDataSelecionada(null); setHorarioSelecionado(''); setNome(''); setTelefone(''); setObs('') }}
              style={{
                marginTop: 20, padding: '12px 24px', borderRadius: 10,
                background: 'none', border: '2px solid #D99773', color: '#D99773',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Agendar outro horário
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 20px 24px', fontSize: 11, color: '#a89888' }}>
        Powered by <strong style={{ color: '#D99773' }}>IARA</strong>
      </div>
    </div>
  )
}
