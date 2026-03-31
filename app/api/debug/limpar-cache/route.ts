// DEBUG: Limpar cache de respostas da IA
// Útil quando muda nome da assistente, configurações, procedimentos
// POST /api/debug/limpar-cache → limpa o cache da clínica autenticada
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Deletar todos os caches desta clínica (expira agora = inválidos)
        const result = await prisma.$executeRaw`
            DELETE FROM cache_respostas WHERE user_id = ${clinicaId}
        `

        return NextResponse.json({
            ok: true,
            mensagem: `✅ Cache limpo com sucesso! ${result} entradas removidas. A IARA vai usar suas configurações atuais nas próximas respostas.`,
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

// GET — para diagnóstico (quantas entradas no cache)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const count = await prisma.$queryRaw`
            SELECT COUNT(*)::int as total, 
                   COUNT(CASE WHEN expires_at > NOW() THEN 1 END)::int as ativos
            FROM cache_respostas 
            WHERE user_id = ${clinicaId}
        ` as any[]

        return NextResponse.json({
            total: count[0]?.total || 0,
            ativos: count[0]?.ativos || 0,
            dica: 'Use POST neste endpoint para limpar o cache quando mudar nome, procedimentos ou configurações.',
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
