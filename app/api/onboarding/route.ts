import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/onboarding — Retorna status real de cada etapa do onboarding
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Buscar dados da clínica
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: {
                nomeClinica: true,
                whatsappClinica: true,
                evolutionInstance: true,
                nomeAssistente: true,
                personalidadeVoz: true,
                tomAtendimento: true,
                humor: true,
                horarioSemana: true,
            },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Contar procedimentos
        let temProcedimentos = false
        try {
            const r = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint as count
                FROM procedimentos
                WHERE user_id = ${clinicaId} AND ativo = true
            `
            temProcedimentos = Number(r[0]?.count ?? 0) > 0
        } catch {
            // tabela pode não existir
        }

        // Etapa 1: Dados cadastrados — nomeClinica preenchido + pelo menos 1 procedimento + horários
        const etapa1 = !!(
            clinica.nomeClinica &&
            clinica.nomeClinica.trim() !== '' &&
            temProcedimentos &&
            clinica.horarioSemana
        )

        // Etapa 2: Secretária configurada — nomeAssistente preenchido + personalidade/tom/humor
        const etapa2 = !!(
            clinica.nomeAssistente &&
            clinica.nomeAssistente.trim() !== '' &&
            (clinica.personalidadeVoz || clinica.tomAtendimento || clinica.humor)
        )

        // Etapa 3: WhatsApp conectado — evolutionInstance existe + verificar conexão real
        let etapa3 = false
        if (clinica.evolutionInstance) {
            const evoUrl = process.env.EVOLUTION_API_URL
            const evoKey = process.env.EVOLUTION_API_KEY

            if (evoUrl && evoKey) {
                try {
                    const res = await fetch(`${evoUrl}/instance/connectionState/${clinica.evolutionInstance}`, {
                        headers: { 'apikey': evoKey },
                        signal: AbortSignal.timeout(3000),
                    })
                    const data = await res.json()
                    etapa3 = data?.instance?.state === 'open' || data?.state === 'open'
                } catch {
                    etapa3 = false
                }
            }
        }

        // Etapa 4: Contatos — pelo menos 1 contato cadastrado
        let etapa4contatos = false
        try {
            const r = await prisma.$queryRaw<{ count: bigint }[]>`
                SELECT COUNT(*)::bigint as count
                FROM contatos
                WHERE clinica_id = ${clinicaId}
            `
            etapa4contatos = Number(r[0]?.count ?? 0) > 0
        } catch {
            // tabela pode não existir
        }

        // Etapa 5: Tudo concluído (todas as anteriores OK)
        const etapa5 = etapa1 && etapa2 && etapa3 && etapa4contatos

        return NextResponse.json({
            dados: etapa1,
            secretaria: etapa2,
            conexoes: etapa3,
            contatos: etapa4contatos,
            aproveitar: etapa5,
        })
    } catch (err) {
        console.error('Erro em /api/onboarding:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
