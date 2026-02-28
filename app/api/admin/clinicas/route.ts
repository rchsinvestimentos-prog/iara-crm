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

        // Buscar todas as clínicas
        const clinicas = await prisma.clinica.findMany({
            select: {
                id: true,
                nome: true,
                nomeClinica: true,
                email: true,
                nomeAssistente: true,
                plano: true,
                nivel: true,
                status: true,
                creditosMensais: true,
                creditosDisponiveis: true,
                whatsappClinica: true,
                whatsappDoutora: true,
                whatsappStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        const result = clinicas.map((c: typeof clinicas[number]) => ({
            id: c.id,
            nome_clinica: c.nomeClinica || c.nome,
            email: c.email,
            nomeIA: c.nomeAssistente,
            plano: c.plano,
            nivel: c.nivel,
            status: c.status,
            whatsapp_clinica: c.whatsappClinica,
            whatsapp_status: c.whatsappStatus,
            creditos_restantes: c.creditosDisponiveis ?? 0,
            creditos_total: c.creditosMensais ?? 0,
            pct_credito: (c.creditosMensais ?? 0) > 0
                ? Math.round(((c.creditosDisponiveis ?? 0) / (c.creditosMensais ?? 1)) * 100)
                : 100,
            total_conversas: 0,
            total_agendamentos: 0,
            total_procedimentos: 0,
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
