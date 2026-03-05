import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashSenha, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/usuarios/[id] — Editar membro
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session) || (session?.user as any)?.adminRole !== 'super_admin') {
            return NextResponse.json({ error: 'Apenas super_admin pode editar' }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { nome, email, senha, role, ativo } = body

        const data: any = {}
        if (nome !== undefined) data.nome = nome
        if (email !== undefined) data.email = email
        if (role !== undefined) data.role = role
        if (ativo !== undefined) data.ativo = ativo
        if (senha) data.senha = await hashSenha(senha)
        data.updatedAt = new Date()

        const usuario = await prisma.adminUser.update({
            where: { id: Number(id) },
            data,
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                createdAt: true,
            },
        })

        return NextResponse.json({ usuario })
    } catch (err) {
        console.error('Erro em PUT /api/admin/usuarios/[id]:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE /api/admin/usuarios/[id] — Desativar (soft delete)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session) || (session?.user as any)?.adminRole !== 'super_admin') {
            return NextResponse.json({ error: 'Apenas super_admin pode desativar' }, { status: 403 })
        }

        const { id } = await params

        await prisma.adminUser.update({
            where: { id: Number(id) },
            data: { ativo: false, updatedAt: new Date() },
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro em DELETE /api/admin/usuarios/[id]:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
