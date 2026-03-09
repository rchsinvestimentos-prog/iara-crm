import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/aniversario?secret=XXX
 *
 * Envia mensagem de aniversário para clientes que fazem aniversário hoje.
 * Detecta aniversário em duas formas:
 *  1. Tag no formato "aniv_DD/MM" ou "aniv_DD-MM" (ex: "aniv_08/03")
 *  2. Notas contendo "aniversário: DD/MM" ou "nascimento: DD/MM"
 *
 * Frequência: Todo dia às 08:00
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const hoje = new Date()
        const diaHoje = String(hoje.getDate()).padStart(2, '0')
        const mesHoje = String(hoje.getMonth() + 1).padStart(2, '0')
        const hojeStr = `${diaHoje}/${mesHoje}`
        const hojeTag = `aniv_${diaHoje}/${mesHoje}`
        const hojeTag2 = `aniv_${diaHoje}-${mesHoje}`

        const clinicas = await prisma.clinica.findMany({
            where: { status: 'ativo', evolutionInstance: { not: null } },
            select: {
                id: true,
                nomeClinica: true,
                nomeAssistente: true,
                evolutionInstance: true,
                evolutionApikey: true,
                configuracoes: true,
            },
        })

        let enviados = 0
        let erros = 0

        for (const clinica of clinicas) {
            const config = (clinica.configuracoes as any) || {}
            if (config.whatsappStatus !== 'open') continue

            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'Clínica'

            // Buscar todos contatos da clínica
            const contatos = await prisma.contato.findMany({
                where: { clinicaId: clinica.id },
                select: { id: true, nome: true, telefone: true, tags: true, notas: true },
            })

            // Filtrar aniversariantes de hoje
            const aniversariantes = contatos.filter(c => {
                // Checar tags
                const tags = (c.tags || []).map(t => t.toLowerCase())
                if (tags.includes(hojeTag.toLowerCase()) || tags.includes(hojeTag2.toLowerCase())) return true
                // Checar notas
                if (c.notas) {
                    const n = c.notas.toLowerCase()
                    if (n.includes(`aniversário: ${hojeStr}`) || n.includes(`nascimento: ${hojeStr}`) || n.includes(`aniv: ${hojeStr}`)) return true
                }
                return false
            })

            if (aniversariantes.length === 0) continue

            // Dedup por dia
            const anivKey = `aniv_${hoje.toISOString().split('T')[0]}`
            const anivEnviados: string[] = config[anivKey] || []

            for (const cliente of aniversariantes) {
                if (anivEnviados.includes(String(cliente.id))) continue
                const primeiroNome = (cliente.nome || 'Cliente').split(' ')[0]

                const msgCustom = config.mensagemAniversario || ''
                const mensagem = msgCustom
                    ? msgCustom.replace(/{nome}/g, primeiroNome).replace(/{clinica}/g, nomeClinica)
                    : `🎂 Parabéns, ${primeiroNome}!!! 🎉\n\nAqui é a ${nomeIA}, da ${nomeClinica}! 💜\n\nQue esse dia seja tão especial quanto você! Desejamos muita saúde, alegria e beleza! ✨\n\nComo presente de aniversário, preparamos algo especial para você. Venha nos visitar! 🎁\n\nUm grande abraço da equipe ${nomeClinica}! 💛`

                try {
                    const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY
                    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${clinica.evolutionInstance}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                        body: JSON.stringify({ number: cliente.telefone.replace(/\D/g, ''), text: mensagem }),
                    })
                    if (res.ok) { enviados++; anivEnviados.push(String(cliente.id)) }
                    else erros++
                } catch { erros++ }
            }

            // Salvar enviados de hoje
            if (anivEnviados.length > 0) {
                await prisma.clinica.update({
                    where: { id: clinica.id },
                    data: { configuracoes: { ...config, [anivKey]: anivEnviados } },
                })
            }
        }

        console.log(`[ANIVERSARIO] ✅ ${enviados} enviados | ${erros} erros`)
        return NextResponse.json({ ok: true, enviados, erros })
    } catch (err: any) {
        console.error('[ANIVERSARIO] ❌ Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
