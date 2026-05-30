// ============================================
// API: /api/auth/apple-calendar
// ============================================
// Conecta o Apple Calendar da profissional via CalDAV.
// Recebe Apple ID + App-Specific Password, valida, e salva no DB.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { connectAppleCalendar } from '@/lib/apple-calendar'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { email, appPassword, profissionalId } = body

        if (!email || !appPassword) {
            return NextResponse.json(
                { error: 'Apple ID (email) e Senha de App são obrigatórios.' },
                { status: 400 }
            )
        }

        // Validar credenciais via CalDAV
        const result = await connectAppleCalendar(email, appPassword)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Não foi possível conectar ao Apple Calendar.' },
                { status: 400 }
            )
        }

        // Usar o primeiro calendário disponível (ou o selecionado)
        const calendarUrl = result.calendars[0]?.url || ''

        if (profissionalId) {
            // Multi-profissional: salvar no profissional específico
            await prisma.profissional.update({
                where: { id: profissionalId, clinicaId },
                data: {
                    appleCalendarEmail: email,
                    appleCalendarPassword: appPassword,
                    appleCalendarUrl: calendarUrl,
                    calendarProvider: 'apple',
                },
            })
        } else {
            // Single-profissional: salvar na clínica (User)
            await prisma.user.update({
                where: { id: clinicaId },
                data: {
                    appleCalendarEmail: email,
                    appleCalendarPassword: appPassword,
                    appleCalendarUrl: calendarUrl,
                    calendarProvider: 'apple',
                },
            })
        }

        console.log(`[AppleCalendar] ✅ Conectado para clínica ${clinicaId}`)

        return NextResponse.json({
            success: true,
            calendars: result.calendars,
            message: 'Apple Calendar conectado com sucesso!',
        })

    } catch (err: any) {
        console.error('[AppleCalendar] Erro na API:', err)
        return NextResponse.json(
            { error: 'Erro interno ao conectar Apple Calendar.' },
            { status: 500 }
        )
    }
}
