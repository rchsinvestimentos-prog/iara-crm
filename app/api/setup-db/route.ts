import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint de setup: cria tabelas que ainda não existem
// Chame GET /api/setup-db uma vez após o deploy
export async function GET() {
  const results: string[] = []

  // ============================================
  // TABELA: historico_conversas (memória das conversas da IARA)
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS historico_conversas (
        id SERIAL PRIMARY KEY,
        user_id INT,
        telefone_cliente VARCHAR(50),
        role VARCHAR(20),
        content TEXT,
        push_name VARCHAR(200),
        origem VARCHAR(30) DEFAULT 'whatsapp',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_historico_user_tel
      ON historico_conversas (user_id, telefone_cliente, created_at DESC)
    `)
    results.push('✅ Tabela historico_conversas garantida')
  } catch (e: any) {
    results.push(`⚠️ historico_conversas: ${e.message?.slice(0, 80)}`)
  }

  // ============================================
  // TABELA: memoria_clientes
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS memoria_clientes (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        telefone_cliente VARCHAR(50) NOT NULL,
        resumo_geral TEXT,
        procedimentos_realizados TEXT[] DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, telefone_cliente)
      )
    `)
    results.push('✅ Tabela memoria_clientes garantida')
  } catch (e: any) {
    results.push(`⚠️ memoria_clientes: ${e.message?.slice(0, 80)}`)
  }

  // ============================================
  // TABELA: status_conversa (pausas)
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS status_conversa (
        id SERIAL PRIMARY KEY,
        telefone_cliente VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        pausa_ate TIMESTAMPTZ,
        motivo VARCHAR(100),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(telefone_cliente, user_id)
      )
    `)
    results.push('✅ Tabela status_conversa garantida')
  } catch (e: any) {
    results.push(`⚠️ status_conversa: ${e.message?.slice(0, 80)}`)
  }

  // ============================================
  // TABELA: cache_respostas
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cache_respostas (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        hash_mensagem VARCHAR(32) NOT NULL,
        resposta TEXT,
        modelo VARCHAR(100),
        hits INT DEFAULT 0,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, hash_mensagem)
      )
    `)
    results.push('✅ Tabela cache_respostas garantida')
  } catch (e: any) {
    results.push(`⚠️ cache_respostas: ${e.message?.slice(0, 80)}`)
  }

  // ============================================
  // TABELA: feedback_iara
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS feedback_iara (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        regra TEXT NOT NULL,
        origem VARCHAR(50) DEFAULT 'manual',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    results.push('✅ Tabela feedback_iara garantida')
  } catch (e: any) {
    results.push(`⚠️ feedback_iara: ${e.message?.slice(0, 80)}`)
  }

  // ============================================
  // TABELA: fila_recontato
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS fila_recontato (
        id SERIAL PRIMARY KEY,
        telefone VARCHAR(50),
        instancia VARCHAR(200),
        nome_cliente VARCHAR(200),
        user_id INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    results.push('✅ Tabela fila_recontato garantida')
  } catch (e: any) {
    results.push(`⚠️ fila_recontato: ${e.message?.slice(0, 80)}`)
  }

  // ============================================
  // TABELA: webhook_debug_log
  // ============================================
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS webhook_debug_log (
        id SERIAL PRIMARY KEY,
        payload TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    results.push('✅ Tabela webhook_debug_log garantida')
  } catch (e: any) {
    results.push(`⚠️ webhook_debug_log: ${e.message?.slice(0, 80)}`)
  }

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

    // ============================================
    // Apple Calendar columns on users table
    // ============================================
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_calendar_email" VARCHAR(200)`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_calendar_password" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_calendar_url" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "calendar_provider" VARCHAR(20) DEFAULT 'google'`)
      results.push('✅ Colunas Apple Calendar em users garantidas')
    } catch (e: any) {
      results.push(`⚠️ Apple Calendar cols (users): ${e.message?.slice(0, 80)}`)
    }

    // Apple Calendar columns on profissionais table
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "profissionais" ADD COLUMN IF NOT EXISTS "apple_calendar_email" VARCHAR(200)`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "profissionais" ADD COLUMN IF NOT EXISTS "apple_calendar_password" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "profissionais" ADD COLUMN IF NOT EXISTS "apple_calendar_url" TEXT`)
      await prisma.$executeRawUnsafe(`ALTER TABLE "profissionais" ADD COLUMN IF NOT EXISTS "calendar_provider" VARCHAR(20) DEFAULT 'google'`)
      results.push('✅ Colunas Apple Calendar em profissionais garantidas')
    } catch (e: any) {
      results.push(`⚠️ Apple Calendar cols (profissionais): ${e.message?.slice(0, 80)}`)
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Setup DB error:', error)
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 })
  }
}
