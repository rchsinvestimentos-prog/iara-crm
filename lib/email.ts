import { Resend } from 'resend'

// Lazy init — evita erro no build quando env var não está disponível
let _resend: Resend | null = null
function getResend() {
    if (!_resend && process.env.RESEND_API_KEY) {
        _resend = new Resend(process.env.RESEND_API_KEY)
    }
    return _resend
}

interface WelcomeEmailParams {
    email: string
    nome: string
    senha: string
    plano: string
}

export async function enviarEmailBoasVindas({ email, nome, senha, plano }: WelcomeEmailParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY não configurada, pulando envio')
        return null
    }

    const primeiroNome = nome.split(' ')[0] || nome

    try {
        const resendClient = getResend()
        if (!resendClient) return null

        const result = await resendClient.emails.send({
            from: process.env.RESEND_FROM || 'IARA <noreply@iara.click>',
            to: email,
            subject: `${primeiroNome}, sua IARA está pronta! 🎉`,
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
                <h1 style="color:#FFFFFF;font-size:22px;margin:0 0 8px 0;">Olá, ${primeiroNome}! 👋</h1>
                <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
                    Sua conta IARA <strong style="color:#D99773;">${plano.charAt(0).toUpperCase() + plano.slice(1)}</strong> foi criada com sucesso!
                </p>

                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
                    <p style="color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;">Seus dados de acesso</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="color:#9CA3AF;font-size:13px;padding:6px 0;">🔗 Painel:</td>
                            <td style="color:#FFFFFF;font-size:13px;padding:6px 0;text-align:right;">
                                <a href="https://app.iara.click" style="color:#D99773;text-decoration:none;">app.iara.click</a>
                            </td>
                        </tr>
                        <tr>
                            <td style="color:#9CA3AF;font-size:13px;padding:6px 0;">📧 Email:</td>
                            <td style="color:#FFFFFF;font-size:13px;padding:6px 0;text-align:right;">${email}</td>
                        </tr>
                        <tr>
                            <td style="color:#9CA3AF;font-size:13px;padding:6px 0;">🔑 Senha:</td>
                            <td style="color:#FFFFFF;font-size:14px;font-weight:bold;padding:6px 0;text-align:right;font-family:monospace;letter-spacing:2px;">${senha}</td>
                        </tr>
                    </table>
                </div>

                <a href="https://app.iara.click/login" style="display:block;text-align:center;background:linear-gradient(135deg,#D99773,#C07A55);color:#FFFFFF;font-weight:600;font-size:14px;padding:14px;border-radius:12px;text-decoration:none;">
                    Acessar meu painel →
                </a>

                <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
                    <p style="color:#6B7280;font-size:12px;line-height:1.5;margin:0;">
                        <strong style="color:#9CA3AF;">Próximos passos:</strong><br/>
                        1️⃣ Acesse o painel e aceite os termos<br/>
                        2️⃣ Configure sua clínica em "Configurações"<br/>
                        3️⃣ Conecte seu WhatsApp em "Instâncias"<br/>
                        4️⃣ A IARA começa a atender automaticamente! 🚀
                    </p>
                </div>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding-top:24px;">
                <p style="color:#374151;font-size:10px;margin:0;">
                    A IARA é uma Inteligência Artificial. Ela pode cometer erros.<br/>
                    Todas as conversas são armazenadas para fins de segurança.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        })

        console.log(`[Email] ✅ Email de boas-vindas enviado para ${email}`)
        return result
    } catch (err) {
        console.error(`[Email] ❌ Erro ao enviar email para ${email}:`, err)
        return null
    }
}
