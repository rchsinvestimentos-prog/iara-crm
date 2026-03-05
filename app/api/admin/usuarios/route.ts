import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashSenha, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/usuarios — Listar equipe
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const usuarios = await prisma.adminUser.findMany({
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                avatarUrl: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ usuarios })
    } catch (err) {
        console.error('Erro em GET /api/admin/usuarios:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/admin/usuarios — Criar membro da equipe
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session) || (session?.user as any)?.adminRole !== 'super_admin') {
            return NextResponse.json({ error: 'Apenas super_admin pode criar usuários' }, { status: 403 })
        }

        const body = await request.json()
        const { nome, email, senha, role } = body

        if (!nome || !email || !senha) {
            return NextResponse.json({ error: 'nome, email e senha são obrigatórios' }, { status: 400 })
        }

        // Verificar se email já existe
        const existente = await prisma.adminUser.findUnique({ where: { email } })
        if (existente) {
            return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
        }

        const senhaHash = await hashSenha(senha)

        const usuario = await prisma.adminUser.create({
            data: {
                nome,
                email,
                senha: senhaHash,
                role: role || 'visualizador',
            },
            select: {
                id: true,
                nome: true,
                email: true,
                role: true,
                ativo: true,
                createdAt: true,
            },
        })

        return NextResponse.json({ usuario }, { status: 201 })
    } catch (err) {
        console.error('Erro em POST /api/admin/usuarios:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
