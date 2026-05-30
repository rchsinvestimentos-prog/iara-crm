// DEBUG: Mostra os campos de texto da clínica que alimentam o prompt da IARA
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        // Buscar TODAS as clínicas com seus campos de texto relevantes
        const clinicas = await prisma.$queryRaw`
            SELECT 
                id, 
                nome_clinica, 
                nome_doutora,
                nome_assistente,
                estilo_atendimento,
                feedbacks,
                evolution_instance,
                whatsapp_clinica,
                whatsapp_doutora,
                status,
                LEFT(configuracoes::text, 2000) as configuracoes_preview
            FROM users 
            ORDER BY id
        ` as any[]

        // Buscar feedback_iara (comandos realtime da dra via whatsapp)
        let feedbacksRealtime: any[] = []
        try {
            feedbacksRealtime = await prisma.$queryRaw`
                SELECT id, user_id, regra, created_at 
                FROM feedback_iara 
                ORDER BY created_at DESC LIMIT 20
            ` as any[]
        } catch { feedbacksRealtime = [{ error: 'tabela não existe' }] }

        // Buscar instancias_clinica 
        let instancias: any[] = []
        try {
            instancias = await prisma.$queryRaw`
                SELECT id, user_id, evolution_instance, canal, status_conexao, ativo
                FROM instancias_clinica ORDER BY id
            ` as any[]
        } catch { instancias = [{ error: 'tabela não existe' }] }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            clinicas: clinicas.map((c: any) => ({
                id: c.id,
                nomeClinica: c.nome_clinica,
                nomeDoutora: c.nome_doutora,
                nomeAssistente: c.nome_assistente,
                estiloAtendimento: c.estilo_atendimento,
                feedbacks: c.feedbacks,
                evolutionInstance: c.evolution_instance,
                whatsappClinica: c.whatsapp_clinica,
                whatsappDoutora: c.whatsapp_doutora,
                status: c.status,
                configPreview: c.configuracoes_preview,
            })),
            feedbacksRealtime,
            instancias,
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
