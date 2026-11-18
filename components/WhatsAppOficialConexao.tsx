'use client'

// ============================================================================
// Card do WhatsApp oficial na tela WhatsApp/Conexões.
//
// Enquanto a conexão não está liberada para a clínica (app da Meta em revisão),
// mostra o anúncio "Em breve" que a tela passa em `emBreve`. Liberada, abre o
// cadastro da própria Meta (Embedded Signup) e termina a conexão em
// /api/whatsapp-oficial.
//
// Dois caminhos:
// - "Conectar meu WhatsApp Business": coexistência. O número continua no
//   aplicativo do celular e a IARA responde pela API oficial.
// - "Usar um número novo": número que não está em nenhum WhatsApp.
// ============================================================================
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from './IdiomaProvider'

interface Conta {
    id: number
    numero: string | null
    nomeVerificado: string | null
    coexistencia: boolean
    status: string
    ultimoErro?: string | null
}

interface Info {
    liberado: boolean
    appId?: string
    configId?: string
    graphVersion?: string
    contas: Conta[]
}

declare global {
    interface Window { FB?: any; fbAsyncInit?: () => void }
}

// O SDK do Facebook é carregado uma vez por página.
let sdkPromessa: Promise<void> | null = null
function carregarSdk(appId: string, versao: string): Promise<void> {
    if (window.FB) return Promise.resolve()
    if (sdkPromessa) return sdkPromessa
    sdkPromessa = new Promise((ok, falha) => {
        window.fbAsyncInit = () => {
            window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: versao })
            ok()
        }
        const s = document.createElement('script')
        s.src = 'https://connect.facebook.net/en_US/sdk.js'
        s.async = true
        s.crossOrigin = 'anonymous'
        s.onerror = () => { sdkPromessa = null; falha(new Error('sdk')) }
        document.body.appendChild(s)
    })
    return sdkPromessa
}

export default function WhatsAppOficialConexao({ emBreve }: { emBreve: ReactNode }) {
    const { t } = useT()
    const [info, setInfo] = useState<Info | null>(null)
    const [falhouCarregar, setFalhouCarregar] = useState(false)
    const [conectando, setConectando] = useState(false)
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState('')
    const [removendo, setRemovendo] = useState<number | null>(null)
    const [sdkPronto, setSdkPronto] = useState(false)

    // O cadastro devolve duas coisas por caminhos diferentes: o code (no
    // retorno do FB.login) e os ids do número (num postMessage). A conexão
    // só termina com as duas, e o code vale 30 segundos.
    const pedido = useRef<{ coexistencia: boolean; code?: string; wabaId?: string; phoneNumberId?: string; businessId?: string; enviado?: boolean } | null>(null)

    const carregar = useCallback(async () => {
        try {
            const r = await fetch('/api/whatsapp-oficial')
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
            setInfo(d)
            setFalhouCarregar(false)
        } catch (e) {
            console.error('[WhatsApp oficial] Não carregou:', e)
            setFalhouCarregar(true)
        }
    }, [])

    useEffect(() => { carregar() }, [carregar])

    // O SDK carrega antes do clique: assim o clique abre a janela da Meta na
    // hora. Com o carregamento no meio, o Safari bloqueava a janela.
    useEffect(() => {
        if (!info?.liberado || !info.appId) return
        carregarSdk(info.appId, info.graphVersion || 'v22.0')
            .then(() => setSdkPronto(true))
            .catch(() => setErro(t('Não consegui abrir o cadastro da Meta. Verifique se algum bloqueador está impedindo o Facebook e tente de novo.')))
    }, [info?.liberado, info?.appId, info?.graphVersion, t])

    const terminar = useCallback(async () => {
        const p = pedido.current
        if (!p || p.enviado || !p.code || !p.wabaId || !p.phoneNumberId) return
        p.enviado = true
        try {
            const r = await fetch('/api/whatsapp-oficial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: p.code, wabaId: p.wabaId, phoneNumberId: p.phoneNumberId, businessId: p.businessId, coexistencia: p.coexistencia }),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) {
                setErro(d.error || t('Não consegui concluir a conexão. Tente de novo.'))
            } else {
                setSucesso(t('WhatsApp oficial conectado: {numero}', { numero: d.numero || '' }))
                await carregar()
            }
        } catch {
            setErro(t('Sem conexão com o servidor. Tente de novo.'))
        } finally {
            pedido.current = null
            setConectando(false)
        }
    }, [carregar, t])

    // Eventos do cadastro da Meta (janela do Facebook)
    useEffect(() => {
        const ouvir = (event: MessageEvent) => {
            let host = ''
            try { host = new URL(event.origin).hostname } catch { return }
            if (!/(^|\.)facebook\.com$/.test(host)) return
            let dados: any
            try { dados = typeof event.data === 'string' ? JSON.parse(event.data) : event.data } catch { return }
            if (dados?.type !== 'WA_EMBEDDED_SIGNUP' || !pedido.current) return
            const ev = String(dados.event || '')
            if (ev.startsWith('FINISH')) {
                pedido.current.wabaId = dados.data?.waba_id
                pedido.current.phoneNumberId = dados.data?.phone_number_id
                pedido.current.businessId = dados.data?.business_id
                if (!pedido.current.phoneNumberId) {
                    setErro(t('A Meta terminou o cadastro sem informar o número. Tente de novo.'))
                    pedido.current = null
                    setConectando(false)
                    return
                }
                terminar()
            } else if (ev === 'CANCEL') {
                setErro(t('O cadastro foi fechado antes do fim. Quando quiser, é só começar de novo.'))
                pedido.current = null
                setConectando(false)
            } else if (ev === 'ERROR') {
                setErro(t('A Meta informou um erro no cadastro: {erro}', { erro: dados.data?.error_message || '' }))
                pedido.current = null
                setConectando(false)
            }
        }
        window.addEventListener('message', ouvir)
        return () => window.removeEventListener('message', ouvir)
    }, [terminar, t])

    const desistir = (mensagem: string) => {
        pedido.current = null
        setConectando(false)
        setErro(mensagem)
    }

    const conectar = (coexistencia: boolean) => {
        if (!info?.configId || !sdkPronto || !window.FB) return
        setErro('')
        setSucesso('')
        setConectando(true)
        pedido.current = { coexistencia }
        window.FB.login((resposta: any) => {
            const p = pedido.current
            if (!p) return
            const code = resposta?.authResponse?.code
            if (!code) {
                // Janela fechada sem autorização (mesmo que o FINISH tenha chegado)
                desistir(t('O cadastro foi fechado antes do fim. Quando quiser, é só começar de novo.'))
                return
            }
            p.code = code
            terminar()
            // Os dados do número chegam por outro caminho; se não vierem logo,
            // o code (30 s) vence e não adianta esperar.
            setTimeout(() => {
                if (pedido.current === p && !p.enviado) desistir(t('A Meta terminou o cadastro sem informar o número. Tente de novo.'))
            }, 20_000)
        }, {
            config_id: info.configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: coexistencia
                ? { setup: {}, featureType: 'whatsapp_business_app_onboarding' }
                : { setup: {} },
        })
    }

    const desconectar = async (conta: Conta) => {
        if (!confirm(t('Desligar o WhatsApp oficial {numero}? A IARA para de responder por ele.', { numero: conta.numero || '' }))) return
        setRemovendo(conta.id)
        setErro('')
        try {
            const r = await fetch(`/api/whatsapp-oficial?id=${conta.id}`, { method: 'DELETE' })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) setErro(d.error || t('Não consegui desligar o número.'))
            else await carregar()
        } catch {
            setErro(t('Sem conexão com o servidor. Tente de novo.'))
        } finally {
            setRemovendo(null)
        }
    }

    if (!info) {
        // Sem resposta ainda (ou falhou): mostra o anúncio, que não promete nada
        return (
            <>
                {emBreve}
                {falhouCarregar && (
                    <p style={{ margin: '-8px 0 16px', fontSize: 12, color: '#94a3b8' }}>
                        {t('Não consegui verificar o WhatsApp oficial agora.')}{' '}
                        <button onClick={carregar} style={{ border: 'none', background: 'none', color: '#128C7E', cursor: 'pointer', padding: 0, fontSize: 12 }}>{t('Tentar de novo')}</button>
                    </p>
                )}
            </>
        )
    }
    if (!info.liberado) return <>{emBreve}</>

    const conectadas = info.contas.filter(c => c.status === 'conectado')
    const comErro = info.contas.filter(c => c.status === 'erro')

    return (
        <div style={{ background: '#fff', borderRadius: 20, padding: '24px 28px', border: '1px solid #e2e8f0', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #128C7E, #075E54)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✅</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>{t('WhatsApp Oficial')}</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>{t('Conexão direta com a Meta, com selo de empresa verificada')}</p>
                </div>
            </div>

            {conectadas.length > 0 && (
                <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                    {conectadas.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <span style={{ fontSize: 14 }}>🟢</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>{c.numero || t('Número conectado')}</div>
                                <div style={{ fontSize: 12, color: '#4b5563' }}>
                                    {c.nomeVerificado ? `${c.nomeVerificado} · ` : ''}
                                    {c.coexistencia ? t('continua no WhatsApp Business do celular') : t('número só da API oficial')}
                                </div>
                            </div>
                            <button
                                onClick={() => desconectar(c)}
                                disabled={removendo === c.id}
                                style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', opacity: removendo === c.id ? 0.6 : 1 }}
                            >
                                {removendo === c.id ? t('Desligando...') : t('Desligar')}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {comErro.map(c => (
                <div key={c.id} style={{ marginTop: 8, padding: '10px 14px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14 }}>🔴</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#b91c1c' }}>{c.numero || t('Número conectado')} — {t('parou de funcionar')}</div>
                            <div style={{ fontSize: 12, color: '#7f1d1d' }}>{t('A IARA não está respondendo por este número. Conecte de novo.')}{c.ultimoErro ? ` (${c.ultimoErro})` : ''}</div>
                        </div>
                        <button
                            onClick={() => desconectar(c)}
                            disabled={removendo === c.id}
                            style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                        >
                            {removendo === c.id ? t('Desligando...') : t('Remover')}
                        </button>
                    </div>
                </div>
            ))}

            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap' as const, gap: 10, alignItems: 'center' }}>
                <button
                    onClick={() => conectar(true)}
                    disabled={conectando || !sdkPronto}
                    style={{ padding: '11px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #128C7E, #075E54)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: conectando ? 0.6 : 1 }}
                >
                    {conectando ? t('Abrindo o cadastro da Meta...') : !sdkPronto ? t('Carregando...') : t('Conectar meu WhatsApp Business')}
                </button>
                <button
                    onClick={() => conectar(false)}
                    disabled={conectando || !sdkPronto}
                    style={{ padding: '11px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: 13, cursor: 'pointer', opacity: conectando ? 0.6 : 1 }}
                >
                    {t('Usar um número novo')}
                </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
                {t('Com o WhatsApp Business você continua usando o aplicativo no celular normalmente; a IARA responde pela conexão oficial. O número novo não pode estar em nenhum WhatsApp.')}
            </p>

            {erro && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#dc2626' }}>{erro}</p>}
            {sucesso && <p style={{ margin: '12px 0 0', fontSize: 13, color: '#16a34a' }}>{sucesso}</p>}
        </div>
    )
}
