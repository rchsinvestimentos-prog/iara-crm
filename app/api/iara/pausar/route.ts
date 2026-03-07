import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/iara/pausar — Pausar ou retomar a IARA
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const acao = body.acao // 'pausar' | 'retomar'

        if (!['pausar', 'retomar'].includes(acao)) {
            return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const novoStatus = acao === 'pausar' ? 'pausado' : 'ativo'

        // 1. Atualizar status no Prisma (painel)
        const clinica = await prisma.clinica.update({
            where: { id: clinicaId },
            data: { status: novoStatus },
            select: { nome: true, nomeAssistente: true, whatsappDoutora: true, status: true },
        })

        const nomeIA = clinica.nomeAssistente || 'IARA'

        // 2. Tentar atualizar no banco N8N também (tabela users)
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE users SET status = $1, updated_at = NOW() WHERE nome_clinica ILIKE $2 OR whatsapp_pessoal = $3`,
                novoStatus,
                `%${clinica.nome}%`,
                clinica.whatsappDoutora || ''
            )
        } catch {
            // N8N table might not exist in this DB context — silently continue
        }

        // 3. Enviar mensagem WhatsApp de aviso (se tiver whatsapp configurado)
        let mensagemAviso = ''

        if (acao === 'pausar') {
            const frases = [
                `⏸️ ${nomeIA} pausada! Dra, estou parando os atendimentos agora. Quando quiser que eu volte, é só clicar em "Retomar" no painel. As mensagens que chegarem vão ficar sem resposta até lá.`,
                `⏸️ Entendido, Dra! ${nomeIA} fazendo uma pausa. Vou segurar as mensagens aqui e quando você retomar, eu volto com tudo! 💜`,
            ]
            mensagemAviso = frases[Math.floor(Math.random() * frases.length)]
        } else {
            const frases = [
                `▶️ ${nomeIA} de volta! Dra, retomei os atendimentos agora. Pode ficar tranquila que estou respondendo tudo! 🙋‍♀️💜`,
                `▶️ Voltei! ${nomeIA} ativa e pronta para atender suas clientes. Bora! ✨`,
            ]
            mensagemAviso = frases[Math.floor(Math.random() * frases.length)]
        }

        // Enviar via Evolution API (se configurado)
        if (clinica.whatsappDoutora && process.env.EVOLUTION_API_URL) {
            try {
                await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE_ADMIN}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': process.env.EVOLUTION_API_KEY || '',
                    },
                    body: JSON.stringify({
                        number: clinica.whatsappDoutora,
                        text: mensagemAviso,
                    }),
                })
            } catch {
                // WhatsApp send failed — not critical
            }
        }

        return NextResponse.json({
            ok: true,
            status: novoStatus,
            mensagem: mensagemAviso,
            nomeIA,
        })
    } catch (err) {
        console.error('Erro em /api/iara/pausar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/iara/pausar — Verificar status atual
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { status: true, nomeAssistente: true },
        })

        return NextResponse.json({
            status: clinica?.status || 'ativo',
            pausada: clinica?.status === 'pausado',
            nomeIA: clinica?.nomeAssistente || 'IARA',
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
