import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkFeature, getLimite, incrementFeature } from '@/lib/feature-limits'

// GET /api/campanhas — Lista campanhas
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const campanhas = await prisma.campanha.findMany({
            where: { clinicaId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { envios: true } } },
        })

        // Retornar info de limite junto
        const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId }, select: { nivel: true } })
        const nivel = clinica?.nivel ?? 1
        const featureCheck = await checkFeature(clinicaId, nivel, 'campanhaContatos')

        return NextResponse.json({ campanhas, limites: featureCheck })
    } catch (err) {
        console.error('Erro GET /api/campanhas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/campanhas — Criar campanha
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true },
        })
        const nivel = clinica?.nivel ?? 1

        const { nome, mensagem, filtroEtapa } = await request.json()

        if (!nome || !mensagem) {
            return NextResponse.json({ error: 'Nome e mensagem são obrigatórios' }, { status: 400 })
        }

        // Verificar limite de contatos para campanhas
        const limiteContatos = getLimite(nivel, 'campanhaContatos')
        const featureCheck = await checkFeature(clinicaId, nivel, 'campanhaContatos')

        // Buscar contatos que vão receber
        const whereContatos: Record<string, unknown> = { clinicaId }
        if (filtroEtapa) whereContatos.etapa = filtroEtapa

        let contatos = await prisma.contato.findMany({
            where: whereContatos as any,
            select: { telefone: true, nome: true },
        })

        if (contatos.length === 0) {
            return NextResponse.json({ error: 'Nenhum contato encontrado para esta etapa' }, { status: 400 })
        }

        // Aplicar limite: se não é ilimitado, cortar a lista
        let limitado = false
        if (!featureCheck.ilimitado) {
            const restante = featureCheck.restante
            if (restante <= 0) {
                return NextResponse.json({
                    error: `Você já usou seus ${featureCheck.limite} envios de campanha este mês. Faça upgrade para enviar mais!`,
                    upgrade: true,
                }, { status: 403 })
            }
            if (contatos.length > restante) {
                contatos = contatos.slice(0, restante)
                limitado = true
            }
        }

        // Criar campanha + envios
        const campanha = await prisma.campanha.create({
            data: {
                clinicaId,
                nome,
                mensagem,
                filtroEtapa,
                envios: {
                    create: contatos.map(c => ({
                        telefone: c.telefone,
                        nome: c.nome,
                    })),
                },
            },
            include: { _count: { select: { envios: true } } },
        })

        // Incrementar uso
        await incrementFeature(clinicaId, 'campanhaContatos', contatos.length)

        return NextResponse.json({
            ok: true,
            campanha,
            limitado,
            mensagemLimite: limitado
                ? `Seu plano permite ${limiteContatos} envios/mês. A campanha foi criada com ${contatos.length} contatos. Faça upgrade para enviar para todos!`
                : undefined,
        })
    } catch (err) {
        console.error('Erro POST /api/campanhas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
