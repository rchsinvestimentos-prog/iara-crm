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
                magicToken: { label: 'Magic Link', type: 'text' },
            },
            async authorize(credentials) {
                try {
                    // ─── 0a) Impersonação por token (admin suporte) ───
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
                            profissionalId: null,
                            clinicaIdReal: clinica.id,
                        }
                    }

                    // ─── 0b) Magic link profissional ───
                    if (credentials?.magicToken) {
                        console.log('[AUTH] magicToken recebido:', credentials.magicToken?.substring(0, 8) + '...')
                        const profRows = await prisma.$queryRawUnsafe<any[]>(`
                            SELECT p.id, p.nome, p.email, p.clinica_id, c.nivel
                            FROM profissionais p
                            LEFT JOIN clinica c ON c.id = p.clinica_id
                            WHERE p.magic_token = $1
                              AND p.magic_token_expires >= NOW()
                              AND p.ativo = true
                            LIMIT 1
                        `, credentials.magicToken)
                        console.log('[AUTH] profRows encontrado:', profRows.length, profRows[0]?.nome || 'nenhum')
                        const prof = profRows[0]
                        if (!prof) return null

                        // Consumir token (uso único)
                        await prisma.$executeRawUnsafe(
                            `UPDATE profissionais SET magic_token = NULL, magic_token_expires = NULL WHERE id = $1`,
                            prof.id
                        )

                        return {
                            id: `prof_${prof.id}`,
                            email: prof.email || '',
                            name: prof.nome,
                            role: 'profissional',
                            userType: 'profissional',
                            adminRole: null,
                            plano: prof.nivel || 0,
                            profissionalId: prof.id,
                            clinicaIdReal: prof.clinica_id,
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
                                profissionalId: null,
                                clinicaIdReal: null,
                            }
                        }
                    }

                    // ─── 2) Tentar clinica (clientes) ───
                    const clinica = await prisma.clinica.findUnique({
                        where: { email: credentials.email },
                    })

                    if (clinica && clinica.senha) {
                        const senhaValida = await bcrypt.compare(credentials.password, clinica.senha)
                        if (senhaValida) {
                            return {
                                id: String(clinica.id),
                                email: clinica.email,
                                name: clinica.nomeClinica || clinica.nome,
                                role: clinica.role || 'cliente',
                                userType: 'cliente',
                                adminRole: null,
                                plano: clinica.nivel,
                                profissionalId: null,
                                clinicaIdReal: clinica.id,
                            }
                        }
                    }

                    // ─── 3) Tentar profissional (equipe) ───
                    const profRows2 = await prisma.$queryRawUnsafe<any[]>(`
                        SELECT p.id, p.nome, p.email, p.senha_hash, p.clinica_id, c.nivel
                        FROM profissionais p
                        LEFT JOIN clinica c ON c.id = p.clinica_id
                        WHERE p.email = $1 AND p.ativo = true AND p.senha_hash IS NOT NULL
                        LIMIT 1
                    `, credentials.email)
                    const prof2 = profRows2[0]
                    if (prof2 && prof2.senha_hash) {
                        const profSenhaValida = await bcrypt.compare(credentials.password, prof2.senha_hash)
                        if (profSenhaValida) {
                            return {
                                id: `prof_${prof2.id}`,
                                email: prof2.email || '',
                                name: prof2.nome,
                                role: 'profissional',
                                userType: 'profissional',
                                adminRole: null,
                                plano: prof2.nivel || 0,
                                profissionalId: prof2.id,
                                clinicaIdReal: prof2.clinica_id,
                            }
                        }
                    }

                    return null
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
                token.profissionalId = (user as any).profissionalId
                token.clinicaIdReal = (user as any).clinicaIdReal
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
                    ; (session.user as any).profissionalId = token.profissionalId
                    ; (session.user as any).clinicaIdReal = token.clinicaIdReal
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

// Helper: verificar se session é profissional
export function isProfissional(session: any): boolean {
    return session?.user?.userType === 'profissional'
}

// Helper: pegar profissionalId da session
export function getProfissionalId(session: any): string | null {
    return session?.user?.profissionalId || null
}

// Helper: pegar clinicaId para profissionais (usa clinicaIdReal em vez do id do user)
export async function getClinicaIdForRole(session: any): Promise<number | null> {
    if (!session?.user) return null
    if (session.user.userType === 'profissional') {
        return session.user.clinicaIdReal ? Number(session.user.clinicaIdReal) : null
    }
    return getClinicaId(session)
}
