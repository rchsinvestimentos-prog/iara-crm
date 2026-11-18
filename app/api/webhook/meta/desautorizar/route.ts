// ============================================================================
// Meta → "Remover app" (Deauthorize callback URL)
// URL para cadastrar no app da Meta:
//   https://app.iara.click/api/webhook/meta/desautorizar
// A pessoa removeu o app nas configurações do Facebook: o token dela deixa de
// valer, então a conexão do Instagram é desligada e o token, apagado.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { lerSignedRequest } from '@/lib/meta'
import { apagarConexoesDaMeta } from '@/lib/exclusao-dados'

export async function POST(request: NextRequest) {
    const form = await request.formData().catch(() => null)
    const dados = lerSignedRequest(String(form?.get('signed_request') || '') || null)
    if (!dados) {
        console.warn('[Meta Desautorizar] ❌ signed_request ausente ou inválido')
        return NextResponse.json({ error: 'signed_request inválido' }, { status: 400 })
    }
    try {
        const n = await apagarConexoesDaMeta(dados.userId, 'desativar')
        console.log(`[Meta Desautorizar] usuário ${dados.userId} removeu o app — ${n} conexão(ões) do Instagram desligada(s)`)
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error(`[Meta Desautorizar] ❌ Erro ao desligar as conexões do usuário ${dados.userId}:`, err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
