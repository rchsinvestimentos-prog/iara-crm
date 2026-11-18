// ============================================================================
// Meta → pedido de exclusão de dados (Data deletion request URL)
// URL para cadastrar no app da Meta:
//   https://app.iara.click/api/webhook/meta/exclusao-de-dados
// Apaga a conexão da Meta desse usuário e responde no formato que a Meta pede:
// { url, confirmation_code } — a url mostra o código para a pessoa acompanhar.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { lerSignedRequest } from '@/lib/meta'
import { apagarConexoesDaMeta, registrarPedidoExclusao } from '@/lib/exclusao-dados'

export async function POST(request: NextRequest) {
    const form = await request.formData().catch(() => null)
    const dados = lerSignedRequest(String(form?.get('signed_request') || '') || null)
    if (!dados) {
        console.warn('[Meta Exclusão] ❌ signed_request ausente ou inválido')
        return NextResponse.json({ error: 'signed_request inválido' }, { status: 400 })
    }
    try {
        const apagados = await apagarConexoesDaMeta(dados.userId, 'apagar')
        const codigo = await registrarPedidoExclusao({ origem: 'meta', metaUserId: dados.userId, registrosAfetados: apagados })
        const base = process.env.NEXTAUTH_URL || 'https://app.iara.click'
        console.log(`[Meta Exclusão] usuário ${dados.userId}: ${apagados} conexão(ões) apagada(s), código ${codigo}`)
        return NextResponse.json({
            url: `${base}/legal/exclusao-de-dados?codigo=${codigo}`,
            confirmation_code: codigo,
        })
    } catch (err) {
        console.error(`[Meta Exclusão] ❌ Erro ao apagar os dados do usuário ${dados.userId}:`, err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
