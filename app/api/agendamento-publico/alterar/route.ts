import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarNotificacaoWhatsApp } from '@/lib/notificacao'
import { updateCalendarEventForProfissional } from '@/lib/google-calendar'

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { agendamentoId, novaData, novoHorario, telefone } = body

    if (!agendamentoId || !novaData || !novoHorario || !telefone) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 })
    }

    // Buscar agendamento existente
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
    })

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Validar que o telefone corresponde ao paciente
    const telLimpo = telefone.replace(/\D/g, '')
    const telAgendamento = agendamento.telefone.replace(/\D/g, '')
    if (!telLimpo.endsWith(telAgendamento.slice(-8)) && !telAgendamento.endsWith(telLimpo.slice(-8))) {
      return NextResponse.json({ error: 'Telefone não corresponde ao agendamento' }, { status: 403 })
    }

    // Verificar se não está cancelado
    if (agendamento.status === 'cancelado') {
      return NextResponse.json({ error: 'Agendamento já cancelado' }, { status: 400 })
    }

    const dataAnterior = agendamento.data.toISOString().split('T')[0].split('-').reverse().join('/')
    const horarioAnterior = agendamento.horario

    // Atualizar agendamento
    const updated = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: {
        data: new Date(`${novaData}T00:00:00Z`),
        horario: novoHorario,
        status: 'reagendado',
        updatedAt: new Date(),
      },
    })

    console.log(`[Alterar] ✅ Agendamento ${agendamentoId} reagendado: ${novaData} ${novoHorario}`)

    // Background: notificações
    const novaDataBR = novaData.split('-').reverse().join('/')

    notificarAlteracaoAsync({
      clinicaId: agendamento.clinicaId,
      profissionalId: agendamento.profissionalId,
      nomePaciente: agendamento.nomePaciente,
      procedimento: agendamento.procedimento,
      dataAnterior,
      horarioAnterior,
      novaDataBR,
      novoHorario,
      novaData,
      duracao: agendamento.duracao,
      googleEventId: agendamento.googleEventId,
    }).catch(err => console.error('[Alterar] Erro nas automações:', err))

    return NextResponse.json({ success: true, agendamento: updated })
  } catch (err: any) {
    console.error('Erro /api/agendamento-publico/alterar:', err)
    return NextResponse.json({ error: 'Erro ao alterar agendamento' }, { status: 500 })
  }
}

interface NotifAlteracaoParams {
  clinicaId: number
  profissionalId: string
  nomePaciente: string
  procedimento: string
  dataAnterior: string
  horarioAnterior: string
  novaDataBR: string
  novoHorario: string
  novaData: string
  duracao: number
  googleEventId: string | null
}

async function notificarAlteracaoAsync(params: NotifAlteracaoParams) {
  const {
    clinicaId, profissionalId, nomePaciente, procedimento,
    dataAnterior, horarioAnterior, novaDataBR, novoHorario,
    novaData, duracao, googleEventId
  } = params

  const clinica = await prisma.clinica.findUnique({
    where: { id: clinicaId },
    select: {
      evolutionInstance: true,
      whatsappClinica: true,
      nomeAssistente: true,
      timezone: true,
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
    `📅 *Agendamento Alterado*`,
    ``,
    `👤 *Paciente:* ${nomePaciente}`,
    `💉 *Procedimento:* ${procedimento}`,
    ``,
    `❌ *Antes:* ${dataAnterior} às ${horarioAnterior}`,
    `✅ *Agora:* ${novaDataBR} às ${novoHorario}`,
    ``,
    `_A paciente remarcou pelo link público._`,
  ].join('\n')

  // Notificar clínica
  if (instanceName && clinica?.whatsappClinica) {
    await enviarNotificacaoWhatsApp(instanceName, clinica.whatsappClinica, msg)
    console.log(`[Alterar] 📩 Notificação enviada para CLÍNICA`)
  }

  // Notificar profissional (se diferente da clínica)
  if (instanceName && profissional?.whatsapp) {
    const numClinica = clinica?.whatsappClinica?.replace(/\D/g, '') || ''
    const numProf = profissional.whatsapp.replace(/\D/g, '')
    if (numProf !== numClinica) {
      await enviarNotificacaoWhatsApp(instanceName, profissional.whatsapp, msg)
      console.log(`[Alterar] 📩 Notificação enviada para PROFISSIONAL`)
    }
  }

  // Atualizar Google Calendar
  if (googleEventId) {
    try {
      const tz = clinica?.timezone || 'America/Sao_Paulo'
      const startDateTime = `${novaData}T${novoHorario}:00`
      const endDate = new Date(`${novaData}T${novoHorario}:00`)
      endDate.setMinutes(endDate.getMinutes() + duracao)
      const endHH = String(endDate.getHours()).padStart(2, '0')
      const endMM = String(endDate.getMinutes()).padStart(2, '0')
      const endDateTime = `${novaData}T${endHH}:${endMM}:00`

      if (typeof updateCalendarEventForProfissional === 'function') {
        await updateCalendarEventForProfissional(profissionalId, googleEventId, {
          summary: `${procedimento} — ${nomePaciente} (REMARCADO)`,
          startDateTime,
          endDateTime,
          timeZone: tz,
        })
        console.log(`[Alterar] 📆 Google Calendar atualizado`)
      }
    } catch (err) {
      console.error('[Alterar] Erro ao atualizar Google Calendar:', err)
    }
  }
}
