// FIX: Re-register the Evolution instance in the database
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const results: any[] = []
    
    try {
        const instanceName = 'iara_9_whatsapp_1774729726353'
        const userId = 9
        
        // Step 1: Check if instance exists in instancias_clinica
        const existing = await prisma.$queryRaw`
            SELECT id, evolution_instance, status_conexao, ativo 
            FROM instancias_clinica 
            WHERE user_id = ${userId} AND canal = 'whatsapp'
        ` as any[]
        
        results.push({ step: '1_existing', data: existing })
        
        // Step 2: If not found, re-insert
        if (existing.length === 0) {
            await prisma.$executeRaw`
                INSERT INTO instancias_clinica (
                    evolution_instance, canal, status_conexao, ativo, 
                    nome_instancia, user_id, created_at, updated_at,
                    numero_whatsapp
                ) VALUES (
                    ${instanceName}, 'whatsapp', 'conectado', true,
                    'WhatsApp Principal', ${userId}, NOW(), NOW(),
                    '554188590652'
                )
            `
            results.push({ step: '2_inserted', success: true })
        } else {
            // Update status to connected
            await prisma.$executeRaw`
                UPDATE instancias_clinica 
                SET status_conexao = 'conectado', 
                    ativo = true, 
                    evolution_instance = ${instanceName},
                    numero_whatsapp = '554188590652',
                    updated_at = NOW()
                WHERE user_id = ${userId} AND canal = 'whatsapp'
            `
            results.push({ step: '2_updated', success: true })
        }
        
        // Step 3: Sync legacy clinica table
        await prisma.$executeRaw`
            UPDATE users SET evolution_instance = ${instanceName}
            WHERE id = ${userId}
        `
        results.push({ step: '3_legacy_synced', success: true })
        
        // Step 4: Verify
        const verify = await prisma.$queryRaw`
            SELECT ic.id, ic.evolution_instance, ic.status_conexao, ic.ativo,
                   u.evolution_instance as legacy_instance
            FROM instancias_clinica ic
            JOIN users u ON u.id = ic.user_id
            WHERE ic.user_id = ${userId} AND ic.canal = 'whatsapp'
        ` as any[]
        
        results.push({ step: '4_verified', data: verify })
        
        // Step 5: Test webhook - simulate what happens when a message arrives
        const catracaTest = await prisma.clinica.findFirst({
            where: { evolutionInstance: instanceName },
            select: { id: true, nomeClinica: true, status: true, creditosDisponiveis: true }
        })
        results.push({ step: '5_catraca_lookup_legado', found: !!catracaTest, data: catracaTest })
        
        if (!catracaTest) {
            // Try fallback
            const fallback = await prisma.$queryRawUnsafe<any[]>(
                `SELECT user_id FROM instancias_clinica WHERE evolution_instance = $1 AND ativo = true LIMIT 1`,
                instanceName
            )
            results.push({ step: '5b_catraca_fallback', found: fallback.length > 0, data: fallback })
        }
        
        return NextResponse.json({ 
            status: 'fixed', 
            timestamp: new Date().toISOString(),
            results 
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack?.substring(0, 300), partialResults: results }, { status: 500 })
    }
}
