import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCalendarTokens, getCalendarEvents } from '@/lib/google-calendar'
import { parseFuncionalidades } from '@/lib/engine/types'

/**
 * GET /api/agenda/diagnostico
 *
 * Diz por que a agenda não está sincronizando, em vez de mostrar apenas
 * "Conectada" porque existe um token gravado.
 *
 * O card de Conexões olhava só a existência do token. Token existe e não
 * funciona é o caso comum: o do Google vale 1 hora, e quando a renovação
 * falha nada avisa — o agendamento é salvo internamente e some do Google
 * sem erro nenhum na tela.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const email = (session?.user as { email?: string })?.email
        if (!email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findFirst({ where: { email } })
        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const problemas: string[] = []

        // 1. A clínica desligou a integração?
        const funcs = parseFuncionalidades(clinica.funcionalidades)
        const ligado = funcs.google_calendar !== false
        if (!ligado) problemas.push('A integração com a agenda está desligada nas funcionalidades.')

        // 2. Alguém conectou?
        const tokens = await getCalendarTokens(clinica.id)
        const profissionaisComToken = await prisma.profissional.count({
            where: { clinicaId: clinica.id, googleCalendarToken: { not: null } },
        })
        const conectado = !!tokens || profissionaisComToken > 0
        if (!conectado) problemas.push('Ninguém conectou uma conta do Google ainda.')

        // 3. O credenciamento do servidor existe? Sem ele a renovação falha e
        //    a agenda para de funcionar uma hora depois de conectar.
        const temCredenciais = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
        if (!temCredenciais) problemas.push('O servidor está sem as credenciais do Google — a renovação do acesso não funciona.')

        // 4. O token responde AGORA? É o único teste que prova de verdade.
        let tokenValido: boolean | null = null
        if (tokens && temCredenciais) {
            try {
                const agora = new Date()
                const daqui7 = new Date(Date.now() + 7 * 24 * 3600 * 1000)
                await getCalendarEvents(clinica.id, agora.toISOString(), daqui7.toISOString())
                tokenValido = true
            } catch {
                tokenValido = false
                problemas.push('O acesso do Google expirou e não foi renovado. Reconecte a conta.')
            }
        }

        const temRefresh = !!tokens?.refreshToken
        if (tokens && !temRefresh) {
            problemas.push('A conexão foi feita sem permissão de renovação — vai parar em 1 hora. Reconecte.')
        }

        return NextResponse.json({
            funcionando: problemas.length === 0 && conectado && ligado,
            problemas,
            detalhe: {
                integracaoLigada: ligado,
                contaConectada: conectado,
                origemDoToken: tokens?.source ?? null,
                profissionaisComAgenda: profissionaisComToken,
                podeRenovar: temRefresh,
                credenciaisDoServidor: temCredenciais,
                tokenRespondeAgora: tokenValido,
            },
        })
    } catch (err) {
        console.error('[Agenda diagnóstico] Erro:', err)
        return NextResponse.json({ error: 'Erro ao diagnosticar' }, { status: 500 })
    }
}
