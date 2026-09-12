import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PACOTES } from '@/lib/planos'

/**
 * Clonagem de voz no Fish Audio.
 *
 * Antes a gravação ia para a ElevenLabs e o id era salvo como
 * voice_provider = 'elevenlabs', mas lib/engine/audio.ts toca a voz clonada
 * pelo Fish. Id de um serviço e reprodução no outro: nunca tocava.
 *
 * O Fish foi escolhido para clonagem porque cobra por uso e não limita quantas
 * vozes a conta guarda — a ElevenLabs limita por vagas (5 no plano Pro), o que
 * travaria o número de clínicas que podem clonar.
 */

/** 15 segundos de voz limpa é o mínimo que o Fish recomenda para um clone bom. */
const TAMANHO_MINIMO_BYTES = 60 * 1024
const TAMANHO_MAXIMO_BYTES = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nome: true, nomeClinica: true, configuracoes: true },
        })
        if (!clinica) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        // A clonagem é pacote avulso, não nível de plano. O gate antigo era
        // nivel >= 3, então quem comprava o pacote em outro plano não conseguia
        // clonar, e quem estava no plano 3 sem o pacote conseguia de graça.
        const cfgAtual = (clinica.configuracoes as Record<string, unknown>) || {}
        if (!cfgAtual[PACOTES.clonagem.chave]) {
            return NextResponse.json(
                { error: 'A clonagem de voz é um pacote à parte. Fale com o suporte para liberar.' },
                { status: 403 }
            )
        }

        if (!process.env.FISH_AUDIO_API_KEY) {
            console.error('[Clonagem] FISH_AUDIO_API_KEY não configurada')
            return NextResponse.json({ error: 'Clonagem indisponível no momento. Fale com o suporte.' }, { status: 503 })
        }

        const formData = await request.formData()
        const audio = formData.get('audio') as File | null
        const nomeVoz = (formData.get('nome') as string) || clinica.nome || 'Dra'

        if (!audio) {
            return NextResponse.json({ error: 'Envie a gravação da sua voz.' }, { status: 400 })
        }
        if (audio.size < TAMANHO_MINIMO_BYTES) {
            return NextResponse.json(
                { error: 'A gravação ficou muito curta. Grave de 30 a 60 segundos falando sem parar.' },
                { status: 400 }
            )
        }
        if (audio.size > TAMANHO_MAXIMO_BYTES) {
            return NextResponse.json({ error: 'A gravação ficou grande demais. Grave até 2 minutos.' }, { status: 400 })
        }

        const fishForm = new FormData()
        fishForm.append('type', 'tts')
        fishForm.append('train_mode', 'fast')
        fishForm.append('title', `IARA - ${nomeVoz}`)
        fishForm.append('description', `Voz de ${nomeVoz}, clínica ${clinica.nomeClinica || clinica.nome || clinicaId}`)
        // Privada: a voz de uma profissional real não pode ficar no catálogo público.
        fishForm.append('visibility', 'private')
        fishForm.append('enhance_audio_quality', 'true')
        fishForm.append('voices', audio)

        const res = await fetch('https://api.fish.audio/model', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}` },
            body: fishForm,
        })

        if (!res.ok) {
            const detalhe = (await res.text()).slice(0, 300)
            console.error(`[Clonagem] ❌ Fish HTTP ${res.status}:`, detalhe)
            const amigavel = res.status === 402 || /credit|balance/i.test(detalhe)
                ? 'A conta de voz está sem saldo. Fale com o suporte.'
                : 'Não consegui criar a voz agora. Tente de novo em alguns minutos.'
            return NextResponse.json({ error: amigavel }, { status: 502 })
        }

        const data = await res.json()
        const voiceId = data?._id || data?.id
        if (!voiceId) {
            console.error('[Clonagem] ❌ Fish respondeu sem id:', JSON.stringify(data).slice(0, 200))
            return NextResponse.json({ error: 'Resposta inesperada do serviço de voz.' }, { status: 502 })
        }

        // Um update só, pelo id da clínica. O anterior casava pelo NOME
        // ("WHERE nome_clinica ILIKE '%nome%'"), o que podia gravar a voz de
        // uma clínica na ficha de outra com nome parecido.
        await prisma.clinica.update({
            where: { id: clinicaId },
            data: {
                vozClonada: voiceId,
                configuracoes: {
                    ...cfgAtual,
                    voice_id_clonada: voiceId,
                    voice_provider: 'fish',
                    tipo_voz_ativa: 'clone',
                    usar_voz_clonada: true,
                },
            },
        })

        console.log(`[Clonagem] ✅ Voz criada no Fish para clínica ${clinicaId}: ${voiceId}`)

        return NextResponse.json({
            ok: true,
            voiceId,
            mensagem: `Pronto! A ${nomeVoz} agora atende com a sua voz.`,
        })
    } catch (err) {
        console.error('[Clonagem] ❌ Erro:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

/** GET /api/midia/clonar-voz — a clínica já tem voz clonada? */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Buscava com "WHERE nome_clinica ILIKE '%<id da clínica>%'", comparando
        // o id com o NOME: nunca achava nada e a tela dizia que não havia voz.
        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
            select: { nivel: true, vozClonada: true, configuracoes: true },
        })

        const cfg = (clinica?.configuracoes as Record<string, unknown>) || {}
        const voiceId = (cfg.voice_id_clonada as string) || clinica?.vozClonada || null

        return NextResponse.json({
            voiceId,
            temVoz: !!voiceId,
            temPacote: !!cfg[PACOTES.clonagem.chave],
            plano: clinica?.nivel || 1,
        })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
