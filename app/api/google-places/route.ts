import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

/**
 * GET /api/google-places?q=NomeClinica+Cidade
 * 
 * Busca clínica no Google Places e retorna até 5 resultados com:
 * - name, address, place_id, rating
 * 
 * O place_id é usado para gerar o link de avaliação:
 * https://search.google.com/local/writereview?placeid=PLACE_ID
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)
        if (!clinicaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        if (!GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY não configurada', noKey: true }, { status: 422 })
        }

        const q = request.nextUrl.searchParams.get('q') || ''
        if (!q.trim()) return NextResponse.json({ results: [] })

        // Google Places Text Search
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${GOOGLE_API_KEY}&language=pt-BR`

        const res = await fetch(url)
        const data = await res.json()

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('[Google Places] Erro:', data.status, data.error_message)
            return NextResponse.json({ error: data.error_message || data.status }, { status: 400 })
        }

        const results = (data.results || []).slice(0, 5).map((place: any) => ({
            placeId: place.place_id,
            nome: place.name,
            endereco: place.formatted_address,
            rating: place.rating,
            totalRatings: place.user_ratings_total,
            // Link direto para escrever review
            linkReview: `https://search.google.com/local/writereview?placeid=${place.place_id}`,
        }))

        return NextResponse.json({ results })
    } catch (err: any) {
        console.error('[Google Places] Erro:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
