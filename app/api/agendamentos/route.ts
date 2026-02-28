import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { getAgendamentosReais } from '@/lib/n8n-queries'

// GET /api/agendamentos — Próximos agendamentos reais
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // clinicaId = users.id diretamente (sem bridge)
        const agendamentos = await getAgendamentosReais(clinicaId, 10)
        return NextResponse.json({ agendamentos, fonte: 'unificado' })
    } catch (err) {
        console.error('Erro em /api/agendamentos:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
