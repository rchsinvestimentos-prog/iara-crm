// ============================================
// "ME LEMBRE EM 30 MIN" DE VERDADE
// ============================================
// Antes, o botão só deixava a IARA calada por mais 30 minutos — ninguém era
// lembrado. Agora, passado o tempo, a doutora (ou as profissionais, como no
// alerta de foto) recebe uma mensagem no WhatsApp com o link da triagem.
//
// O aviso sai por setTimeout; se o servidor reiniciar no meio, o Guardian
// (lib/engine/webhook-sync.ts) manda os vencidos. Tabela fora do
// schema.prisma, como whatsapp_queda: o boot nunca apaga.

import { prisma } from '@/lib/prisma'
import * as sender from '@/lib/engine/sender'

let tabelaPronta: Promise<unknown> | null = null
function garantirTabela() {
    if (!tabelaPronta) {
        tabelaPronta = prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS triagem_lembrete (
                id SERIAL PRIMARY KEY,
                clinica_id INT NOT NULL,
                contato_id INT NOT NULL,
                lembrar_em TIMESTAMPTZ NOT NULL,
                enviado_em TIMESTAMPTZ,
                tentativas INT NOT NULL DEFAULT 0,
                criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `).then(() => prisma.$executeRawUnsafe(
            // Tabela criada antes da coluna existir
            `ALTER TABLE triagem_lembrete ADD COLUMN IF NOT EXISTS tentativas INT NOT NULL DEFAULT 0`,
        )).catch(err => {
            tabelaPronta = null
            throw err
        })
    }
    return tabelaPronta
}

export async function agendarLembreteTriagem(clinicaId: number, contatoId: number, minutos: number) {
    await garantirTabela()
    // Um lembrete pendente por contato: apertar de novo só adia
    await prisma.$transaction([
        prisma.$executeRaw`
            DELETE FROM triagem_lembrete
            WHERE clinica_id = ${clinicaId} AND contato_id = ${contatoId} AND enviado_em IS NULL
        `,
        prisma.$executeRaw`
            INSERT INTO triagem_lembrete (clinica_id, contato_id, lembrar_em)
            VALUES (${clinicaId}, ${contatoId}, NOW() + ${minutos + ' minutes'}::INTERVAL)
        `,
    ])
    setTimeout(() => {
        enviarLembretesVencidos().catch(err => console.error('[Lembrete triagem] Erro ao enviar:', err))
    }, minutos * 60 * 1000 + 5000)
}

/** Manda os lembretes que já venceram. Roda pelo setTimeout e pelo Guardian. */
export async function enviarLembretesVencidos() {
    await garantirTabela()
    // Marca antes de enviar: setTimeout e Guardian juntos não mandam duas vezes
    const vencidos = await prisma.$queryRaw<{ id: number; clinica_id: number; contato_id: number }[]>`
        UPDATE triagem_lembrete SET enviado_em = NOW()
        WHERE enviado_em IS NULL AND lembrar_em <= NOW()
        RETURNING id, clinica_id, contato_id
    `
    for (const l of vencidos) {
        let resultado: 'entregue' | 'descartado' | 'falhou' = 'falhou'
        try {
            resultado = await enviarUm(l.clinica_id, l.contato_id)
        } catch (err) {
            console.error(`[Lembrete triagem] Erro no lembrete ${l.id} (contato ${l.contato_id}):`, err)
        }
        if (resultado === 'falhou') {
            // Ninguém recebeu: devolve para a fila. O Guardian tenta de novo (até 3 vezes).
            await prisma.$executeRaw`
                UPDATE triagem_lembrete
                SET enviado_em = CASE WHEN tentativas + 1 >= 3 THEN enviado_em ELSE NULL END,
                    tentativas = tentativas + 1
                WHERE id = ${l.id}
            `.catch(err => console.error(`[Lembrete triagem] Erro ao devolver o lembrete ${l.id} para a fila:`, err))
        }
    }
}

async function enviarUm(clinicaId: number, contatoId: number): Promise<'entregue' | 'descartado' | 'falhou'> {
    const contato = await prisma.contato.findFirst({ where: { id: contatoId, clinicaId } })
    const clinica = await prisma.clinica.findFirst({
        where: { id: clinicaId },
        select: { evolutionInstance: true, evolutionApikey: true, whatsappDoutora: true },
    })
    if (!contato || !clinica) {
        console.warn(`[Lembrete triagem] Contato ${contatoId} ou clínica ${clinicaId} não existe mais — lembrete descartado`)
        return 'descartado'
    }

    // A doutora já resolveu nesse meio-tempo? Toda saída da triagem apaga a
    // linha ou troca o motivo (assumir). Sem olhar pausa_ate: a pausa do
    // "me lembre" vence junto com o lembrete e daria falso "já resolvida".
    const triagem = await prisma.$queryRaw<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM status_conversa
        WHERE telefone_cliente = ${contato.telefone} AND user_id = ${clinicaId}
          AND motivo = 'triagem_pendente'
    `
    if ((triagem[0]?.n ?? 0) === 0) {
        console.log(`[Lembrete triagem] ${contato.telefone} já foi resolvida — lembrete não enviado`)
        return 'descartado'
    }

    if (!clinica.evolutionInstance) {
        console.error(`[Lembrete triagem] Clínica ${clinicaId} sem instância do WhatsApp — lembrete de ${contato.telefone} não saiu`)
        return 'falhou'
    }

    const panelUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'
    const texto = `⏰ *Lembrete:* ${contato.nome || 'a cliente'} ainda espera a sua avaliação.\n📱 ${contato.telefone}\n\nToque no link para ver as fotos e responder:\n🔗 ${panelUrl}/clientes?contatoId=${contato.id}&triage=true`

    // Mesmo destino do alerta de foto: profissionais com WhatsApp, senão a dona
    const profs = await prisma.$queryRaw<{ whatsapp: string | null }[]>`
        SELECT whatsapp FROM profissionais
        WHERE clinica_id = ${clinicaId} AND ativo = true AND whatsapp IS NOT NULL AND whatsapp <> ''
    `
    const destinos = new Set(profs.map(p => p.whatsapp as string))
    if (destinos.size === 0 && clinica.whatsappDoutora) destinos.add(clinica.whatsappDoutora)
    if (destinos.size === 0) {
        console.error(`[Lembrete triagem] Clínica ${clinicaId} sem WhatsApp de profissional nem da dona — lembrete de ${contato.telefone} não saiu`)
        return 'falhou'
    }

    let entregues = 0
    for (const telefone of destinos) {
        const ok = await sender.sendText(
            { instancia: clinica.evolutionInstance, telefone, apikey: clinica.evolutionApikey || undefined },
            texto,
        )
        if (ok) entregues++
        else console.error(`[Lembrete triagem] Falha ao mandar lembrete de ${contato.telefone} para ${telefone}`)
    }
    console.log(`[Lembrete triagem] Lembrete de ${contato.telefone} entregue a ${entregues} de ${destinos.size} número(s)`)
    // Se alguém recebeu, não reenvia (quem já recebeu ganharia duplicado)
    return entregues > 0 ? 'entregue' : 'falhou'
}
