// API — Receber solicitação de exclusão de dados (formulário público)
// POST /api/legal/exclusao
//
// Antes esta rota ficava atrás do login (o formulário é público, então o
// pedido nunca chegava) e só escrevia no log. Agora o pedido é gravado, o
// suporte recebe um e-mail e a pessoa recebe um código.

import { NextRequest, NextResponse } from 'next/server'
import { registrarPedidoExclusao } from '@/lib/exclusao-dados'

const corta = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Rota pública: sem limite, um script enchia a tabela e a caixa do suporte.
// 5 pedidos por IP por hora bastam para gente de verdade.
const LIMITE_POR_HORA = 5
const tentativas: Map<string, number[]> = ((globalThis as any).__exclusaoTentativas ??= new Map<string, number[]>())

function passouDoLimite(chave: string): boolean {
    const agora = Date.now()
    const recentes = (tentativas.get(chave) || []).filter(t => agora - t < 60 * 60 * 1000)
    recentes.push(agora)
    tentativas.set(chave, recentes)
    if (tentativas.size > 10000) tentativas.clear()
    return recentes.length > LIMITE_POR_HORA
}

export async function POST(request: NextRequest) {
    try {
        const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || request.headers.get('x-real-ip') || 'sem-ip'
        if (passouDoLimite(ip)) {
            console.warn(`[Legal] ⚠️ Muitos pedidos de exclusão do IP ${ip} — recusado`)
            return NextResponse.json({ error: 'Muitos pedidos em pouco tempo. Tente de novo mais tarde ou escreva para suporte@iara.click.' }, { status: 429 })
        }

        const body = await request.json().catch(() => ({}))
        const email = corta(body.email, 255)
        const telefone = corta(body.telefone, 40)
        const motivo = corta(body.motivo, 2000)

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
        }

        const codigo = await registrarPedidoExclusao({ origem: 'formulario', email, telefone, motivo })
        console.log(`[Legal] 🗑️ Pedido de exclusão ${codigo} recebido`)
        return NextResponse.json({ ok: true, codigo })
    } catch (err) {
        console.error('[Legal] ❌ Não consegui gravar o pedido de exclusão:', err)
        return NextResponse.json({ error: 'Não conseguimos registrar o pedido agora. Tente de novo ou escreva para suporte@iara.click.' }, { status: 500 })
    }
}
