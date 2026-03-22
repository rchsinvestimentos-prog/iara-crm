import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarNotificacaoWhatsApp } from '@/lib/notificacao'

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { agendamentoId, telefone, motivo } = body

    if (!agendamentoId || !telefone) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 })
    }

    // Buscar agendamento
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
    })

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Validar telefone
    const telLimpo = telefone.replace(/\D/g, '')
    const telAgendamento = agendamento.telefone.replace(/\D/g, '')
    if (!telLimpo.endsWith(telAgendamento.slice(-8)) && !telAgendamento.endsWith(telLimpo.slice(-8))) {
      return NextResponse.json({ error: 'Telefone não corresponde ao agendamento' }, { status: 403 })
    }

    if (agendamento.status === 'cancelado') {
      return NextResponse.json({ error: 'Agendamento já cancelado' }, { status: 400 })
    }

    // Cancelar agendamento
    const updated = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: {
        status: 'cancelado',
        observacao: motivo ? `Cancelado pela paciente: ${motivo}` : 'Cancelado pela paciente via link público',
        updatedAt: new Date(),
      },
    })

    console.log(`[Cancelar] ✅ Agendamento ${agendamentoId} cancelado`)

    // Background: notificações
    const dataBR = agendamento.data.toISOString().split('T')[0].split('-').reverse().join('/')

    notificarCancelamentoAsync({
      clinicaId: agendamento.clinicaId,
      profissionalId: agendamento.profissionalId,
      nomePaciente: agendamento.nomePaciente,
      procedimento: agendamento.procedimento,
      dataBR,
      horario: agendamento.horario,
      motivo: motivo || null,
      googleEventId: agendamento.googleEventId,
    }).catch(err => console.error('[Cancelar] Erro nas automações:', err))

    return NextResponse.json({ success: true, agendamento: updated })
  } catch (err: any) {
    console.error('Erro /api/agendamento-publico/cancelar:', err)
    return NextResponse.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 })
  }
}

interface NotifCancelParams {
  clinicaId: number
  profissionalId: string
  nomePaciente: string
  procedimento: string
  dataBR: string
  horario: string
  motivo: string | null
  googleEventId: string | null
}

async function notificarCancelamentoAsync(params: NotifCancelParams) {
  const {
    clinicaId, profissionalId, nomePaciente, procedimento,
    dataBR, horario, motivo, googleEventId
  } = params

  const clinica = await prisma.clinica.findUnique({
    where: { id: clinicaId },
    select: {
      evolutionInstance: true,
      whatsappClinica: true,
      nomeAssistente: true,
    }
  })

  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
    select: { nome: true, whatsapp: true, tratamento: true }
  })

  const instanceName = clinica?.evolutionInstance
  const nomeProfissional = profissional
    ? (profissional.tratamento ? `${profissional.tratamento} ${profissional.nome}` : profissional.nome)
    : 'Profissional'

  const msg = [
    `❌ *Agendamento Cancelado*`,
    ``,
    `👤 *Paciente:* ${nomePaciente}`,
    `💉 *Procedimento:* ${procedimento}`,
    `🗓 *Data:* ${dataBR} às ${horario}`,
    `👩‍⚕️ *Profissional:* ${nomeProfissional}`,
    motivo ? `\n💬 *Motivo:* ${motivo}` : '',
    ``,
    `_Cancelado pela paciente via link público._`,
  ].filter(Boolean).join('\n')

  // Notificar clínica
  if (instanceName && clinica?.whatsappClinica) {
    await enviarNotificacaoWhatsApp(instanceName, clinica.whatsappClinica, msg)
    console.log(`[Cancelar] 📩 Notificação enviada para CLÍNICA`)
  }

  // Notificar profissional
  if (instanceName && profissional?.whatsapp) {
    const numClinica = clinica?.whatsappClinica?.replace(/\D/g, '') || ''
    const numProf = profissional.whatsapp.replace(/\D/g, '')
    if (numProf !== numClinica) {
      await enviarNotificacaoWhatsApp(instanceName, profissional.whatsapp, msg)
      console.log(`[Cancelar] 📩 Notificação enviada para PROFISSIONAL`)
    }
  }

  // Deletar evento do Google Calendar
  if (googleEventId) {
    try {
      // Tentar importar a função de deletar
      const { deleteCalendarEventForProfissional } = await import('@/lib/google-calendar')
      if (typeof deleteCalendarEventForProfissional === 'function') {
        await deleteCalendarEventForProfissional(profissionalId, googleEventId)
        console.log(`[Cancelar] 📆 Google Calendar: evento removido`)
      }
    } catch (err) {
      console.error('[Cancelar] Erro ao remover evento do Calendar:', err)
    }
  }
}
