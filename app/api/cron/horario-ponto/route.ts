import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/horario-ponto?secret=XXX&tipo=entrada|saida
 *
 * "Batendo Ponto" — IARA manda mensagem humanizada de chegada/saída
 * para clientes que conversaram recentemente (últimas 48h).
 *
 * Frequência:
 *   - Entrada: 1x por dia no horário de abertura (ex: 08:00)
 *   - Saída:   1x por dia no horário de fechamento (ex: 18:00)
 *
 * URL: https://app.iara.click/api/cron/horario-ponto?secret=XXX&tipo=entrada
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tipo = request.nextUrl.searchParams.get('tipo') || 'entrada'

    try {
        const clinicas = await prisma.clinica.findMany({
            where: { status: 'ativo', evolutionInstance: { not: null } },
            select: {
                id: true,
                nomeClinica: true,
                nomeAssistente: true,
                evolutionInstance: true,
                evolutionApikey: true,
                funcionalidades: true,
                configuracoes: true,
                horarioSemana: true,
            },
        })

        let enviados = 0
        let pulados = 0
        let erros = 0

        for (const clinica of clinicas) {
            // Verificar toggle horario_ponto (default OFF)
            let funcs: Record<string, boolean> = {}
            try {
                funcs = typeof clinica.funcionalidades === 'string'
                    ? JSON.parse(clinica.funcionalidades)
                    : (clinica.funcionalidades || {})
            } catch { /* default */ }
            // Este toggle é OFF por padrão
            if (funcs.horario_ponto !== true) { pulados++; continue }

            const config = (clinica.configuracoes as any) || {}
            if (config.whatsappStatus !== 'open') { pulados++; continue }

            const nomeIA = clinica.nomeAssistente || 'IARA'
            const nomeClinica = clinica.nomeClinica || 'Clínica'
            const instanceName = clinica.evolutionInstance!
            const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY

            // Rastrear quem já recebeu ponto hoje
            const pontoKey = `ponto_${tipo}_${new Date().toISOString().split('T')[0]}`
            const pontoEnviados: string[] = config[pontoKey] || []

            // Buscar contatos que conversaram nas últimas 48h (leads quentes)
            const h48atras = new Date(Date.now() - 48 * 60 * 60 * 1000)

            try {
                const contatos = await prisma.contato.findMany({
                    where: {
                        clinicaId: clinica.id,
                        updatedAt: { gte: h48atras },
                        etapa: { notIn: ['bloqueado', 'atendida'] },
                        telefone: { not: null },
                    },
                    select: { id: true, nome: true, telefone: true },
                    take: 15, // Limite por clínica
                })

                for (const contato of contatos) {
                    if (!contato.telefone) continue
                    if (pontoEnviados.includes(String(contato.id))) continue

                    const primeiroNome = (contato.nome || '').split(' ')[0] || 'querida'

                    const mensagem = tipo === 'entrada'
                        ? `Bom dia, ${primeiroNome}! ☀️ Aqui é a ${nomeIA}. A ${nomeClinica} já está aberta e pronta pra te atender! Se quiser agendar algo pra hoje, é só me falar 😊💛`
                        : `Oi ${primeiroNome}! 🌙 A ${nomeClinica} está encerrando o expediente por hoje. Se precisar de algo amanhã, já pode me mandar mensagem que eu respondo assim que abrirmos! Boa noite 💛✨`

                    try {
                        const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                            body: JSON.stringify({ number: contato.telefone.replace(/\D/g, ''), text: mensagem }),
                        })
                        if (res.ok) {
                            enviados++
                            pontoEnviados.push(String(contato.id))
                        } else erros++
                    } catch { erros++ }
                }

                // Salvar quem já recebeu
                if (pontoEnviados.length > 0) {
                    await prisma.clinica.update({
                        where: { id: clinica.id },
                        data: { configuracoes: { ...config, [pontoKey]: pontoEnviados.slice(-500) } },
                    })
                }
            } catch (e) {
                console.error(`[PONTO] Erro clínica ${clinica.id}:`, e)
                erros++
            }
        }

        console.log(`[PONTO-${tipo.toUpperCase()}] ✅ ${enviados} enviados | ${pulados} pulados | ${erros} erros`)
        return NextResponse.json({ ok: true, tipo, enviados, pulados, erros })
    } catch (err: any) {
        console.error(`[PONTO] ❌ Erro geral:`, err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
