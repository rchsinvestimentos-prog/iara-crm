import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { executarSetupDb, sincronizarColunasDoSchema } from '@/lib/banco/setup-db'

export const dynamic = 'force-dynamic'

const RELATORIO_BOOT = process.env.BANCO_BOOT_RELATORIO || '/tmp/iara-banco-no-boot.json'

// Garante tabelas e colunas que o app precisa. Só adiciona, nunca apaga.
// O mesmo SQL roda sozinho no boot do contêiner (scripts/banco-no-boot.js);
// esta rota fica como conferência manual e mostra o resultado do último boot.
export async function GET() {
  let ultimoBoot: unknown = null
  try {
    const r = JSON.parse(readFileSync(RELATORIO_BOOT, 'utf8'))
    ultimoBoot = {
      quando: r.quando,
      ok: r.ok,
      tentativas: r.tentativas,
      duracaoMs: r.duracaoMs,
      colunasAdicionadas: Array.isArray(r.colunasAdicionadas) ? r.colunasAdicionadas.length : 0,
      avisos: Array.isArray(r.avisos) ? r.avisos.length : 0,
      erro: r.erro ? 'sim — ver log do contêiner' : null,
    }
  } catch {
    // Sem relatório: rodando fora do contêiner, ou o boot não chegou a gravar.
  }

  let results: string[] = []
  try {
    results = (await executarSetupDb(prisma)).results
  } catch (error: any) {
    console.error('Setup DB error:', error)
    return NextResponse.json(
      { success: false, error: error.message, results: error.results || results, ultimoBoot },
      { status: 500 }
    )
  }

  let colunasDoSchema: { adicionadas: string[]; avisos: string[] } | { erro: string }
  try {
    let schemaTexto = ''
    try { schemaTexto = readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8') } catch { }
    colunasDoSchema = await sincronizarColunasDoSchema(prisma, Prisma.dmmf, schemaTexto)
  } catch (error: any) {
    console.error('Setup DB (colunas do schema) error:', error)
    colunasDoSchema = { erro: String(error?.message || error).split('\n').pop()!.slice(0, 200) }
  }

  return NextResponse.json({ success: true, results, colunasDoSchema, ultimoBoot })
}
