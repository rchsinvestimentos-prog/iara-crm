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
        // Verificar se já tem foto salva (usando Prisma p/ mapear campos corretamente)
        const existente = await prisma.contato.findFirst({
            where: { clinicaId, telefone },
            select: { id: true, fotoUrl: true },
        })

        // Se já tem foto, pular
        if (existente?.fotoUrl) return

        let fotoUrl: string | null = null

        if (canal === 'whatsapp' && instancia) {
            // WhatsApp: buscar via Evolution API
            const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://press-evolution.h4xd66.easypanel.host'
            const evolutionKey = apikey || process.env.EVOLUTION_API_KEY || ''

            try {
                const res = await fetch(`${evolutionUrl}/chat/fetchProfilePictureUrl/${instancia}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': evolutionKey,
                    },
                    body: JSON.stringify({ number: telefone }),
                    signal: AbortSignal.timeout(8000), // 8s timeout
                })

                if (res.ok) {
                    const data = await res.json()
                    fotoUrl = data.profilePictureUrl || data.wpiUrl || data.url || data.picture || null
                    console.log(`[AutoCapture] 📸 Evolution resposta foto ${telefone}: ${fotoUrl ? 'ENCONTROU' : 'sem foto'}`)
                } else {
                    console.log(`[AutoCapture] ⚠️ Evolution foto ${telefone}: status ${res.status}`)
                }
            } catch (fetchErr: any) {
                console.log(`[AutoCapture] ⚠️ Erro buscando foto ${telefone}: ${fetchErr.message}`)
            }
        }

        // Salvar a foto no contato via Prisma
        if (fotoUrl && existente) {
            await prisma.contato.update({
                where: { id: existente.id },
                data: { fotoUrl },
            })
            console.log(`[AutoCapture] ✅ Foto salva para ${telefone}: ${fotoUrl.slice(0, 60)}...`)
        }
    } catch (err) {
        // Silencioso — foto é opcional
        console.log(`[AutoCapture] Erro geral foto: ${(err as any)?.message}`)
    }
}
