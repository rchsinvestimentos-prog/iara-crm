'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, Check, Loader2, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface FotoPerfilModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarUrl?: string | null
  onAvatarUpdated?: (newUrl: string) => void
}

export default function FotoPerfilModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  onAvatarUpdated,
}: FotoPerfilModalProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 5MB.')
      return
    }
    setError('')
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch('/api/auth/foto-perfil', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { url } = await res.json()
        setSuccess(true)
        onAvatarUpdated?.(url)
        setTimeout(() => {
          setSuccess(false)
          setPreview(null)
          setSelectedFile(null)
          onClose()
        }, 1800)
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao fazer upload')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    setUploading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/foto-perfil', { method: 'DELETE' })
      if (res.ok) {
        onAvatarUpdated?.('')
        onClose()
      } else {
        setError('Erro ao remover foto')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in relative"
        style={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Faixa superior */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
          style={{ background: 'linear-gradient(90deg, #D99773, #0F4C61)' }}
        />

        {/* Botão fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D99773] to-[#C07A55] flex items-center justify-center flex-shrink-0">
            <Camera size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Foto de Perfil</h3>
            <p className="text-xs text-gray-500">JPG, PNG ou WebP · Máx 5MB</p>
          </div>
        </div>

        {/* Foto atual */}
        {currentAvatarUrl && !preview && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <Image src={currentAvatarUrl} alt="Avatar atual" width={48} height={48} className="w-full h-full object-cover" unoptimized />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-300">Foto atual</p>
              <p className="text-[10px] text-gray-600">Selecione uma nova para substituir</p>
            </div>
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              Remover
            </button>
          </div>
        )}

        {/* Preview da nova imagem */}
        {preview && (
          <div className="relative mb-4">
            <div className="w-full aspect-square max-h-48 rounded-xl overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => { setPreview(null); setSelectedFile(null) }}
              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Zona de drop */}
        {!preview && (
          <div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all mb-4 ${
              dragging ? 'border-[#D99773] bg-[#D99773]/5' : 'border-white/10 hover:border-[#D99773]/40 hover:bg-white/[0.02]'
            }`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(217,151,115,0.1)' }}
            >
              <Upload size={22} className="text-[#D99773]" />
            </div>
            <p className="text-sm font-medium text-gray-300">
              {dragging ? 'Solte a imagem aqui' : 'Arraste ou clique para selecionar'}
            </p>
            <p className="text-xs text-gray-600 mt-1">JPG, PNG, WebP até 5MB</p>
          </div>
        )}

        {/* Erro */}
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        {/* Botão de upload */}
        {preview && (
          <button
            onClick={handleUpload}
            disabled={uploading || success}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{
              background: success
                ? 'linear-gradient(135deg, #06D6A0, #059669)'
                : 'linear-gradient(135deg, #D99773, #C07A55)',
              boxShadow: success ? '0 8px 30px rgba(6,214,160,0.3)' : '0 8px 30px rgba(217,151,115,0.3)',
            }}
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : success ? (
              <><Check size={16} /> Foto atualizada!</>
            ) : (
              <><Upload size={16} /> Salvar foto de perfil</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
