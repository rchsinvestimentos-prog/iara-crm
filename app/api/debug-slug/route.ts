import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint temporário de diagnóstico para verificar slugs de profissionais
// REMOVER DEPOIS DO DEBUG
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const secret = searchParams.get('secret')

  if (secret !== 'iara2026debug') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (slug) {
      // Buscar profissional pelo slug em ambos os campos
      const result = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          p.id, p.nome, p.link_agendamento, p.link_config->>'slug' as config_slug,
          p.horario_semana, p.almoco_semana, p.atende_sabado, p.horario_sabado,
          p.atende_domingo, p.horario_domingo,
          p.ativo,
          c.horario_semana as cli_horario_semana, c.almoco_semana as cli_almoco_semana,
          c.atende_sabado as cli_atende_sabado, c.horario_sabado as cli_horario_sabado,
          c.atende_domingo as cli_atende_domingo, c.horario_domingo as cli_horario_domingo
        FROM profissionais p
        LEFT JOIN users c ON c.id = p.clinica_id
        WHERE p.link_config->>'slug' = $1 
           OR p.link_agendamento = $1
        LIMIT 5
      `, slug)

      return NextResponse.json({ 
        query: slug,
        found: result.length,
        profissionais: result 
      })
    }

    // Listar todos os profissionais com slugs configurados
    const all = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        p.id, p.nome, p.link_agendamento, p.link_config->>'slug' as config_slug,
        p.horario_semana, p.ativo
      FROM profissionais p
      WHERE p.link_agendamento IS NOT NULL 
         OR p.link_config->>'slug' IS NOT NULL
      ORDER BY p.nome
      LIMIT 20
    `)

    return NextResponse.json({ total: all.length, profissionais: all })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
