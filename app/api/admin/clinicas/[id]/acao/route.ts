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
    context: any
) {
    try {
        // Extrair ID da URL como fallback robusto
        let idStr: string | undefined
        try {
            const p = context?.params
            const resolved = (p && typeof p.then === 'function') ? await p : p
            idStr = resolved?.id
        } catch { }

        // Fallback: extrair da URL
        if (!idStr) {
            const url = new URL(request.url)
            const segments = url.pathname.split('/')
            const acaoIdx = segments.indexOf('acao')
            if (acaoIdx > 0) idStr = segments[acaoIdx - 1]
        }

        const clinicaId = parseInt(idStr || '')
        if (isNaN(clinicaId)) {
            return NextResponse.json({ error: `ID inválido (recebido: ${idStr})` }, { status: 400 })
        }

        const session = await getServerSession(authOptions)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const adminRole = (session?.user as any)?.adminRole || ''
        const perms = getPermissions(adminRole)
        if (!perms.canEdit) {
            return NextResponse.json({ error: 'Você não tem permissão para editar clínicas' }, { status: 403 })
        }

        const body = await request.json()
        const { acao } = body

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId }
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        if (acao === 'impersonar') {
            const token = crypto.randomUUID()
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { tokenAtivacao: token },
            })
            return NextResponse.json({
                message: 'Token de acesso gerado!',
                impersonateToken: token,
            })
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
                        let zapFormatado = clinica.telefone.replace(/\D/g, '')
                        if (!zapFormatado.startsWith('55')) zapFormatado = '55' + zapFormatado
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

        if (acao === 'excluir') {
            // 1. Deletar instância na Evolution API (se existir)
            if (clinica.evolutionInstance) {
                try {
                    const evolutionUrl = process.env.EVOLUTION_API_URL
                    const evolutionKey = process.env.EVOLUTION_API_KEY
                    if (evolutionUrl && evolutionKey) {
                        await fetch(`${evolutionUrl}/instance/delete/${clinica.evolutionInstance}`, {
                            method: 'DELETE',
                            headers: { 'apikey': evolutionKey },
                        })
                        console.log(`[Admin] 🗑️ Instância Evolution "${clinica.evolutionInstance}" deletada`)
                    }
                } catch (e) {
                    console.error('[Admin] Erro ao deletar instância Evolution:', e)
                }
            }

            // 2. Deletar TODOS os registros relacionados (cascade manual)
            const tabelasRaw = [
                'procedimentos',
                'historico_conversa',
                'status_conversa',
                'cache_respostas',
                'memoria_cliente',
                'cuidados_pos',
            ]
            for (const tabela of tabelasRaw) {
                try {
                    await prisma.$executeRawUnsafe(`DELETE FROM "${tabela}" WHERE clinica_id = ${clinicaId}`)
                } catch { /* tabela pode não existir */ }
            }

            // Tabelas com clinicaId no Prisma schema
            try { await prisma.usoFeature.deleteMany({ where: { clinicaId } }) } catch {}
            try { await prisma.contato.deleteMany({ where: { clinicaId } }) } catch {}
            try { await prisma.crmColuna.deleteMany({ where: { clinicaId } }) } catch {}
            try { await prisma.campanha.deleteMany({ where: { clinicaId } }) } catch {}

            // Tabelas raw com "clinicaId" (aspas) — formato Prisma
            const tabelasPrismaCol = [
                'procedimentos',
                'leads_crm',
            ]
            for (const tabela of tabelasPrismaCol) {
                try {
                    await prisma.$executeRawUnsafe(`DELETE FROM "${tabela}" WHERE "clinicaId" = ${clinicaId}`)
                } catch { /* tabela pode não existir */ }
            }

            // 3. Deletar a clínica do banco
            await prisma.clinica.delete({ where: { id: clinicaId } })

            return NextResponse.json({ message: `Clínica "${clinica.nome || clinica.nomeClinica}" excluída com sucesso!` })
        }

        if (acao === 'creditos') {
            const { quantidade } = body
            const qtd = parseInt(quantidade)
            if (!qtd || qtd <= 0) {
                return NextResponse.json({ error: 'Quantidade de créditos inválida' }, { status: 400 })
            }
            // Soma créditos ao saldo existente
            await prisma.$executeRaw`
                UPDATE clinicas 
                SET creditos_restantes = COALESCE(creditos_restantes, 0) + ${qtd},
                    creditos_total = COALESCE(creditos_total, 0) + ${qtd}
                WHERE id = ${clinicaId}
            `
            return NextResponse.json({ message: `✅ ${qtd} créditos liberados para "${clinica.nome || clinica.nomeClinica}"!` })
        }

        if (acao === 'plano') {
            const { nivel } = body
            const novoNivel = parseInt(nivel)
            if (![1, 2].includes(novoNivel)) {
                return NextResponse.json({ error: 'Nível inválido (1=Essencial, 2=Premium)' }, { status: 400 })
            }
            await prisma.clinica.update({
                where: { id: clinicaId },
                data: { nivel: novoNivel }
            })
            const nomePlano = novoNivel === 1 ? 'Essencial' : 'Premium'
            return NextResponse.json({ message: `✅ Plano alterado para ${nomePlano}!` })
        }

        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })

    } catch (err) {
        console.error('Erro em POST /api/admin/clinicas/[id]/acao:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
