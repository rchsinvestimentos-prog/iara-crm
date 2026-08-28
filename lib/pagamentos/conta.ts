// ============================================
// CONTA — achar ou criar a clínica pelo e-mail
// ============================================
// No modelo de checkout (Hotmart, Assiny), a compra costuma vir ANTES da
// conta existir: a pessoa paga e só então ganha acesso. O identificador é
// sempre o e-mail que ela usou na compra.
//
// Esta lógica já existia dentro do webhook da Hotmart. Foi trazida para cá
// para que Assiny e Asaas usem exatamente a mesma — três caminhos de criação
// de conta divergiriam com o tempo, e o cliente que caísse no caminho errado
// pagaria e não receberia acesso.

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { enviarEmailBoasVindas } from '@/lib/email'
import { PLANOS, type PlanoKey } from '@/lib/planos'

/** Senha temporária: 3 minúsculas + 2 maiúsculas + 4 números + 1 especial. */
function gerarSenha(): string {
    const lower = 'abcdefghijkmnopqrstuvwxyz'
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const nums = '23456789'
    const especial = '!@#$%&*'
    const sorteia = (s: string) => s[Math.floor(Math.random() * s.length)]
    return (
        Array.from({ length: 3 }, () => sorteia(lower)).join('') +
        Array.from({ length: 2 }, () => sorteia(upper)).join('') +
        Array.from({ length: 4 }, () => sorteia(nums)).join('') +
        sorteia(especial)
    )
}

/**
 * Devolve a clínica dona daquele e-mail, criando a conta se não existir.
 *
 * `criada` diz qual dos dois aconteceu — quem chama usa isso para decidir se
 * manda "bem-vinda, aqui está seu acesso" ou "seu plano foi atualizado".
 */
export async function acharOuCriarClinica(dados: {
    email: string
    nome?: string
    telefone?: string
    planoInicial?: PlanoKey
}): Promise<{ clinicaId: number; criada: boolean; senhaTemporaria?: string }> {
    const email = dados.email.trim().toLowerCase()
    if (!email) throw new Error('e-mail vazio')

    const existente = await prisma.clinica.findFirst({ where: { email } })
    if (existente) return { clinicaId: existente.id, criada: false }

    const plano = PLANOS[dados.planoInicial || 'essencial']
    const senhaTemporaria = gerarSenha()
    const nome = (dados.nome || '').trim() || email.split('@')[0]

    const nova = await prisma.clinica.create({
        data: {
            nome,
            nomeClinica: nome,          // a cliente ajusta depois no painel
            email,
            senha: await bcrypt.hash(senhaTemporaria, 12),
            telefone: dados.telefone?.replace(/\D/g, '') || '',
            role: 'cliente',
            nivel: plano.nivel,
            plano: dados.planoInicial || 'essencial',
            status: 'ativo',
            nomeAssistente: 'IARA',
            creditosMensais: plano.creditos,
            creditosDisponiveis: plano.creditos,
            maxInstanciasWhatsapp: plano.whatsapps,
            maxInstanciasInstagram: plano.nivel >= 2 ? 1 : 0,
        },
    })

    console.log(`[Pagamentos] 👤 conta criada para ${email} (clínica ${nova.id})`)

    // Falha de e-mail não pode derrubar a liberação: a cliente pagou, o
    // acesso tem que existir. Se o e-mail não sair, ela recupera a senha
    // pelo "esqueci minha senha".
    enviarEmailBoasVindas({
        email,
        nome,
        senha: senhaTemporaria,
        plano: dados.planoInicial || 'essencial',
    }).catch(err => console.error('[Pagamentos] Falha ao enviar boas-vindas:', err))

    return { clinicaId: nova.id, criada: true, senhaTemporaria }
}
