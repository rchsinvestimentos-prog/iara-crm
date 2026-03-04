import { prisma } from './prisma'

/**
 * Envia uma notificação por WhatsApp para a dona da clínica
 * confirmando mudanças feitas no painel.
 *
 * Usa a Evolution API diretamente para enviar a mensagem.
 * Configuração necessária: EVOLUTION_API_URL e EVOLUTION_API_KEY no .env
 */

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

interface MudancaConfig {
    campo: string
    valorAnterior: string | null
    valorNovo: string | null
}

/**
 * Detecta o que mudou comparando dados antigos com novos
 */
export function detectarMudancas(
    antigo: Record<string, unknown>,
    novo: Record<string, unknown>
): MudancaConfig[] {
    const labels: Record<string, string> = {
        nomeClinica: 'nome da clínica',
        nomeAssistente: 'nome da assistente',
        whatsappClinica: 'WhatsApp da clínica',
        whatsappDoutora: 'WhatsApp pessoal',
        tomAtendimento: 'tom de atendimento',
        endereco: 'endereço',
        diferenciais: 'diferenciais',
        horarioInicio: 'horário de início',
        horarioFim: 'horário de fim',
        diasFuncionamento: 'dias de funcionamento',
    }

    const mudancas: MudancaConfig[] = []

    for (const [key, label] of Object.entries(labels)) {
        const va = String(antigo[key] ?? '')
        const vn = String(novo[key] ?? '')
        if (key in novo && va !== vn) {
            mudancas.push({
                campo: label,
                valorAnterior: va || null,
                valorNovo: vn || null,
            })
        }
    }

    return mudancas
}

/**
 * Gera a mensagem de confirmação para o WhatsApp
 */
export function gerarMensagemConfirmacao(
    nomeIA: string,
    mudancas: MudancaConfig[]
): string {
    if (mudancas.length === 0) return ''

    const linhas = mudancas.map((m) => {
        if (m.campo === 'nome da assistente') {
            return `✅ Agora sua assistente vai se chamar *${m.valorNovo}*! Já estou respondendo com meu novo nome.`
        }
        if (m.campo === 'nome da clínica') {
            return `✅ O nome da clínica foi atualizado para *${m.valorNovo}*.`
        }
        if (m.campo === 'tom de atendimento') {
            return `✅ Meu tom de atendimento foi ajustado para *${m.valorNovo}*.`
        }
        if (m.campo === 'endereço') {
            return `✅ O endereço da clínica foi atualizado para *${m.valorNovo}*.`
        }
        if (m.campo === 'diferenciais') {
            return `✅ Os diferenciais da clínica foram atualizados! Já sei usar eles pra convencer suas clientes.`
        }
        if (m.campo === 'horário de início' || m.campo === 'horário de fim') {
            return `✅ Os horários de atendimento foram atualizados.`
        }
        if (m.campo === 'dias de funcionamento') {
            return `✅ Os dias de funcionamento foram atualizados para *${m.valorNovo}*.`
        }
        return `✅ *${m.campo}* atualizado para: ${m.valorNovo}`
    })

    // Remover duplicatas (ex: horário início + fim gera 2 mensagens iguais)
    const unicas = [...new Set(linhas)]

    return `🔧 *Configurações atualizadas no painel!*\n\n${unicas.join('\n\n')}\n\n_Alteração feita pelo painel da ${nomeIA}._`
}

/**
 * Envia mensagem de confirmação por WhatsApp via Evolution API
 */
export async function enviarNotificacaoWhatsApp(
    instanceName: string,
    whatsappDona: string,
    mensagem: string
): Promise<boolean> {
    if (!EVOLUTION_URL || !EVOLUTION_KEY || !whatsappDona || !mensagem) {
        console.log('[Notificação] Pulando envio — configuração incompleta')
        return false
    }

    try {
        const numero = whatsappDona.replace(/\D/g, '')
        const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_KEY,
            },
            body: JSON.stringify({
                number: numero,
                text: mensagem,
            }),
        })

        if (res.ok) {
            console.log(`[Notificação] ✅ Confirmação enviada para ${numero}`)
            return true
        } else {
            console.error(`[Notificação] ❌ Erro ao enviar:`, await res.text())
            return false
        }
    } catch (err) {
        console.error('[Notificação] Erro:', err)
        return false
    }
}

/**
 * Fluxo completo: detecta mudanças, gera mensagem e envia
 */
export async function notificarMudancaConfig(
    clinicaId: string,
    dadosAntigos: Record<string, unknown>,
    dadosNovos: Record<string, unknown>
) {
    const mudancas = detectarMudancas(dadosAntigos, dadosNovos)
    if (mudancas.length === 0) return

    // Buscar dados da clínica para enviar a notificação
    const clinica = await prisma.clinica.findUnique({
        where: { id: clinicaId },
        select: {
            nomeAssistente: true,
            whatsappDoutora: true,
            instanceName: true,
        },
    })

    if (!clinica?.whatsappDoutora || !clinica?.instanceName) {
        console.log('[Notificação] Sem WhatsApp/instância configurados — pulando')
        return
    }

    const mensagem = gerarMensagemConfirmacao(
        clinica.nomeAssistente || 'IARA',
        mudancas
    )

    if (mensagem) {
        await enviarNotificacaoWhatsApp(
            clinica.instanceName,
            clinica.whatsappDoutora,
            mensagem
        )
    }
}
