import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/engine/pipeline'
import { resgatarAbandonados } from '@/lib/engine/agrupador'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * GET /api/cron/resgate-mensagens?secret=XXX
 *
 * Rede de segurança do agrupador.
 *
 * A espera de 30 segundos vive na memória do contêiner. Se ele reiniciar no
 * meio dela — e um deploy faz exatamente isso — o relógio some e a paciente
 * fica sem resposta, sem erro nenhum aparecendo.
 *
 * Aqui as mensagens que ficaram paradas além do teto são despachadas assim
 * mesmo. A paciente recebe a resposta atrasada, em vez de nunca.
 *
 * Frequência: a cada 1 minuto.
 * URL no cron-job.org: https://app.iara.click/api/cron/resgate-mensagens?secret=SEU_SECRET
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const resgatadas = await resgatarAbandonados(m => {
            processMessage(m).catch(err =>
                console.error('[Resgate] Erro no pipeline:', err)
            )
        })
        return NextResponse.json({ ok: true, conversasResgatadas: resgatadas })
    } catch (err: any) {
        console.error('[Resgate] ❌ Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
