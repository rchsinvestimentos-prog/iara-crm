import { NextRequest, NextResponse } from 'next/server'

// Mapa de preços por país
const PRECOS: Record<string, {
    pais: string
    moeda: string
    simbolo: string
    planos: number[]
    idioma: string
    flag: string
}> = {
    BR: { pais: 'Brasil', moeda: 'BRL', simbolo: 'R$', planos: [97, 197, 297], idioma: 'pt-BR', flag: '🇧🇷' },
    PT: { pais: 'Portugal', moeda: 'EUR', simbolo: '€', planos: [27, 47, 67], idioma: 'pt-PT', flag: '🇵🇹' },
    US: { pais: 'United States', moeda: 'USD', simbolo: '$', planos: [27, 47, 67], idioma: 'en-US', flag: '🇺🇸' },
    ES: { pais: 'España', moeda: 'EUR', simbolo: '€', planos: [27, 47, 67], idioma: 'es', flag: '🇪🇸' },
    AR: { pais: 'Argentina', moeda: 'USD', simbolo: '$', planos: [27, 47, 67], idioma: 'es', flag: '🇦🇷' },
    CO: { pais: 'Colombia', moeda: 'USD', simbolo: '$', planos: [27, 47, 67], idioma: 'es', flag: '🇨🇴' },
    MX: { pais: 'México', moeda: 'USD', simbolo: '$', planos: [27, 47, 67], idioma: 'es', flag: '🇲🇽' },
    // Default para países não mapeados (cobra em USD)
    DEFAULT: { pais: 'International', moeda: 'USD', simbolo: '$', planos: [27, 47, 67], idioma: 'en-US', flag: '🌍' },
}

// Detectar país pelo IP usando header do Cloudflare/Vercel ou fallback API
async function detectarPais(request: NextRequest): Promise<string> {
    // 1. Cloudflare header (mais rápido)
    const cfCountry = request.headers.get('cf-ipcountry')
    if (cfCountry && cfCountry !== 'XX') return cfCountry.toUpperCase()

    // 2. Vercel header
    const vercelCountry = request.headers.get('x-vercel-ip-country')
    if (vercelCountry) return vercelCountry.toUpperCase()

    // 3. Query param override (para testes ou link direto)
    const { searchParams } = new URL(request.url)
    const paisParam = searchParams.get('pais')
    if (paisParam) return paisParam.toUpperCase()

    // 4. Fallback: IP lookup (grátis, até 1000 req/dia)
    try {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        if (ip && ip !== '127.0.0.1' && !ip.startsWith('192.168')) {
            const geo = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`, {
                signal: AbortSignal.timeout(2000),
            })
            const data = await geo.json()
            if (data.countryCode) return data.countryCode.toUpperCase()
        }
    } catch { /* fallback silencioso */ }

    // 5. Default: Brasil
    return 'BR'
}

// GET /api/pricing — Retorna preços baseado na localização
export async function GET(request: NextRequest) {
    try {
        const pais = await detectarPais(request)
        const pricing = PRECOS[pais] || PRECOS.DEFAULT

        return NextResponse.json({
            paisDetectado: pais,
            pais: pricing.pais,
            moeda: pricing.moeda,
            simbolo: pricing.simbolo,
            planos: pricing.planos,
            idioma: pricing.idioma,
            flag: pricing.flag,
            nomes: ['Essencial', 'Pro', 'Premium'],
            features: {
                1: {
                    label: pricing.idioma === 'en-US' ? 'Essential' : pricing.idioma === 'es' ? 'Esencial' : 'Essencial',
                    items: pricing.idioma === 'en-US'
                        ? ['WhatsApp AI 24/7', 'Auto scheduling', 'Smart follow-ups', 'Promotions & combos', '1,000 credits/month']
                        : pricing.idioma === 'es'
                            ? ['WhatsApp IA 24/7', 'Agenda automática', 'Follow-ups inteligentes', 'Promociones y combos', '1.000 créditos/mes']
                            : ['WhatsApp IA 24/7', 'Agendamento automático', 'Follow-ups inteligentes', 'Promoções e combos', '1.000 créditos/mês'],
                },
                2: {
                    label: 'Pro',
                    items: pricing.idioma === 'en-US'
                        ? ['Everything in Essential', 'Instagram DM AI', '4 languages', '3,000 credits/month']
                        : pricing.idioma === 'es'
                            ? ['Todo del Esencial', 'Instagram DM IA', '4 idiomas', '3.000 créditos/mes']
                            : ['Tudo do Essencial', 'Instagram DM IA', '4 idiomas', '3.000 créditos/mês'],
                },
                3: {
                    label: 'Premium',
                    items: pricing.idioma === 'en-US'
                        ? ['Everything in Pro', 'Team / Multi-professional', 'Cloned voice (ElevenLabs)', 'Multi-clinic', '5,000 credits/month']
                        : pricing.idioma === 'es'
                            ? ['Todo del Pro', 'Equipo / Multi-profesional', 'Voz clonada (ElevenLabs)', 'Multi-clínica', '5.000 créditos/mes']
                            : ['Tudo do Pro', 'Equipe / Multi-profissional', 'Voz clonada (ElevenLabs)', 'Multi-clínica', '5.000 créditos/mês'],
                },
            },
            // Geo-blocking: informar se está no país "certo"
            bloqueio: {
                ativo: false, // Ativar quando tiver links separados por região
                mensagem: pais === 'BR' ? null : `Preços para ${pricing.pais} (${pricing.simbolo}). Compras vinculadas ao seu país.`,
            },
        })
    } catch (err) {
        console.error('Erro pricing:', err)
        // Fallback BR
        return NextResponse.json({
            paisDetectado: 'BR',
            pais: PRECOS.BR.pais,
            moeda: PRECOS.BR.moeda,
            simbolo: PRECOS.BR.simbolo,
            planos: PRECOS.BR.planos,
            idioma: PRECOS.BR.idioma,
            flag: PRECOS.BR.flag,
        })
    }
}
