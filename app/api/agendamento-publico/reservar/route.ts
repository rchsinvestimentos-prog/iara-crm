import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      clinicaId,
      profissionalId,
      nomePaciente,
      telefone,
      procedimento,
      data, // "2023-10-25"
      horario, // "14:30"
      duracao,
      valor
    } = body

    if (!clinicaId || !profissionalId || !nomePaciente || !telefone || !procedimento || !data || !horario) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 })
    }

    // Criar o agendamento
    // A data no banco é DateTime, podemos forçar "YYYY-MM-DDT00:00:00Z"
    // para ser consistente com as consultas DATE(data). 
    // Outra opção é converter para UTC mantendo o fuso da clinica, mas o Date do JS serve por hora (00:00Z)
    const dateObj = new Date(`${data}T00:00:00Z`)

    const novo = await prisma.agendamento.create({
      data: {
        clinicaId: Number(clinicaId),
        profissionalId: String(profissionalId),
        nomePaciente,
        telefone,
        procedimento,
        data: dateObj,
        horario,
        duracao: Number(duracao || 30),
        valor: valor ? Number(valor) : null,
        status: 'pendente',
        origem: 'link_publico',
      }
    })

    return NextResponse.json({ success: true, agendamento: novo })

  } catch (err: any) {
    console.error('Erro /api/agendamento-publico/reservar:', err)
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
  }
}
