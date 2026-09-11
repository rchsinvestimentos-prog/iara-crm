import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions, hashSenha } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Conta =
    | { tabela: 'clinica'; id: number; hash: string | null }
    | { tabela: 'profissional'; id: string; hash: string | null }
    | { tabela: 'admin'; id: number; hash: string | null }

/**
 * Descobre de QUEM é a senha que está sendo trocada.
 *
 * Antes a rota usava getClinicaId(), que para um profissional da equipe
 * devolve o id da clínica: a secretária que abrisse "Redefinir Senha" trocava
 * a senha da DONA da clínica, sem precisar saber a senha dela.
 */
async function contaDaSessao(user: any): Promise<Conta | null> {
    if (!user?.id) return null

    if (user.userType === 'profissional' && user.profissionalId) {
        const rows = await prisma.$queryRawUnsafe<{ senha_hash: string | null }[]>(
            'SELECT senha_hash FROM profissionais WHERE id = $1 AND ativo = true LIMIT 1',
            user.profissionalId
        )
        if (!rows[0]) return null
        return { tabela: 'profissional', id: user.profissionalId, hash: rows[0].senha_hash }
    }

    if (user.userType === 'admin') {
        const id = Number(String(user.id).replace('admin_', ''))
        const admin = await prisma.adminUser.findUnique({ where: { id }, select: { senha: true } })
        if (!admin) return null
        return { tabela: 'admin', id, hash: admin.senha }
    }

    // Cliente: é a conta com que a pessoa entrou, não a clínica ativa no seletor
    // de multi-clínica — a senha pertence ao login.
    const id = Number(user.id)
    if (isNaN(id)) return null
    const clinica = await prisma.clinica.findUnique({ where: { id }, select: { senha: true } })
    if (!clinica) return null
    return { tabela: 'clinica', id, hash: clinica.senha }
}

function liberadoSemSenhaAtual(user: any, conta: Conta): boolean {
    // Conta que nunca teve senha não tem o que digitar.
    if (!conta.hash) return true
    // Entrou pelo link do email há menos de 15 minutos.
    const ate = Number(user?.trocaSenhaLiberadaAte)
    return Number.isFinite(ate) && ate > Date.now()
}

/**
 * GET /api/auth/change-password
 * Diz à tela se precisa pedir a senha atual.
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    const conta = await contaDaSessao(session?.user)
    if (!conta) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    return NextResponse.json({ precisaSenhaAtual: !liberadoSemSenhaAtual(session?.user, conta) })
}

/**
 * POST /api/auth/change-password
 * Body: { senhaAtual?: string, novaSenha: string, confirmarSenha: string }
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const conta = await contaDaSessao(session?.user)

        if (!conta) {
            return NextResponse.json({ error: 'Sua sessão expirou. Entre de novo.' }, { status: 401 })
        }

        const { senhaAtual, novaSenha, confirmarSenha } = await request.json()

        if (!novaSenha || String(novaSenha).length < 6) {
            return NextResponse.json({ error: 'A nova senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })
        }
        if (novaSenha !== confirmarSenha) {
            return NextResponse.json({ error: 'A nova senha e a confirmação não são iguais.' }, { status: 400 })
        }

        if (!liberadoSemSenhaAtual(session?.user, conta)) {
            if (!senhaAtual) {
                return NextResponse.json({ error: 'Digite sua senha atual.' }, { status: 400 })
            }
            const confere = await bcrypt.compare(String(senhaAtual), conta.hash as string)
            if (!confere) {
                return NextResponse.json({ error: 'A senha atual está incorreta.' }, { status: 400 })
            }
            if (senhaAtual === novaSenha) {
                return NextResponse.json({ error: 'A nova senha precisa ser diferente da atual.' }, { status: 400 })
            }
        }

        const senhaHash = await hashSenha(novaSenha)

        if (conta.tabela === 'clinica') {
            await prisma.clinica.update({ where: { id: conta.id }, data: { senha: senhaHash } })
        } else if (conta.tabela === 'admin') {
            await prisma.adminUser.update({ where: { id: conta.id }, data: { senha: senhaHash } })
        } else {
            await prisma.$executeRawUnsafe(
                'UPDATE profissionais SET senha_hash = $1 WHERE id = $2',
                senhaHash,
                conta.id
            )
        }

        console.log(`[Auth] ✅ Senha alterada (${conta.tabela} ${conta.id})`)
        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Auth] ❌ Erro ao alterar senha:', err)
        return NextResponse.json({ error: 'Não foi possível alterar a senha agora. Tente de novo.' }, { status: 500 })
    }
}
