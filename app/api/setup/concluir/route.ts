import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { nomeClinica, nomeDra, especialidade, whatsapp, procedimentos, horaInicio, horaFim, diasSemana } = body

        // 1. Atualizar clínica
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                nomeClinica: nomeClinica || null,
                nome: nomeDra || undefined, // Atualizar o nome da Dra se preenchido
                diferenciais: especialidade || null, // Especialidade salva nos diferenciais
                whatsappClinica: whatsapp || null,
                horarioSemana: `${horaInicio || '08:00'} às ${horaFim || '18:00'}`,
            },
        })

        // 2. Inserir procedimentos (limpar antigos primeiro, precaução)
        if (procedimentos && Array.isArray(procedimentos)) {
            // Conversão manual se o clinicaId no DB for Int mas o model pede String (ver schema original)
            const cId = String(clinicaId)
            await prisma.procedimento.deleteMany({
                where: { clinicaId: cId },
            })

            const procsToInsert = procedimentos
                .filter(p => p.nome && p.nome.trim() !== '')
                .map(p => {
                    const precoStr = String(p.valor || '0').replace('.', '').replace(',', '.')
                    const preco = parseFloat(precoStr)
                    const precoFinal = isNaN(preco) ? 0 : preco

                    return {
                        clinicaId: cId,
                        nome: p.nome,
                        valor: precoFinal,
                        duracao: p.duracao || '30 min',
                        ativo: true,
                    }
                })

            if (procsToInsert.length > 0) {
                await prisma.procedimento.createMany({
                    data: procsToInsert,
                })
            }
        }

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('Erro no Setup:', err)
        return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
    }
}
