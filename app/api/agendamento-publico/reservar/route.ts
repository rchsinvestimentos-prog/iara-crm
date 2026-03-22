import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarNotificacaoWhatsApp } from '@/lib/notificacao'
import { createCalendarEventForProfissional } from '@/lib/google-calendar'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      clinicaId,
      profissionalId,
      nomePaciente,
      telefone,
      procedimento,
      data, // "2025-10-25"
      horario, // "14:30"
      duracao,
      valor
    } = body

    if (!clinicaId || !profissionalId || !nomePaciente || !telefone || !procedimento || !data || !horario) {
      return NextResponse.json({ error: 'Faltam campos obrigatórios' }, { status: 400 })
    }

    const dateObj = new Date(`${data}T00:00:00Z`)
    const duracaoMin = Number(duracao || 30)

    // =========================================
    // 1. Criar agendamento interno
    // =========================================
    const novo = await prisma.agendamento.create({
      data: {
        clinicaId: Number(clinicaId),
        profissionalId: String(profissionalId),
        nomePaciente,
        telefone,
        procedimento,
        data: dateObj,
        horario,
        duracao: duracaoMin,
        valor: valor ? Number(valor) : null,
        status: 'pendente',
        origem: 'link_publico',
      }
    })

    console.log(`[Reservar] ✅ Agendamento criado: ${novo.id}`)

    // =========================================
    // 2. Automações em background (não bloqueia a resposta)
    // =========================================
    const dataBR = data.split('-').reverse().join('/')

    dispararAutomacoesAsync({
      clinicaId: Number(clinicaId),
      profissionalId: String(profissionalId),
      nomePaciente,
      telefone,
      procedimento,
      dataBR,
      horario,
      data,
      duracaoMin,
      agendamentoId: novo.id,
    }).catch(err => console.error('[Reservar] Erro nas automações:', err))

    return NextResponse.json({ success: true, agendamento: novo })

  } catch (err: any) {
    console.error('Erro /api/agendamento-publico/reservar:', err)
    return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 })
  }
}

// =========================================
// AUTOMAÇÕES PÓS-AGENDAMENTO
// =========================================

interface AutomacaoParams {
  clinicaId: number
  profissionalId: string
  nomePaciente: string
  telefone: string
  procedimento: string
  dataBR: string
  horario: string
  data: string // YYYY-MM-DD
  duracaoMin: number
  agendamentoId: string
}

async function dispararAutomacoesAsync(params: AutomacaoParams) {
  const {
    clinicaId, profissionalId, nomePaciente, telefone,
    procedimento, dataBR, horario, data, duracaoMin, agendamentoId
  } = params

  // Buscar dados da clínica
  const clinica = await prisma.clinica.findUnique({
    where: { id: clinicaId },
    select: {
      evolutionInstance: true,
      whatsappClinica: true,
      whatsappDoutora: true,
      nomeClinica: true,
      nomeAssistente: true,
      timezone: true,
    }
  })

  // Buscar dados da profissional
  const profissional = await prisma.profissional.findUnique({
    where: { id: profissionalId },
  }) as any

  const instanceName = clinica?.evolutionInstance
  const nomeProfissional = profissional
    ? (profissional.tratamento ? `${profissional.tratamento} ${profissional.nome}` : profissional.nome)
    : 'Profissional'
  const tz = clinica?.timezone || 'America/Sao_Paulo'
  const profSlug = (profissional?.linkConfig as any)?.slug || null

  // ─── A) Notificação WhatsApp para a CLÍNICA ───
  if (instanceName && clinica?.whatsappClinica) {
    const msgClinica = [
      `📅 *Novo Agendamento pelo Link!*`,
      ``,
      `👤 *Paciente:* ${nomePaciente}`,
      `📱 *Telefone:* ${telefone}`,
      `💉 *Procedimento:* ${procedimento}`,
      `🗓 *Data:* ${dataBR} às ${horario}`,
      `👩‍⚕️ *Profissional:* ${nomeProfissional}`,
      ``,
      profSlug ? `🔗 *Link de gerenciamento:* https://iara.click/a/${profSlug}/agendamento/${agendamentoId}` : '',
      ``,
      `_Agendamento feito pelo link público da ${clinica.nomeAssistente || 'IARA'}._`,
    ].join('\n')

    await enviarNotificacaoWhatsApp(instanceName, clinica.whatsappClinica, msgClinica)
    console.log(`[Reservar] 📩 Notificação enviada para CLÍNICA (${clinica.whatsappClinica})`)
  }

  // ─── B) Notificação WhatsApp para a PROFISSIONAL ───
  if (instanceName && profissional?.whatsapp) {
    const whatsappProf = profissional.whatsapp

    // Evitar envio duplicado se o número da profissional = número da clínica
    const numClinica = clinica?.whatsappClinica?.replace(/\D/g, '') || ''
    const numProf = whatsappProf.replace(/\D/g, '')

    if (numProf !== numClinica) {
      const msgProf = [
        `📅 *Novo Agendamento!*`,
        ``,
        `👤 *Paciente:* ${nomePaciente}`,
        `📱 *Telefone:* ${telefone}`,
        `💉 *Procedimento:* ${procedimento}`,
        `🗓 *Data:* ${dataBR} às ${horario}`,
        ``,
        profSlug ? `🔗 *Remarcar/Cancelar:* https://iara.click/a/${profSlug}/agendamento/${agendamentoId}` : '',
        ``,
        `_Agendamento feito pelo seu link público._`,
      ].join('\n')

      await enviarNotificacaoWhatsApp(instanceName, whatsappProf, msgProf)
      console.log(`[Reservar] 📩 Notificação enviada para PROFISSIONAL (${whatsappProf})`)
    }
  }

  // ─── C) Google Calendar ───
  try {
    const startDateTime = `${data}T${horario}:00`
    const endDate = new Date(`${data}T${horario}:00`)
    endDate.setMinutes(endDate.getMinutes() + duracaoMin)
    const endHH = String(endDate.getHours()).padStart(2, '0')
    const endMM = String(endDate.getMinutes()).padStart(2, '0')
    const endDateTime = `${data}T${endHH}:${endMM}:00`

    const evento = await createCalendarEventForProfissional(profissionalId, {
      summary: `${procedimento} — ${nomePaciente}`,
      description: [
        `Agendado pelo link público.`,
        `Paciente: ${nomePaciente}`,
        `Telefone: ${telefone}`,
        `Procedimento: ${procedimento}`,
        `Duração: ${duracaoMin}min`,
      ].join('\n'),
      startDateTime,
      endDateTime,
      timeZone: tz,
    })

    if (evento?.id) {
      // Salvar googleEventId no agendamento
      await prisma.agendamento.updateMany({
        where: {
          clinicaId,
          profissionalId,
          horario,
          data: new Date(`${data}T00:00:00Z`),
          nomePaciente,
        },
        data: { googleEventId: evento.id },
      })
      console.log(`[Reservar] 📆 Google Calendar: evento criado (${evento.id})`)
    } else {
      console.log(`[Reservar] ⚠️ Google Calendar: sem token ou falha (continuando sem)`)
    }
  } catch (err) {
    console.error('[Reservar] Erro ao criar evento no Google Calendar:', err)
  }

  // ─── D) CRM: mover contato para "agendada" ───
  try {
    await prisma.contato.updateMany({
      where: {
        clinicaId,
        telefone: telefone.replace(/\D/g, ''),
      },
      data: {
        etapa: 'agendada',
        updatedAt: new Date(),
      },
    })
    console.log(`[Reservar] 📋 CRM: contato ${telefone} → agendada`)
  } catch (err) {
    // Pode falhar se o contato não existe no CRM — isso é ok
    console.log(`[Reservar] CRM: contato não encontrado (ok, paciente novo)`)
  }
}
