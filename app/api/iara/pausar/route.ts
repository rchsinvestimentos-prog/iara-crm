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
            select: { nome: true, nomeAssistente: true, whatsappDoutora: true, status: true, evolutionInstance: true, evolutionApikey: true },
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
            mensagemAviso = `⏸️ *Atendimento Pausado*\n\n${nomeIA} está pausada. As mensagens que chegarem não terão resposta automática até você retomar no painel.`
        } else {
            mensagemAviso = `▶️ *Atendimento Ativado*\n\n${nomeIA} voltou! Pronta para atender suas clientes automaticamente. 💜`
        }

        // Enviar via Evolution API (usa a instância da própria clínica)
        const instanceName = clinica.evolutionInstance
        const apiKey = clinica.evolutionApikey || process.env.EVOLUTION_API_KEY || ''
        const apiUrl = process.env.EVOLUTION_API_URL

        if (clinica.whatsappDoutora && instanceName && apiUrl) {
            try {
                await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey,
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
