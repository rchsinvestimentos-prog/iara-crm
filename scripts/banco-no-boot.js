// ============================================================================
// Roda no contêiner ANTES do servidor subir (ver entrypoint.sh).
//
// 1. Executa o mesmo SQL de GET /api/setup-db (tabelas e colunas antigas).
// 2. Cria as colunas que o schema.prisma tem e o banco ainda não.
//
// Só adiciona, nunca apaga. Substitui o "prisma db push --accept-data-loss",
// que nunca chegou a rodar no contêiner (faltava o pacote @prisma/engines) e
// que, se rodasse, apagaria as tabelas da memória da IARA que não estão no
// schema.
//
// Termina com código 0 se conseguiu falar com o banco e rodar tudo, 1 se não.
// O entrypoint sobe o app nos dois casos: o login já não depende de colunas
// novas (select mínimo em lib/auth.ts).
// ============================================================================
const fs = require('fs')
const path = require('path')
const { PrismaClient, Prisma } = require('@prisma/client')
const { executarSetupDb, sincronizarColunasDoSchema } = require('../lib/banco/setup-db.js')

const TENTATIVAS = 3
const ESPERA_ENTRE_TENTATIVAS_MS = 5000
// Teto do script inteiro. Banco travado não pode segurar o site fora do ar.
const LIMITE_TOTAL_MS = 60000
const RELATORIO = process.env.BANCO_BOOT_RELATORIO || '/tmp/iara-banco-no-boot.json'
const SCHEMA = path.join(__dirname, '..', 'prisma', 'schema.prisma')

const inicio = Date.now()
const relatorio = { quando: new Date().toISOString(), ok: false, tentativas: 0, colunasAdicionadas: [], dadosMudados: [], avisos: [], erro: null }

function gravarRelatorio() {
  relatorio.duracaoMs = Date.now() - inicio
  try { fs.writeFileSync(RELATORIO, JSON.stringify(relatorio, null, 2)) } catch (e) {
    console.error(`[banco-no-boot] não consegui gravar ${RELATORIO}: ${e.message}`)
  }
}

function berrar(msg) {
  console.error('')
  console.error('❌❌❌ ' + msg)
  console.error('')
}

const teto = setTimeout(() => {
  relatorio.erro = `tempo esgotado (${LIMITE_TOTAL_MS / 1000}s)`
  berrar(`[banco-no-boot] ${relatorio.erro} — o banco não respondeu a tempo.`)
  gravarRelatorio()
  process.exit(1)
}, LIMITE_TOTAL_MS)
teto.unref()

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// Uma conexão só, para os SET abaixo valerem para todos os comandos.
function urlComUmaConexao() {
  const url = process.env.DATABASE_URL || ''
  if (!url || /[?&]connection_limit=/.test(url)) return url
  return url + (url.includes('?') ? '&' : '?') + 'connection_limit=1'
}

// ----------------------------------------------------------------------------
// Mudanças de DADOS que rodam uma vez só.
//
// Cada uma tem um nome; quando roda, grava o nome em migracoes_dados junto com
// os valores de antes (para desfazer à mão, se precisar). Nos boots seguintes
// o nome já está lá e nada acontece. Tudo num comando só: ou muda e marca,
// ou não faz nada.
// ----------------------------------------------------------------------------
const UMA_VEZ = [
    {
        // 10/11/2026: plano único de R$497 (lib/planos.ts). Clínica ativa
        // gravada no nível 1 ou 2 via "sem plano ativo" na tela do plano,
        // mesmo com tudo liberado. Passa para o nível 3 com os números dele.
        // Créditos: soma a diferença deste mês (de 1.000 para 15.000, soma
        // 14.000), sem tirar nada de ninguém.
        nome: 'plano-unico-nivel-3-2026-11-10',
        sql: `
            WITH ja AS (SELECT 1 FROM migracoes_dados WHERE nome = $1),
            alvo AS (
                SELECT id, email, nivel, plano, creditos_mensais, creditos_disponiveis,
                       max_instancias_whatsapp, max_instancias_instagram
                FROM users
                WHERE nivel < 3 AND status = 'ativo' AND NOT EXISTS (SELECT 1 FROM ja)
                FOR UPDATE
            ),
            mudou AS (
                UPDATE users u SET
                    nivel = 3,
                    plano = 'premium',
                    creditos_disponiveis = COALESCE(u.creditos_disponiveis, 0)
                        + GREATEST(15000 - COALESCE(alvo.creditos_mensais, 0), 0),
                    creditos_mensais = GREATEST(COALESCE(u.creditos_mensais, 0), 15000),
                    max_instancias_whatsapp = GREATEST(COALESCE(u.max_instancias_whatsapp, 0), 2),
                    max_instancias_instagram = GREATEST(COALESCE(u.max_instancias_instagram, 0), 1)
                FROM alvo WHERE u.id = alvo.id
                RETURNING u.id
            ),
            marca AS (
                INSERT INTO migracoes_dados (nome, antes)
                SELECT $1, COALESCE((SELECT jsonb_agg(to_jsonb(alvo)) FROM alvo), '[]'::jsonb)
                WHERE NOT EXISTS (SELECT 1 FROM ja)
                ON CONFLICT (nome) DO NOTHING
                RETURNING nome
            )
            SELECT (SELECT COUNT(*) FROM marca)::int AS rodou, (SELECT COUNT(*) FROM mudou)::int AS linhas`,
    },
]

async function rodarUmaVez(prisma) {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS migracoes_dados (
            nome VARCHAR(120) PRIMARY KEY,
            rodada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            antes JSONB
        )
    `)
    for (const m of UMA_VEZ) {
        try {
            const [r] = await prisma.$queryRawUnsafe(m.sql, m.nome)
            if (r && r.rodou) {
                console.log(`[banco-no-boot] 🔁 ${m.nome}: ${r.linhas} linha(s) mudada(s)`)
                relatorio.dadosMudados.push(`${m.nome}: ${r.linhas}`)
            }
        } catch (e) {
            // Não derruba o boot (nada foi gravado: é um comando só), mas grita.
            const msg = `${m.nome} FALHOU: ${String((e && e.message) || e).split('\n').pop().slice(0, 200)}`
            berrar(`[banco-no-boot] ${msg}`)
            relatorio.avisos.push(msg)
        }
    }
}

async function umaTentativa() {
  const prisma = new PrismaClient({ datasources: { db: { url: urlComUmaConexao() } } })
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    // Durante o deploy o contêiner antigo ainda atende. ALTER TABLE precisa de
    // trava exclusiva e, enquanto espera por ela, enfileira as leituras da
    // tabela — inclusive o login. Espera no máximo 3s; se não conseguir, vira
    // aviso e a coluna fica para o próximo boot ou GET /api/setup-db.
    await prisma.$executeRawUnsafe(`SET lock_timeout = '3s'`)
    await prisma.$executeRawUnsafe(`SET statement_timeout = '20s'`)

    const { results } = await executarSetupDb(prisma)
    for (const r of results) if (r.startsWith('⚠️')) relatorio.avisos.push(r)

    let schemaTexto = ''
    try { schemaTexto = fs.readFileSync(SCHEMA, 'utf8') } catch {
      relatorio.avisos.push(`schema.prisma não encontrado em ${SCHEMA} — colunas criadas com o tipo básico`)
    }
    const { adicionadas, avisos } = await sincronizarColunasDoSchema(prisma, Prisma.dmmf, schemaTexto)
    relatorio.colunasAdicionadas.push(...adicionadas)
    relatorio.avisos.push(...avisos)

    await rodarUmaVez(prisma)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

async function main() {
  for (let n = 1; n <= TENTATIVAS; n++) {
    relatorio.tentativas = n
    relatorio.avisos = []
    relatorio.colunasAdicionadas = []
    relatorio.dadosMudados = []
    try {
      await umaTentativa()
      relatorio.ok = true
      relatorio.erro = null
      break
    } catch (e) {
      relatorio.erro = String((e && e.message) || e).trim().split('\n').pop().slice(0, 300)
      console.error(`[banco-no-boot] tentativa ${n}/${TENTATIVAS} falhou: ${relatorio.erro}`)
      if (n < TENTATIVAS) await esperar(ESPERA_ENTRE_TENTATIVAS_MS)
    }
  }

  if (relatorio.colunasAdicionadas.length) {
    console.log(`[banco-no-boot] ➕ ${relatorio.colunasAdicionadas.length} coluna(s) criada(s):`)
    for (const c of relatorio.colunasAdicionadas) console.log(`   + ${c}`)
  }
  if (relatorio.avisos.length) {
    console.warn(`[banco-no-boot] ⚠️ ${relatorio.avisos.length} aviso(s):`)
    for (const a of relatorio.avisos) console.warn(`   ! ${a}`)
  }

  gravarRelatorio()
  if (!relatorio.ok) {
    berrar(`[banco-no-boot] NÃO consegui conferir o banco depois de ${TENTATIVAS} tentativas: ${relatorio.erro}`)
    process.exit(1)
  }
  console.log(`[banco-no-boot] ✅ banco conferido em ${Date.now() - inicio}ms (tentativa ${relatorio.tentativas})`)
  process.exit(0)
}

main()
