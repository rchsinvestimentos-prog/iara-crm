import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
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
                    // Buscar clínica pelo email
                    const clinica = await prisma.clinica.findUnique({
                        where: { email: credentials.email },
                    })

                    if (!clinica) return null

                    // TODO: Usar bcrypt.compare em produção
                    // Por agora, comparação simples pra desenvolvimento
                    const senhaValida = clinica.senha === credentials.password

                    if (!senhaValida) return null

                    return {
                        id: clinica.id,
                        email: clinica.email,
                        name: clinica.nome,
                        role: clinica.role,
                        plano: clinica.plano,
                    }
                } catch {
                    // Se o banco não tiver conectado, permitir login mock
                    console.log('⚠️ Banco indisponível — usando login mock')
                    if (credentials.email === 'demo@iara.click' && credentials.password === 'iara123') {
                        return {
                            id: 'mock-1',
                            email: 'demo@iara.click',
                            name: 'Studio Ana Silva',
                            role: 'cliente',
                            plano: 1,
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
    },
    secret: process.env.NEXTAUTH_SECRET,
}
