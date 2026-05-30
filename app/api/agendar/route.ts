import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/agendar?slug=dra-maria — Dados públicos do profissional
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const profissionalId = searchParams.get('profissionalId')
    const data = searchParams.get('data') // YYYY-MM-DD

    if (!slug && !profissionalId) {
      return NextResponse.json({ error: 'slug ou profissionalId obrigatório' }, { status: 400 })
    }

    // Busca profissional pelo slug ou ID
    const profissional = await prisma.profissional.findFirst({
      where: slug
        ? { linkAgendamento: slug, ativo: true }
        : { id: profissionalId!, ativo: true },
      select: {
        id: true,
        nome: true,
        bio: true,
        especialidade: true,
        fotoUrl: true,
        whatsapp: true,
        chavePix: true,
        linkPagamento: true,
        horarioSemana: true,
        almocoSemana: true,
        atendeSabado: true,
        horarioSabado: true,
        almocoSabado: true,
        atendeDomingo: true,
        horarioDomingo: true,
        almocoDomingo: true,
        intervaloAtendimento: true,
        clinicaId: true,
        clinica: {
          select: {
            nomeClinica: true,
            nome: true,
            avatarFotos: true,
            horarioSemana: true,
            almocoSemana: true,
            atendeSabado: true,
            horarioSabado: true,
            almocoSabado: true,
            atendeDomingo: true,
            horarioDomingo: true,
            almocoDomingo: true,
            intervaloAtendimento: true,
          }
        },
        procedimentos: {
          where: { ativo: true },
          select: {
            id: true,
            nome: true,
            valor: true,
            desconto: true,
            duracao: true,
            descricao: true,
          },
          orderBy: { nome: 'asc' }
        }
      }
    })

    if (!profissional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Se pediu uma data específica, retorna slots ocupados
    let slotsOcupados: string[] = []
    if (data) {
      const dia = new Date(data)
      const proximoDia = new Date(dia)
      proximoDia.setDate(proximoDia.getDate() + 1)

      const agendamentos = await prisma.agendamento.findMany({
        where: {
          profissionalId: profissional.id,
          data: { gte: dia, lt: proximoDia },
          status: { notIn: ['cancelado', 'reagendado'] }
        },
        select: { horario: true, duracao: true }
      })

      slotsOcupados = agendamentos.map(a => a.horario)
    }

    // Herda horários da clínica se profissional não tem
    const clinica = profissional.clinica
    const horarios = {
      horarioSemana: profissional.horarioSemana || clinica.horarioSemana || '08:00 às 18:00',
      almocoSemana: profissional.almocoSemana || clinica.almocoSemana || '12:00 às 13:00',
      atendeSabado: profissional.atendeSabado ?? clinica.atendeSabado ?? false,
      horarioSabado: profissional.horarioSabado || clinica.horarioSabado || '08:00 às 12:00',
      almocoSabado: profissional.almocoSabado || clinica.almocoSabado || '',
      atendeDomingo: profissional.atendeDomingo ?? clinica.atendeDomingo ?? false,
      horarioDomingo: profissional.horarioDomingo || clinica.horarioDomingo || '',
      almocoDomingo: profissional.almocoDomingo || clinica.almocoDomingo || '',
      intervalo: profissional.intervaloAtendimento || clinica.intervaloAtendimento || 15,
    }

    return NextResponse.json({
      profissional: {
        id: profissional.id,
        nome: profissional.nome,
        bio: profissional.bio,
        especialidade: profissional.especialidade,
        fotoUrl: profissional.fotoUrl,
        chavePix: profissional.chavePix,
        linkPagamento: profissional.linkPagamento,
      },
      clinica: {
        nome: clinica.nomeClinica || clinica.nome,
        logo: Array.isArray(clinica.avatarFotos) && (clinica.avatarFotos as string[]).length > 0
          ? (clinica.avatarFotos as string[])[0]
          : null,
      },
      procedimentos: profissional.procedimentos,
      horarios,
      slotsOcupados,
    })
  } catch (error) {
    console.error('Erro em GET /api/agendar:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/agendar — Criar agendamento via link público (SEM autenticação)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profissionalId, nomePaciente, telefone, procedimento, data, horario, duracao, procedimentoId } = body

    if (!profissionalId || !nomePaciente || !telefone || !procedimento || !data || !horario) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios' }, { status: 400 })
    }

    // Valida profissional
    const prof = await prisma.profissional.findFirst({
      where: { id: profissionalId, ativo: true },
      select: { id: true, clinicaId: true, nome: true }
    })

    if (!prof) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Verifica conflito
    const conflito = await prisma.agendamento.findFirst({
      where: {
        profissionalId,
        data: new Date(data),
        horario,
        status: { notIn: ['cancelado', 'reagendado'] }
      }
    })

    if (conflito) {
      return NextResponse.json({ error: 'Esse horário já está ocupado. Escolha outro.' }, { status: 409 })
    }

    // Busca valor do procedimento se informado o ID
    let valor = null
    if (procedimentoId) {
      const proc = await prisma.procedimento.findUnique({
        where: { id: procedimentoId },
        select: { valor: true }
      })
      if (proc) valor = proc.valor
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        clinicaId: prof.clinicaId,
        profissionalId,
        nomePaciente,
        telefone,
        procedimento,
        data: new Date(data),
        horario,
        duracao: duracao || 30,
        valor,
        origem: 'link_publico',
        status: 'pendente'
      }
    })

    return NextResponse.json({
      ok: true,
      agendamento: {
        id: agendamento.id,
        data: agendamento.data,
        horario: agendamento.horario,
        profissional: prof.nome,
      },
      mensagem: `Agendamento recebido! Você receberá uma confirmação em breve.`
    }, { status: 201 })
  } catch (error) {
    console.error('Erro em POST /api/agendar:', error)
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
  }
}
