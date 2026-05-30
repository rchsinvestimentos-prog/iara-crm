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

// GET /api/admin/clinicas — Todas as clínicas (admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Buscar todas as clínicas (exceto admins)
        const clinicas = await prisma.clinica.findMany({
            where: { role: { not: 'admin' } },
            select: {
                id: true,
                nome: true,
                nomeClinica: true,
                email: true,
                nomeAssistente: true,
                plano: true,
                nivel: true,
                status: true,
                creditosMensais: true,
                creditosDisponiveis: true,
                whatsappClinica: true,
                whatsappDoutora: true,
                evolutionInstance: true,
                createdAt: true,
                proximaRenovacao: true,
                autorizouCuidadosPos: true,
                cuidadosPos: true,
                aceiteTermos: true,
                personalidadeVoz: true,
                tomAtendimento: true,
                humor: true,
                horarioSemana: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        const evoUrl = process.env.EVOLUTION_API_URL
        const evoKey = process.env.EVOLUTION_API_KEY

        // Checar status real de cada instância na Evolution API (em paralelo)
        const statusMap = new Map<number, string>()
        if (evoUrl && evoKey) {
            const checks = clinicas
                .filter(c => c.evolutionInstance)
                .map(async (c) => {
                    try {
                        const res = await fetch(`${evoUrl}/instance/connectionState/${c.evolutionInstance}`, {
                            headers: { 'apikey': evoKey },
                            signal: AbortSignal.timeout(3000), // timeout 3s
                        })
                        const data = await res.json()
                        const connected = data?.instance?.state === 'open' || data?.state === 'open'
                        statusMap.set(c.id, connected ? 'conectado' : 'desconectado')
                    } catch {
                        statusMap.set(c.id, 'desconectado')
                    }
                })
            await Promise.all(checks)
        }

        // Contar procedimentos ativos por clínica
        const procedimentosCounts = new Map<number, number>()
        try {
            const counts = await prisma.$queryRaw<{ user_id: number; count: bigint }[]>`
                SELECT user_id, COUNT(*)::bigint as count
                FROM procedimentos
                WHERE ativo = true AND user_id IS NOT NULL
                GROUP BY user_id
            `
            for (const row of counts) {
                procedimentosCounts.set(row.user_id, Number(row.count))
            }
        } catch { /* tabela pode não existir */ }


        const result = clinicas.map((c: typeof clinicas[number]) => ({
            id: c.id,
            nome_clinica: c.nomeClinica || c.nome,
            email: c.email,
            nomeIA: c.nomeAssistente,
            plano: c.plano,
            nivel: c.nivel,
            status: c.status,
            whatsapp_clinica: c.whatsappClinica,
            whatsapp_status: statusMap.get(c.id) || (c.evolutionInstance ? 'verificando...' : 'desconectado'),
            creditos_restantes: c.creditosDisponiveis ?? 0,
            creditos_total: c.creditosMensais ?? 0,
            pct_credito: (c.creditosMensais ?? 0) > 0
                ? Math.round(((c.creditosDisponiveis ?? 0) / (c.creditosMensais ?? 1)) * 100)
                : 100,
            proxima_renovacao: c.proximaRenovacao,
            total_conversas: 0,
            total_agendamentos: 0,
            total_procedimentos: 0,
            criado_em: c.createdAt,
            autorizou_cuidados_pos: c.autorizouCuidadosPos,
            cuidados_pos: c.cuidadosPos,
            aceite_termos: c.aceiteTermos,
            onboarding: (() => {
                const whatsConnected = statusMap.get(c.id) === 'conectado'
                const temProcs = (procedimentosCounts.get(c.id) ?? 0) > 0
                const dados = !!(c.nomeClinica && c.nomeClinica.trim() !== '' && temProcs && c.horarioSemana)
                const secretaria = !!(c.nomeAssistente && c.nomeAssistente.trim() !== '' && (c.personalidadeVoz || c.tomAtendimento || c.humor))
                const conexoes = whatsConnected
                const done = [dados, secretaria, conexoes].filter(Boolean).length
                return { dados, secretaria, conexoes, done, total: 3 }
            })(),
        }))

        return NextResponse.json({ clinicas: result })
    } catch (err) {
        console.error('Erro em /api/admin/clinicas:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/admin/clinicas — Criar clínica manualmente
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Checar permissão de criação
        const adminRole = (session?.user as any)?.adminRole || ''
        const perms = getPermissions(adminRole)
        if (!perms.canCreate) {
            return NextResponse.json({ error: 'Sem permissão para criar clínicas' }, { status: 403 })
        }

        const body = await request.json()
        const { nome, email, telefone, codigoPais, nivel, duracao, creditos, enviarEmail } = body

        if (!nome || !email) {
            return NextResponse.json({ error: 'nome e email são obrigatórios' }, { status: 400 })
        }

        // Verificar se email já existe
        const existente = await prisma.clinica.findUnique({ where: { email } })
        if (existente) {
            return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
        }

        // Gerar senha aleatória
        const senhaPlana = gerarSenhaAleatoria()
        const senhaHash = await hashSenha(senhaPlana)

        // Calcular data de renovação
        let proximaRenovacao: Date | null = null
        if (duracao && duracao !== 'ilimitado') {
            let dias = 30
            // Corrige o parseInt pegando "1 mes"
            if (duracao.includes('mes')) {
                dias = parseInt(duracao) * 30
            } else {
                dias = parseInt(duracao)
            }

            if (!isNaN(dias)) {
                proximaRenovacao = new Date()
                proximaRenovacao.setDate(proximaRenovacao.getDate() + dias)
            }
        }

        // Plano labels
        const planoLabels: Record<number, string> = { 1: 'essencial', 2: 'premium' }
        const nivelFinal = nivel || 1
        const creditosFinal = creditos || (nivelFinal === 2 ? 3000 : 1000)

        const clinica = await prisma.clinica.create({
            data: {
                nome,
                email,
                telefone: telefone || null,
                senha: senhaHash,
                role: 'cliente',
                nivel: nivelFinal,
                plano: planoLabels[nivelFinal] || 'essencial',
                status: 'ativo',
                creditosMensais: creditosFinal,
                creditosDisponiveis: creditosFinal,
                proximaRenovacao,
            },
        })

        // Enviar notificações de boas-vindas
        let emailStatus = 'não solicitado'
        let whatsappStatus = 'não solicitado'

        if (enviarEmail !== false) {
            // Email
            try {
                const result = await enviarEmailBoasVindas({
                    email,
                    nome,
                    senha: senhaPlana,
                    plano: planoLabels[nivelFinal] || 'essencial',
                })
                emailStatus = result ? '✅ enviado' : '❌ falhou (RESEND_API_KEY ausente ou erro)'
            } catch (emailErr: any) {
                emailStatus = `❌ erro: ${emailErr?.message || 'desconhecido'}`
            }

            // WhatsApp
            if (telefone) {
                try {
                    const evolutionUrl = process.env.EVOLUTION_API_URL
                    const evolutionKey = process.env.EVOLUTION_API_KEY
                    const adminInstance = process.env.EVOLUTION_ADMIN_INSTANCE || 'IARA_Suporte'

                    if (!evolutionUrl || !evolutionKey) {
                        whatsappStatus = '❌ EVOLUTION_API_URL ou EVOLUTION_API_KEY não configuradas'
                    } else {
                        let zapFormatado = telefone.replace(/\D/g, '')
                        const prefixo = codigoPais || '55'
                        if (!zapFormatado.startsWith(prefixo)) zapFormatado = prefixo + zapFormatado
                        const primeiroNome = nome.split(' ')[0] || nome

                        const msgZap = `Olá ${primeiroNome}! 🎉\n\nSua conta na *IARA (${planoLabels[nivelFinal].toUpperCase()})* foi criada com sucesso!\n\n🔗 *Acesse seu painel:* https://app.iara.click\n📧 *Email:* ${email}\n🔑 *Senha:* ${senhaPlana}\n\nEntre lá e faça o Setup inicial para eu começar a atender os seus pacientes! 🚀`

                        const zapRes = await fetch(`${evolutionUrl}/message/sendText/${adminInstance}`, {
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
                        const zapData = await zapRes.json().catch(() => ({}))

                        if (zapRes.ok) {
                            whatsappStatus = `✅ enviado para ${zapFormatado}`
                        } else {
                            whatsappStatus = `❌ Evolution respondeu ${zapRes.status}: ${JSON.stringify(zapData)}`
                        }
                    }
                } catch (e: any) {
                    whatsappStatus = `❌ erro: ${e?.message || 'desconhecido'}`
                }
            } else {
                whatsappStatus = '⚠️ telefone não informado'
            }
        }

        console.log(`[Admin] Criação clínica ${email}: email=${emailStatus}, whatsapp=${whatsappStatus}`)

        return NextResponse.json({
            clinica: {
                id: clinica.id,
                nome: clinica.nome,
                email: clinica.email,
                nivel: clinica.nivel,
                status: clinica.status,
                senha_gerada: senhaPlana,
            },
            emailStatus,
            whatsappStatus,
        }, { status: 201 })
    } catch (err: any) {
        console.error('Erro em POST /api/admin/clinicas:', err)
        return NextResponse.json({ error: `Erro interno: ${err?.message || 'Erro Desconhecido'}` }, { status: 500 })
    }
}
