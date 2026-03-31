import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/engine/ai-engine'
import { checkRateLimit } from '@/lib/rate-limiter'

/**
 * POST /api/simulador
 * 
 * Simula uma conversa com a IARA da clínica.
 * Recebe: { mensagem: string, historico?: { role: string, content: string }[] }
 * Retorna: { resposta: string }
 * 
 * Usa o mesmo buildSystemPrompt do pipeline real,
 * mas sem enviar WhatsApp, sem salvar histórico, sem créditos.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        // Rate limit: máx 20 msgs/min no simulador (evitar abuso)
        const rl = checkRateLimit(String(clinicaId), 'anthropic')
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Muitas mensagens em seguida. Aguarde 1 minuto.' },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { mensagem, historico = [] } = body

        if (!mensagem?.trim()) {
            return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
        }

        // Buscar procedimentos
        let procedimentos: any[] = []
        try {
            procedimentos = await prisma.procedimento.findMany({
                where: { clinicaId: String(clinicaId) },
            })
        } catch { /* sem procedimentos */ }

        // Montar system prompt identico ao pipeline real
        const systemPrompt = buildSystemPrompt({
            clinica: clinica as any,
            mensagem,
            pushName: 'Cliente Simulada',
            tipoEntrada: 'text',
            procedimentos,
            feedbacks: [],
            memoria: null,
            agendaContext: null,
            historico: historico.map((h: any) => ({
                role: h.role,
                content: h.content,
            })),
        })

        // Chamar Anthropic (mesmo modelo do pipeline)
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        const openaiKey = process.env.OPENAI_API_KEY

        let resposta = ''

        if (anthropicKey) {
            // Claude Sonnet (principal)
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-5',
                    max_tokens: 500,
                    system: systemPrompt,
                    messages: [
                        ...historico.map((h: any) => ({
                            role: h.role === 'user' ? 'user' : 'assistant',
                            content: h.content,
                        })),
                        { role: 'user', content: mensagem },
                    ],
                }),
            })

            if (res.ok) {
                const data = await res.json()
                resposta = data.content?.[0]?.text || 'Sem resposta'
            } else {
                throw new Error(`Claude error: ${res.status}`)
            }
        } else if (openaiKey) {
            // Fallback GPT
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 500,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...historico.map((h: any) => ({
                            role: h.role,
                            content: h.content,
                        })),
                        { role: 'user', content: mensagem },
                    ],
                }),
            })

            if (res.ok) {
                const data = await res.json()
                resposta = data.choices?.[0]?.message?.content || 'Sem resposta'
            } else {
                throw new Error(`GPT error: ${res.status}`)
            }
        } else {
            return NextResponse.json({ error: 'Nenhuma API key configurada' }, { status: 500 })
        }

        return NextResponse.json({ resposta })

    } catch (err: any) {
        console.error('[Simulador] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
