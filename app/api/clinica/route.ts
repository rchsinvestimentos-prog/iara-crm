import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/clinica — retorna dados da clínica logada
export async function GET() {
    try {
        // TODO: pegar clinicaId da sessão NextAuth
        const clinica = await prisma.clinica.findFirst({
            include: {
                procedimentos: true,
                horarios: true,
            },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        return NextResponse.json(clinica)
    } catch {
        // Fallback com dados mock se banco indisponível
        return NextResponse.json({
            id: 'mock-1',
            nome: 'Studio Ana Silva',
            email: 'demo@iara.click',
            nomeIA: 'IARA',
            plano: 1,
            creditosTotal: 100,
            creditosUsados: 32,
            whatsappStatus: 'conectado',
            procedimentos: [
                { id: '1', nome: 'Micropigmentação Fio a Fio', valor: 497, desconto: 10, parcelas: '3x sem juros', duracao: '2h' },
                { id: '2', nome: 'Sombreado', valor: 397, desconto: 20, parcelas: '3x sem juros', duracao: '1h30' },
            ],
        })
    }
}

// PUT /api/clinica — atualiza dados da clínica
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        // TODO: pegar clinicaId da sessão NextAuth
        const clinica = await prisma.clinica.findFirst()

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const updated = await prisma.clinica.update({
            where: { id: clinica.id },
            data: {
                nome: body.nome,
                nomeIA: body.nomeIA,
                whatsappClinica: body.whatsappClinica,
                whatsappPessoal: body.whatsappPessoal,
                diferenciais: body.diferenciais,
            },
        })

        return NextResponse.json(updated)
    } catch {
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
    }
}
