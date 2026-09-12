import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt, callAI } from '@/lib/engine/ai-engine'
import { determineOutputType, generateTTS } from '@/lib/engine/audio'
import type { FeedbackDra, DadosClinica } from '@/lib/engine/types'
import { extrairMarcadoresAnexo, normalizarAnexos, MAX_ANEXOS_POR_RESPOSTA } from '@/lib/anexos-procedimento'

/**
 * POST /api/iara/simulate — Simula uma conversa com a IARA (via Painel)
 * Body: { message: string, leadName?: string, history?: { role: string, content: string }[], withAudio?: boolean, overrides?: any }
 * Retorna: { text: string, audioBase64?: string, fallback: boolean }
 */
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const clinicaId = await getClinicaId(session)

    if (!clinicaId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { message, leadName = 'Cliente Teste', history = [], withAudio = false, overrides = {} } = body

    if (!message || typeof message !== 'string') {
        return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })
    }

    try {
        const clinicaDb = await prisma.clinica.findUnique({
            where: { id: clinicaId }
        })

        if (!clinicaDb) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const procedimentosRaw = await prisma.procedimento.findMany({
            where: { clinicaId: clinicaId, ativo: true }
        })

        // Merge de configs do banco com o que o usuário está testando na UI (sem ter salvo ainda)
        const clinica = {
            ...clinicaDb,
            ...overrides
        }

        // Converter feedbacks
        let feedbacksArr: FeedbackDra[] = []

        // Se vieram overrides textuais ou já como string
        const feedbacksSource = overrides.feedbacks ? overrides.feedbacks : clinica.feedbacks
        if (feedbacksSource) {
            try {
                const parsed = typeof feedbacksSource === 'string' ? JSON.parse(feedbacksSource) : feedbacksSource
                if (Array.isArray(parsed)) {
                    feedbacksArr = parsed.map((p: any) => typeof p === 'string' ? { regra: p } : p)
                }
            } catch (e) {
                console.error('[Simulate] Erro ao carregar feedbacks:', e)
            }
        }

        const systemPrompt = buildSystemPrompt({
            clinica: clinica as unknown as DadosClinica,
            mensagem: message,
            pushName: leadName,
            tipoEntrada: withAudio ? 'audio' : 'text',
            historico: history,
            procedimentos: procedimentosRaw as any,
            feedbacks: feedbacksArr,
            memoria: null
        })

        // Chama a IA real
        const result = await callAI(
            systemPrompt,
            message,
            undefined,
            history,
            withAudio ? 'audio' : 'text'
        )

        // Anexos: no WhatsApp o arquivo sai logo depois da mensagem. Aqui o
        // marcador sai do texto e o simulador mostra o arquivo que seria enviado.
        const marcadores = extrairMarcadoresAnexo(result.texto)
        const todosAnexos = new Map(
            procedimentosRaw.flatMap((p: any) => normalizarAnexos(p.anexos)).map(a => [a.id, a] as const)
        )
        const anexos = marcadores.ids
            .map(id => todosAnexos.get(id))
            .filter((a): a is NonNullable<typeof a> => !!a)
            .slice(0, MAX_ANEXOS_POR_RESPOSTA)
            .map(a => ({ id: a.id, tipo: a.tipo, descricao: a.descricao, nomeArquivo: a.nomeArquivo, url: `/api/uploads/${a.arquivo}` }))
        const texto = marcadores.texto

        let audioBase64: string | undefined
        if (withAudio && texto) {
            try {
                const config = determineOutputType(clinica as unknown as DadosClinica, true)
                const audioBuffer = await generateTTS(texto, config)
                if (audioBuffer) {
                    audioBase64 = audioBuffer
                }
            } catch (err) {
                console.error('[IARA Simulate] Erro ao gerar áudio:', err)
            }
        }

        return NextResponse.json({
            text: texto,
            anexos,
            fallback: result.fallback,
            ...(audioBase64 ? { audioBase64 } : {}),
        })
    } catch (error: any) {
        console.error('[IARA Simulate] Erro geral:', error)
        return NextResponse.json({ error: `Erro interno ao simular: ${error.message || error}` }, { status: 500 })
    }
}
