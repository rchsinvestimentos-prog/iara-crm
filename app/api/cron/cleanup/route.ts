import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Cron de limpeza automática.
 * Roda 1x por dia — remove dados antigos pra manter performance.
 * 
 * GET /api/cron/cleanup?secret=XXX
 * 
 * LÓGICA:
 * 1. Remove histórico de conversas > 90 dias
 * 2. Remove logs antigos > 30 dias
 * 3. Remove uso_features de meses passados (> 3 meses)
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const resultados: any = {}

        // 1. Histórico de conversas > 90 dias
        try {
            const limite90dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
            const r = await prisma.$executeRaw`
                DELETE FROM historico_conversas 
                WHERE created_at < ${limite90dias}::timestamp
            `
            resultados.historicoRemovido = r
        } catch { resultados.historicoRemovido = 'tabela não encontrada' }

        // 2. Uso de features > 3 meses
        try {
            const agora = new Date()
            const tresMesesAtras = new Date(agora.getFullYear(), agora.getMonth() - 3, 1)
            const mesLimite = `${tresMesesAtras.getFullYear()}-${String(tresMesesAtras.getMonth() + 1).padStart(2, '0')}`

            const r = await prisma.usoFeature.deleteMany({
                where: { mesAno: { lt: mesLimite } },
            })
            resultados.usoFeaturesRemovido = r.count
        } catch { resultados.usoFeaturesRemovido = 'erro' }

        // 3. Agendamentos cancelados > 60 dias
        try {
            const limite60dias = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
            const r = await prisma.$executeRaw`
                DELETE FROM agendamentos_v2 
                WHERE status = 'cancelado' 
                  AND created_at < ${limite60dias}::timestamp
            `
            resultados.agendamentosCancelados = r
        } catch { resultados.agendamentosCancelados = 'tabela não encontrada' }

        console.log('[Cleanup] ✅ Limpeza concluída:', resultados)

        return NextResponse.json({
            ok: true,
            message: 'Limpeza automática concluída',
            resultados,
        })

    } catch (err: any) {
        console.error('[Cleanup] ❌ Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
