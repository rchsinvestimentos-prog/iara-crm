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

                    if (!clinica || !clinica.senha) return null

                    const senhaValida = await bcrypt.compare(credentials.password, clinica.senha)
                    if (!senhaValida) return null

                    return {
                        id: String(clinica.id),
                        email: clinica.email,
                        name: clinica.nomeClinica || clinica.nome,
                        role: clinica.role || 'cliente',
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
        maxAge: 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
}

export async function getClinicaId(session: any): Promise<number | null> {
    if (!session?.user?.id) return null
    return Number(session.user.id)
}

export async function hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 12)
}
