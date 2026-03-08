import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''

/**
 * Cron de renovação de créditos mensais.
 * Roda 1x por dia — verifica quem tem proxima_renovacao <= hoje.
 * 
 * GET /api/cron/renovacao?secret=XXX
 * 
 * LÓGICA:
 * 1. Busca clínicas com proxima_renovacao <= agora e status = 'ativo'
 * 2. Renova créditos para o valor do plano
 * 3. Atualiza proxima_renovacao pra +30 dias
 * 4. Reseta uso de features do mês
 */
export async function GET(request: NextRequest) {
    // Auth
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const agora = new Date()

        // Buscar clínicas que precisam renovar
        const clinicas = await prisma.clinica.findMany({
            where: {
                status: 'ativo',
                proximaRenovacao: { lte: agora },
            },
            select: {
                id: true,
                nome: true,
                nomeClinica: true,
                nivel: true,
                creditosMensais: true,
                proximaRenovacao: true,
            },
        })

        if (clinicas.length === 0) {
            return NextResponse.json({
                ok: true,
                message: 'Nenhuma clínica precisa renovar hoje.',
                renovadas: 0,
            })
        }

        // Créditos por nível de plano
        const creditosPorNivel: Record<number, number> = {
            1: 1000,
            2: 5000,
            3: 5000,
            4: 10000,
        }

        const resultados: any[] = []

        for (const clinica of clinicas) {
            const nivel = clinica.nivel || 1
            const creditos = creditosPorNivel[nivel] || 1000

            // Renovar créditos
            await prisma.clinica.update({
                where: { id: clinica.id },
                data: {
                    creditosDisponiveis: creditos,
                    proximaRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
                },
            })

            // Resetar uso de features do mês anterior
            const mesAnterior = (() => {
                const d = new Date()
                d.setMonth(d.getMonth() - 1)
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            })()

            await prisma.usoFeature.deleteMany({
                where: {
                    clinicaId: clinica.id,
                    mesAno: mesAnterior,
                },
            })

            resultados.push({
                id: clinica.id,
                nome: clinica.nomeClinica || clinica.nome,
                nivel,
                creditosRenovados: creditos,
            })

            console.log(`[Renovação] ✅ Clínica ${clinica.id} renovada: ${creditos} créditos (P${nivel})`)
        }

        return NextResponse.json({
            ok: true,
            message: `${resultados.length} clínica(s) renovadas.`,
            renovadas: resultados.length,
            detalhes: resultados,
        })

    } catch (err: any) {
        console.error('[Renovação] ❌ Erro:', err)
        return NextResponse.json({
            error: 'Erro na renovação',
            message: err.message,
        }, { status: 500 })
    }
}
