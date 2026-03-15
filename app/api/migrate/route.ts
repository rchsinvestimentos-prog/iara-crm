import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/migrate — Roda migrations pendentes (protegido por secret)
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== 'iara-migrate-2026') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const results: string[] = []

    try {
        // Adicionar colunas do AtendimentoTool
        const columns = [
            { name: 'modo_ia', sql: "ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS modo_ia VARCHAR(30) DEFAULT 'secretaria'" },
            { name: 'sempre_ligada', sql: "ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS sempre_ligada BOOLEAN DEFAULT true" },
            { name: 'blacklist', sql: "ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS blacklist TEXT" },
            { name: 'mensagem_aniversario', sql: "ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS mensagem_aniversario TEXT" },
            { name: 'mensagem_fora_horario', sql: "ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS mensagem_fora_horario TEXT" },
            { name: 'dias_atendimento', sql: "ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS dias_atendimento TEXT" },
        ]

        for (const col of columns) {
            try {
                await prisma.$executeRawUnsafe(col.sql)
                results.push(`✅ ${col.name} — OK`)
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err)
                results.push(`⚠️ ${col.name} — ${msg}`)
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (err) {
        console.error('[MIGRATE] Erro:', err)
        return NextResponse.json({ error: 'Erro na migration', details: String(err) }, { status: 500 })
    }
}
