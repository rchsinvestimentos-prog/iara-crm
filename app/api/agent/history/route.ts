// ============================================
// API — Histórico de Conversa com a IARA
// ============================================
// GET /api/agent/history
// Retorna o histórico de conversas Dra ↔ IARA.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDraHistory } from '@/lib/agent/dra-memory'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Verificar plano
        const clinica = await prisma.clinica.findUnique({ 
            where: { id: clinicaId }, 
            select: { nivel: true } 
        })
        if ((clinica?.nivel ?? 1) < 3) {
            return NextResponse.json({ error: 'Recurso exclusivo do plano Estrategista', upgrade: true }, { status: 403 })
        }

        const history = await getDraHistory(clinicaId, 100)

        // Inverter para ordem cronológica (mais antigo primeiro)
        const chronological = history.reverse()

        return NextResponse.json({ ok: true, messages: chronological })
    } catch (err) {
        console.error('[API/Agent/History]', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
