import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Fix FK + teste INSERT - versão simplificada
export async function GET() {
  const results: string[] = []

  try {
    // 1. Dropar TODAS as FK constraints de clinica_id
    const constraints = await prisma.$queryRawUnsafe<any[]>(`
      SELECT conname, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      WHERE conrelid = 'profissionais'::regclass
    `)
    
    for (const c of constraints) {
      if (c.conname?.includes('clinica_id')) {
        await prisma.$executeRawUnsafe(`ALTER TABLE profissionais DROP CONSTRAINT IF EXISTS "${c.conname}"`)
        results.push(`Dropada: ${c.conname}`)
      }
    }

    // 2. Verificar se clinica id=9 existe
    const clinica = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM clinicas WHERE id = 9`)
    results.push(`Clinica 9 existe: ${clinica.length > 0 ? 'SIM' : 'NÃO'}`)

    // 3. Testar INSERT direto (sem FK)
    const inserted = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO profissionais (id, clinica_id, nome, is_dono, ativo, ordem, created_at)
      VALUES (gen_random_uuid()::text, 9, 'TESTE DIRETO', false, true, 0, NOW())
      RETURNING id
    `)
    results.push(`✅ INSERT funcionou! ID: ${inserted[0]?.id}`)

    // 4. Limpar teste
    await prisma.$executeRawUnsafe(`DELETE FROM profissionais WHERE nome = 'TESTE DIRETO'`)
    results.push('✅ Teste limpo')

    // 5. Recriar FK (os tipos batem: ambos int4)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE profissionais 
        ADD CONSTRAINT profissionais_clinica_id_fkey 
        FOREIGN KEY (clinica_id) REFERENCES clinicas(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `)
      results.push('✅ FK recriada')
    } catch (fkErr: any) {
      results.push(`⚠️ FK não recriada: ${fkErr.message}`)
    }

    // 6. Testar INSERT COM FK
    try {
      const inserted2 = await prisma.$queryRawUnsafe<any[]>(`
        INSERT INTO profissionais (id, clinica_id, nome, is_dono, ativo, ordem, created_at)
        VALUES (gen_random_uuid()::text, 9, 'TESTE COM FK', false, true, 0, NOW())
        RETURNING id
      `)
      results.push(`✅ INSERT com FK funcionou! ID: ${inserted2[0]?.id}`)
      await prisma.$executeRawUnsafe(`DELETE FROM profissionais WHERE nome = 'TESTE COM FK'`)
      results.push('✅ Teste com FK limpo')
    } catch (fkInsertErr: any) {
      results.push(`❌ INSERT com FK falhou: ${fkInsertErr.message}`)
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Fix DB error:', error)
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
