import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * POST /api/templates/enviar
 * Send a template message to selected contacts via WhatsApp.
 * Body: { mensagem: string, contatos: string[] (phone numbers) }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { evolutionInstance: true, evolutionApikey: true },
        })

        if (!clinica?.evolutionInstance) {
            return NextResponse.json({ error: 'WhatsApp não conectado' }, { status: 400 })
        }

        const body = await request.json()
        const { mensagem, contatos } = body

        if (!mensagem || !contatos?.length) {
            return NextResponse.json({ error: 'Mensagem e contatos são obrigatórios' }, { status: 400 })
        }

        const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY
        let enviados = 0
        let erros = 0

        for (const telefone of contatos) {
            try {
                const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${clinica.evolutionInstance}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ number: telefone.replace(/\D/g, ''), text: mensagem }),
                })
                if (res.ok) enviados++
                else erros++
            } catch { erros++ }

            // Rate limit: 1 msg per 500ms
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        return NextResponse.json({ ok: true, enviados, erros })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
