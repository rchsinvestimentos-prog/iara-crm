import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

// ⚠️  ROTA TEMPORÁRIA DE SETUP — REMOVER APÓS USO
// 1) Cria tabelas do Prisma via $executeRawUnsafe
// 2) Cria o usuário admin inicial
// Acessar: GET /api/setup?key=setup-iara-2026

const prisma = new PrismaClient()

const CREATE_TABLES_SQL = `
-- Tabela principal: clinicas
CREATE TABLE IF NOT EXISTS "clinicas" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senha" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'cliente',
  "nomeDoutora" TEXT,
  "whatsappClinica" TEXT,
  "whatsappPessoal" TEXT,
  "nomeIA" TEXT NOT NULL DEFAULT 'IARA',
  "diferenciais" TEXT,
  "plano" INTEGER NOT NULL DEFAULT 1,
  "creditosTotal" INTEGER NOT NULL DEFAULT 100,
  "creditosUsados" INTEGER NOT NULL DEFAULT 0,
  "dataRenovacao" TIMESTAMP(3),
  "hotmartOrderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "whatsappStatus" TEXT NOT NULL DEFAULT 'desconectado',
  "instanceName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinicas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "clinicas_email_key" ON "clinicas"("email");

-- Tabela: procedimentos
CREATE TABLE IF NOT EXISTS "procedimentos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clinicaId" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL,
  "desconto" INTEGER NOT NULL DEFAULT 0,
  "parcelas" TEXT,
  "duracao" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "procedimentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procedimentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "procedimentos_clinicaId_idx" ON "procedimentos"("clinicaId");

-- Tabela: horarios_funcionamento
CREATE TABLE IF NOT EXISTS "horarios_funcionamento" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clinicaId" TEXT NOT NULL,
  "semanaInicio" TEXT NOT NULL DEFAULT '09:00',
  "semanaFim" TEXT NOT NULL DEFAULT '18:00',
  "almocoSemana" BOOLEAN NOT NULL DEFAULT false,
  "almocoInicio" TEXT,
  "almocoFim" TEXT,
  "sabado" BOOLEAN NOT NULL DEFAULT false,
  "sabadoInicio" TEXT,
  "sabadoFim" TEXT,
  "almocoSabado" BOOLEAN NOT NULL DEFAULT false,
  "almocoSabInicio" TEXT,
  "almocoSabFim" TEXT,
  "domingo" BOOLEAN NOT NULL DEFAULT false,
  "domingoInicio" TEXT,
  "domingoFim" TEXT,
  "feriado" BOOLEAN NOT NULL DEFAULT false,
  "feriadoInicio" TEXT,
  "feriadoFim" TEXT,
  "intervalo" INTEGER NOT NULL DEFAULT 15,
  "antecedenciaMin" INTEGER NOT NULL DEFAULT 2,
  "antecedenciaMax" INTEGER NOT NULL DEFAULT 30,
  CONSTRAINT "horarios_funcionamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "horarios_funcionamento_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "horarios_funcionamento_clinicaId_key" ON "horarios_funcionamento"("clinicaId");

-- Tabela: conversas
CREATE TABLE IF NOT EXISTS "conversas" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clinicaId" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "nome" TEXT,
  "ultimaMensagem" TEXT,
  "ultimaData" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ativo',
  "lida" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversas_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "conversas_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "conversas_clinicaId_idx" ON "conversas"("clinicaId");
CREATE INDEX IF NOT EXISTS "conversas_telefone_idx" ON "conversas"("telefone");

-- Tabela: mensagens
CREATE TABLE IF NOT EXISTS "mensagens" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "conversaId" TEXT NOT NULL,
  "remetente" TEXT NOT NULL,
  "conteudo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'texto',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mensagens_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "mensagens_conversaId_idx" ON "mensagens"("conversaId");

-- Tabela: agendamentos (do painel)
CREATE TABLE IF NOT EXISTS "agendamentos" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clinicaId" TEXT NOT NULL,
  "nomePaciente" TEXT NOT NULL,
  "telefone" TEXT,
  "procedimento" TEXT NOT NULL,
  "data" TIMESTAMP(3) NOT NULL,
  "horario" TEXT NOT NULL,
  "duracao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pendente',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agendamentos_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "agendamentos_clinicaId_idx" ON "agendamentos"("clinicaId");
CREATE INDEX IF NOT EXISTS "agendamentos_data_idx" ON "agendamentos"("data");

-- Tabela: credito_historico
CREATE TABLE IF NOT EXISTS "credito_historico" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clinicaId" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "creditos" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credito_historico_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credito_historico_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "credito_historico_clinicaId_idx" ON "credito_historico"("clinicaId");

-- Tabela: config_atendimento
CREATE TABLE IF NOT EXISTS "config_atendimento" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "clinicaId" TEXT NOT NULL,
  "saudacao" BOOLEAN NOT NULL DEFAULT true,
  "perguntarNome" BOOLEAN NOT NULL DEFAULT true,
  "oferecerDesc" BOOLEAN NOT NULL DEFAULT true,
  "enviarAudio" BOOLEAN NOT NULL DEFAULT false,
  "enviarPreco" BOOLEAN NOT NULL DEFAULT true,
  "enviarFotos" BOOLEAN NOT NULL DEFAULT true,
  "reagendarAuto" BOOLEAN NOT NULL DEFAULT true,
  "listaEspera" BOOLEAN NOT NULL DEFAULT false,
  "avaliacaoPos" BOOLEAN NOT NULL DEFAULT true,
  "lembrete24h" BOOLEAN NOT NULL DEFAULT true,
  "lembrete1h" BOOLEAN NOT NULL DEFAULT true,
  "confirmacao" BOOLEAN NOT NULL DEFAULT true,
  "bloqueioSpam" BOOLEAN NOT NULL DEFAULT true,
  "feedbacks" JSONB,
  CONSTRAINT "config_atendimento_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "config_atendimento_clinicaId_key" ON "config_atendimento"("clinicaId");
`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key !== 'setup-iara-2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs: string[] = []

    // STEP 1: Criar tabelas via raw SQL
    try {
        logs.push('🔄 Criando tabelas...')
        // Executar cada statement separadamente
        const statements = CREATE_TABLES_SQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 5)

        for (const stmt of statements) {
            try {
                await prisma.$executeRawUnsafe(stmt + ';')
            } catch (e: any) {
                // Ignorar erros de "already exists"
                if (!e.message?.includes('already exists')) {
                    logs.push(`⚠️ ${e.message?.slice(0, 100)}`)
                }
            }
        }
        logs.push('✅ Tabelas criadas/verificadas!')
    } catch (err: any) {
        logs.push(`❌ Erro criando tabelas: ${err.message?.slice(0, 300)}`)
    }

    // STEP 2: Criar usuário admin
    try {
        const email = 'rafael@iara.click'
        const senha = 'iara2026'
        const senhaHash = await bcrypt.hash(senha, 12)

        logs.push('🔄 Criando usuário admin...')

        const clinica = await prisma.clinica.upsert({
            where: { email },
            update: {
                senha: senhaHash,
                role: 'admin',
                nome: 'Rafael Rocha',
                nomeDoutora: 'Rafael',
                plano: 3,
                creditosTotal: 9999,
                status: 'ativo',
            },
            create: {
                nome: 'Rafael Rocha',
                email,
                senha: senhaHash,
                role: 'admin',
                nomeDoutora: 'Rafael',
                nomeIA: 'IARA',
                plano: 3,
                creditosTotal: 9999,
                creditosUsados: 0,
                status: 'ativo',
                whatsappStatus: 'desconectado',
            },
        })

        logs.push('✅ Usuário admin criado/atualizado!')

        return NextResponse.json({
            success: true,
            logs,
            usuario: {
                id: clinica.id,
                email: clinica.email,
                nome: clinica.nome,
                role: clinica.role,
            },
            credenciais: {
                email,
                senha,
            },
        })
    } catch (error: any) {
        logs.push(`❌ Erro ao criar usuário: ${error.message}`)
        return NextResponse.json(
            { error: 'Erro ao criar usuário', detail: error.message, logs },
            { status: 500 }
        )
    }
}
