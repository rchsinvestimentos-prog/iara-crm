import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/campanhas/[id]/teste — Envia teste para o WhatsApp da dona
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { whatsappDoutora: true, evolutionInstance: true, evolutionApikey: true },
        })

        if (!clinica?.whatsappDoutora || !clinica.evolutionInstance) {
            return NextResponse.json({ error: 'WhatsApp da dona não configurado' }, { status: 400 })
        }

        const campanha = await prisma.campanha.findFirst({
            where: { id: params.id, clinicaId },
        })

        if (!campanha) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
        }

        const apiUrl = process.env.EVOLUTION_API_URL
        const apiKey = clinica.evolutionApikey || process.env.EVOLUTION_API_KEY || ''

        const res = await fetch(`${apiUrl}/message/sendText/${clinica.evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                number: clinica.whatsappDoutora,
                text: `🧪 *TESTE DE CAMPANHA*\n\n${campanha.mensagem}\n\n---\n_Esta é uma prévia. Somente você recebeu._`,
            }),
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'Falha ao enviar teste' }, { status: 500 })
        }

        return NextResponse.json({ ok: true, mensagem: 'Teste enviado para seu WhatsApp!' })
    } catch (err) {
        console.error('Erro POST /api/campanhas/[id]/teste:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
