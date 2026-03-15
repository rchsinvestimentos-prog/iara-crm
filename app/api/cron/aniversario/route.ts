import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const CRON_SECRET = process.env.CRON_SECRET || ''
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

/**
 * GET /api/cron/aniversario?secret=XXX
 *
 * Fluxo completo de aniversário:
 *  1. Dia 1 do mês → aviso mensal para aniversariantes do mês (se ativo)
 *  2. No dia do aniversário → parabéns + desconto (se ativo)
 *  3. 7, 15, 25 dias depois → lembretes de desconto (se ativo)
 *  + Lista VIP: envia para a Dra a lista de aniversariantes no dia 1
 *
 * Usa o campo `dataNascimento` do model Contato.
 * Frequência: Todo dia às 08:00
 */
export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret')
    if (!secret || secret !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const hoje = new Date()
        const diaHoje = hoje.getDate()
        const mesHoje = hoje.getMonth() + 1 // 1-indexed

        const clinicas = await prisma.clinica.findMany({
            where: { status: 'ativo', evolutionInstance: { not: null } },
            select: {
                id: true, nomeClinica: true, nomeAssistente: true,
                evolutionInstance: true, evolutionApikey: true,
                configuracoes: true, telefoneDra: true,
            },
        })

        let enviados = 0
        let erros = 0

        for (const clinica of clinicas) {
            const config = (clinica.configuracoes as any) || {}
            if (config.whatsappStatus !== 'open') continue

            const anivConfig = config.aniversarioConfig || {}
            const nomeClinica = clinica.nomeClinica || 'Clínica'

            // Buscar contatos COM dataNascimento
            const contatos = await prisma.contato.findMany({
                where: { clinicaId: clinica.id, dataNascimento: { not: null } },
                select: { id: true, nome: true, telefone: true, dataNascimento: true, tags: true, notas: true },
            })

            if (contatos.length === 0) continue

            // Dedup key para hoje
            const anivKey = `aniv_${hoje.toISOString().split('T')[0]}`
            const anivEnviados: string[] = config[anivKey] || []

            // ── DIA 1: Aviso mensal + Lista VIP ──
            if (diaHoje === 1) {
                const anivMes = contatos.filter(c => {
                    const d = new Date(c.dataNascimento!)
                    return d.getMonth() + 1 === mesHoje
                })

                if (anivMes.length > 0) {
                    // Lista VIP para a Dra
                    if (anivConfig.listaVipMensal && (clinica as any).telefoneDra) {
                        const lista = anivMes.map(c => {
                            const d = new Date(c.dataNascimento!)
                            return `• ${c.nome} — dia ${d.getDate()}`
                        }).join('\n')
                        const msgVip = `👑 Lista VIP — Aniversariantes de ${mesNome(mesHoje)}\n\n${lista}\n\nTotal: ${anivMes.length} aniversariante(s) 🎂`
                        await enviarMsg(clinica, (clinica as any).telefoneDra, msgVip)
                    }

                    // Aviso mensal para cada aniversariante
                    if (anivConfig.avisoMensal) {
                        for (const c of anivMes) {
                            const key = `mensal_${c.id}`
                            if (anivEnviados.includes(key)) continue
                            const nome1 = (c.nome || 'Cliente').split(' ')[0]
                            const msg = montarMsg(anivConfig.mensagemDesconto || '', nome1, nomeClinica, anivConfig)
                                || `💜 ${nome1}, seu aniversário é esse mês! A ${nomeClinica} preparou algo especial pra você! 🎁✨`
                            const ok = await enviarMsg(clinica, c.telefone, msg)
                            if (ok) { enviados++; anivEnviados.push(key) } else erros++
                        }
                    }
                }
            }

            // ── ANIVERSÁRIO HOJE ──
            const anivHoje = contatos.filter(c => {
                const d = new Date(c.dataNascimento!)
                return d.getDate() === diaHoje && d.getMonth() + 1 === mesHoje
            })

            if (anivConfig.parabensDia) {
                for (const c of anivHoje) {
                    const key = `parabens_${c.id}`
                    if (anivEnviados.includes(key)) continue
                    const nome1 = (c.nome || 'Cliente').split(' ')[0]
                    let msg = montarMsg(anivConfig.mensagemParabens || '', nome1, nomeClinica, anivConfig)
                        || `🎂 Parabéns, ${nome1}!!! 🎉\n\nAqui é da ${nomeClinica}! Que esse dia seja tão especial quanto você! 💜✨`

                    // Adicionar desconto se ativo
                    if (anivConfig.descontoAtivo) {
                        msg += `\n\n🎁 Presente: ${anivConfig.descontoPct || 10}% de desconto válido por ${anivConfig.descontoValidade || 30} dias!`
                    }
                    // Combo
                    if (anivConfig.comboAtivo && anivConfig.comboDescricao) {
                        msg += `\n\n✨ ${anivConfig.comboDescricao}`
                    }
                    // Cupom
                    if (anivConfig.cupomAtivo) {
                        const cupom = `${anivConfig.cupomPrefixo || 'ANIV'}-${nome1.toUpperCase()}-${hoje.getFullYear()}`
                        msg += `\n\n🎟️ Seu cupom: ${cupom}`
                    }

                    const ok = await enviarMsg(clinica, c.telefone, msg)
                    if (ok) { enviados++; anivEnviados.push(key) } else erros++
                }
            }

            // ── LEMBRETES PÓS-ANIVERSÁRIO ──
            // Para cada contato, verificar se está X dias depois do aniversário
            if (anivConfig.descontoAtivo) {
                for (const c of contatos) {
                    const d = new Date(c.dataNascimento!)
                    const anivEsteAno = new Date(hoje.getFullYear(), d.getMonth(), d.getDate())
                    const diasDepois = Math.floor((hoje.getTime() - anivEsteAno.getTime()) / (1000 * 60 * 60 * 24))

                    const nome1 = (c.nome || 'Cliente').split(' ')[0]
                    const validade = anivConfig.descontoValidade || 30
                    const desconto = anivConfig.descontoPct || 10

                    // 7 dias depois
                    if (diasDepois === 7 && anivConfig.lembretePos7) {
                        const key = `lembrete7_${c.id}`
                        if (!anivEnviados.includes(key)) {
                            const msg = `💜 ${nome1}, ainda dá tempo! Seu desconto de aniversário de ${desconto}% continua valendo! Faltam ${validade - 7} dias. Quer agendar? 😊`
                            const ok = await enviarMsg(clinica, c.telefone, msg)
                            if (ok) { enviados++; anivEnviados.push(key) } else erros++
                        }
                    }

                    // 15 dias depois
                    if (diasDepois === 15 && anivConfig.lembretePos15) {
                        const key = `lembrete15_${c.id}`
                        if (!anivEnviados.includes(key)) {
                            const msg = `✨ ${nome1}, seu presente de aniversário (${desconto}% OFF) ainda está disponível! Restam ${validade - 15} dias. Aproveite! 🎁`
                            const ok = await enviarMsg(clinica, c.telefone, msg)
                            if (ok) { enviados++; anivEnviados.push(key) } else erros++
                        }
                    }

                    // 25 dias depois (último aviso)
                    if (diasDepois === 25 && anivConfig.ultimoAviso25) {
                        const key = `ultimo_${c.id}`
                        if (!anivEnviados.includes(key)) {
                            const msg = `🔔 ${nome1}, ÚLTIMO AVISO! Seu desconto de aniversário de ${desconto}% expira em ${validade - 25} dias! Não deixe essa chance passar! 💜`
                            const ok = await enviarMsg(clinica, c.telefone, msg)
                            if (ok) { enviados++; anivEnviados.push(key) } else erros++
                        }
                    }
                }
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

// ── Helpers ──

function mesNome(m: number): string {
    return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m - 1]
}

function montarMsg(template: string, nome: string, clinica: string, config: any): string {
    if (!template) return ''
    return template
        .replace(/{nome}/g, nome)
        .replace(/{clinica}/g, clinica)
        .replace(/{desconto}/g, String(config.descontoPct || 10))
        .replace(/{validade}/g, String(config.descontoValidade || 30))
}

async function enviarMsg(clinica: any, telefone: string, text: string): Promise<boolean> {
    try {
        const apiKey = clinica.evolutionApikey || EVOLUTION_API_KEY
        const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${clinica.evolutionInstance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ number: telefone.replace(/\D/g, ''), text }),
        })
        return res.ok
    } catch { return false }
}
