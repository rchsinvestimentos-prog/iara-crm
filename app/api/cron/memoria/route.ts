import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

/**
 * GET /api/cron/memoria?secret=XXX
 *
 * MEMÓRIA DE LONGO PRAZO.
 *
 * A IARA lê o histórico de conversa, mas só as últimas 20 mensagens — e a
 * limpeza automática apaga tudo com mais de 90 dias. Sem este cron, o que a
 * paciente contou some: o medo de agulha, o orçamento, a data do casamento.
 *
 * Aqui a conversa esfriada vira um resumo curto gravado em contatos.memoria_ia,
 * que entra no prompt de toda conversa futura e não expira nunca.
 *
 * Frequência sugerida: de hora em hora.
 * URL no cron-job.org: https://app.iara.click/api/cron/memoria?secret=SEU_SECRET
 */

/** Conversa precisa estar parada há pelo menos isso pra ser resumida. */
const MINUTOS_ESFRIANDO = 30
/** Não olha conversas mais velhas que isso (já foram resumidas ou morreram). */
const HORAS_JANELA = 48
/** Teto por execução — protege o custo se muita coisa acumular. */
const MAX_POR_RODADA = 60
/** Teto do resumo. Ele vai no prompt a cada mensagem e é cobrado por inteiro. */
const MAX_CHARS_RESUMO = 700

type Pendente = {
    clinica_id: number
    telefone_cliente: string
    ultima_msg: Date
    total: number
}

/** Marca até onde cada conversa já foi resumida. Criada aqui pra não mexer no schema. */
async function garantirTabela(): Promise<void> {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS memoria_resumos (
            clinica_id INT NOT NULL,
            telefone_cliente VARCHAR(50) NOT NULL,
            resumido_ate TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (clinica_id, telefone_cliente)
        )
    `)
}

async function resumirComIA(
    conversa: string,
    resumoAtual: string | null
): Promise<string | null> {
    const instrucao = resumoAtual
        ? `Já existe um resumo desta paciente. Atualize-o com o que a conversa nova acrescenta.\n\nRESUMO ATUAL:\n${resumoAtual}\n\nCONVERSA NOVA:\n${conversa}`
        : `Escreva o primeiro resumo desta paciente com base na conversa.\n\nCONVERSA:\n${conversa}`

    const system = `Você monta a memória de longo prazo de uma paciente de clínica de estética.

Escreva um resumo curto, em português, que ajude a atendente a retomar a conversa daqui a meses.

REGISTRE apenas o que for útil e foi dito de fato:
- procedimentos que ela quer ou já fez, e o que achou
- orçamento, forma de pagamento, sensibilidade a preço
- receios, alergias, restrições que ela mencionou
- prazos e datas importantes pra ela (viagem, casamento, evento)
- preferências de horário e de contato
- como ela gosta de ser tratada

NÃO FAÇA:
- não invente nada que não esteja escrito na conversa
- não repita o catálogo nem os preços da clínica
- não escreva diagnóstico médico nem opinião clínica
- não use marcadores nem títulos — texto corrido

Máximo de ${MAX_CHARS_RESUMO} caracteres. Se a conversa não trouxe nada de útil, responda exatamente: NADA`

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                temperature: 0.3,
                system,
                messages: [{ role: 'user', content: instrucao }],
            }),
            signal: AbortSignal.timeout(30000),
        })

        if (!res.ok) {
            console.error('[Memoria] Claude erro:', res.status, (await res.text()).slice(0, 200))
            return null
        }

        const data = await res.json()
        const texto = (data.content?.[0]?.text || '').trim()
        if (!texto || texto === 'NADA') return null
        return texto.slice(0, MAX_CHARS_RESUMO)
    } catch (err: any) {
        console.error('[Memoria] Falha ao resumir:', err?.message?.slice(0, 120))
        return null
    }
}

export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'ANTHROPIC_API_KEY ausente' }, { status: 500 })
    }

    const t0 = Date.now()
    let resumidas = 0
    let semNovidade = 0
    let erros = 0

    try {
        await garantirTabela()

        // Conversas que esfriaram e têm mensagem mais nova do que o último resumo.
        const pendentes = await prisma.$queryRawUnsafe<Pendente[]>(`
            SELECT h.user_id AS clinica_id,
                   h.telefone_cliente,
                   MAX(h.created_at) AS ultima_msg,
                   COUNT(*)::int AS total
            FROM historico_conversas h
            LEFT JOIN memoria_resumos m
                   ON m.clinica_id = h.user_id
                  AND m.telefone_cliente = h.telefone_cliente
            WHERE h.created_at > NOW() - INTERVAL '${HORAS_JANELA} hours'
              AND (m.resumido_ate IS NULL OR h.created_at > m.resumido_ate)
            GROUP BY h.user_id, h.telefone_cliente
            HAVING MAX(h.created_at) < NOW() - INTERVAL '${MINUTOS_ESFRIANDO} minutes'
               AND COUNT(*) >= 4
            ORDER BY MAX(h.created_at) DESC
            LIMIT ${MAX_POR_RODADA}
        `)

        for (const p of pendentes) {
            try {
                const msgs = await prisma.$queryRaw<{ role: string; content: string }[]>`
                    SELECT role, content
                    FROM historico_conversas
                    WHERE user_id = ${p.clinica_id}
                      AND telefone_cliente = ${p.telefone_cliente}
                      AND created_at > NOW() - INTERVAL '48 hours'
                    ORDER BY created_at ASC
                    LIMIT 60
                `
                if (msgs.length < 4) { semNovidade++; continue }

                const conversa = msgs
                    .map(m => `${m.role === 'user' ? 'PACIENTE' : 'IARA'}: ${m.content}`)
                    .join('\n')
                    .slice(0, 8000)

                const contato = await prisma.contato.findFirst({
                    where: { clinicaId: p.clinica_id, telefone: p.telefone_cliente },
                    select: { id: true, memoriaIA: true },
                })

                const resumo = await resumirComIA(conversa, contato?.memoriaIA ?? null)

                // Marca a conversa como processada mesmo quando não rendeu resumo —
                // senão o cron tenta de novo a cada hora e paga pela mesma conversa.
                await prisma.$executeRaw`
                    INSERT INTO memoria_resumos (clinica_id, telefone_cliente, resumido_ate, updated_at)
                    VALUES (${p.clinica_id}, ${p.telefone_cliente}, ${p.ultima_msg}, NOW())
                    ON CONFLICT (clinica_id, telefone_cliente)
                    DO UPDATE SET resumido_ate = ${p.ultima_msg}, updated_at = NOW()
                `

                if (!resumo) { semNovidade++; continue }

                if (contato) {
                    await prisma.contato.update({
                        where: { id: contato.id },
                        data: { memoriaIA: resumo },
                    })
                    resumidas++
                } else {
                    // Sem ficha no CRM não há onde gravar. Acontece com número que
                    // mandou mensagem e nunca virou contato.
                    semNovidade++
                }
            } catch (err: any) {
                erros++
                console.error(`[Memoria] Erro na conversa ${p.clinica_id}/${p.telefone_cliente}:`, err?.message?.slice(0, 120))
            }
        }

        const resultado = {
            ok: true,
            candidatas: pendentes.length,
            resumidas,
            semNovidade,
            erros,
            ms: Date.now() - t0,
        }
        console.log('[Memoria] ✅', resultado)
        return NextResponse.json(resultado)
    } catch (err: any) {
        console.error('[Memoria] ❌ Erro geral:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
