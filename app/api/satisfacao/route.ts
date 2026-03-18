import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/satisfacao — Listar avaliações + NPS
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(req.url)
        const dias = parseInt(searchParams.get('dias') || '30')

        const desde = new Date()
        desde.setDate(desde.getDate() - dias)
        const desdeISO = desde.toISOString()

        // Buscar avaliações
        const avaliacoes = await prisma.$queryRaw<any[]>`
            SELECT id, telefone, nome, nota, comentario, google_review_enviado as "googleReviewEnviado", created_at as "createdAt"
            FROM avaliacoes
            WHERE clinica_id = ${clinicaId}
              AND created_at >= ${desdeISO}::timestamp
            ORDER BY created_at DESC
            LIMIT 100
        `

        // NPS calculation
        const promotores = avaliacoes.filter(a => a.nota >= 4).length
        const detratores = avaliacoes.filter(a => a.nota <= 2).length
        const total = avaliacoes.length
        const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0
        const media = total > 0 ? Math.round((avaliacoes.reduce((s: number, a: any) => s + a.nota, 0) / total) * 10) / 10 : 0

        return NextResponse.json({
            avaliacoes,
            nps,
            media,
            total,
            promotores,
            detratores,
            neutros: total - promotores - detratores,
        })
    } catch (err) {
        console.error('Erro em /api/satisfacao GET:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST /api/satisfacao — Registrar avaliação (+ enviar Google Review se nota >= 4)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await req.json()
        const { telefone, nome, nota, comentario } = body

        if (!telefone || !nota || nota < 1 || nota > 5) {
            return NextResponse.json({ error: 'Telefone e nota (1-5) são obrigatórios' }, { status: 400 })
        }

        // Criar avaliação
        const avaliacao = await prisma.avaliacao.create({
            data: {
                clinicaId,
                telefone,
                nome: nome || null,
                nota,
                comentario: comentario || null,
            },
        })

        // Verificar se deve solicitar Google Review
        if (nota >= 4) {
            try {
                const clinica = await prisma.clinica.findUnique({
                    where: { id: clinicaId },
                    select: { configuracoes: true, evolutionInstance: true, evolutionApikey: true },
                })

                const config = (clinica?.configuracoes as any) || {}
                const linkGoogle = config?.linkGoogleReview
                const googleReviewAtivo = config?.googleReviewAtivo !== false

                if (linkGoogle && googleReviewAtivo && clinica?.evolutionInstance) {
                    const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution.belivv.com'
                    const EVOLUTION_KEY = clinica.evolutionApikey || process.env.EVOLUTION_API_KEY || ''

                    const mensagem = config?.mensagemGoogleReview
                        || `Oi ${nome || ''}! 😊 Ficamos muito felizes com sua avaliação! Se puder, deixe um comentário no nosso Google também: ${linkGoogle} — Agradecemos demais! 💜`

                    await fetch(`${EVOLUTION_URL}/message/sendText/${clinica.evolutionInstance}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': EVOLUTION_KEY,
                        },
                        body: JSON.stringify({
                            number: telefone.replace(/\D/g, ''),
                            text: mensagem,
                        }),
                    })

                    // Marcar como enviado
                    await prisma.avaliacao.update({
                        where: { id: avaliacao.id },
                        data: { googleReviewEnviado: true },
                    })
                }
            } catch (err) {
                console.error('Erro ao enviar Google Review:', err)
            }
        }

        return NextResponse.json({ avaliacao, ok: true })
    } catch (err) {
        console.error('Erro em /api/satisfacao POST:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
