import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint de setup: cria tabelas que ainda não existem
// Chame GET /api/setup-db uma vez após o deploy
export async function GET() {
  const results: string[] = []

  try {
    // Verificar se a tabela profissionais existe
    const tableCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profissionais'
      ) as exists
    `)

    if (!tableCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "profissionais" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
          "clinica_id" INTEGER NOT NULL,
          "nome" VARCHAR(200) NOT NULL,
          "tratamento" VARCHAR(50),
          "bio" TEXT,
          "especialidade" VARCHAR(200),
          "diferenciais" TEXT,
          "whatsapp" VARCHAR(30),
          "cursos" JSONB DEFAULT '[]',
          "redes_sociais_prof" JSONB DEFAULT '{}',
          "horario_semana" VARCHAR(50),
          "almoco_semana" VARCHAR(50),
          "atende_sabado" BOOLEAN,
          "horario_sabado" VARCHAR(50),
          "almoco_sabado" VARCHAR(50),
          "atende_domingo" BOOLEAN,
          "horario_domingo" VARCHAR(50),
          "almoco_domingo" VARCHAR(50),
          "intervalo_atendimento" INTEGER,
          "google_calendar_token" TEXT,
          "google_calendar_refresh_token" TEXT,
          "google_calendar_id" VARCHAR(200) DEFAULT 'primary',
          "google_token_expires" TIMESTAMP(3),
          "ausencias" JSONB DEFAULT '[]',
          "link_agendamento" VARCHAR(100),
          "foto_url" VARCHAR(500),
          "chave_pix" VARCHAR(200),
          "link_pagamento" VARCHAR(500),
          "is_dono" BOOLEAN NOT NULL DEFAULT false,
          "ativo" BOOLEAN NOT NULL DEFAULT true,
          "ordem" INTEGER NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push('✅ Tabela profissionais criada')

      // Criar índice
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "profissionais_clinica_id_idx" ON "profissionais"("clinica_id")
      `)
      results.push('✅ Índice clinica_id criado')

      // Criar unique constraint no link_agendamento
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "profissionais_link_agendamento_key" ON "profissionais"("link_agendamento")
      `)
      results.push('✅ Unique index link_agendamento criado')

      // Adicionar FK para clinicas
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "profissionais" 
        ADD CONSTRAINT "profissionais_clinica_id_fkey" 
        FOREIGN KEY ("clinica_id") REFERENCES "clinicas"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE
      `).catch(() => results.push('⚠️ FK clinica_id já existia ou tabela clinicas não encontrada'))
      results.push('✅ FK clinica_id adicionada')

    } else {
      results.push('ℹ️ Tabela profissionais já existe')
    }

    // Verificar se coluna profissionalId existe na tabela procedimentos
    const procColCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'procedimentos' 
        AND column_name = 'profissional_id'
      ) as exists
    `)

    if (!procColCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "procedimentos" ADD COLUMN IF NOT EXISTS "profissional_id" TEXT
      `)
      results.push('✅ Coluna profissional_id adicionada em procedimentos')

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "procedimentos" 
        ADD CONSTRAINT "procedimentos_profissional_id_fkey" 
        FOREIGN KEY ("profissional_id") REFERENCES "profissionais"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE
      `).catch(() => results.push('⚠️ FK profissional_id em procedimentos já existia'))
    } else {
      results.push('ℹ️ Coluna profissional_id já existe em procedimentos')
    }

    // Verificar coluna pos_procedimento em procedimentos
    const posColCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'procedimentos' 
        AND column_name = 'pos_procedimento'
      ) as exists
    `)

    if (!posColCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "procedimentos" ADD COLUMN IF NOT EXISTS "pos_procedimento" TEXT
      `)
      results.push('✅ Coluna pos_procedimento adicionada em procedimentos')
    } else {
      results.push('ℹ️ Coluna pos_procedimento já existe em procedimentos')
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Setup DB error:', error)
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
