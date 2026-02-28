import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { getGraficoMensagens } from '@/lib/n8n-queries'

// GET /api/stats/grafico?dias=30 — Dados para Recharts
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dias = Math.min(Number(searchParams.get('dias') || 30), 90)

        // clinicaId = users.id diretamente (sem bridge)
        const dados = await getGraficoMensagens(clinicaId, dias)

        return NextResponse.json({ dados, fonte: 'unificado' })
    } catch (err) {
        console.error('Erro em /api/stats/grafico:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
