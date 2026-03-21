import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/debug/profissional-token — verificar se colunas existem e token está salvo
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const secret = url.searchParams.get('s')
        if (secret !== 'iara2026debug') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // 1) Verificar se as colunas existem
        const cols = await prisma.$queryRawUnsafe<any[]>(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'profissionais' 
            AND column_name IN ('magic_token', 'magic_token_expires', 'email', 'senha_hash')
            ORDER BY column_name
        `)

        // 2) Listar profissionais com token
        let profissionais: any[] = []
        try {
            profissionais = await prisma.$queryRawUnsafe<any[]>(`
                SELECT id, nome, email, 
                    CASE WHEN magic_token IS NOT NULL THEN LEFT(magic_token, 8) || '...' ELSE NULL END as token_prefix,
                    magic_token_expires,
                    CASE WHEN magic_token_expires >= NOW() THEN 'VÁLIDO' ELSE 'EXPIRADO' END as status,
                    senha_hash IS NOT NULL as tem_senha,
                    ativo
                FROM profissionais 
                ORDER BY created_at DESC 
                LIMIT 10
            `)
        } catch (queryErr: any) {
            profissionais = [{ error: queryErr.message }]
        }

        return NextResponse.json({
            colunas_existentes: cols.map((c: any) => `${c.column_name} (${c.data_type})`),
            colunas_faltando: ['magic_token', 'magic_token_expires', 'email', 'senha_hash']
                .filter(c => !cols.find((col: any) => col.column_name === c)),
            profissionais,
            agora: new Date().toISOString(),
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack?.split('\n').slice(0, 5) }, { status: 500 })
    }
}
