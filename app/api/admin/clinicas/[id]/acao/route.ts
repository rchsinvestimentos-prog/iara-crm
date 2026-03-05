import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashSenha, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarEmailBoasVindas } from '@/lib/email'
import { getPermissions } from '@/lib/permissions'

function gerarSenhaAleatoria(len = 10): string {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#'
    let s = ''
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
    return s
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const adminRole = (session?.user as any)?.adminRole || ''
        const perms = getPermissions(adminRole)
        if (!perms.canEdit) {
            return NextResponse.json({ error: 'Você não tem permissão para editar clínicas' }, { status: 403 })
        }

        const clinicaId = params.id
        const body = await request.json()
        const { acao } = body

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        if (acao === 'bloquear') {
            const novoStatus = clinica.status === 'ativo' ? 'inativo' : 'ativo'
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { status: novoStatus }
            })
            return NextResponse.json({ message: `Clínica ${novoStatus === 'ativo' ? 'desbloqueada' : 'bloqueada'} com sucesso!` })
        }

        if (acao === 'testes') {
            // Placeholder para rodar testes (Webhook N8N etc)
            return NextResponse.json({ message: 'Rotina de testes iniciada (simulação).' })
        }

        if (acao === 'reenviar') {
            if (!clinica.email) {
                return NextResponse.json({ error: 'Clínica não possui email cadastrado' }, { status: 400 })
            }

            const senhaPlana = gerarSenhaAleatoria()
            const senhaHash = await hashSenha(senhaPlana)

            // Atualiza a senha no banco
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { senha: senhaHash }
            })

            // Dispara Email
            await enviarEmailBoasVindas({
                email: clinica.email,
                nome: clinica.nome || clinica.nomeClinica || 'Cliente',
                senha: senhaPlana,
                plano: clinica.plano || 'essencial',
            })

            // Dispara WhatsApp se tiver
            if (clinica.telefone) {
                try {
                    const evolutionUrl = process.env.EVOLUTION_API_URL
                    const evolutionKey = process.env.EVOLUTION_API_KEY
                    const adminInstance = process.env.EVOLUTION_ADMIN_INSTANCE || 'IARA_Suporte'

                    if (evolutionUrl && evolutionKey) {
                        const zapFormatado = clinica.telefone.replace(/\D/g, '')
                        const primeiroNome = (clinica.nome || clinica.nomeClinica || 'Cliente').split(' ')[0]
                        const planoF = (clinica.plano || 'essencial').toUpperCase()

                        const msgZap = `Olá ${primeiroNome}! 🎉\n\nFoi solicitado um reenvio de acesso da sua conta na *IARA (${planoF})*.\n\n🔗 *Acesse seu painel:* https://app.iara.click\n📧 *Email:* ${clinica.email}\n🔑 *NOVA Senha:* ${senhaPlana}\n\nEntre lá para gerenciar o seu atendimento! 🚀`

                        await fetch(`${evolutionUrl}/message/sendText/${adminInstance}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': evolutionKey,
                            },
                            body: JSON.stringify({
                                number: zapFormatado,
                                text: msgZap,
                            }),
                        })
                    }
                } catch (e) {
                    console.error('[Admin] Erro ao reenviar WhatsApp:', e)
                }
            }

            return NextResponse.json({ message: `Acesso reenviado para ${clinica.email} e WhatsApp. Nova senha gerada!` })
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

    } catch (err) {
        console.error('Erro em POST /api/admin/clinicas/[id]/acao:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
