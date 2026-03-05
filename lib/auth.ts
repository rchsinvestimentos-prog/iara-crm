import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Senha', type: 'password' },
                impersonateToken: { label: 'Token', type: 'text' },
            },
            async authorize(credentials) {
                try {
                    // ─── 0) Impersonação por token (admin suporte) ───
                    if (credentials?.impersonateToken) {
                        const clinica = await prisma.clinica.findFirst({
                            where: { tokenAtivacao: credentials.impersonateToken },
                        })
                        if (!clinica) return null

                        // Limpar token (uso único)
                        await prisma.clinica.update({
                            where: { id: clinica.id },
                            data: { tokenAtivacao: null },
                        })

                        return {
                            id: String(clinica.id),
                            email: clinica.email,
                            name: clinica.nomeClinica || clinica.nome,
                            role: clinica.role || 'cliente',
                            userType: 'cliente',
                            adminRole: null,
                            plano: clinica.nivel,
                        }
                    }

                    if (!credentials?.email || !credentials?.password) return null

                    // ─── 1) Tentar admin_users primeiro ───
                    const admin = await prisma.adminUser.findUnique({
                        where: { email: credentials.email },
                    })

                    if (admin && admin.ativo && admin.senha) {
                        const senhaValida = await bcrypt.compare(credentials.password, admin.senha)
                        if (senhaValida) {
                            return {
                                id: `admin_${admin.id}`,
                                email: admin.email,
                                name: admin.nome,
                                role: 'admin',
                                userType: 'admin',
                                adminRole: admin.role,
                                plano: 99,
                            }
                        }
                    }

                    // ─── 2) Tentar clinica (clientes) ───
                    const clinica = await prisma.clinica.findUnique({
                        where: { email: credentials.email },
                    })

                    if (!clinica || !clinica.senha) return null

                    const senhaValida = await bcrypt.compare(credentials.password, clinica.senha)
                    if (!senhaValida) return null

                    return {
                        id: String(clinica.id),
                        email: clinica.email,
                        name: clinica.nomeClinica || clinica.nome,
                        role: clinica.role || 'cliente',
                        userType: 'cliente',
                        adminRole: null,
                        plano: clinica.nivel,
                    }
                } catch (err) {
                    console.error('Erro no login:', err)
                    return null
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
                token.plano = (user as any).plano
                token.userType = (user as any).userType
                token.adminRole = (user as any).adminRole
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub
                    ; (session.user as any).role = token.role
                    ; (session.user as any).plano = token.plano
                    ; (session.user as any).userType = token.userType
                    ; (session.user as any).adminRole = token.adminRole
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
}

export async function getClinicaId(session: any): Promise<number | null> {
    if (!session?.user?.id) return null
    const userId = Number(session.user.id)

    // Verificar cookie de clínica ativa (multi-clínica)
    try {
        const { cookies } = require('next/headers')
        const cookieStore = await cookies()
        const activeId = cookieStore.get('activeClinicaId')?.value
        if (activeId) {
            const clinicaId = Number(activeId)
            // Validar que essa clínica pertence ao usuário
            if (clinicaId === userId) return clinicaId
            const filha = await prisma.clinica.findFirst({
                where: { id: clinicaId, parentId: userId },
                select: { id: true },
            })
            if (filha) return filha.id
        }
    } catch {
        // Cookie não disponível (ex: chamada fora de request context)
    }

    return userId
}

export async function hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 12)
}

// Helper: verificar se session é admin
export function isAdmin(session: any): boolean {
    return session?.user?.userType === 'admin'
}

// Helper: pegar role admin da session
export function getAdminRole(session: any): string | null {
    return session?.user?.adminRole || null
}
