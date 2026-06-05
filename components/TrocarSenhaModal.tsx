'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react'
import { Suspense } from 'react'

interface TrocarSenhaModalProps {
  /** Controle programático: quando passado, ignora o ?trocarSenha=1 da URL */
  isOpen?: boolean
  onClose?: () => void
}

/**
 * Modal "Trocar Senha"
 * - Modo URL: aparece quando ?trocarSenha=1 está na URL (fluxo de magic link / reset de senha)
 * - Modo programático: controlado via props `isOpen` / `onClose`
 */
export default function TrocarSenhaModal(props: TrocarSenhaModalProps) {
  // Se as props de controle foram passadas, não precisa de Suspense
  if (props.isOpen !== undefined) {
    return props.isOpen ? <TrocarSenhaContent onClose={props.onClose ?? (() => { })} /> : null
  }

  // Modo legado — depende de useSearchParams, precisa de Suspense no caller
  return (
    <Suspense fallback={null}>
      <TrocarSenhaUrlMode />
    </Suspense>
  )
}

/** Modo URL: lê ?trocarSenha=1 */
function TrocarSenhaUrlMode() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (searchParams.get('trocarSenha') === '1') {
      setShow(true)
    }
  }, [searchParams])

  if (!show) return null

  return (
    <TrocarSenhaContent
      onClose={() => {
        setShow(false)
        router.replace('/dashboard')
      }}
    />
  )
}

/** Conteúdo do modal em si */
function TrocarSenhaContent({ onClose }: { onClose: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (senha.length < 6) {
      setError('Mínimo 6 caracteres')
      return
    }
    if (senha !== confirmar) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha: senha }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao alterar senha')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111827] border border-white/[0.06] rounded-2xl p-6 shadow-2xl animate-fade-in relative">

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all"
        >
          <X size={16} />
        </button>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Check size={32} className="text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Senha alterada! ✅</h3>
            <p className="text-sm text-gray-400">Fechando...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 pr-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D99773] to-[#C07A55] flex items-center justify-center flex-shrink-0">
                <Lock size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Redefinir Senha</h3>
                <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Nova senha"
                  className="input-field pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Confirmar nova senha"
                className="input-field"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !senha || !confirmar}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#D99773] to-[#C07A55] text-white disabled:opacity-50 transition-all hover:shadow-[0_8px_30px_rgba(217,151,115,0.3)]"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Salvar nova senha'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
