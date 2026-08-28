import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { determineOutputType, generateTTS } from '@/lib/engine/audio'
import type { DadosClinica } from '@/lib/engine/types'

/**
 * POST /api/voz/testar-pronuncia
 * Body: { texto: string, pronuncias?: { escrita, falada }[] }
 *
 * Fala um texto qualquer na voz configurada da clínica, para a profissional
 * conferir se a pronúncia que ela cadastrou soa certa ANTES de salvar.
 *
 * As pronúncias vêm no corpo, não do banco, justamente porque ainda não foram
 * salvas — é o ponto do teste. Sem cache: cada texto é diferente.
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const email = (session?.user as { email?: string })?.email
        if (!email) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findFirst({ where: { email } })
        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { texto, pronuncias } = await request.json()
        const limpo = String(texto || '').trim().slice(0, 300)
        if (!limpo) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })

        const config = determineOutputType(clinica as unknown as DadosClinica, true)
        if (Array.isArray(pronuncias)) config.pronuncias = pronuncias

        const audio = await generateTTS(limpo, config)
        if (!audio) {
            return NextResponse.json({ error: 'Não consegui gerar o áudio agora' }, { status: 502 })
        }

        return NextResponse.json({ audioBase64: audio, provedor: config.provedorVoz })
    } catch (err) {
        console.error('[Testar pronúncia] Erro:', err)
        return NextResponse.json({ error: 'Erro ao gerar áudio' }, { status: 500 })
    }
}
