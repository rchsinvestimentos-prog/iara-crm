import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/disclaimer
 * 
 * Salva o aceite do disclaimer de pós-procedimento.
 * A Dra aceita que é responsável técnica pelas orientações cadastradas.
 * 
 * Body: { 
 *   tipo: 'pos_procedimento' | 'termos_uso',
 *   nomeCompleto: string,
 *   registroProfissional?: string (CRM/CREFITO)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { tipo, nomeCompleto, registroProfissional } = body

        if (!tipo || !nomeCompleto?.trim()) {
            return NextResponse.json({ error: 'Tipo e nome são obrigatórios' }, { status: 400 })
        }

        // Obter IP do request
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'

        // Salvar disclaimer no campo configuracoes da clínica
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })

        const config = (clinica?.configuracoes as any) || {}
        const disclaimers = config.disclaimers || []

        disclaimers.push({
            tipo,
            nomeCompleto: nomeCompleto.trim(),
            registroProfissional: registroProfissional?.trim() || null,
            ip,
            aceitoEm: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || 'unknown',
        })

        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                configuracoes: {
                    ...config,
                    disclaimers,
                    // Marcar aceite dos termos
                    ...(tipo === 'termos_uso' ? { termosAceitos: true, termosAceitosEm: new Date().toISOString() } : {}),
                    ...(tipo === 'pos_procedimento' ? { disclaimerPosAceito: true, disclaimerPosAceitoEm: new Date().toISOString() } : {}),
                },
            },
        })

        console.log(`[Disclaimer] ✅ ${tipo} aceito por "${nomeCompleto}" (Clínica ${clinicaId}, IP: ${ip})`)

        return NextResponse.json({ ok: true, tipo })
    } catch (err: any) {
        console.error('[Disclaimer] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * GET /api/disclaimer
 * 
 * Retorna status dos disclaimers da clínica.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })

        const config = (clinica?.configuracoes as any) || {}

        return NextResponse.json({
            termosAceitos: config.termosAceitos || false,
            termosAceitosEm: config.termosAceitosEm || null,
            disclaimerPosAceito: config.disclaimerPosAceito || false,
            disclaimerPosAceitoEm: config.disclaimerPosAceitoEm || null,
            totalDisclaimers: (config.disclaimers || []).length,
        })
    } catch (err: any) {
        console.error('[Disclaimer] Erro GET:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
