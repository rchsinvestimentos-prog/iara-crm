import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/contatos/importar — Importar lista de contatos (CSV ou texto colado)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { contatos } = body as { contatos: { nome: string; telefone: string }[] }

        if (!Array.isArray(contatos) || contatos.length === 0) {
            return NextResponse.json({ error: 'Lista de contatos vazia' }, { status: 400 })
        }

        let importados = 0
        let duplicados = 0

        for (const c of contatos) {
            if (!c.telefone) continue
            const tel = c.telefone.replace(/\D/g, '')
            if (!tel) continue

            try {
                await prisma.contato.upsert({
                    where: { clinicaId_telefone: { clinicaId, telefone: tel } },
                    update: { nome: c.nome || tel, updatedAt: new Date() },
                    create: { clinicaId, nome: c.nome || tel, telefone: tel, origem: 'csv' },
                })
                importados++
            } catch {
                duplicados++
            }
        }

        return NextResponse.json({ ok: true, importados, duplicados, total: contatos.length })
    } catch (err) {
        console.error('Erro POST /api/contatos/importar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
