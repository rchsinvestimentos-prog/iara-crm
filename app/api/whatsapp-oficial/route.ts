// ============================================================================
// WhatsApp oficial — conectar, listar e desconectar números da clínica
//
// GET    → se a conexão está disponível para esta clínica + números conectados
// POST   → recebe o que o cadastro da Meta (Embedded Signup) devolveu na tela
//          { code, wabaId, phoneNumberId, businessId?, coexistencia } e termina
//          a conexão: troca o code pelo token, inscreve o app nos webhooks da
//          conta e, se for número novo (sem coexistência), registra o número.
// DELETE → ?id= desliga o número (para de receber e de responder)
//
// O code da Meta vale 30 segundos: a tela chama o POST na hora.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomInt } from 'crypto'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { META_APP_ID, META_GRAPH_URL, META_GRAPH_VERSION, whatsappOficialConfigurado, whatsappOficialLiberado } from '@/lib/meta'
import { esquecerConta } from '@/lib/whatsapp-oficial'

const META_APP_SECRET = process.env.META_APP_SECRET || ''

async function clinicaDaSessao() {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return null
    const c = await prisma.clinica.findUnique({ where: { id: Number(clinicaId) }, select: { id: true, email: true } })
    return c
}

async function graph(caminho: string, token: string, init: RequestInit = {}) {
    const res = await fetch(`${META_GRAPH_URL}/${caminho}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
        signal: AbortSignal.timeout(30_000),
    })
    const dados = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, dados }
}

const erroDaMeta = (r: { status: number; dados: any }) => r.dados?.error?.message || `HTTP ${r.status}`

export async function GET() {
    try {
        const clinica = await clinicaDaSessao()
        if (!clinica) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const contas = await prisma.$queryRaw<any[]>`
            SELECT id, numero, nome_verificado, coexistencia, status, ultimo_erro, created_at
            FROM whatsapp_oficial WHERE user_id = ${clinica.id} AND status <> 'removido'
            ORDER BY created_at
        `
        const liberado = whatsappOficialLiberado(clinica.email)
        return NextResponse.json({
            liberado,
            // Só vai para a tela de quem pode conectar
            ...(liberado ? { appId: META_APP_ID, configId: process.env.WHATSAPP_ES_CONFIG_ID, graphVersion: META_GRAPH_VERSION } : {}),
            contas: contas.map(c => ({
                id: c.id, numero: c.numero, nomeVerificado: c.nome_verificado, coexistencia: c.coexistencia,
                status: c.status, ultimoErro: c.ultimo_erro, criadoEm: c.created_at,
            })),
        })
    } catch (err) {
        console.error('[WA Oficial] ❌ Erro ao listar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const clinica = await clinicaDaSessao().catch(() => null)
    if (!clinica) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (!whatsappOficialConfigurado()) {
        return NextResponse.json({ error: 'A conexão com o WhatsApp oficial ainda não está configurada.' }, { status: 503 })
    }
    if (!whatsappOficialLiberado(clinica.email)) {
        return NextResponse.json({ error: 'O WhatsApp oficial ainda não está liberado para a sua conta.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code : ''
    const wabaId = String(body.wabaId || '')
    const phoneNumberId = String(body.phoneNumberId || '')
    const businessId = body.businessId ? String(body.businessId) : null
    const coexistencia = body.coexistencia === true
    if (!code || !/^\d+$/.test(wabaId) || !/^\d+$/.test(phoneNumberId)) {
        return NextResponse.json({ error: 'O cadastro da Meta não devolveu os dados do número. Tente de novo.' }, { status: 400 })
    }

    // Número já ligado a outra clínica: não troca de dono em silêncio
    const dono = await prisma.$queryRaw<{ user_id: number }[]>`
        SELECT user_id FROM whatsapp_oficial WHERE phone_number_id = ${phoneNumberId} AND status = 'conectado'
    `
    if (dono[0] && dono[0].user_id !== clinica.id) {
        console.warn(`[WA Oficial] ❌ Número ${phoneNumberId} já conectado à clínica ${dono[0].user_id}; clínica ${clinica.id} tentou conectar`)
        return NextResponse.json({ error: 'Este número já está conectado em outra conta da IARA.' }, { status: 409 })
    }

    try {
        // 1. code → token da empresa (não vence)
        const tokenRes = await fetch(
            `${META_GRAPH_URL}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${encodeURIComponent(code)}`,
            { signal: AbortSignal.timeout(30_000) },
        )
        const tokenDados = await tokenRes.json().catch(() => ({}))
        const token: string = tokenDados?.access_token || ''
        if (!token) {
            console.error(`[WA Oficial] ❌ Troca do code falhou (clínica ${clinica.id}): ${JSON.stringify(tokenDados?.error || tokenDados).slice(0, 300)}`)
            return NextResponse.json({ error: `A Meta não confirmou a conexão: ${tokenDados?.error?.message || 'tente de novo'}` }, { status: 502 })
        }

        // 2. dados do número
        const info = await graph(`${phoneNumberId}?fields=display_phone_number,verified_name`, token)
        if (!info.ok) {
            console.error(`[WA Oficial] ❌ Não li o número ${phoneNumberId}: ${erroDaMeta(info)}`)
            return NextResponse.json({ error: `Não consegui ler o número na Meta: ${erroDaMeta(info)}` }, { status: 502 })
        }

        // 3. app inscrito nos webhooks da conta (sem isso as mensagens não chegam)
        const inscricao = await graph(`${wabaId}/subscribed_apps`, token, { method: 'POST' })
        if (!inscricao.ok || inscricao.dados?.success !== true) {
            console.error(`[WA Oficial] ❌ Inscrição nos webhooks da conta ${wabaId} falhou: ${erroDaMeta(inscricao)}`)
            return NextResponse.json({ error: `A Meta não liberou o recebimento de mensagens: ${erroDaMeta(inscricao)}` }, { status: 502 })
        }

        // 4. número novo: registrar na Cloud API com um PIN de 6 dígitos.
        //    Na coexistência o número continua no app do celular e não registra.
        let pin: string | null = null
        if (!coexistencia) {
            // Número que já foi registrado por nós antes volta com o mesmo PIN
            // (a verificação em duas etapas fica com o PIN do primeiro registro).
            const anterior = await prisma.$queryRaw<{ pin: string | null }[]>`
                SELECT pin FROM whatsapp_oficial WHERE phone_number_id = ${phoneNumberId} AND pin IS NOT NULL LIMIT 1
            `
            pin = anterior[0]?.pin || String(randomInt(0, 1_000_000)).padStart(6, '0')
            const registro = await graph(`${phoneNumberId}/register`, token, {
                method: 'POST',
                body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
            })
            if (!registro.ok || registro.dados?.success !== true) {
                console.error(`[WA Oficial] ❌ Registro do número ${phoneNumberId} falhou: ${erroDaMeta(registro)}`)
                return NextResponse.json({ error: `A Meta não ativou o número: ${erroDaMeta(registro)}` }, { status: 502 })
            }
        }

        const numero = info.dados?.display_phone_number || null
        const nome = info.dados?.verified_name || null
        await prisma.$executeRaw`
            INSERT INTO whatsapp_oficial (user_id, waba_id, phone_number_id, business_id, numero, nome_verificado, access_token, coexistencia, pin, status, ultimo_erro)
            VALUES (${clinica.id}, ${wabaId}, ${phoneNumberId}, ${businessId}, ${numero}, ${nome}, ${token}, ${coexistencia}, ${pin}, 'conectado', NULL)
            ON CONFLICT (phone_number_id) DO UPDATE SET
                user_id = EXCLUDED.user_id, waba_id = EXCLUDED.waba_id, business_id = EXCLUDED.business_id,
                numero = EXCLUDED.numero, nome_verificado = EXCLUDED.nome_verificado, access_token = EXCLUDED.access_token,
                coexistencia = EXCLUDED.coexistencia, pin = COALESCE(EXCLUDED.pin, whatsapp_oficial.pin),
                status = 'conectado', ultimo_erro = NULL, updated_at = NOW()
        `
        esquecerConta(phoneNumberId)
        console.log(`[WA Oficial] ✅ Clínica ${clinica.id} conectou ${numero} (${phoneNumberId})${coexistencia ? ' em coexistência' : ''}`)
        return NextResponse.json({ ok: true, numero, nomeVerificado: nome })
    } catch (err: any) {
        console.error(`[WA Oficial] ❌ Erro ao conectar (clínica ${clinica.id}):`, err)
        return NextResponse.json({ error: 'Erro ao concluir a conexão. Tente de novo.' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const clinica = await clinicaDaSessao().catch(() => null)
    if (!clinica) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const id = Number(request.nextUrl.searchParams.get('id'))
    if (!Number.isInteger(id)) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

    try {
        const linhas = await prisma.$queryRaw<{ phone_number_id: string; waba_id: string; access_token: string }[]>`
            SELECT phone_number_id, waba_id, access_token FROM whatsapp_oficial WHERE id = ${id} AND user_id = ${clinica.id}
        `
        const conta = linhas[0]
        if (!conta) return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 })

        // Tirar a inscrição é cortesia com a Meta; se falhar, o número é
        // desligado aqui do mesmo jeito (os eventos que chegarem são ignorados).
        // A inscrição é da conta WABA inteira: se outro número dela continua
        // conectado, tirar a inscrição cortaria as mensagens dele.
        const outros = await prisma.$queryRaw<{ n: number }[]>`
            SELECT 1 AS n FROM whatsapp_oficial
            WHERE waba_id = ${conta.waba_id} AND id <> ${id} AND status = 'conectado' LIMIT 1
        `
        let aviso: string | null = null
        if (conta.access_token && outros.length === 0) {
            const r = await graph(`${conta.waba_id}/subscribed_apps`, conta.access_token, { method: 'DELETE' }).catch((e: any) => ({ ok: false, status: 0, dados: { error: { message: e?.message } } }))
            if (!r.ok) {
                aviso = erroDaMeta(r)
                console.warn(`[WA Oficial] ⚠️ Não tirei a inscrição da conta ${conta.waba_id}: ${aviso}`)
            }
        }
        await prisma.$executeRaw`
            UPDATE whatsapp_oficial SET status = 'removido', access_token = '', updated_at = NOW(), ultimo_erro = ${aviso}
            WHERE id = ${id} AND user_id = ${clinica.id}
        `
        esquecerConta(conta.phone_number_id)
        console.log(`[WA Oficial] Clínica ${clinica.id} desligou o número ${conta.phone_number_id}`)
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[WA Oficial] ❌ Erro ao desligar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
