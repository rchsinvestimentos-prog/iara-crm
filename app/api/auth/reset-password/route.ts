import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'

/**
 * POST /api/auth/reset-password
 * Gera uma nova senha aleatória, salva no banco e envia por email.
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json()

        if (!email) {
            return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
        }

        // Busca clínica pelo email
        const clinica = await prisma.clinica.findFirst({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, email: true, nomeClinica: true },
        })

        // Sempre retorna sucesso (segurança — não revela se email existe)
        if (!clinica) {
            return NextResponse.json({ ok: true, message: 'Se o email estiver cadastrado, você receberá uma nova senha.' })
        }

        // Gera senha aleatória de 8 caracteres
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
        let novaSenha = ''
        for (let i = 0; i < 8; i++) {
            novaSenha += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        // Hash e salva
        const senhaHash = await bcrypt.hash(novaSenha, 12)
        await prisma.clinica.update({
            where: { id: clinica.id },
            data: { senha: senhaHash },
        })

        // Envia email com a nova senha
        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY)
            const primeiroNome = (clinica.nomeClinica || 'Dra').split(' ')[0]

            await resend.emails.send({
                from: process.env.RESEND_FROM || 'Iara - Secretária Virtual com IA <noreply@iara.click>',
                to: clinica.email || email,
                subject: `${primeiroNome}, sua nova senha IARA 🔑`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;margin:0 auto;padding:40px 20px;">
        <tr>
            <td align="center" style="padding-bottom:30px;">
                <img src="https://app.iara.click/iara-avatar.png" alt="IARA" width="80" height="80" style="border-radius:16px;border:2px solid rgba(255,255,255,0.1);" />
            </td>
        </tr>
        <tr>
            <td style="background:linear-gradient(135deg,rgba(217,151,115,0.08),rgba(15,76,97,0.08));border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px;">
                <h1 style="color:#FFFFFF;font-size:22px;margin:0 0 8px 0;">Olá, ${primeiroNome}! 🔑</h1>
                <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                    Recebemos seu pedido de recuperação de senha. Aqui está sua nova senha:
                </p>

                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
                    <p style="color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">Sua nova senha</p>
                    <p style="color:#D99773;font-size:28px;font-weight:bold;font-family:monospace;letter-spacing:4px;margin:0;">${novaSenha}</p>
                </div>

                <a href="https://app.iara.click/login" style="display:block;text-align:center;background:linear-gradient(135deg,#D99773,#C07A55);color:#FFFFFF;font-weight:600;font-size:14px;padding:14px;border-radius:12px;text-decoration:none;">
                    Acessar meu painel →
                </a>

                <p style="color:#6B7280;font-size:11px;margin-top:20px;text-align:center;">
                    Recomendamos trocar a senha após o primeiro acesso.
                </p>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding-top:24px;">
                <p style="color:#374151;font-size:10px;margin:0;">
                    Se você não solicitou essa alteração, entre em contato com o suporte.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
                `,
            })

            console.log(`[Reset] ✅ Nova senha enviada para ${clinica.email}`)
        }

        return NextResponse.json({ ok: true, message: 'Se o email estiver cadastrado, você receberá uma nova senha.' })
    } catch (err: any) {
        console.error('[Reset] ❌ Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
