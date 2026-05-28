import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const FollowUpSaveSchema = z.object({
    configs: z.array(z.object({
        tipo: z.string(),
        ativo: z.boolean(),
        mensagem: z.string(),
        diasDelay: z.number().int().min(1).max(365).optional().nullable(),
        procedimentoIds: z.array(z.number()).optional().default([]),
    }))
})

// Gatilhos padrão da IARA pré-carregados
const DEFAULT_CAMPAIGNS = [
    {
        tipo: 'pix_agendamento',
        mensagem: 'Oi {nome_cliente}! 💜 Seu agendamento foi pré-reservado com sucesso. Para confirmar o seu horário, envie o sinal usando o código Copia e Cola Pix da clínica abaixo:\n\n{codigo_pix}\n\nTe espero! 😊',
        ativo: true,
        diasDelay: null,
        procedimentoIds: []
    },
    {
        tipo: 'anamnese_24h',
        mensagem: 'Olá, {nome_cliente}! 💜 Falta apenas 24h para o seu atendimento! Para agilizarmos sua consulta, por favor preencha e assine sua Ficha de Anamnese digital pelo link seguro:\n\n{link_anamnese}\n\nÉ rapidinho e super seguro! Até logo.',
        ativo: true,
        diasDelay: null,
        procedimentoIds: []
    },
    {
        tipo: 'lembrete_dia',
        mensagem: 'Oi {nome_cliente}! Passando pra lembrar que hoje às {horario} é o seu horário marcado! 📍 Te aguardamos na {endereco_clinica}. Se precisar de rotas, segue o Maps:\n\n{link_maps}\n\nConfirma que está vindo? 😊',
        ativo: true,
        diasDelay: null,
        procedimentoIds: []
    },
    {
        tipo: 'pos_24h',
        mensagem: 'Olá, {nome_cliente}! Passando para saber se deu tudo certo no seu procedimento e se você está amando o resultado! 😍 Se você gostou, poderia dar uma nota rápida no Google? Nos ajuda muito:\n\n{link_avaliacao_google}\n\nLembra de seguir os cuidados recomendados!',
        ativo: true,
        diasDelay: null,
        procedimentoIds: []
    },
    {
        tipo: 'retorno_30d',
        mensagem: 'Oi {nome_cliente}! 💜 Já faz 30 dias do seu procedimento e está na hora de realizar a sua consulta de retoque para garantir que o resultado fique impecável! Vamos marcar? Qual dia fica melhor para você?',
        ativo: false,
        diasDelay: 30,
        procedimentoIds: []
    },
    {
        tipo: 'pos_3meses',
        mensagem: 'Oi {nome_cliente}! 💜 Passando pra saber como está o resultado do seu procedimento após 3 meses! Está tudo certinho e no lugar? Se precisar dar um pulinho aqui na clínica para dar uma olhadinha, é só me falar!',
        ativo: false,
        diasDelay: 90,
        procedimentoIds: []
    },
    {
        tipo: 'pos_6meses',
        mensagem: 'Oi {nome_cliente}! Já faz 6 meses desde o seu último procedimento! 😱 O tempo passa rápido, né? Que tal darmos um pulo na clínica para ver como estão as sobrancelhas e renovar o seu olhar? Me diga se quer ver os horários livres!',
        ativo: false,
        diasDelay: 180,
        procedimentoIds: []
    }
]

// GET /api/follow-up
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)

        // Buscar as configurações salvas da clínica
        let configs = await prisma.followUpConfig.findMany({
            where: { clinicaId: cid }
        })

        // Se a clínica ainda não possuir nenhuma campanha, fazemos o bootstrap das 7 padrão
        if (configs.length === 0) {
            const dataToInsert = DEFAULT_CAMPAIGNS.map(camp => ({
                clinicaId: cid,
                tipo: camp.tipo,
                mensagem: camp.mensagem,
                ativo: camp.ativo,
                diasDelay: camp.diasDelay,
                procedimentoIds: camp.procedimentoIds as any,
            }))

            // Criar em lote
            await prisma.followUpConfig.createMany({
                data: dataToInsert
            })

            configs = await prisma.followUpConfig.findMany({
                where: { clinicaId: cid }
            })
        }

        // Retornar as configs + o nível do plano para o frontend lidar com os gates de bloqueio
        const clinica = await prisma.clinica.findUnique({
            where: { id: cid },
            select: { nivel: true }
        })

        return NextResponse.json({
            nivelPlano: clinica?.nivel || 1,
            configs,
        })
    } catch (err) {
        console.error('[GET /api/follow-up] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao carregar follow-ups' }, { status: 500 })
    }
}

// POST /api/follow-up
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)

        // Validar plano da clínica no servidor para evitar burlar o frontend
        const clinica = await prisma.clinica.findUnique({
            where: { id: cid },
            select: { nivel: true }
        })

        const nivel = clinica?.nivel || 1
        if (nivel < 2) {
            return NextResponse.json({ 
                error: 'Funcionalidade exclusiva. Faça o upgrade para o Plano Pro (Nível 2) para ativar follow-ups automáticos.' 
            }, { status: 403 })
        }

        const body = await request.json()
        const validated = FollowUpSaveSchema.parse(body)

        // Atualizar ou Criar em transação
        const updates = validated.configs.map(config => {
            return prisma.followUpConfig.upsert({
                where: {
                    clinicaId_tipo: {
                        clinicaId: cid,
                        tipo: config.tipo,
                    }
                },
                update: {
                    ativo: config.ativo,
                    mensagem: config.mensagem,
                    diasDelay: config.diasDelay,
                    procedimentoIds: config.procedimentoIds as any,
                    updatedAt: new Date()
                },
                create: {
                    clinicaId: cid,
                    tipo: config.tipo,
                    ativo: config.ativo,
                    mensagem: config.mensagem,
                    diasDelay: config.diasDelay,
                    procedimentoIds: config.procedimentoIds as any,
                }
            })
        })

        await prisma.$transaction(updates)

        return NextResponse.json({ ok: true })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/follow-up] Erro:', err)
        return NextResponse.json({ error: 'Erro ao salvar follow-ups' }, { status: 500 })
    }
}
