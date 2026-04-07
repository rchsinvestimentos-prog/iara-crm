import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/engine/ai-engine'
import { checkRateLimit } from '@/lib/rate-limiter'
import { getAgendaContext } from '@/lib/engine/calendar'
import type { ProfissionalAtivo, Procedimento } from '@/lib/engine/types'

/**
 * POST /api/simulador
 * 
 * Simula uma conversa com a IARA da clínica.
 * Recebe: { mensagem: string, historico?: { role: string, content: string }[] }
 * Retorna: { resposta: string }
 * 
 * Usa o mesmo buildSystemPrompt do pipeline real,
 * AGORA busca TODOS os dados reais: procedimentos, profissionais,
 * feedbacks, agenda, promoções — igual ao pipeline de produção.
 * Única diferença: não salva histórico e não gasta créditos.
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

        // ─── Buscar Procedimentos ────────────────────────────────────────
        let procedimentos: Procedimento[] = []
        try {
            const raw = await prisma.procedimento.findMany({
                where: { clinicaId: String(clinicaId) },
            })
            procedimentos = raw.map((p: any) => ({
                id: p.id,
                nome: p.nome,
                valor: p.valor || 0,
                desconto: p.desconto || 0,
                parcelas: p.parcelas,
                duracao: p.duracao,
                descricao: p.descricao,
                valorMin: p.valorMin || p.valor_min || null,
                valorMax: p.valorMax || p.valor_max || null,
                profissionalId: p.profissionalId || p.profissional_id || null,
            }))
        } catch { /* sem procedimentos */ }

        // ─── Buscar Profissionais ────────────────────────────────────────
        let profissionaisRaw: ProfissionalAtivo[] = []
        try {
            const profs = await prisma.profissional.findMany({
                where: { clinicaId, ativo: true },
                orderBy: { ordem: 'asc' },
            })
            profissionaisRaw = profs.map((p: any) => ({
                id: p.id,
                nome: p.nome,
                bio: p.bio,
                especialidade: p.especialidade,
                whatsapp: p.whatsapp,
                isDono: p.isDono || p.is_dono || false,
                procedimentos: procedimentos.filter(proc => proc.profissionalId === p.id),
                horarioSemana: p.horarioSemana || p.horario_semana,
                horarioSabado: p.horarioSabado || p.horario_sabado,
                atendeSabado: p.atendeSabado ?? p.atende_sabado,
                horarioDomingo: p.horarioDomingo || p.horario_domingo,
                atendeDomingo: p.atendeDomingo ?? p.atende_domingo,
                intervaloAtendimento: p.intervaloAtendimento || p.intervalo_atendimento,
                ausencias: [],
                googleCalendarToken: p.googleCalendarToken,
                googleCalendarRefreshToken: p.googleCalendarRefreshToken,
                googleCalendarId: p.googleCalendarId,
                googleTokenExpires: p.googleTokenExpires,
            }))
        } catch { /* sem profissionais */ }

        // ─── Buscar Feedbacks da Dra ─────────────────────────────────────
        let feedbacks: { regra: string }[] = []
        try {
            const fbRows = await prisma.$queryRaw<any[]>`
                SELECT regra FROM feedback_iara 
                WHERE user_id = ${clinicaId} AND ativo = true
                ORDER BY created_at DESC LIMIT 10
            `
            feedbacks = fbRows.map((r: any) => ({ regra: r.regra }))
        } catch { /* sem feedbacks */ }

        // ─── Buscar Promoções Ativas ─────────────────────────────────────
        let promocoesAtivas: { nome: string; descricao: string | null; instrucaoIara: string | null; procedimentos: string[] }[] = []
        try {
            const promos = await prisma.$queryRaw<any[]>`
                SELECT p.nome, p.descricao, p.instrucao_iara,
                    COALESCE(
                        (SELECT array_agg(proc.nome) 
                         FROM promocao_procedimentos pp 
                         JOIN procedimentos proc ON proc.id = pp.procedimento_id 
                         WHERE pp.promocao_id = p.id), 
                        ARRAY[]::text[]
                    ) as procedimentos_nomes
                FROM promocoes p
                WHERE p.clinica_id = ${clinicaId} 
                  AND p.ativo = true
                  AND (p.data_fim IS NULL OR p.data_fim >= NOW())
            `
            promocoesAtivas = promos.map((p: any) => ({
                nome: p.nome,
                descricao: p.descricao,
                instrucaoIara: p.instrucao_iara,
                procedimentos: p.procedimentos_nomes || [],
            }))
        } catch { /* sem promoções */ }

        // ─── Buscar Agenda (real, sincronizada) ──────────────────────────
        let agendaContext: string | null = null
        try {
            agendaContext = await getAgendaContext(
                clinicaId,
                clinica as any,
                profissionaisRaw.length > 1 ? profissionaisRaw : undefined
            )
        } catch { /* sem agenda */ }

        // ─── Montar System Prompt (idêntico ao pipeline real) ────────────
        const systemPrompt = buildSystemPrompt({
            clinica: clinica as any,
            mensagem,
            pushName: 'Cliente Simulada',
            tipoEntrada: 'text',
            procedimentos,
            feedbacks,
            memoria: null,
            agendaContext,
            historico: historico.map((h: any) => ({
                role: h.role,
                content: h.content,
            })),
            profissionais: profissionaisRaw.length > 1 ? profissionaisRaw : undefined,
            promocoesAtivas,
        })

        // ─── Chamar IA ──────────────────────────────────────────────────
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        const openaiKey = process.env.OPENAI_API_KEY

        let resposta = ''

        if (anthropicKey) {
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
