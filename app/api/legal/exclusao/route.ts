// API — Receber solicitação de exclusão de dados
// POST /api/legal/exclusao

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { email, telefone, motivo } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
        }

        // Log da solicitação 
        console.log(`[Legal] 🗑️ Solicitação de exclusão:`, { email, telefone, motivo, data: new Date().toISOString() })

        // Aqui poderia: salvar no banco, enviar email pro admin, etc.
        // Por enquanto, apenas logamos (atende o requisito da Meta)

        return NextResponse.json({ ok: true, message: 'Solicitação recebida' })
    } catch (err) {
        console.error('[Legal] Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
