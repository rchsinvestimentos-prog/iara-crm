import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// ⚠️  ROTA TEMPORÁRIA DE SETUP — REMOVER APÓS USO
// Cria o usuário admin inicial do sistema
// Acessar: GET /api/setup?key=setup-iara-2026

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key !== 'setup-iara-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const email = 'rafael@iara.click'
        const senha = 'iara2026'
        const senhaHash = await bcrypt.hash(senha, 12)

        const clinica = await prisma.clinica.upsert({
            where: { email },
            update: {
                senha: senhaHash,
                role: 'admin',
                nome: 'Rafael Rocha',
                nomeDoutora: 'Rafael',
                plano: 3,
                creditosTotal: 9999,
                status: 'ativo',
            },
            create: {
                nome: 'Rafael Rocha',
                email,
                senha: senhaHash,
                role: 'admin',
                nomeDoutora: 'Rafael',
                nomeIA: 'IARA',
                plano: 3,
                creditosTotal: 9999,
                creditosUsados: 0,
                status: 'ativo',
                whatsappStatus: 'desconectado',
            },
        })

        return NextResponse.json({
            success: true,
            message: '✅ Usuário admin criado com sucesso!',
            usuario: {
                id: clinica.id,
                email: clinica.email,
                nome: clinica.nome,
                role: clinica.role,
            },
            credenciais: {
                email: 'rafael@iara.click',
                senha: 'iara2026',
            },
        })
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Erro ao criar usuário', detail: error.message },
            { status: 500 }
        )
    }
}
