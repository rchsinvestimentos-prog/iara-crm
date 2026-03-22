'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, X, Check, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useParams } from 'next/navigation'

interface AgendamentoDetalhe {
  id: string
  nomePaciente: string
  telefone: string
  procedimento: string
  data: string
  horario: string
  status: string
  duracao: number
  nomeProfissional: string
  nomeClinica: string
  clinicaId: number
  profissionalId: string
}

export default function GerenciarAgendamento() {
  const params = useParams()
  const agendamentoId = params.id as string

  const [agendamento, setAgendamento] = useState<AgendamentoDetalhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [telefoneConfirm, setTelefoneConfirm] = useState('')
  const [novaData, setNovaData] = useState('')
  const [novoHorario, setNovoHorario] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (agendamentoId) fetchAgendamento()
  }, [agendamentoId])

  async function fetchAgendamento() {
    try {
      const res = await fetch(`/api/agendamento-publico/detalhe?id=${agendamentoId}`)
      if (!res.ok) throw new Error('Não encontrado')
      const data = await res.json()
      setAgendamento(data)
    } catch {
      setError('Agendamento não encontrado.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!telefoneConfirm.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/agendamento-publico/cancelar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamentoId,
          telefone: telefoneConfirm,
          motivo: motivo || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar')
      setActionResult({ type: 'success', msg: 'Agendamento cancelado com sucesso!' })
      setShowCancelModal(false)
      fetchAgendamento()
    } catch (err: any) {
      setActionResult({ type: 'error', msg: err.message || 'Erro ao cancelar' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReschedule() {
    if (!telefoneConfirm.trim() || !novaData || !novoHorario) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/agendamento-publico/alterar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agendamentoId,
          telefone: telefoneConfirm,
          novaData,
          novoHorario,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao remarcar')
      setActionResult({ type: 'success', msg: 'Agendamento remarcado com sucesso!' })
      setShowRescheduleModal(false)
      fetchAgendamento()
    } catch (err: any) {
      setActionResult({ type: 'error', msg: err.message || 'Erro ao remarcar' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
        <Loader2 className="animate-spin text-[#D99773]" size={40} />
      </div>
    )
  }

  if (error || !agendamento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white px-6">
        <AlertTriangle size={48} className="text-yellow-400 mb-4" />
        <p className="text-lg text-center">{error || 'Agendamento não encontrado.'}</p>
      </div>
    )
  }

  const dataBR = agendamento.data.split('-').reverse().join('/')
  const isCancelado = agendamento.status === 'cancelado'
  const isPassado = new Date(`${agendamento.data}T${agendamento.horario}:00`) < new Date()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white">
      <div className="max-w-md mx-auto px-5 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#D99773]">Seu Agendamento</h1>
          <p className="text-sm text-gray-400 mt-1">{agendamento.nomeClinica}</p>
        </div>

        {/* Status Badge */}
        {actionResult && (
          <div className={`mb-4 p-3 rounded-xl text-sm text-center ${
            actionResult.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {actionResult.msg}
          </div>
        )}

        {/* Appointment Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Detalhes</span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              isCancelado ? 'bg-red-500/20 text-red-300' :
              agendamento.status === 'reagendado' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-green-500/20 text-green-300'
            }`}>
              {isCancelado ? '❌ Cancelado' :
               agendamento.status === 'reagendado' ? '🔄 Remarcado' :
               '✅ Confirmado'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400">Paciente</p>
              <p className="font-semibold">{agendamento.nomePaciente}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Procedimento</p>
              <p className="font-semibold">{agendamento.procedimento}</p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={12} /> Data
                </p>
                <p className="font-semibold">{dataBR}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> Horário
                </p>
                <p className="font-semibold">{agendamento.horario}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Profissional</p>
              <p className="font-semibold">{agendamento.nomeProfissional}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isCancelado && !isPassado && (
          <div className="space-y-3">
            <button
              onClick={() => { setShowRescheduleModal(true); setTelefoneConfirm(''); setNovaData(''); setNovoHorario('') }}
              className="w-full py-3.5 rounded-xl bg-[#D99773] text-white font-semibold text-sm hover:bg-[#c4865f] transition-all flex items-center justify-center gap-2"
            >
              <Calendar size={16} /> Remarcar Agendamento
            </button>
            <button
              onClick={() => { setShowCancelModal(true); setTelefoneConfirm(''); setMotivo('') }}
              className="w-full py-3.5 rounded-xl bg-white/5 border border-red-400/30 text-red-300 font-semibold text-sm hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
            >
              <X size={16} /> Cancelar Agendamento
            </button>
          </div>
        )}

        {isCancelado && (
          <div className="text-center text-gray-400 text-sm py-4">
            Este agendamento foi cancelado.
          </div>
        )}

        {isPassado && !isCancelado && (
          <div className="text-center text-gray-400 text-sm py-4">
            Este agendamento já ocorreu.
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowCancelModal(false)}>
            <div className="w-full max-w-md bg-[#1a1a2e] rounded-t-3xl p-6 border-t border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} /> Cancelar Agendamento
              </h3>
              <p className="text-sm text-gray-400 mb-4">Confirme seu WhatsApp para cancelar:</p>

              <input
                type="tel"
                value={telefoneConfirm}
                onChange={e => setTelefoneConfirm(e.target.value)}
                placeholder="Seu WhatsApp (11 99999-9999)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm mb-3 focus:outline-none focus:border-[#D99773]"
              />

              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Motivo do cancelamento (opcional)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm mb-4 focus:outline-none focus:border-[#D99773] resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 text-sm font-medium"
                >
                  Voltar
                </button>
                <button
                  onClick={handleCancel}
                  disabled={submitting || !telefoneConfirm.trim()}
                  className="flex-1 py-3 rounded-xl bg-red-500/80 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowRescheduleModal(false)}>
            <div className="w-full max-w-md bg-[#1a1a2e] rounded-t-3xl p-6 border-t border-white/10" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-[#D99773] mb-4 flex items-center gap-2">
                <Calendar size={18} /> Remarcar Agendamento
              </h3>
              <p className="text-sm text-gray-400 mb-4">Confirme seu WhatsApp e escolha nova data:</p>

              <input
                type="tel"
                value={telefoneConfirm}
                onChange={e => setTelefoneConfirm(e.target.value)}
                placeholder="Seu WhatsApp (11 99999-9999)"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm mb-3 focus:outline-none focus:border-[#D99773]"
              />

              <input
                type="date"
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm mb-3 focus:outline-none focus:border-[#D99773]"
              />

              <input
                type="time"
                value={novoHorario}
                onChange={e => setNovoHorario(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm mb-4 focus:outline-none focus:border-[#D99773]"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 text-sm font-medium"
                >
                  Voltar
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={submitting || !telefoneConfirm.trim() || !novaData || !novoHorario}
                  className="flex-1 py-3 rounded-xl bg-[#D99773] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
