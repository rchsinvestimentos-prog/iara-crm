// ============================================
// API: /api/auth/apple-calendar/disconnect
// ============================================
// Desconecta o Apple Calendar, limpando credenciais do DB.

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

        if (profissionalId) {
            await prisma.profissional.update({
                where: { id: profissionalId, clinicaId },
                data: {
                    appleCalendarEmail: null,
                    appleCalendarPassword: null,
                    appleCalendarUrl: null,
                    calendarProvider: 'google',
                },
            })
        } else {
            await prisma.user.update({
                where: { id: clinicaId },
                data: {
                    appleCalendarEmail: null,
                    appleCalendarPassword: null,
                    appleCalendarUrl: null,
                    calendarProvider: 'google',
                },
            })
        }

        console.log(`[AppleCalendar] 🔌 Desconectado para clínica ${clinicaId}`)

        return NextResponse.json({
            success: true,
            message: 'Apple Calendar desconectado.',
        })

    } catch (err: any) {
        console.error('[AppleCalendar] Erro ao desconectar:', err)
        return NextResponse.json(
            { error: 'Erro interno ao desconectar.' },
            { status: 500 }
        )
    }
}
