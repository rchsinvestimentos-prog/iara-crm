// ============================================
// API — Chat com a IARA (Painel)
// ============================================
// POST /api/agent/chat
// Envia mensagem da Dra via painel e recebe resposta da IARA.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processaDraMensagem } from '@/lib/agent/dra-agent'
import type { DadosClinica } from '@/lib/engine/types'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Verificar plano (exclusivo nível 3+)
        const clinica = await prisma.clinica.findUnique({ where: { id: clinicaId } })
        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        if ((clinica.nivel ?? 1) < 3) {
            return NextResponse.json({ 
                error: 'Esse recurso é exclusivo do plano Estrategista. Faça upgrade para conversar com a IARA! 🚀',
                upgrade: true 
            }, { status: 403 })
        }

        const { mensagem } = await request.json()
        if (!mensagem || typeof mensagem !== 'string') {
            return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 })
        }

        // Processar com o Agent
        const resposta = await processaDraMensagem(
            clinica as unknown as DadosClinica,
            mensagem,
            'painel'
        )

        return NextResponse.json({
            ok: true,
            resposta: resposta.texto,
            intent: resposta.intent.tipo,
            toolsExecuted: resposta.toolsExecuted,
        })

    } catch (err: any) {
        console.error('[API/Agent/Chat]', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
