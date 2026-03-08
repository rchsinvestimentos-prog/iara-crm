import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const maxDuration = 120

// NanoBanana Pro 2 (Gemini 3 Pro Image) — pre-trained tune on Astria
const NANOBANANA_PRO_TUNE_ID = '3618064'

const REALISM_PREFIX = 'RAW photograph, unedited, natural lighting, shot on professional DSLR, 8K UHD, natural skin with visible pores and texture. '
const REALISM_SUFFIX = ' -- untouched RAW file, no artificial smoothing, Kodak Portra 400 color science, photojournalistic quality, real human proportions, accurate hand anatomy with five fingers, natural skin subsurface scattering.'
const NEGATIVE_PROMPT = 'bad quality, blurry, pixelated, plastic skin, airbrushed, CGI, 3D render, digital art, illustration, painting, cartoon, anime, extra fingers, deformed hands, bad anatomy, uncanny valley, artificial looking, overly smooth skin, unnatural lighting, watermark, text, logo'

const parseAspect = (ratio: string) => {
    switch (ratio) {
        case '16:9': return '16:9'
        case '9:16': return '9:16'
        case '1:1': return '1:1'
        case '3:4': return '3:4'
        default: return '9:16'
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { prompt, image, aspectRatio, numImages } = await req.json()

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 })
        }

        const ASTRIA_KEY = process.env.ASTRIA_API_KEY
        const count = Math.min(numImages || 1, 4)

        if (!ASTRIA_KEY) {
            // Mock fallback quando não tem key configurada
            console.warn('[fotos-ia] ASTRIA_API_KEY não configurada. Usando mock.')
            await new Promise(r => setTimeout(r, 3000))
            const mocks = Array.from({ length: count }, (_, i) =>
                `https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=800&auto=format&fit=crop&sig=${Date.now()}-${i}`
            )
            return NextResponse.json({ success: true, mock: true, images: mocks })
        }

        // Clean prompt
        const cleanPrompt = prompt
            .replace(/\[STYLE\]:?\s*/gi, '')
            .replace(/\[POSE\]:?\s*/gi, '')
            .trim()

        const fullPrompt = `${REALISM_PREFIX}${cleanPrompt}${REALISM_SUFFIX}`
        const tuneId = NANOBANANA_PRO_TUNE_ID

        // Build request body
        const promptBody: any = {
            prompt: {
                text: fullPrompt,
                negative_prompt: NEGATIVE_PROMPT,
                num_images: count,
                aspect_ratio: parseAspect(aspectRatio || '9:16'),
                super_resolution: true,
            }
        }

        // Include reference image if provided
        if (image) {
            promptBody.prompt.input_image = image
        }

        // Create prompt on Astria
        const createRes = await fetch(`https://api.astria.ai/tunes/${tuneId}/prompts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ASTRIA_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(promptBody),
        })

        if (!createRes.ok) {
            const err = await createRes.text()
            console.error('[fotos-ia] Astria error:', err)
            return NextResponse.json({ error: `Erro Astria: ${err}` }, { status: 500 })
        }

        const promptData = await createRes.json()

        // Poll for results (async generation)
        const maxAttempts = 60
        const pollInterval = 3000

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, pollInterval))

            const statusRes = await fetch(`https://api.astria.ai/tunes/${tuneId}/prompts/${promptData.id}`, {
                headers: { 'Authorization': `Bearer ${ASTRIA_KEY}` },
            })

            if (!statusRes.ok) continue

            const statusData = await statusRes.json()

            if (statusData.images && statusData.images.length > 0) {
                const images = statusData.images.map((img: any) => typeof img === 'string' ? img : img.url)
                console.log(`[fotos-ia] ✅ ${images.length} images ready!`)
                return NextResponse.json({ success: true, images })
            }

            if (statusData.status === 'failed' || statusData.status === 'error') {
                return NextResponse.json({ error: 'Geração de imagem falhou' }, { status: 500 })
            }
        }

        return NextResponse.json({ error: 'Timeout: imagem demorou mais de 3 minutos' }, { status: 504 })

    } catch (error: any) {
        console.error('[fotos-ia] Fatal:', error)
        return NextResponse.json({ error: error.message || 'Erro na geração' }, { status: 500 })
    }
}
