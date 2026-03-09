import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/iara/pausar — Pausar, retomar ou ativar modo férias
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const acao = body.acao // 'pausar' | 'retomar' | 'ferias'

        if (!['pausar', 'retomar', 'ferias'].includes(acao)) {
            return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const novoStatus = acao === 'retomar' ? 'ativo' : 'pausado'

        // Buscar config atual
        const clinicaAtual = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { configuracoes: true },
        })
        const config = (clinicaAtual?.configuracoes as any) || {}

        // Montar update de configuracoes
        let configUpdate = { ...config }
        if (acao === 'ferias') {
            configUpdate.feriasTe = body.dataRetorno || null
            configUpdate.mensagemFerias = body.mensagemFerias || null
        } else if (acao === 'retomar') {
            // Limpa férias ao retomar
            delete configUpdate.feriasTe
            delete configUpdate.mensagemFerias
        }

        // 1. Atualizar status no Prisma
        const clinica = await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                status: novoStatus,
                configuracoes: configUpdate,
            },
            select: {
                nome: true,
                nomeAssistente: true,
                whatsappDoutora: true,
                status: true,
                evolutionInstance: true,
                evolutionApikey: true,
            },
        })

        const nomeIA = clinica.nomeAssistente || 'IARA'

        // 2. Tentar atualizar no banco N8N também
        try {
            await prisma.$executeRawUnsafe(
                `UPDATE users SET status = $1, updated_at = NOW() WHERE nome_clinica ILIKE $2 OR whatsapp_pessoal = $3`,
                novoStatus,
                `%${clinica.nome}%`,
                clinica.whatsappDoutora || ''
            )
        } catch { /* N8N table might not be accessible */ }

        // 3. Mensagem de aviso para a Dra
        let mensagemAviso = ''
        if (acao === 'ferias') {
            const retorno = body.dataRetorno
                ? new Date(body.dataRetorno + 'T12:00:00').toLocaleDateString('pt-BR')
                : 'data definida'
            mensagemAviso = `🌴 *Modo Férias Ativado*\n\n${nomeIA} está pausada até ${retorno}. Ela reativa automaticamente nessa data!\n\nMensagem que será enviada às clientes:\n"${body.mensagemFerias || ''}"`
        } else if (acao === 'pausar') {
            mensagemAviso = `⏸️ *Atendimento Pausado*\n\n${nomeIA} está pausada. As mensagens que chegarem não terão resposta automática até você retomar no painel.`
        } else {
            mensagemAviso = `▶️ *Atendimento Ativado*\n\n${nomeIA} voltou! Pronta para atender suas clientes automaticamente. 💜`
        }

        // 4. Enviar via Evolution API
        const instanceName = clinica.evolutionInstance
        const apiKey = clinica.evolutionApikey || process.env.EVOLUTION_API_KEY || ''
        const apiUrl = process.env.EVOLUTION_API_URL

        if (clinica.whatsappDoutora && instanceName && apiUrl) {
            try {
                await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                    body: JSON.stringify({ number: clinica.whatsappDoutora, text: mensagemAviso }),
                })
            } catch { /* not critical */ }
        }

        return NextResponse.json({ ok: true, status: novoStatus, nomeIA })
    } catch (err) {
        console.error('Erro em /api/iara/pausar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// GET /api/iara/pausar — Verificar status atual + férias
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { status: true, nomeAssistente: true, configuracoes: true },
        })

        const config = (clinica?.configuracoes as any) || {}

        // Auto-retomar se data de férias passou
        if (clinica?.status === 'pausado' && config.feriasTe) {
            const retorno = new Date(config.feriasTe + 'T23:59:00')
            if (new Date() > retorno) {
                // Reativar automaticamente
                await prisma.clinica.update({
                    where: { id: clinicaId },
                    data: {
                        status: 'ativo',
                        configuracoes: { ...config, feriasTe: null, mensagemFerias: null },
                    },
                })
                return NextResponse.json({
                    status: 'ativo', pausada: false,
                    nomeIA: clinica.nomeAssistente || 'IARA',
                })
            }
        }

        return NextResponse.json({
            status: clinica?.status || 'ativo',
            pausada: clinica?.status === 'pausado',
            nomeIA: clinica?.nomeAssistente || 'IARA',
            feriasTe: config.feriasTe || null,
            mensagemFerias: config.mensagemFerias || null,
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
