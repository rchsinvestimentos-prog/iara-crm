// ============================================
// ÁUDIO — Transcrição + TTS
// ============================================
// Transcrever áudios recebidos (Whisper) e gerar áudios de resposta (TTS).
// Era o F05 (Transcrição) + F08 (Voz TTS) no n8n.
//
// PROVEDOR DE VOZ POR PLANO:
// - P1 (Secretária): OpenAI TTS "nova" — gratuito-ish, voz feminina natural
// - P2 (Estrategista): OpenAI TTS "nova" (ou ElevenLabs padrão se configurado)
// - P3+ (Designer/Audiovisual): ElevenLabs com voz clonada da Dra

import type { DadosClinica, ConfigSaida } from './types'
import * as fs from 'fs'
import * as path from 'path'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''

// ============================================
// TRANSCRIÇÃO (Whisper)
// ============================================

/**
 * Transcreve áudio usando OpenAI Whisper.
 * 
 * Recebe: áudio em base64
 * Retorna: texto transcrito
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
    if (!audioBase64 || !OPENAI_API_KEY) {
        console.error('[Audio] Sem áudio base64 ou API key')
        return ''
    }

    try {
        // Converter base64 para buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64')

        // Montar FormData com o arquivo
        const formData = new FormData()
        const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' })
        formData.append('file', audioBlob, 'audio.ogg')
        formData.append('model', 'whisper-1')
        formData.append('language', 'pt') // detecta automatico se não for PT

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: formData,
        })

        if (!res.ok) {
            const err = await res.text()
            console.error('[Audio] Erro Whisper:', err)
            return ''
        }

        const data = await res.json()
        const texto = (data.text || '').trim()
        console.log(`[Audio] ✅ Transcrito: "${texto.slice(0, 80)}..."`)
        return texto

    } catch (err) {
        console.error('[Audio] Erro na transcrição:', err)
        return ''
    }
}

/**
 * Baixar áudio da Evolution API (base64).
 * Quando a Evolution manda o webhook, o áudio pode vir embutido ou precisar ser baixado.
 */
export async function downloadAudioFromEvolution(
    instanceName: string,
    messageId: string,
    apikey?: string,
    rawMessage?: any
): Promise<string | null> {
    const EVOLUTION_URL = process.env.EVOLUTION_API_URL || ''
    const EVOLUTION_KEY = apikey || process.env.EVOLUTION_API_KEY || ''

    if (!EVOLUTION_URL) {
        console.error('[Audio] ❌ EVOLUTION_API_URL não configurada')
        return null
    }

    // ===================================================
    // ESTRATÉGIA 1: getBase64FromMediaMessage (padrão)
    // ===================================================
    try {
        console.log(`[Audio] 📥 [1/3] Tentando getBase64FromMediaMessage... (instance: ${instanceName}, msgId: ${messageId})`)
        const res = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_KEY,
            },
            body: JSON.stringify({
                message: rawMessage || { key: { id: messageId } },
                convertToMp4: false,
            }),
        })

        if (res.ok) {
            const data = await res.json()
            const base64 = data.base64 || data.audio || null
            if (base64 && base64.length > 100) {
                console.log(`[Audio] ✅ [1/3] Base64 obtido (${(base64.length / 1024).toFixed(0)}KB)`)
                return base64
            }
            console.log(`[Audio] ⚠️ [1/3] Resposta OK mas base64 vazio:`, JSON.stringify(data).slice(0, 100))
        } else {
            console.log(`[Audio] ⚠️ [1/3] Status ${res.status} — tentando próxima estratégia`)
        }
    } catch (err) {
        console.error('[Audio] ❌ [1/3] Erro:', err)
    }

    // ===================================================
    // ESTRATÉGIA 2: /message/download-media (Evolution v2)
    // ===================================================
    try {
        console.log(`[Audio] 📥 [2/3] Tentando download-media endpoint...`)
        const res = await fetch(`${EVOLUTION_URL}/message/download-media/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_KEY,
            },
            body: JSON.stringify({
                message: rawMessage || { key: { id: messageId } },
            }),
        })

        if (res.ok) {
            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('audio') || contentType.includes('octet-stream') || contentType.includes('application')) {
                const buf = await res.arrayBuffer()
                if (buf.byteLength > 100) {
                    const base64 = Buffer.from(buf).toString('base64')
                    console.log(`[Audio] ✅ [2/3] Binary obtido (${(buf.byteLength / 1024).toFixed(0)}KB)`)
                    return base64
                }
            } else {
                const data = await res.json().catch(() => null)
                if (data) {
                    const base64 = data.base64 || data.audio || null
                    if (base64 && base64.length > 100) {
                        console.log(`[Audio] ✅ [2/3] Base64 JSON obtido (${(base64.length / 1024).toFixed(0)}KB)`)
                        return base64
                    }
                }
            }
            console.log(`[Audio] ⚠️ [2/3] Resposta OK mas sem dados utilizáveis`)
        } else {
            console.log(`[Audio] ⚠️ [2/3] Status ${res.status}`)
        }
    } catch (err) {
        console.error('[Audio] ❌ [2/3] Erro:', err)
    }

    // ===================================================
    // ESTRATÉGIA 3: Download direto da URL (Evolution v2 fallback)
    // ===================================================
    const mediaUrl = rawMessage?.audioMessage?.url
        || rawMessage?.message?.audioMessage?.url
        || rawMessage?.audioMessage?.directPath
    if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
        try {
            console.log(`[Audio] 📥 [3/3] Download direto da URL: ${mediaUrl.slice(0, 80)}`)
            const res = await fetch(mediaUrl, {
                headers: { 'User-Agent': 'WhatsApp/2.23.20.0 A' }
            })
            if (res.ok) {
                const buf = await res.arrayBuffer()
                if (buf.byteLength > 100) {
                    const base64 = Buffer.from(buf).toString('base64')
                    console.log(`[Audio] ✅ [3/3] URL download OK (${(buf.byteLength / 1024).toFixed(0)}KB)`)
                    return base64
                }
            }
        } catch (err) {
            console.error('[Audio] ❌ [3/3] Erro:', err)
        }
    }

    console.error(`[Audio] ❌ Todas as 3 estratégias falharam para msgId: ${messageId}`)
    return null
}


// ============================================
// TTS (Text-to-Speech)
// ============================================

/**
 * Determina qual provedor de voz usar baseado no plano da clínica.
 * 
 * LÓGICA:
 * - P1: OpenAI TTS "nova" (quando a cliente envia áudio)
 * - P2: ElevenLabs padrão (se configurado, senão OpenAI)
 * - P3+: ElevenLabs com voz clonada (se enviou áudio pra clonar)
 * 
 * SÓ GERA ÁUDIO se a cliente enviou áudio primeiro (respeita o canal).
 */
export function determineOutputType(
    clinica: DadosClinica,
    clienteEnviouAudio: boolean,
    responderAudioAtivo: boolean = true,
    cotaRealistaDisponivel: boolean = true
): ConfigSaida {
    // Se não veio áudio, responde com texto
    if (!clienteEnviouAudio) {
        return { tipoSaida: 'text', provedorVoz: null, voiceId: null }
    }

    // Se o toggle "responder com áudio" está desligado, força texto
    if (!responderAudioAtivo) {
        console.log('[Audio] 🔇 responder_audio=OFF — forçando resposta em texto')
        return { tipoSaida: 'text', provedorVoz: null, voiceId: null }
    }

    const cfg = (clinica.configuracoes as any) || {}

    // -----------------------------------------------
    // Preferências salvas pelo VozTool.
    //
    // Os dois pacotes são independentes do plano: qualquer clínica pode
    // comprar qualquer um. Antes isso era amarrado ao nível, o que deixava
    // o Premium sem clonagem se ela não tivesse pago o pacote, e obrigava
    // quem só queria voz bonita a subir de plano.
    // -----------------------------------------------
    const azureVoiceId = cfg.azure_voice_id || VOZ_AZURE_PADRAO
    const elevenVoiceId = cfg.eleven_voice_id || null
    const vozClonadaId = cfg.voice_id_clonada || clinica.vozClonada || null
    const temPacoteRealista = !!cfg.pacote_voz_realista
    const temPacoteClonagem = !!cfg.pacote_clonagem
    // Compatibilidade: clínicas configuradas antes desta mudança têm 'tts' e
    // 'ultra' gravados. Sem esta tradução elas cairiam todas no padrão e quem
    // pagou pela voz realista perderia a voz de um deploy para o outro.
    const LEGADO: Record<string, string> = { tts: 'padrao', ultra: 'realista' }
    const salvo = cfg.tipo_voz_ativa ? (LEGADO[cfg.tipo_voz_ativa] || cfg.tipo_voz_ativa) : null
    const escolha = salvo || (temPacoteClonagem ? 'clone' : temPacoteRealista ? 'realista' : 'padrao')

    // -----------------------------------------------
    // CLONAGEM — voz da própria doutora, via Fish Audio
    // -----------------------------------------------
    if (escolha === 'clone' && temPacoteClonagem && vozClonadaId) {
        console.log('[Audio] 🎙️ voz: clone (Fish Audio)')
        return { tipoSaida: 'audio', provedorVoz: 'fish', voiceId: vozClonadaId }
    }

    // -----------------------------------------------
    // VOZ REALISTA — catálogo da ElevenLabs, pacote de R$97
    //
    // Tem cota própria porque custa ~10x a Azure por áudio. Quando acaba,
    // cai para a Azure em vez de parar: a cliente continua ouvindo uma voz
    // boa, só não a premium. Ninguém fica sem resposta por causa de cota.
    // -----------------------------------------------
    if (escolha === 'realista' && temPacoteRealista && elevenVoiceId) {
        if (cotaRealistaDisponivel) {
            console.log('[Audio] 🎙️ voz: realista (ElevenLabs)')
            return { tipoSaida: 'audio', provedorVoz: 'elevenlabs', voiceId: elevenVoiceId }
        }
        console.log('[Audio] 🎙️ cota de voz realista esgotada no mês — usando Azure')
    }

    // -----------------------------------------------
    // PADRÃO — Azure, incluída em todos os planos
    // -----------------------------------------------
    console.log(`[Audio] 🎙️ voz: padrão (Azure ${azureVoiceId})`)
    return { tipoSaida: 'audio', provedorVoz: 'azure', voiceId: azureVoiceId }
}

/**
 * Gera áudio a partir de texto usando OpenAI TTS.
 *
 * Não é mais a voz padrão — virou o último recurso da cadeia de reserva.
 * Soa como leitura de robô em português; ficou só para o caso de Azure,
 * ElevenLabs e Fish estarem todas fora do ar ao mesmo tempo.
 *
 * Retorna: áudio em base64 (mp3)
 */
export async function generateTTS_OpenAI(
    texto: string,
    voiceId: string = 'nova'
): Promise<string | null> {
    if (!OPENAI_API_KEY || !texto) return null

    try {
        const res = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: texto,
                voice: voiceId,
                response_format: 'mp3',
            }),
        })

        if (!res.ok) {
            console.error('[TTS-OpenAI] ❌ Erro:', await res.text())
            return null
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        const base64 = buffer.toString('base64')
        console.log(`[TTS-OpenAI] ✅ Áudio gerado (${(buffer.length / 1024).toFixed(0)}KB)`)
        return base64

    } catch (err) {
        console.error('[TTS-OpenAI] Erro:', err)
        return null
    }
}

/**
 * Vozes brasileiras da Azure disponíveis para escolha no painel.
 * São as neurais pt-BR que soam melhor em atendimento — evitei as de
 * locução/telejornal, que ficam artificiais numa conversa de WhatsApp.
 */
export const VOZES_AZURE = [
    { id: 'pt-BR-FranciscaNeural', nome: 'Francisca', desc: 'Acolhedora e natural — a mais próxima de uma recepcionista' },
    { id: 'pt-BR-ThalitaNeural',   nome: 'Thalita',   desc: 'Jovem e simpática, ritmo mais leve' },
    { id: 'pt-BR-BrendaNeural',    nome: 'Brenda',    desc: 'Calma e clara, boa para explicar procedimento' },
    { id: 'pt-BR-LeilaNeural',     nome: 'Leila',     desc: 'Madura e segura, transmite autoridade' },
    { id: 'pt-BR-YaraNeural',      nome: 'Yara',      desc: 'Doce e próxima' },
    { id: 'pt-BR-AntonioNeural',   nome: 'Antônio',   desc: 'Masculina, cordial' },
] as const

export const VOZ_AZURE_PADRAO = 'pt-BR-FranciscaNeural'

/**
 * Gera áudio com a Azure (voz padrão de todos os planos).
 *
 * Custa quase o mesmo da OpenAI e soa muito melhor em português: a OpenAI
 * lê com sotaque de quem aprendeu, a Azure fala como brasileira. Os
 * primeiros 500 mil caracteres do mês são gratuitos na conta da Azure.
 */
export async function generateTTS_Azure(
    texto: string,
    voiceId: string
): Promise<string | null> {
    const key = process.env.AZURE_SPEECH_KEY
    const regiao = process.env.AZURE_SPEECH_REGION || 'brazilsouth'
    if (!key) {
        console.warn('[TTS-Azure] AZURE_SPEECH_KEY não configurada')
        return null
    }

    // A Azure fala SSML. Escapa o texto para não quebrar o XML com & ou <.
    const escapado = texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR">`
        + `<voice name="${voiceId}"><prosody rate="+4%">${escapado}</prosody></voice></speak>`

    try {
        const res = await fetch(`https://${regiao}.tts.speech.microsoft.com/cognitiveservices/v1`, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                'User-Agent': 'IARA',
            },
            body: ssml,
            signal: AbortSignal.timeout(30000),
        })

        if (!res.ok) {
            console.error(`[TTS-Azure] ❌ HTTP ${res.status}:`, (await res.text()).slice(0, 200))
            return null
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        console.log(`[TTS-Azure] ✅ Áudio gerado (${(buffer.length / 1024).toFixed(0)}KB)`)
        return buffer.toString('base64')
    } catch (err) {
        console.error('[TTS-Azure] Erro:', err)
        return null
    }
}

/**
 * Gera áudio com o Fish Audio (pacote de clonagem de voz).
 *
 * Escolhido no lugar da ElevenLabs para clonagem porque cobra por uso e não
 * limita quantas vozes clonadas a conta pode ter. Na ElevenLabs as vagas de
 * clone são contadas por plano, e a conta ficava negativa a partir da sexta
 * clínica — ver o documento "Quanto Custa a IARA".
 *
 * O reference_id é o modelo de voz criado quando a doutora enviou o áudio dela.
 */
export async function generateTTS_Fish(
    texto: string,
    voiceId: string
): Promise<string | null> {
    const key = process.env.FISH_AUDIO_API_KEY
    if (!key) {
        console.warn('[TTS-Fish] FISH_AUDIO_API_KEY não configurada')
        return null
    }

    try {
        const res = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                model: 's1',
            },
            body: JSON.stringify({ text: texto, reference_id: voiceId, format: 'mp3' }),
            signal: AbortSignal.timeout(45000),
        })

        if (!res.ok) {
            console.error(`[TTS-Fish] ❌ HTTP ${res.status}:`, (await res.text()).slice(0, 200))
            return null
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        console.log(`[TTS-Fish] ✅ Áudio gerado (${(buffer.length / 1024).toFixed(0)}KB)`)
        return buffer.toString('base64')
    } catch (err) {
        console.error('[TTS-Fish] Erro:', err)
        return null
    }
}

/**
 * Gera áudio a partir de texto usando ElevenLabs.
 * Retorna: áudio em base64 (mp3)
 */
export async function generateTTS_ElevenLabs(
    texto: string,
    voiceId: string
): Promise<string | null> {
    if (!ELEVENLABS_API_KEY || !voiceId || !texto) return null

    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: texto,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        })

        if (!res.ok) {
            console.error('[TTS-ElevenLabs] ❌ Erro:', await res.text())
            return null
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        const base64 = buffer.toString('base64')
        console.log(`[TTS-ElevenLabs] ✅ Áudio gerado (${(buffer.length / 1024).toFixed(0)}KB)`)
        return base64

    } catch (err) {
        console.error('[TTS-ElevenLabs] Erro:', err)
        return null
    }
}

/**
 * Pré-processa texto antes de enviar ao TTS.
 * Expande abreviações, remove emojis, normaliza números para pronunça natural.
 */
function prepareTextForTTS(texto: string): string {
    return texto
        // Asteriscos de formatação WhatsApp (negrito)
        .replace(/\*/g, '')
        // Horas: "15hrs" → "15 horas", "15h" → "15 horas", "15h30" → "15 horas e 30"
        .replace(/(\d{1,2})\s*hrs?\b/gi, '$1 horas')
        .replace(/(\d{1,2})\s*hs?\b/gi, '$1 horas')
        .replace(/(\d{1,2})h(\d{2})\b/gi, '$1 horas e $2')
        .replace(/(\d{1,2})h\b/gi, '$1 horas')
        // Minutos: "30min" → "30 minutos"
        .replace(/(\d+)\s*min\b/gi, '$1 minutos')
        // Dra. / Dr.
        .replace(/\bDra\.\s*/gi, 'Doutora ')
        .replace(/\bDr\.\s*/gi, 'Doutor ')
        // R$ valores: "R$ 150,00" → "150 reais", "R$ 1.500" → "1500 reais"
        .replace(/R\$\s*(\d+)\.(\d{3}),(\d{2})/g, '$1$2 reais e $3 centavos')
        .replace(/R\$\s*(\d+)\.(\d{3})/g, '$1$2 reais')
        .replace(/R\$\s*(\d+),(\d{2})/g, '$1 reais e $2 centavos')
        .replace(/R\$\s*(\d+)/g, '$1 reais')
        // US$ / € / $
        .replace(/US\$\s*(\d+)/g, '$1 dólares')
        .replace(/\u20ac\s*(\d+)/g, '$1 euros')
        // Porcentagem: "10%" → "10 por cento"
        .replace(/(\d+)%/g, '$1 por cento')
        // Endereço
        .replace(/\bnº\s*/gi, 'número ')
        .replace(/\bN\.\s*(\d)/gi, 'número $1')
        // Abreviações comuns
        .replace(/\bobs\b/gi, 'observação')
        .replace(/\btel\b/gi, 'telefone')
        .replace(/\bqtd\b/gi, 'quantidade')
        .replace(/\bex\b/gi, 'exemplo')
        .replace(/\bprof\b/gi, 'profissional')
        // Emojis (remover para TTS — não são pronúncias)
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
        .replace(/[\u{200D}]/gu, '')
        .replace(/[\u{20E3}]/gu, '')
        // Limpar espaços extras
        .replace(/\s{2,}/g, ' ')
        .trim()
}

/**
 * Gera TTS com o provedor correto baseado na config.
 * 
 * Wrapper que chama OpenAI ou ElevenLabs.
 * Aplica pré-processamento de texto para pronunça natural.
 */
export async function generateTTS(
    texto: string,
    config: ConfigSaida
): Promise<string | null> {
    if (config.tipoSaida !== 'audio' || !config.provedorVoz) return null

    // Pré-processar texto para pronunça natural
    const textoProcessado = prepareTextForTTS(texto)
    console.log(`[TTS] Texto processado: "${textoProcessado.slice(0, 80)}..."`)

    // Contabiliza o custo de voz: na ElevenLabs 1 caractere = 1 crédito, e o
    // crédito é o item mais caro por clínica. Somar 'chars' do mês responde
    // qual plano da ElevenLabs a operação realmente exige.
    console.log(`[TTS] 💰 voz: provedor=${config.provedorVoz} chars=${textoProcessado.length}`)

    // Cadeia de reserva: provedor escolhido → Azure → OpenAI.
    //
    // A Azure fica no meio porque soa bem e é barata: se o pacote premium
    // falhar, a paciente ouve uma voz brasileira decente em vez da leitura
    // robótica. A OpenAI só entra se até a Azure estiver fora do ar.
    //
    // Antes a queda era direto para a OpenAI e ninguém era avisado — foi
    // assim que clínicas pagando pelos planos 2 e 3 ficaram meses com a voz
    // robótica depois que a chave da ElevenLabs foi revogada.
    const azureId = VOZ_AZURE_PADRAO

    if (config.provedorVoz === 'fish' && config.voiceId) {
        const audio = await generateTTS_Fish(textoProcessado, config.voiceId)
        if (audio) return audio
        console.warn('[TTS] ⚠️ Clonagem (Fish) falhou → caindo para Azure')
        return (await generateTTS_Azure(textoProcessado, azureId))
            ?? generateTTS_OpenAI(textoProcessado, 'nova')
    }

    if (config.provedorVoz === 'elevenlabs' && config.voiceId) {
        const audio = await generateTTS_ElevenLabs(textoProcessado, config.voiceId)
        if (audio) return audio
        console.warn('[TTS] ⚠️ Voz realista (ElevenLabs) falhou → caindo para Azure')
        return (await generateTTS_Azure(textoProcessado, azureId))
            ?? generateTTS_OpenAI(textoProcessado, 'nova')
    }

    if (config.provedorVoz === 'azure') {
        const audio = await generateTTS_Azure(textoProcessado, config.voiceId || azureId)
        if (audio) return audio
        console.warn('[TTS] ⚠️ Azure falhou → caindo para OpenAI')
        return generateTTS_OpenAI(textoProcessado, 'nova')
    }

    return generateTTS_OpenAI(textoProcessado, config.voiceId || 'nova')
}

/**
 * Salva um áudio em base64 no disco local (/public/uploads/audios/) e retorna a URL pública.
 */
export async function saveAudioFile(
    base64Data: string,
    prefix: string
): Promise<string | null> {
    try {
        if (!base64Data) return null
        
        // Remover possível cabeçalho do dataURI (data:audio/mp3;base64,...)
        const cleanBase64 = base64Data.replace(/^data:audio\/\w+;base64,/, '')
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audios')
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
        }
        
        const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`
        const filepath = path.join(uploadDir, filename)
        
        await fs.promises.writeFile(filepath, Buffer.from(cleanBase64, 'base64'))
        return `/uploads/audios/${filename}`
    } catch (err) {
        console.error('[Audio] Erro ao salvar arquivo de áudio:', err)
        return null
    }
}
