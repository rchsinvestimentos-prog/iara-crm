import { prisma } from '@/lib/prisma'

// Cache para evitar buscar foto repetidamente na mesma sessão
const fotoCache = new Map<string, boolean>()

/**
 * Auto-capture: cria ou atualiza contato no CRM quando recebe mensagem WhatsApp/Instagram.
 * Usa upsert no telefone pra não duplicar. Atualiza ultimoContato e pushName.
 * Também busca foto de perfil do WhatsApp/Instagram.
 */
export async function autoCaptureCRM(opts: {
    clinicaId: number
    telefone: string
    pushName: string
    canal?: string
    instancia?: string
    evolutionApikey?: string
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

        // Auto-mover: 'novo' ou 'importado' → 'em-conversa' (conversa iniciada)
        if (contato.etapa === 'novo' || contato.etapa === 'importado') {
            await prisma.contato.update({
                where: { id: contato.id },
                data: { etapa: 'em_conversa' },
            }).catch(() => {})
        }

        // Buscar foto de perfil (se ainda não tem e não buscou recentemente)
        const fotoKey = `${opts.clinicaId}:${opts.telefone}`
        if (!fotoCache.has(fotoKey)) {
            fotoCache.set(fotoKey, true)
            // Fire-and-forget — não bloqueia o pipeline
            fetchAndSaveProfilePhoto(opts.clinicaId, opts.telefone, opts.canal || 'whatsapp', opts.instancia, opts.evolutionApikey)
                .catch(() => {})
        }

        return contato
    } catch (err) {
        console.error('[AutoCapture] Erro ao criar/atualizar contato:', err)
        return null
    }
}

/**
 * Busca a foto de perfil do WhatsApp via Evolution API e salva no contato.
 */
async function fetchAndSaveProfilePhoto(
    clinicaId: number,
    telefone: string,
    canal: string,
    instancia?: string,
    apikey?: string
) {
    try {
        // Verificar se já tem foto salva
        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT foto_url FROM contatos WHERE clinica_id = $1 AND numero_whatsapp = $2 AND foto_url IS NOT NULL LIMIT 1`,
            clinicaId, telefone
        ).catch(() => [])
        
        if (existing.length > 0 && existing[0].foto_url) return // Já tem foto

        let fotoUrl: string | null = null

        if (canal === 'whatsapp' && instancia) {
            // WhatsApp: buscar via Evolution API
            const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://press-evolution.h4xd66.easypanel.host'
            const evolutionKey = apikey || process.env.EVOLUTION_API_KEY || ''
            
            const res = await fetch(`${evolutionUrl}/chat/fetchProfilePictureUrl/${instancia}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': evolutionKey,
                },
                body: JSON.stringify({ number: telefone }),
            })
            
            if (res.ok) {
                const data = await res.json()
                fotoUrl = data.profilePictureUrl || data.wpiUrl || data.url || null
            }
        }

        // Salvar a foto no contato
        if (fotoUrl) {
            await prisma.$executeRawUnsafe(
                `UPDATE contatos SET foto_url = $1 WHERE clinica_id = $2 AND numero_whatsapp = $3`,
                fotoUrl, clinicaId, telefone
            ).catch(() => {})
            console.log(`[AutoCapture] 📸 Foto salva para ${telefone}`)
        }
    } catch (err) {
        // Silencioso — foto é opcional
    }
}
