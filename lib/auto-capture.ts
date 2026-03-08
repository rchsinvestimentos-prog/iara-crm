import { prisma } from '@/lib/prisma'

/**
 * Auto-capture: cria ou atualiza contato no CRM quando recebe mensagem WhatsApp.
 * Usa upsert no telefone pra não duplicar. Atualiza ultimoContato e pushName.
 */
export async function autoCaptureCRM(opts: {
    clinicaId: number
    telefone: string
    pushName: string
    canal?: string
}) {
    if (!opts.telefone || opts.telefone.length < 8) return null

    try {
        const contato = await prisma.contato.upsert({
            where: {
                clinicaId_telefone: {
                    clinicaId: opts.clinicaId,
                    telefone: opts.telefone,
                }
            },
            create: {
                clinicaId: opts.clinicaId,
                telefone: opts.telefone,
                nome: opts.pushName || `+${opts.telefone}`,
                origem: opts.canal || 'whatsapp',
                etapa: 'novo',
                ultimoContato: new Date(),
            },
            update: {
                ultimoContato: new Date(),
                // Só atualizar nome se veio pushName e o contato ainda tem nome genérico
                ...(opts.pushName ? {
                    nome: opts.pushName,
                } : {}),
            },
        })

        return contato
    } catch (err) {
        console.error('[AutoCapture] Erro ao criar/atualizar contato:', err)
        return null
    }
}
