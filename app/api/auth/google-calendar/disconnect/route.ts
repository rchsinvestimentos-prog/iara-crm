// ============================================
// API: /api/auth/google-calendar/disconnect
// ============================================
// Desconecta o Google Agenda, limpando os tokens do banco.
//
// Só o Apple Calendar tinha esse caminho. Sem ele, a única saída era
// reconectar por cima — e quem quisesse parar de sincronizar precisava
// revogar o acesso pelo painel da conta Google, longe daqui.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { profissionalId } = body as { profissionalId?: string }

        // Avisa o Google que o acesso não é mais usado. Sem isso a conexão
        // continua listada na conta da pessoa mesmo depois de desconectada
        // aqui — parece que a IARA ainda tem acesso quando já não tem.
        const alvo = profissionalId
            ? await prisma.profissional.findFirst({
                where: { id: profissionalId, clinicaId },
                select: { googleCalendarToken: true, googleCalendarRefreshToken: true },
            })
            : await prisma.clinica.findUnique({
                where: { id: clinicaId },
                select: { googleCalendarToken: true, googleCalendarRefreshToken: true },
            })

        const paraRevogar = alvo?.googleCalendarRefreshToken || alvo?.googleCalendarToken
        if (paraRevogar) {
            try {
                await fetch('https://oauth2.googleapis.com/revoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ token: paraRevogar }),
                    signal: AbortSignal.timeout(10000),
                })
            } catch {
                // Token já inválido ou Google fora do ar. Limpar daqui é o que
                // importa; deixar o registro para trás seria pior.
            }
        }

        if (profissionalId) {
            await prisma.profissional.updateMany({
                where: { id: profissionalId, clinicaId },
                data: {
                    googleCalendarToken: null,
                    googleCalendarRefreshToken: null,
                    googleCalendarId: null,
                },
            })
        } else {
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: {
                    googleCalendarToken: null,
                    googleCalendarRefreshToken: null,
                    googleCalendarId: null,
                    googleTokenExpires: null,
                },
            })
        }

        return NextResponse.json({ ok: true, message: 'Google Agenda desconectado.' })
    } catch (err) {
        console.error('[Google Calendar disconnect] Erro:', err)
        return NextResponse.json({ error: 'Erro ao desconectar' }, { status: 500 })
    }
}
