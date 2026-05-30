import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Debug WhatsApp connection
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const evoUrl = process.env.EVOLUTION_API_URL
    const evoKey = process.env.EVOLUTION_API_KEY

    const result: any = {
        hasEvoUrl: !!evoUrl,
        hasEvoKey: !!evoKey,
        evoUrlPreview: evoUrl ? evoUrl.slice(0, 30) + '...' : 'NOT SET',
        evoKeyPreview: evoKey ? evoKey.slice(0, 5) + '***' : 'NOT SET',
    }

    // Listar instâncias na Evolution API
    if (evoUrl && evoKey) {
        try {
            const res = await fetch(`${evoUrl}/instance/fetchInstances`, {
                headers: { 'apikey': evoKey },
            })
            const data = await res.json()
            result.instances = Array.isArray(data)
                ? data.map((i: any) => ({
                    name: i.instance?.instanceName || i.instanceName,
                    state: i.instance?.state || i.state,
                    owner: i.instance?.owner || i.owner,
                }))
                : data
            result.instanceCount = Array.isArray(data) ? data.length : 'not_array'
        } catch (err: any) {
            result.fetchError = err.message
        }
    }

    // Clinicas com evolutionInstance
    const clinicas = await prisma.clinica.findMany({
        where: { evolutionInstance: { not: null } },
        select: { id: true, email: true, evolutionInstance: true },
    })
    result.clinicasComInstancia = clinicas

    return NextResponse.json(result)
}
