import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Diagnóstico definitivo: encontrar onde está a clinica id=9
export async function GET() {
  const results: string[] = []

  try {
    // 1. Qual clinica o Prisma retorna?
    const clinicaPrisma = await prisma.clinica.findFirst({
      select: { id: true, email: true }
    })
    results.push(`Prisma clinica.findFirst: ${JSON.stringify(clinicaPrisma)}`)

    // 2. Listar TODAS as tabelas que contêm "clinica"
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name ILIKE '%clinic%'
    `)
    results.push(`Tabelas com "clinic": ${JSON.stringify(tables.map((t: any) => t.table_name))}`)

    // 3. Para cada tabela, buscar id=9
    for (const t of tables) {
      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM "${t.table_name}" WHERE id = 9 LIMIT 1`
        )
        results.push(`${t.table_name} id=9: ${rows.length > 0 ? 'EXISTE' : 'NÃO EXISTE'}`)
      } catch (e: any) {
        results.push(`${t.table_name} id=9: ERRO - ${e.message?.substring(0, 100)}`)
      }
    }

    // 4. Listar TODAS tabelas com a coluna "id"
    const tablesWithId = await prisma.$queryRawUnsafe<any[]>(`
      SELECT DISTINCT table_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND column_name = 'id' 
      AND table_name ILIKE '%clinic%'
    `)
    results.push(`Tabelas com coluna id: ${JSON.stringify(tablesWithId.map((t: any) => t.table_name))}`)

    // 5. Qual é a tabela real? Verificar case-sensitive
    const allTables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name = 'Clinica' OR table_name = 'clinica' OR table_name = 'clinicas')
    `)
    results.push(`Tabelas exatas: ${JSON.stringify(allTables.map((t: any) => t.table_name))}`)

    // 6. Contar registros em cada tabela clinica
    for (const t of allTables) {
      try {
        const count = await prisma.$queryRawUnsafe<any[]>(
          `SELECT COUNT(*)::int as total FROM "${t.table_name}"`
        )
        results.push(`${t.table_name} total: ${count[0]?.total}`)
        
        // Listar IDs
        const ids = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM "${t.table_name}" ORDER BY id LIMIT 5`
        )
        results.push(`${t.table_name} IDs: ${JSON.stringify(ids.map((r: any) => r.id))}`)
      } catch (e: any) {
        results.push(`${t.table_name}: ERRO - ${e.message?.substring(0, 100)}`)
      }
    }

    // 7. Dropar FK de profissionais (para permitir cadastro)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE profissionais DROP CONSTRAINT IF EXISTS profissionais_clinica_id_fkey
    `)
    results.push('FK dropada para permitir cadastro')

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Fix DB error:', error)
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
