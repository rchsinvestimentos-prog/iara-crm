import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const clinica = await prisma.$queryRaw`
            SELECT id, nome_clinica, whatsapp_doutora, whatsapp_clinica, evolution_instance 
            FROM users WHERE id = 9 LIMIT 1
        ` as any[]
        
        const instancias = await prisma.$queryRaw`
            SELECT id, evolution_instance, status_conexao, ativo 
            FROM instancias_clinica WHERE user_id = 9
        ` as any[]
        
        return NextResponse.json({ 
            clinica: clinica[0] || null, 
            instancias,
            dica: 'O número whatsapp_doutora é o número do dono. Mensagens desse número são tratadas como "a doutora respondendo" e IARA pausa. Teste com OUTRO número.'
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}
