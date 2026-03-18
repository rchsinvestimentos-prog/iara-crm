import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/calendario — Lista agendamentos com filtros
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const profissionalId = searchParams.get('profissionalId')
    const status = searchParams.get('status')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const data = searchParams.get('data') // dia específico

    // Monta filtros dinâmicos
    const where: Record<string, unknown> = { clinicaId }

    if (profissionalId) where.profissionalId = profissionalId
    if (status) where.status = status

    if (data) {
      // Dia específico
      const dia = new Date(data)
      const proximoDia = new Date(dia)
      proximoDia.setDate(proximoDia.getDate() + 1)
      where.data = { gte: dia, lt: proximoDia }
    } else if (dataInicio || dataFim) {
      const filtroData: Record<string, Date> = {}
      if (dataInicio) filtroData.gte = new Date(dataInicio)
      if (dataFim) filtroData.lte = new Date(dataFim)
      where.data = filtroData
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        profissional: {
          select: { id: true, nome: true, especialidade: true, fotoUrl: true }
        }
      },
      orderBy: [{ data: 'asc' }, { horario: 'asc' }]
    })

    return NextResponse.json(agendamentos)
  } catch (error) {
    console.error('Erro em GET /api/calendario:', error)
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
  }
}

// POST /api/calendario — Criar agendamento
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

    const body = await request.json()
    const { profissionalId, nomePaciente, telefone, procedimento, data, horario, duracao, valor, observacao, contatoId } = body

    if (!profissionalId || !nomePaciente || !telefone || !procedimento || !data || !horario) {
      return NextResponse.json({ error: 'Campos obrigatórios: profissionalId, nomePaciente, telefone, procedimento, data, horario' }, { status: 400 })
    }

    // Verifica conflito de horário
    const conflito = await prisma.agendamento.findFirst({
      where: {
        profissionalId,
        data: new Date(data),
        horario,
        status: { notIn: ['cancelado', 'reagendado'] }
      }
    })

    if (conflito) {
      return NextResponse.json({ error: 'Horário já ocupado por outro agendamento' }, { status: 409 })
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        clinicaId,
        profissionalId,
        nomePaciente,
        telefone,
        procedimento,
        data: new Date(data),
        horario,
        duracao: duracao || 30,
        valor: valor || null,
        observacao: observacao || null,
        contatoId: contatoId || null,
        origem: 'painel',
        status: 'pendente'
      },
      include: {
        profissional: {
          select: { id: true, nome: true, especialidade: true }
        }
      }
    })

    return NextResponse.json(agendamento, { status: 201 })
  } catch (error) {
    console.error('Erro em POST /api/calendario:', error)
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
  }
}

// PATCH /api/calendario — Atualizar agendamento (status, reagendar, etc)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

    const body = await request.json()
    const { id, status, data, horario, observacao, nomePaciente, telefone, procedimento, duracao } = body

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    // Verifica se pertence à clínica
    const existente = await prisma.agendamento.findFirst({
      where: { id, clinicaId }
    })

    if (!existente) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    // Monta update dinâmico
    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (data) updateData.data = new Date(data)
    if (horario) updateData.horario = horario
    if (observacao !== undefined) updateData.observacao = observacao
    if (nomePaciente) updateData.nomePaciente = nomePaciente
    if (telefone) updateData.telefone = telefone
    if (procedimento) updateData.procedimento = procedimento
    if (duracao) updateData.duracao = duracao

    // Se mudou data/horario, verifica conflito
    if ((data || horario) && status !== 'cancelado') {
      const novaData = data ? new Date(data) : existente.data
      const novoHorario = horario || existente.horario

      const conflito = await prisma.agendamento.findFirst({
        where: {
          profissionalId: existente.profissionalId,
          data: novaData,
          horario: novoHorario,
          id: { not: id },
          status: { notIn: ['cancelado', 'reagendado'] }
        }
      })

      if (conflito) {
        return NextResponse.json({ error: 'Horário já ocupado' }, { status: 409 })
      }
    }

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: updateData,
      include: {
        profissional: {
          select: { id: true, nome: true, especialidade: true }
        }
      }
    })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error('Erro em PATCH /api/calendario:', error)
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 })
  }
}

// DELETE /api/calendario — Remover agendamento
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const clinicaId = await getClinicaId(session)
    if (!clinicaId) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    // Verifica se pertence à clínica
    const existente = await prisma.agendamento.findFirst({
      where: { id, clinicaId }
    })

    if (!existente) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })

    await prisma.agendamento.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro em DELETE /api/calendario:', error)
    return NextResponse.json({ error: 'Erro ao remover agendamento' }, { status: 500 })
  }
}
