import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper para converter "08:00 às 18:00" em { inicioHora, inicioMinuto, fimHora, fimMinuto }
export function parseHorariosString(texto: string | null) {
  if (!texto) return null
  const match = texto.match(/(\d{2}):(\d{2})\s*(?:às|até|ate|as|-|a)\s*(\d{2}):(\d{2})/i)
  if (!match) return null

  return {
    inicioH: parseInt(match[1], 10),
    inicioM: parseInt(match[2], 10),
    fimH: parseInt(match[3], 10),
    fimM: parseInt(match[4], 10)
  }
}

// Converter "HH:mm" em minutos desde as 00:00 (facilita somas/comparações)
function toMinutes(h: number, m: number) {
  return h * 60 + m
}

function fromMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const profId = searchParams.get('profissionalId')
    const dataStr = searchParams.get('data') // "2023-10-25"
    const duracao = parseInt(searchParams.get('duracao') || '30', 10)

    if (!profId || !dataStr) {
      return NextResponse.json({ error: 'Faltam prâmetros obrigatórios' }, { status: 400 })
    }

    // Buscar profissional + clínica via SQL raw (mais confiável que Prisma Client)
    const profRows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        p.id, p.horario_semana, p.almoco_semana,
        p.atende_sabado, p.horario_sabado, p.almoco_sabado,
        p.atende_domingo, p.horario_domingo, p.almoco_domingo,
        p.intervalo_atendimento,
        c.horario_semana as cli_horario_semana, c.almoco_semana as cli_almoco_semana,
        c.atende_sabado as cli_atende_sabado, c.horario_sabado as cli_horario_sabado,
        c.almoco_sabado as cli_almoco_sabado,
        c.atende_domingo as cli_atende_domingo, c.horario_domingo as cli_horario_domingo,
        c.almoco_domingo as cli_almoco_domingo,
        c.intervalo_atendimento as cli_intervalo
      FROM profissionais p
      LEFT JOIN users c ON c.id = p.clinica_id
      WHERE p.id = $1
      LIMIT 1
    `, profId)

    const prof = profRows[0]
    if (!prof) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Definir as regras de horário. Profissional sobrepõe Clínica.
    const rules = {
      horarioSemana: prof.horario_semana || prof.cli_horario_semana,
      almocoSemana: prof.almoco_semana || prof.cli_almoco_semana,
      atendeSabado: prof.atende_sabado ?? prof.cli_atende_sabado ?? false,
      horarioSabado: prof.horario_sabado || prof.cli_horario_sabado,
      almocoSabado: prof.almoco_sabado || prof.cli_almoco_sabado,
      atendeDomingo: prof.atende_domingo ?? prof.cli_atende_domingo ?? false,
      horarioDomingo: prof.horario_domingo || prof.cli_horario_domingo,
      almocoDomingo: prof.almoco_domingo || prof.cli_almoco_domingo,
      intervalo: prof.intervalo_atendimento || prof.cli_intervalo || 30
    }

    const dateTarget = new Date(dataStr + 'T00:00:00') // Local "00:00:00" is tricky with timezones, let's use the date string "2023-10-25" directly to get the day of the week
    const [year, month, day] = dataStr.split('-').map(Number)
    const localDateObj = new Date(year, month - 1, day)
    const weekDay = localDateObj.getDay()

    // Pegar strings de trabalho do dia
    let strTrabalho: string | null = null
    let strAlmoco: string | null = null
    let atende = true

    if (weekDay === 0) { // Domingo
      atende = Boolean(rules.atendeDomingo)
      strTrabalho = rules.horarioDomingo || null
      strAlmoco = rules.almocoDomingo || null
    } else if (weekDay === 6) { // Sabado
      atende = Boolean(rules.atendeSabado)
      strTrabalho = rules.horarioSabado || null
      strAlmoco = rules.almocoSabado || null
    } else { // Segunda-Sexta
      strTrabalho = rules.horarioSemana || null
      strAlmoco = rules.almocoSemana || null
    }

    if (!atende || !strTrabalho) {
      return NextResponse.json({ 
        slots: [],
        _debug: {
          reason: !atende ? 'Dia marcado como não atende' : 'Sem horário de trabalho configurado',
          weekDay,
          horarioSemana: rules.horarioSemana || null,
          horarioSabado: rules.horarioSabado || null,
          horarioDomingo: rules.horarioDomingo || null,
          atendeSabado: rules.atendeSabado,
          atendeDomingo: rules.atendeDomingo,
        }
      })
    }

    const t = parseHorariosString(strTrabalho)
    const a = parseHorariosString(strAlmoco)

    if (!t) return NextResponse.json({ slots: [] })

    const startMin = toMinutes(t.inicioH, t.inicioM)
    let endMin = toMinutes(t.fimH, t.fimM)

    // Limit break for overnight shifts (simplification: assume no overnight shifts for now, or stop at midnight)
    if (endMin < startMin) endMin = toMinutes(23, 59) 

    let almocoStart = -1, almocoEnd = -1
    if (a) {
      almocoStart = toMinutes(a.inicioH, a.inicioM)
      almocoEnd = toMinutes(a.fimH, a.fimM)
    }

    // Buscar agendamentos que caem em "dataStr"
    // Em Postgres DateTime guarda UTC. Vamos comparar usando raw query com DATE()
    const ocupados = await prisma.$queryRawUnsafe<any[]>(`
      SELECT horario, duracao
      FROM agendamentos_v2
      WHERE profissional_id = $1
        AND DATE(data) = $2
        AND status NOT IN ('cancelado', 'rejeitado')
    `, profId, dataStr)

    // Agendar blocos ocupados no formato { startMin, endMin }
    const ocupacoes = ocupados.map(o => {
      const [hh, mm] = o.horario.split(':').map(Number)
      const sm = toMinutes(hh, mm)
      const em = sm + o.duracao
      return { startMin: sm, endMin: em }
    })

    const slotsFinais = []
    
    // Gerador de slots
    const step = rules.intervalo
    for (let current = startMin; current + duracao <= endMin; current += step) {
      const slotEnd = current + duracao

      // Bate com almoço?
      if (almocoStart !== -1 && almocoEnd !== -1) {
        // Se o slot começar dentro do almoço OU terminar dentro do almoço OU englobar o almoço
        if (current < almocoEnd && slotEnd > almocoStart) {
          continue 
        }
      }

      // Bate com algum agendamento ocupado?
      const conflito = ocupacoes.some(block => {
        return current < block.endMin && slotEnd > block.startMin
      })

      if (!conflito) {
        slotsFinais.push(fromMinutes(current))
      }
    }

    return NextResponse.json({ slots: slotsFinais })

  } catch (err: any) {
    console.error('Erro /api/agendamento-publico/horarios:', err)
    return NextResponse.json({ error: 'Erro ao processar horários' }, { status: 500 })
  }
}
