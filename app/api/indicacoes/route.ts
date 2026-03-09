import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/indicacoes
 * 
 * Retorna o programa de indicação da clínica:
 * - Código de indicação único
 * - Lista de indicadas ativas
 * - Saldo acumulado
 * - Histórico de saques
 * 
 * Comissão: 10% do plano mensal da indicada, enquanto ela estiver ativa.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: {
                configuracoes: true,
                nome: true,
                email: true,
            },
        })

        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        // Gerar código de indicação se não existe
        let codigoIndicacao = (clinica as any).codigoIndicacao
        if (!codigoIndicacao) {
            codigoIndicacao = `IARA-${String(clinicaId).padStart(4, '0')}`
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { codigoIndicacao } as any,
            }).catch(() => {
                // Campo pode não existir ainda
                codigoIndicacao = `IARA-${String(clinicaId).padStart(4, '0')}`
            })
        }

        // Buscar indicadas (clínicas que usaram o código desta)
        let indicadas: any[] = []
        try {
            indicadas = await prisma.clinica.findMany({
                where: { indicadaPor: clinicaId } as any,
                select: {
                    id: true,
                    nomeClinica: true,
                    status: true,
                    nivel: true,
                    plano: true,
                    createdAt: true,
                    creditosMensais: true,
                },
            })
        } catch { /* campo indicadaPor pode não existir */ }

        // Calcular comissão baseada nos planos das indicadas ativas
        const PRECOS: Record<string, number> = {
            secretaria: 197,
            estrategista: 397,
            designer: 697,
            audiovisual: 997,
        }

        const config = (clinica.configuracoes as any) || {}
        const saques = config.saques || []

        let comissaoMensal = 0
        const indicadasComComissao = indicadas.map(ind => {
            const precoMensal = PRECOS[ind.plano || 'secretaria'] || 197
            const comissao = ind.status === 'ativo' ? Math.round(precoMensal * 0.10) : 0
            comissaoMensal += comissao
            return {
                ...ind,
                precoMensal,
                comissao,
            }
        })

        // Saldo: comissão acumulada - saques realizados
        const totalSaques = saques
            .filter((s: any) => s.status === 'pago')
            .reduce((acc: number, s: any) => acc + (s.valor || 0), 0)

        // Estimar saldo acumulado (simplificado: indicadas ativas × meses)
        const saldoEstimado = config.saldoIndicacao || 0

        return NextResponse.json({
            codigoIndicacao,
            linkIndicacao: `https://app.iara.click/indicacao/${codigoIndicacao}`,
            totalIndicadas: indicadas.length,
            indicadasAtivas: indicadas.filter(i => i.status === 'ativo').length,
            comissaoMensal,
            saldoDisponivel: Math.max(0, saldoEstimado - totalSaques),
            totalSaques,
            indicadas: indicadasComComissao,
            saques,
        })
    } catch (err: any) {
        console.error('[Indicações] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * POST /api/indicacoes
 * 
 * Ações:
 * - { acao: 'solicitar_saque', valor: number, pix: string }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()

        if (body.acao === 'solicitar_saque') {
            const { valor, pix } = body
            if (!valor || valor < 50) {
                return NextResponse.json({ error: 'Valor mínimo para saque: R$ 50' }, { status: 400 })
            }
            if (!pix?.trim()) {
                return NextResponse.json({ error: 'Chave Pix obrigatória' }, { status: 400 })
            }

            const clinica = await prisma.clinica.findUnique({
                where: { id: clinicaId },
                select: { configuracoes: true },
            })

            const config = (clinica?.configuracoes as any) || {}
            const saques = config.saques || []
            const saldoDisponivel = (config.saldoIndicacao || 0) - saques
                .filter((s: any) => s.status === 'pago' || s.status === 'pendente')
                .reduce((acc: number, s: any) => acc + (s.valor || 0), 0)

            if (valor > saldoDisponivel) {
                return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
            }

            saques.push({
                id: `SAQ-${Date.now()}`,
                valor,
                pix: pix.trim(),
                status: 'pendente',
                solicitadoEm: new Date().toISOString(),
            })

            await prisma.clinica.update({
                where: { id: clinicaId },
                data: {
                    configuracoes: { ...config, saques },
                },
            })

            console.log(`[Indicações] 💰 Saque solicitado: R$ ${valor} (Clínica ${clinicaId}, Pix: ${pix})`)

            return NextResponse.json({ ok: true, message: 'Saque solicitado! Processaremos em até 3 dias úteis.' })
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    } catch (err: any) {
        console.error('[Indicações] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
