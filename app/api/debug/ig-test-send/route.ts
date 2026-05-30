// Testa envio de DM do Instagram diretamente
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    const results: any = { timestamp: new Date().toISOString() }
    
    try {
        // Buscar config
        const configs = await prisma.$queryRawUnsafe<any[]>('SELECT * FROM config_instagram WHERE ativo = true LIMIT 1')
        if (configs.length === 0) return NextResponse.json({ error: 'Sem config' })
        const config = configs[0]
        const userToken = config.meta_access_token
        
        results.user_token_len = userToken?.length || 0
        
        // 1. Buscar Page Token
        const ptRes = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}?fields=access_token&access_token=${userToken}`)
        const ptData = await ptRes.json()
        const pageToken = ptData.access_token || ''
        results.page_token_len = pageToken.length
        results.page_token_error = ptData.error || null
        
        if (!pageToken) {
            results.fatal = 'Sem page token'
            return NextResponse.json(results)
        }

        // 2. Buscar ultimo sender real
        const msgs = await prisma.$queryRawUnsafe<any[]>(
            `SELECT ig_sender_id FROM mensagens_instagram WHERE direcao = 'entrada' AND ig_sender_id != '999999TEST' ORDER BY created_at DESC LIMIT 1`
        )
        const senderId = msgs[0]?.ig_sender_id || '1494323445507172'
        results.sender_id = senderId

        // 3. Tentar enviar via page_id
        const sendRes = await fetch(`https://graph.facebook.com/v22.0/${config.page_id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: 'Teste direto da IARA! 🤖' },
                messaging_type: 'RESPONSE',
                access_token: pageToken,
            }),
        })
        const sendText = await sendRes.text()
        results.send_page = { status: sendRes.status, body: sendText }
        
        // 4. Se falhou, tentar via ig_account_id 
        if (!sendRes.ok) {
            const sendRes2 = await fetch(`https://graph.facebook.com/v22.0/${config.ig_account_id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: 'Teste 2 IARA! 🤖' },
                    messaging_type: 'RESPONSE',
                    access_token: pageToken,
                }),
            })
            const sendText2 = await sendRes2.text()
            results.send_ig = { status: sendRes2.status, body: sendText2 }
        }

    } catch (e: any) {
        results.error = e.message
    }

    return NextResponse.json(results)
}
