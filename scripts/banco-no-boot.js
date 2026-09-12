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
const relatorio = { quando: new Date().toISOString(), ok: false, tentativas: 0, colunasAdicionadas: [], avisos: [], erro: null }

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
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

async function main() {
  for (let n = 1; n <= TENTATIVAS; n++) {
    relatorio.tentativas = n
    relatorio.avisos = []
    relatorio.colunasAdicionadas = []
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
