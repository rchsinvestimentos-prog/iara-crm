import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { getStatsReais, getConversasRecentes, getClinicaData } from '@/lib/n8n-queries'

// GET /api/stats — Dashboard KPIs (dados reais unificados)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Buscar dados da clínica (agora tudo na mesma tabela)
        const clinicaData = await getClinicaData(clinicaId)

        if (!clinicaData) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Buscar stats reais (clinicaId = users.id diretamente)
        const [stats, conversas] = await Promise.all([
            getStatsReais(clinicaId),
            getConversasRecentes(clinicaId, 5),
        ])

        return NextResponse.json({
            ...stats,
            creditosRestantes: clinicaData.creditos_disponiveis,
            plano: clinicaData.nivel,
            nomeClinica: clinicaData.nome_clinica,
            nomeIA: clinicaData.nome_assistente,
            conversasRecentes: conversas,
            fonte: 'unificado',
        })
    } catch (err) {
        console.error('Erro em /api/stats:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
