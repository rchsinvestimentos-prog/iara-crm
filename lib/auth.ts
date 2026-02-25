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
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                try {
                    const clinica = await prisma.clinica.findUnique({
                        where: { email: credentials.email },
                    })

                    if (!clinica) return null

                    // Comparação segura com bcrypt
                    const senhaValida = await bcrypt.compare(credentials.password, clinica.senha)
                    if (!senhaValida) return null

                    return {
                        id: clinica.id,
                        email: clinica.email,
                        name: clinica.nome,
                        role: clinica.role,
                        plano: clinica.plano,
                    }
                } catch {
                    // Mock APENAS em desenvolvimento
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('⚠️ Banco indisponível — usando login mock (dev only)')
                        if (credentials.email === 'demo@iara.click' && credentials.password === 'iara123') {
                            return {
                                id: 'mock-1',
                                email: 'demo@iara.click',
                                name: 'Studio Ana Silva',
                                role: 'cliente',
                                plano: 1,
                            }
                        }
                    }
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
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub
                    ; (session.user as any).role = token.role
                    ; (session.user as any).plano = token.plano
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24h
    },
    secret: process.env.NEXTAUTH_SECRET,
}

// Helper: verificar sessão nas API routes
export async function getClinicaId(session: any): Promise<string | null> {
    if (!session?.user?.id) return null
    return session.user.id
}

// Helper: hash de senha (usar ao criar clínica)
export async function hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 12)
}
