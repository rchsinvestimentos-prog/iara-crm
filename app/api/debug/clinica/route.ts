import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const secret = searchParams.get('s')
        
        if (secret !== 'iara2026debug') {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const clinicas = await prisma.$queryRaw`
            SELECT id, nome_clinica, email, whatsapp_doutora, whatsapp_clinica, evolution_instance 
            FROM users ORDER BY id ASC
        ` as any[]
        
        const instancias = await prisma.$queryRaw`
            SELECT id, user_id, evolution_instance, status_conexao, ativo 
            FROM instancias_clinica ORDER BY user_id ASC, id ASC
        ` as any[]
        
        return NextResponse.json({ 
            clinicas, 
            instancias,
            dica: 'O número whatsapp_doutora é o número do dono. Mensagens desse número são tratadas como "a doutora respondendo" e IARA pausa. Teste com OUTRO número.'
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}

