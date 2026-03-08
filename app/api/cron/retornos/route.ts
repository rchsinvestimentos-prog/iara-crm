// ============================================
// CRON — Retornos Agendados
// ============================================
// Endpoint chamado periodicamente (a cada 5 minutos via cron externo
// ou Vercel cron) para enviar mensagens de retorno agendadas.
//
// Busca contatos com retornoData <= NOW() e retornoEnviado = false,
// envia a mensagem via Evolution API e marca como enviado.
//
// COMO USAR:
// GET /api/cron/retornos?secret=SEU_CRON_SECRET
// Ou via Vercel Cron: vercel.json → crons → path: "/api/cron/retornos"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendText } from '@/lib/engine/sender'

const CRON_SECRET = process.env.CRON_SECRET || ''

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    // Validar secret (proteção contra chamadas indevidas)
    if (CRON_SECRET) {
        const secret = req.nextUrl.searchParams.get('secret')
        if (secret !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    try {
        const agora = new Date()

        // Buscar todos os retornos pendentes (data já passou, não foi enviado)
        const pendentes = await prisma.contato.findMany({
            where: {
                retornoData: { lte: agora },
                retornoEnviado: false,
            },
            include: {
                clinica: true,
            },
            take: 50,
        })

        if (pendentes.length === 0) {
            return NextResponse.json({ ok: true, enviados: 0, msg: 'Nenhum retorno pendente' })
        }

        let enviados = 0
        let erros = 0

        for (const contato of pendentes) {
            const instancia = contato.clinica?.evolutionInstance
            if (!instancia) {
                console.log(`[Cron/Retornos] ⚠️ Clínica ${contato.clinicaId} sem instância Evolution`)
                continue
            }

            const mensagem = contato.retornoMensagem || 'Olá! Estamos entrando em contato conforme combinado. 😊'

            try {
                const ok = await sendText(
                    {
                        instancia,
                        telefone: contato.telefone,
                        apikey: contato.clinica?.evolutionApikey || undefined,
                    },
                    mensagem
                )

                if (ok) {
                    // Marcar como enviado
                    await prisma.contato.update({
                        where: { id: contato.id },
                        data: {
                            retornoEnviado: true,
                            ultimoContato: new Date(),
                        }
                    })
                    enviados++
                    console.log(`[Cron/Retornos] ✅ Retorno enviado para ${contato.nome} (${contato.telefone})`)
                } else {
                    erros++
                    console.error(`[Cron/Retornos] ❌ Falha ao enviar para ${contato.telefone}`)
                }
            } catch (err) {
                erros++
                console.error(`[Cron/Retornos] ❌ Erro:`, err)
            }

            // Delay entre envios (evitar rate limit da Evolution)
            await new Promise(r => setTimeout(r, 1500))
        }

        console.log(`[Cron/Retornos] 📊 Total: ${pendentes.length} pendentes, ${enviados} enviados, ${erros} erros`)

        return NextResponse.json({
            ok: true,
            pendentes: pendentes.length,
            enviados,
            erros,
            timestamp: agora.toISOString(),
        })

    } catch (err) {
        console.error('[Cron/Retornos] Fatal:', err)
        return NextResponse.json({ error: 'Erro interno do cron' }, { status: 500 })
    }
}
