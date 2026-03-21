import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findFirst({
            where: { email: session.user.email },
            select: { id: true, nomeDoutora: true, nome: true }
        })
        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { profissionalId } = await req.json()
        if (!profissionalId) {
            return NextResponse.json({ error: 'ID do profissional obrigatório' }, { status: 400 })
        }

        // Buscar profissional
        const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, nome, email, whatsapp FROM profissionais WHERE id = $1 AND clinica_id = $2 LIMIT 1`,
            profissionalId, clinica.id
        )
        if (!rows.length) {
            return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
        }

        const prof = rows[0]
        if (!prof.email) {
            return NextResponse.json({ error: 'Profissional não tem email cadastrado' }, { status: 400 })
        }

        // Gerar novo magic token
        const magicToken = crypto.randomUUID()
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

        await prisma.$executeRawUnsafe(
            `UPDATE profissionais SET magic_token = $1, magic_token_expires = $2 WHERE id = $3`,
            magicToken, expires, profissionalId
        )

        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'
        const magicUrl = `${baseUrl}/login?magicToken=${magicToken}`
        const nomeClinica = clinica.nomeDoutora || clinica.nome || 'sua clínica'

        // Enviar por email (Resend)
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'IARA <noreply@iara.click>',
                    to: prof.email,
                    subject: `🔑 Acesse seu painel na IARA - ${nomeClinica}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0B0F19; border-radius: 16px;">
                            <img src="https://app.iara.click/iara-avatar.png" width="60" height="60" style="border-radius: 12px; margin-bottom: 16px;" />
                            <h2 style="color: #fff; margin: 0 0 8px;">Olá, ${prof.nome}! 👋</h2>
                            <p style="color: #9CA3AF; font-size: 14px;">Você foi adicionada como profissional em <strong style="color: #D99773;">${nomeClinica}</strong>.</p>
                            <p style="color: #9CA3AF; font-size: 14px;">Clique no botão abaixo para acessar e criar sua senha:</p>
                            <a href="${magicUrl}" style="display: inline-block; background: linear-gradient(135deg, #D99773, #C07A55); color: #fff; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">Acessar Painel ✨</a>
                            <p style="color: #6B7280; font-size: 12px; margin-top: 24px;">Este link expira em 7 dias. Se não foi você, ignore este email.</p>
                        </div>
                    `,
                }),
            })
        } catch (emailErr) {
            console.error('Erro ao reenviar magic link por email:', emailErr)
        }

        // Enviar por WhatsApp se tiver número
        if (prof.whatsapp) {
            try {
                const instanceName = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT nome_instancia FROM clinica WHERE id = $1`, clinica.id
                )
                const instance = instanceName[0]?.nome_instancia
                if (instance && process.env.EVOLUTION_API_URL) {
                    const phone = prof.whatsapp.replace(/\D/g, '')
                    const whatsNumber = phone.startsWith('55') ? phone : `55${phone}`
                    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instance}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': process.env.EVOLUTION_API_KEY || '',
                        },
                        body: JSON.stringify({
                            number: whatsNumber,
                            text: `🔑 *IARA - Acesso ao Painel*\n\nOlá ${prof.nome}! Acesse o link abaixo para entrar no seu painel:\n${magicUrl}\n\n⏰ Este link expira em 7 dias.`,
                        }),
                    })
                }
            } catch (whatsErr) {
                console.error('Erro ao reenviar magic link por WhatsApp:', whatsErr)
            }
        }

        return NextResponse.json({ ok: true, magicUrl })
    } catch (error: any) {
        console.error('POST /api/clinica/profissionais/reenviar-link error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
