import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/clinicas — Todas as clínicas (admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Verificar se é admin
        const user = await prisma.clinica.findUnique({
            where: { email: session.user.email },
        })

        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Buscar todas as clínicas com stats
        const clinicas = await prisma.clinica.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                nomeIA: true,
                plano: true,
                status: true,
                creditosTotal: true,
                creditosUsados: true,
                whatsappClinica: true,
                whatsappPessoal: true,
                whatsappStatus: true,
                createdAt: true,
                _count: {
                    select: {
                        conversas: true,
                        agendamentos: true,
                        procedimentos: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        })

        const result = clinicas.map(c => ({
            id: c.id,
            nome_clinica: c.nome,
            email: c.email,
            nomeIA: c.nomeIA,
            plano: c.plano,
            status: c.status,
            whatsapp_pessoal: c.whatsappPessoal,
            whatsapp_status: c.whatsappStatus,
            creditos_restantes: c.creditosTotal - c.creditosUsados,
            creditos_total: c.creditosTotal,
            pct_credito: c.creditosTotal > 0
                ? Math.round(((c.creditosTotal - c.creditosUsados) / c.creditosTotal) * 100)
                : 100,
            total_conversas: c._count.conversas,
            total_agendamentos: c._count.agendamentos,
            total_procedimentos: c._count.procedimentos,
            msgs_24h: 0,
            agenda_7dias: 0,
            criado_em: c.createdAt,
        }))

        return NextResponse.json({ clinicas: result })
    } catch (err) {
        console.error('Erro em /api/admin/clinicas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
