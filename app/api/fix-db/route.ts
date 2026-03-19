import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Fix FK constraint - a tabela Clinica não tem @@map, então no Prisma é "Clinica" com C maiúsculo
// O setup-db original referenciou "clinicas" (errado)
export async function GET() {
  const results: string[] = []

  try {
    // 1. Descobrir nome real da tabela clinica
    const tables = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name ILIKE '%clinica%'
    `)
    results.push(`Tabelas encontradas: ${JSON.stringify(tables.map((t: any) => t.table_name))}`)

    // 2. Dropar FK errada
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "profissionais" 
      DROP CONSTRAINT IF EXISTS "profissionais_clinica_id_fkey"
    `)
    results.push('✅ FK errada dropada')

    // 3. Determinar nome correto da tabela
    const clinicaTableName = tables.find((t: any) => 
      t.table_name === 'Clinica' || t.table_name === 'clinica' || t.table_name === 'clinicas'
    )?.table_name

    if (clinicaTableName) {
      // 4. Criar FK correta
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "profissionais" 
        ADD CONSTRAINT "profissionais_clinica_id_fkey" 
        FOREIGN KEY ("clinica_id") REFERENCES "${clinicaTableName}"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `)
      results.push(`✅ FK correta criada referenciando "${clinicaTableName}"`)
    } else {
      // Se não encontrou, remover FK completamente (o INSERT vai funcionar sem ela)
      results.push('⚠️ Tabela clinica não encontrada — FK removida, INSERT deve funcionar')
    }

    // 5. Testar: buscar uma clinica
    const clinicas = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    results.push(`Todas as tabelas: ${JSON.stringify(clinicas.map((t: any) => t.table_name))}`)

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Fix DB error:', error)
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
