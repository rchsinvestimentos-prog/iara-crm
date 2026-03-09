/**
 * Rate Limiter para APIs externas (Anthropic, OpenAI, ElevenLabs).
 * Implementação in-memory simples — funciona até ~300 clínicas.
 * Para 300+ clínicas, migrar para Redis (ioredis).
 * 
 * Uso:
 *   const limiter = getRateLimiter('anthropic', 50, 60000) // 50 req/min
 *   if (!limiter.canProceed(clinicaId)) throw new Error('Rate limited')
 *   limiter.record(clinicaId)
 */

interface RateLimiterConfig {
    maxRequests: number    // max requests no período
    windowMs: number       // janela em ms
}

interface RequestRecord {
    timestamps: number[]
}

class RateLimiter {
    private config: RateLimiterConfig
    private records: Map<string, RequestRecord> = new Map()
    private globalRecords: number[] = []

    constructor(config: RateLimiterConfig) {
        this.config = config
        // Limpar registros antigos a cada 5 minutos
        setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }

    /** Verifica se pode prosseguir (sem estourar o limite) */
    canProceed(clinicaId?: string | number): boolean {
        const now = Date.now()
        const cutoff = now - this.config.windowMs

        // Limitar por clínica (max 1/3 do global)
        if (clinicaId) {
            const key = String(clinicaId)
            const record = this.records.get(key)
            if (record) {
                const recent = record.timestamps.filter(t => t > cutoff)
                const perClinicaMax = Math.max(5, Math.floor(this.config.maxRequests / 3))
                if (recent.length >= perClinicaMax) return false
            }
        }

        // Limitar global
        const recentGlobal = this.globalRecords.filter(t => t > cutoff)
        return recentGlobal.length < this.config.maxRequests
    }

    /** Registra uma request */
    record(clinicaId?: string | number) {
        const now = Date.now()
        this.globalRecords.push(now)

        if (clinicaId) {
            const key = String(clinicaId)
            const record = this.records.get(key) || { timestamps: [] }
            record.timestamps.push(now)
            this.records.set(key, record)
        }
    }

    /** Limpa registros antigos */
    private cleanup() {
        const cutoff = Date.now() - this.config.windowMs * 2
        this.globalRecords = this.globalRecords.filter(t => t > cutoff)

        for (const [key, record] of this.records.entries()) {
            record.timestamps = record.timestamps.filter(t => t > cutoff)
            if (record.timestamps.length === 0) this.records.delete(key)
        }
    }

    /** Retorna stats */
    getStats() {
        const cutoff = Date.now() - this.config.windowMs
        return {
            globalRequestsInWindow: this.globalRecords.filter(t => t > cutoff).length,
            maxRequests: this.config.maxRequests,
            trackedClinics: this.records.size,
            utilizationPercent: Math.round(
                (this.globalRecords.filter(t => t > cutoff).length / this.config.maxRequests) * 100
            ),
        }
    }
}

// Singleton instances
const limiters = new Map<string, RateLimiter>()

export function getRateLimiter(name: string, maxRequests: number, windowMs: number): RateLimiter {
    if (!limiters.has(name)) {
        limiters.set(name, new RateLimiter({ maxRequests, windowMs }))
    }
    return limiters.get(name)!
}

// Pre-configured limiters
export const anthropicLimiter = getRateLimiter('anthropic', 50, 60000)   // 50 req/min
export const openaiLimiter = getRateLimiter('openai', 60, 60000)        // 60 req/min
export const elevenLabsLimiter = getRateLimiter('elevenlabs', 20, 60000) // 20 req/min
export const whisperLimiter = getRateLimiter('whisper', 30, 60000)      // 30 req/min

/**
 * Convenience: check + record in one call.
 * Returns { allowed: boolean }
 * 
 * Usage: const { allowed } = checkRateLimit(clinicaId, 'anthropic')
 */
export function checkRateLimit(clinicaId: string | number, limiterName: 'anthropic' | 'openai' | 'elevenlabs' | 'whisper'): { allowed: boolean } {
    const map: Record<string, RateLimiter> = {
        anthropic: anthropicLimiter,
        openai: openaiLimiter,
        elevenlabs: elevenLabsLimiter,
        whisper: whisperLimiter,
    }
    const limiter = map[limiterName]
    if (!limiter) return { allowed: true }
    const allowed = limiter.canProceed(clinicaId)
    if (allowed) limiter.record(clinicaId)
    return { allowed }
}
