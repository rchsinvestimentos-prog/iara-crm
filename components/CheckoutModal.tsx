'use client'

// ============================================
// CHECKOUT — escolher como pagar
// ============================================
// Aparece quando a clínica decide comprar um plano ou pacote. Oferece PIX
// (cobrança gerada na hora no Asaas) e cartão (link do Assiny).
//
// Nada é liberado aqui: quem libera é o webhook, quando o dinheiro entra.
// A tela só leva a clínica até o pagamento.

import { useState } from 'react'
import { X, QrCode, CreditCard, Loader2, Copy, Check, ExternalLink } from 'lucide-react'

type Metodo = 'pix' | 'cartao'
type Pix = { url: string; copiaECola?: string; qrCode?: string; valor: number }

export default function CheckoutModal({
    aberto, onClose, tipo, item, nome, preco,
}: {
    aberto: boolean
    onClose: () => void
    tipo: 'plano' | 'pacote'
    item: string
    nome: string
    preco: number
}) {
    const [carregando, setCarregando] = useState<Metodo | null>(null)
    const [pix, setPix] = useState<Pix | null>(null)
    const [erro, setErro] = useState('')
    const [copiado, setCopiado] = useState(false)

    if (!aberto) return null

    const escolher = async (metodo: Metodo) => {
        setErro('')
        setCarregando(metodo)
        try {
            const res = await fetch('/api/pagamentos/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, item, metodo }),
            })
            const dados = await res.json()

            if (!res.ok) {
                setErro(dados.error === 'Cartão ainda não disponível para este item'
                    ? 'O cartão para este item ainda está sendo liberado. Use o PIX por enquanto.'
                    : dados.error || 'Não consegui gerar a cobrança. Tente de novo.')
                return
            }

            if (metodo === 'cartao') {
                window.open(dados.url, '_blank')
                onClose()
                return
            }
            setPix(dados)
        } catch {
            setErro('Não consegui falar com o servidor. Tente de novo.')
        } finally {
            setCarregando(null)
        }
    }

    const copiar = () => {
        if (!pix?.copiaECola) return
        navigator.clipboard.writeText(pix.copiaECola)
            .then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2200) })
            .catch(() => { })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(8,20,26,0.6)' }} onClick={onClose}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 flex flex-col gap-4"
                onClick={e => e.stopPropagation()}>

                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-[17px] font-bold text-gray-800 leading-tight">{nome}</h3>
                        <p className="text-[13px] text-gray-500 mt-0.5">
                            R$ {preco}<span className="text-[12px]">/mês</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-500 p-1">
                        <X size={18} />
                    </button>
                </div>

                {erro && (
                    <div className="rounded-xl p-3 text-[12.5px]"
                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#B91C1C' }}>
                        {erro}
                    </div>
                )}

                {!pix ? (
                    <>
                        <p className="text-[13px] text-gray-500">Como você prefere pagar?</p>

                        <button onClick={() => escolher('pix')} disabled={!!carregando}
                            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all disabled:opacity-50"
                            style={{ borderColor: '#E5E7EB' }}>
                            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'rgba(6,214,160,0.12)' }}>
                                {carregando === 'pix'
                                    ? <Loader2 size={18} className="animate-spin" style={{ color: '#06D6A0' }} />
                                    : <QrCode size={18} style={{ color: '#06D6A0' }} />}
                            </span>
                            <span className="text-left">
                                <span className="block text-[14px] font-semibold text-gray-800">PIX</span>
                                <span className="block text-[11.5px] text-gray-400">Libera assim que o pagamento cair</span>
                            </span>
                        </button>

                        <button onClick={() => escolher('cartao')} disabled={!!carregando}
                            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all disabled:opacity-50"
                            style={{ borderColor: '#E5E7EB' }}>
                            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'rgba(217,151,115,0.15)' }}>
                                {carregando === 'cartao'
                                    ? <Loader2 size={18} className="animate-spin" style={{ color: '#D99773' }} />
                                    : <CreditCard size={18} style={{ color: '#D99773' }} />}
                            </span>
                            <span className="text-left">
                                <span className="block text-[14px] font-semibold text-gray-800">Cartão de crédito</span>
                                <span className="block text-[11.5px] text-gray-400">Cobrança automática todo mês</span>
                            </span>
                        </button>
                    </>
                ) : (
                    <>
                        {pix.qrCode && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={`data:image/png;base64,${pix.qrCode}`} alt="QR Code do PIX"
                                className="w-44 h-44 mx-auto rounded-xl" />
                        )}

                        {pix.copiaECola && (
                            <button onClick={copiar}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white"
                                style={{ background: copiado ? '#06D6A0' : 'linear-gradient(135deg, #0F4C61, #1a6e8b)' }}>
                                {copiado ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar código PIX</>}
                            </button>
                        )}

                        <a href={pix.url} target="_blank" rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold border"
                            style={{ borderColor: '#E5E7EB', color: '#0F4C61' }}>
                            <ExternalLink size={14} /> Abrir a página de pagamento
                        </a>

                        <p className="text-[11.5px] text-gray-400 text-center leading-relaxed">
                            Assim que o pagamento cair, a liberação é automática — não precisa
                            avisar ninguém nem mandar comprovante.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
