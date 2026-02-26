import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { getN8NUserId, getGraficoMensagens } from '@/lib/n8n-queries'

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

        const n8nUserId = await getN8NUserId(clinicaId)

        if (!n8nUserId) {
            return NextResponse.json({ dados: [], fonte: 'vazio' })
        }

        const dados = await getGraficoMensagens(n8nUserId, dias)

        return NextResponse.json({ dados, fonte: 'n8n' })
    } catch (err) {
        console.error('Erro em /api/stats/grafico:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
