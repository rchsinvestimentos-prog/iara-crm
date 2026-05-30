import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      select: {
        id: true,
        nomePaciente: true,
        telefone: true,
        procedimento: true,
        data: true,
        horario: true,
        status: true,
        duracao: true,
        observacao: true,
        clinicaId: true,
        profissionalId: true,
      },
    })

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Buscar nome do profissional
    const profissional = await prisma.profissional.findUnique({
      where: { id: agendamento.profissionalId },
      select: { nome: true, tratamento: true },
    })

    // Buscar horários disponíveis (para reagendamento)
    const clinica = await prisma.clinica.findUnique({
      where: { id: agendamento.clinicaId },
      select: { nomeClinica: true },
    })

    const nomeProfissional = profissional
      ? (profissional.tratamento ? `${profissional.tratamento} ${profissional.nome}` : profissional.nome)
      : 'Profissional'

    return NextResponse.json({
      ...agendamento,
      data: agendamento.data.toISOString().split('T')[0],
      nomeProfissional,
      nomeClinica: clinica?.nomeClinica || '',
    })
  } catch (err: any) {
    console.error('Erro /api/agendamento-publico/detalhe:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
