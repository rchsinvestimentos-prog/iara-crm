import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Diagnóstico completo da FK e teste de INSERT
export async function GET() {
  const results: string[] = []

  try {
    // 1. Verificar tipo da coluna clinica_id em profissionais
    const colInfo = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'profissionais' AND column_name = 'clinica_id'
    `)
    results.push(`profissionais.clinica_id tipo: ${JSON.stringify(colInfo[0])}`)

    // 2. Verificar tipo da coluna id em clinicas
    const clinicaIdInfo = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'clinicas' AND column_name = 'id'
    `)
    results.push(`clinicas.id tipo: ${JSON.stringify(clinicaIdInfo[0])}`)

    // 3. Verificar se clinica id 9 existe
    const clinica9 = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, nome FROM clinicas WHERE id = 9
    `)
    results.push(`Clinica 9 existe: ${clinica9.length > 0 ? 'SIM - ' + clinica9[0]?.nome : 'NÃO'}`)

    // 4. Listar todas as constraints na tabela profissionais
    const constraints = await prisma.$queryRawUnsafe<any[]>(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'profissionais'::regclass
    `)
    results.push(`Constraints: ${JSON.stringify(constraints)}`)

    // 5. Dropar TODAS as FK constraints que mencionam clinica_id
    for (const c of constraints) {
      if (c.def?.includes('clinica_id')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE profissionais DROP CONSTRAINT IF EXISTS "${c.conname}"`)
        results.push(`Dropada constraint: ${c.conname}`)
      }
    }

    // 6. Tentar INSERT direto SEM FK
    try {
      const inserted = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO profissionais (id, clinica_id, nome, is_dono, ativo, ordem, created_at)
        VALUES (gen_random_uuid()::text, 9, 'TESTE FK FIX', false, true, 0, NOW())
        RETURNING id, nome
      `)
      results.push(`✅ INSERT sem FK funcionou! ID: ${inserted[0]?.id}`)
      
      // Limpar o registro de teste
      await prisma.$executeRawUnsafe(`DELETE FROM profissionais WHERE nome = 'TESTE FK FIX'`)
      results.push('✅ Registro de teste removido')
    } catch (insertErr: any) {
      results.push(`❌ INSERT falhou: ${insertErr.message}`)
    }

    // 7. Recriar FK correta (agora que sabemos os tipos)
    const profType = colInfo[0]?.data_type
    const clinType = clinicaIdInfo[0]?.data_type
    
    if (profType === clinType || (profType === 'integer' && clinType === 'integer')) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE profissionais 
          ADD CONSTRAINT profissionais_clinica_id_fkey 
          FOREIGN KEY (clinica_id) REFERENCES clinicas(id) 
          ON DELETE RESTRICT ON UPDATE CASCADE
        `)
        results.push('✅ FK recriada com tipos compatíveis')
      } catch (fkErr: any) {
        results.push(`⚠️ FK não recriada: ${fkErr.message}`)
      }
    } else {
      results.push(`⚠️ Tipos incompatíveis! profissionais.clinica_id=${profType}, clinicas.id=${clinType}. FK NÃO recriada.`)
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Fix DB error:', error)
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
