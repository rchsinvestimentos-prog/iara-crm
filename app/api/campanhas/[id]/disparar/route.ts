import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/campanhas/[id]/disparar — Inicia envio dos messages da campanha
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true, evolutionInstance: true, evolutionApikey: true },
        })
        if (!clinica || clinica.nivel < 4) {
            return NextResponse.json({ error: 'Recurso exclusivo do Plano 4' }, { status: 403 })
        }

        const campanha = await prisma.campanha.findFirst({
            where: { id: params.id, clinicaId },
            include: { envios: { where: { status: 'pendente' } } },
        })

        if (!campanha) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
        }

        if (!clinica.evolutionInstance) {
            return NextResponse.json({ error: 'WhatsApp não configurado' }, { status: 400 })
        }

        // Marcar campanha como enviando
        await prisma.campanha.update({
            where: { id: params.id },
            data: { status: 'enviando' },
        })

        const apiUrl = process.env.EVOLUTION_API_URL
        const apiKey = clinica.evolutionApikey || process.env.EVOLUTION_API_KEY || ''
        const instanceName = clinica.evolutionInstance
        let enviados = 0
        let erros = 0

        // Enviar cada mensagem com delay anti-spam
        for (const envio of campanha.envios) {
            try {
                const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({
                        number: envio.telefone,
                        text: campanha.mensagem,
                    }),
                })

                if (res.ok) {
                    await prisma.campanhaEnvio.update({
                        where: { id: envio.id },
                        data: { status: 'enviado', enviadoEm: new Date() },
                    })
                    enviados++
                } else {
                    await prisma.campanhaEnvio.update({
                        where: { id: envio.id },
                        data: { status: 'erro' },
                    })
                    erros++
                }
            } catch {
                await prisma.campanhaEnvio.update({
                    where: { id: envio.id },
                    data: { status: 'erro' },
                })
                erros++
            }

            // Delay anti-spam: 5-15 segundos entre envios
            const delay = Math.floor(Math.random() * 10000) + 5000
            await new Promise(resolve => setTimeout(resolve, delay))
        }

        // Marcar campanha como concluída
        await prisma.campanha.update({
            where: { id: params.id },
            data: { status: 'concluida', totalEnvios: enviados, totalErros: erros },
        })

        return NextResponse.json({ ok: true, enviados, erros })
    } catch (err) {
        console.error('Erro POST /api/campanhas/[id]/disparar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
