'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Link2, Copy, ExternalLink, Share2, Palette, Type,
    Image as ImageIcon, Save, Loader2, CheckCircle2, Home,
    Calendar, Plus, MoreHorizontal, MapPin, Instagram, Youtube
} from 'lucide-react'

interface LinkConfig {
    cor1: string
    cor2: string
    corTexto1: string
    corTexto2: string
    nomeApp: string
    logotipoUrl: string
    endereco: string
    slug: string
    instagram: string
    tiktok: string
    youtube: string
}

const DEFAULT_CONFIG: LinkConfig = {
    cor1: '#D99773',
    cor2: '#34425A',
    corTexto1: '#FFFFFF',
    corTexto2: '#FFFFFF',
    nomeApp: '',
    logotipoUrl: '',
    endereco: '',
    slug: '',
    instagram: '',
    tiktok: '',
    youtube: '',
}

export default function LinkAgendamentoPage() {
    const { data: session } = useSession()
    const [config, setConfig] = useState<LinkConfig>(DEFAULT_CONFIG)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [msg, setMsg] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/profissional/me')
            .then(r => r.json())
            .then(data => {
                if (data.linkConfig && typeof data.linkConfig === 'object') {
                    setConfig(c => ({ ...c, ...data.linkConfig }))
                }
                if (!config.nomeApp && data.nome) {
                    setConfig(c => ({ ...c, nomeApp: c.nomeApp || data.nome }))
                }
                if (!config.slug && data.nome) {
                    const slug = data.nome
                        .toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '')
                    setConfig(c => ({ ...c, slug: c.slug || slug }))
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/a` : 'https://app.iara.click/a'
    const fullLink = `${baseUrl}/${config.slug}`

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(fullLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [fullLink])

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/profissional/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ linkConfig: config }),
            })
            if (res.ok) {
                setMsg('✅ Salvo!')
                setTimeout(() => setMsg(''), 3000)
            }
        } catch { }
        setSaving(false)
    }

    const update = (key: keyof LinkConfig, value: string) => {
        setConfig(c => ({ ...c, [key]: value }))
    }

    if (loading) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-[#D99773]" />
        </div>
    )

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D99773] to-[#C07A55] flex items-center justify-center shadow-lg shadow-[#D99773]/20">
                    <Link2 className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Link de Agendamento</h1>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Personalize e compartilhe seu link</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* ─── LEFT: Settings ─── */}
                <div className="space-y-6">
                    {/* Link Display */}
                    <div className="glass-card p-6 space-y-4">
                        <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <Link2 size={14} /> Link de agendamento:
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-4 py-3 rounded-xl text-sm truncate font-mono"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                                {fullLink}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={fullLink}
                                target="_blank"
                                className="px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            >
                                <ExternalLink size={14} /> Acessar
                            </a>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            >
                                {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
                                {copied ? 'Copiado!' : 'Copiar link'}
                            </button>
                            <button
                                onClick={() => navigator.share?.({ url: fullLink, title: `Agendar com ${config.nomeApp}` })}
                                className="btn-primary px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
                            >
                                <Share2 size={14} /> Divulgar
                            </button>
                        </div>
                    </div>

                    {/* Slug */}
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <Type size={14} /> Alterar o link
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>app.iara.click/a/</span>
                            <input
                                type="text"
                                value={config.slug}
                                onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="input-field flex-1 font-mono"
                            />
                        </div>
                    </div>

                    {/* Visual Config */}
                    <div className="glass-card p-6 space-y-5">
                        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <Palette size={14} /> Mude o visual:
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Cor 1 */}
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Cor 1:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={config.cor1}
                                        onChange={e => update('cor1', e.target.value)}
                                        className="input-field font-mono text-sm"
                                    />
                                    <input
                                        type="color"
                                        value={config.cor1}
                                        onChange={e => update('cor1', e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Cor Texto 1 */}
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Cor do Texto 1:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={config.corTexto1}
                                        onChange={e => update('corTexto1', e.target.value)}
                                        className="input-field font-mono text-sm"
                                    />
                                    <input
                                        type="color"
                                        value={config.corTexto1}
                                        onChange={e => update('corTexto1', e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Cor 2 */}
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Cor 2:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={config.cor2}
                                        onChange={e => update('cor2', e.target.value)}
                                        className="input-field font-mono text-sm"
                                    />
                                    <input
                                        type="color"
                                        value={config.cor2}
                                        onChange={e => update('cor2', e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                    />
                                </div>
                            </div>

                            {/* Cor Texto 2 */}
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Cor do Texto 2:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={config.corTexto2}
                                        onChange={e => update('corTexto2', e.target.value)}
                                        className="input-field font-mono text-sm"
                                    />
                                    <input
                                        type="color"
                                        value={config.corTexto2}
                                        onChange={e => update('corTexto2', e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nome do App */}
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome do App:</label>
                            <input
                                type="text"
                                value={config.nomeApp}
                                onChange={e => update('nomeApp', e.target.value)}
                                placeholder="Ex: Joana Silva"
                                className="input-field"
                            />
                        </div>

                        {/* Endereço */}
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Endereço:</label>
                            <input
                                type="text"
                                value={config.endereco}
                                onChange={e => update('endereco', e.target.value)}
                                placeholder="Rua exemplo, 123 - Cidade"
                                className="input-field"
                            />
                        </div>

                        {/* Logotipo */}
                        <div>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Logotipo:</label>
                            <div className="flex items-center gap-3">
                                {config.logotipoUrl && (
                                    <img src={config.logotipoUrl} alt="Logo" className="w-12 h-12 rounded-xl object-cover" style={{ border: '1px solid var(--border-default)' }} />
                                )}
                                <label className="px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                                    <ImageIcon size={14} /> Escolher arquivo
                                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        const reader = new FileReader()
                                        reader.onload = () => update('logotipoUrl', reader.result as string)
                                        reader.readAsDataURL(file)
                                    }} />
                                </label>
                            </div>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>O tamanho para a imagem é de 412px por 200px</p>
                        </div>
                    </div>

                    {/* Redes Sociais */}
                    <div className="glass-card p-6 space-y-5">
                        <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                            <Instagram size={14} /> Redes Sociais (aparecerão no seu perfil público)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs mb-1 block flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Instagram size={10} /> Instagram</label>
                                <input
                                    type="text"
                                    value={config.instagram}
                                    onChange={e => update('instagram', e.target.value)}
                                    placeholder="@seuuser"
                                    className="input-field text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>TikTok</label>
                                <input
                                    type="text"
                                    value={config.tiktok}
                                    onChange={e => update('tiktok', e.target.value)}
                                    placeholder="@seuuser"
                                    className="input-field text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs mb-1 block flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Youtube size={10} /> YouTube</label>
                                <input
                                    type="text"
                                    value={config.youtube}
                                    onChange={e => update('youtube', e.target.value)}
                                    placeholder="https://youtube.com/@canal"
                                    className="input-field text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                            Salvar Configurações
                        </button>
                        {msg && <span className="text-sm text-green-500 font-medium">{msg}</span>}
                    </div>
                </div>

                {/* ─── RIGHT: Phone Preview ─── */}
                <div className="flex justify-center sticky top-8">
                    <div className="relative">
                        {/* Phone Frame */}
                        <div className="w-[280px] h-[560px] rounded-[40px] border-[6px] border-gray-700 bg-gray-900 shadow-2xl shadow-black/40 overflow-hidden relative">
                            {/* Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-gray-700 rounded-b-2xl z-10" />

                            {/* Screen */}
                            <div className="w-full h-full bg-white flex flex-col">
                                {/* Header */}
                                <div className="pt-10 pb-4 px-5 flex flex-col items-center">
                                    {config.logotipoUrl ? (
                                        <img src={config.logotipoUrl} alt="Logo" className="w-20 h-10 object-contain mb-2" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                            <span className="text-2xl">👩‍⚕️</span>
                                        </div>
                                    )}
                                    <h3 className="text-lg font-bold text-gray-800 text-center">
                                        {config.nomeApp || 'Seu Nome'}
                                    </h3>
                                </div>

                                {/* Buttons */}
                                <div className="px-5 flex gap-3 mb-4">
                                    <button
                                        className="flex-1 py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-semibold shadow-sm transition-all"
                                        style={{ backgroundColor: config.cor1, color: config.corTexto1 }}
                                    >
                                        <Plus size={18} />
                                        AGENDAR
                                    </button>
                                    <button
                                        className="flex-1 py-3 rounded-xl flex flex-col items-center gap-1 text-xs font-semibold shadow-sm transition-all"
                                        style={{ backgroundColor: config.cor2, color: config.corTexto2 }}
                                    >
                                        <Calendar size={18} />
                                        RESERVAS
                                    </button>
                                </div>

                                {/* Address */}
                                <div className="px-5 flex items-center gap-2 text-gray-400 text-xs">
                                    <MapPin size={14} />
                                    <span>{config.endereco || 'Endereço'}</span>
                                </div>

                                {/* Spacer */}
                                <div className="flex-1" />

                                {/* Nav Bar */}
                                <div className="border-t border-gray-100 py-2 px-4 flex justify-around">
                                    <div className="flex flex-col items-center gap-0.5 text-gray-600">
                                        <Home size={16} />
                                        <span className="text-[10px]">INICIO</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5 text-gray-600">
                                        <Calendar size={16} />
                                        <span className="text-[10px]">RESERVAS</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5" style={{ color: config.cor1 }}>
                                        <Plus size={16} />
                                        <span className="text-[10px] font-semibold">AGENDAR</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5 text-gray-600">
                                        <MoreHorizontal size={16} />
                                        <span className="text-[10px]">MAIS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Labels pointing to preview */}
                        <div className="absolute top-[170px] -left-16 text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <span className="px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>Logotipo</span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </div>
                        <div className="absolute top-[255px] -left-10 text-xs font-medium flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: config.cor1 }}>Cor 1</span>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </div>
                        <div className="absolute top-[255px] -right-10 text-xs font-medium flex items-center gap-1">
                            <span style={{ color: 'var(--text-muted)' }}>←</span>
                            <span className="px-2 py-0.5 rounded text-white" style={{ backgroundColor: config.cor2 }}>Cor 2</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
