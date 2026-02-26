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
    BR: { pais: 'Brasil', moeda: 'BRL', simbolo: 'R$', planos: [97, 197, 297, 497], idioma: 'pt-BR', flag: '🇧🇷' },
    PT: { pais: 'Portugal', moeda: 'EUR', simbolo: '€', planos: [29, 59, 89, 149], idioma: 'pt-PT', flag: '🇵🇹' },
    US: { pais: 'United States', moeda: 'USD', simbolo: '$', planos: [29, 59, 89, 149], idioma: 'en-US', flag: '🇺🇸' },
    ES: { pais: 'España', moeda: 'EUR', simbolo: '€', planos: [29, 59, 89, 149], idioma: 'es', flag: '🇪🇸' },
    AR: { pais: 'Argentina', moeda: 'USD', simbolo: '$', planos: [29, 59, 89, 149], idioma: 'es', flag: '🇦🇷' },
    CO: { pais: 'Colombia', moeda: 'USD', simbolo: '$', planos: [29, 59, 89, 149], idioma: 'es', flag: '🇨🇴' },
    MX: { pais: 'México', moeda: 'USD', simbolo: '$', planos: [29, 59, 89, 149], idioma: 'es', flag: '🇲🇽' },
    // Default para países não mapeados (cobra em USD)
    DEFAULT: { pais: 'International', moeda: 'USD', simbolo: '$', planos: [29, 59, 89, 149], idioma: 'en-US', flag: '🌍' },
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
            nomes: ['Secretária', 'Estrategista', 'Designer', 'Audiovisual'],
            features: {
                1: {
                    label: pricing.idioma === 'en-US' ? 'Secretary' : pricing.idioma === 'es' ? 'Secretaria' : 'Secretária',
                    items: pricing.idioma === 'en-US'
                        ? ['Text messaging (WhatsApp/SMS)', 'Audio transcription', 'Auto scheduling', 'Pre-appointment follow-up', '100 credits/month']
                        : pricing.idioma === 'es'
                            ? ['Atención WhatsApp texto', 'Transcripción de audio', 'Agenda automática', 'Seguimiento pre-consulta', '100 créditos/mes']
                            : pricing.idioma === 'pt-PT'
                                ? ['Atendimento WhatsApp texto', 'Transcrição de áudio', 'Agendamento automático', 'Follow-up pré-consulta', '100 créditos/mês']
                                : ['Atendimento WhatsApp texto', 'Atendimento por áudio', 'Agendamento automático', 'Follow-up pré-consulta', '100 créditos/mês'],
                },
                2: {
                    label: pricing.idioma === 'en-US' ? 'Strategist' : 'Estrategista',
                    items: pricing.idioma === 'en-US'
                        ? ['Everything in Plan 1', 'Instagram auto-replies', 'All languages supported', 'Marketing plan', '300 credits/month']
                        : pricing.idioma === 'es'
                            ? ['Todo del Plan 1', 'Auto-respuestas Instagram', 'Todos los idiomas', 'Plan de marketing', '300 créditos/mes']
                            : ['Tudo do Plano 1', 'Auto-respostas Instagram', 'Todos os idiomas', 'Plano de marketing', '300 créditos/mês'],
                },
                3: {
                    label: 'Designer',
                    items: pricing.idioma === 'en-US'
                        ? ['Everything in Plan 2', 'Cloned voice (ElevenLabs)', 'AI carousel posts', 'Logo + brand guide', '600 credits/month']
                        : pricing.idioma === 'es'
                            ? ['Todo del Plan 2', 'Voz clonada (ElevenLabs)', 'Posts carrusel IA', 'Logo + manual de marca', '600 créditos/mes']
                            : ['Tudo do Plano 2', 'Voz clonada (ElevenLabs)', 'Posts carrossel IA', 'Logo + manual de marca', '600 créditos/mês'],
                },
                4: {
                    label: pricing.idioma === 'en-US' ? 'Audiovisual' : 'Audiovisual',
                    items: pricing.idioma === 'en-US'
                        ? ['Everything in Plan 3', 'AI video avatar (HeyGen)', 'Cloned voice + avatar', 'AI video editor', '1,200 credits/month']
                        : pricing.idioma === 'es'
                            ? ['Todo del Plan 3', 'Avatar vídeo IA (HeyGen)', 'Voz clonada + avatar', 'Editor de vídeo IA', '1.200 créditos/mes']
                            : ['Tudo do Plano 3', 'Avatar vídeo IA (HeyGen)', 'Voz clonada + avatar', 'Editor de vídeo IA', '1.200 créditos/mês'],
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
