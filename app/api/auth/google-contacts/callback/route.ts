import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/google-contacts/callback
 * 
 * Callback OAuth2 — troca code por token, busca contatos do Google People API,
 * e redireciona para /contatos com os dados salvos temporariamente.
 */
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code')
    const stateParam = request.nextUrl.searchParams.get('state')
    const error = request.nextUrl.searchParams.get('error')

    if (error || !code || !stateParam) {
        return NextResponse.redirect(new URL('/contatos?google_error=cancelled', request.url))
    }

    try {
        const { clinicaId } = JSON.parse(Buffer.from(stateParam, 'base64').toString())
        if (!clinicaId) throw new Error('clinicaId inválido')

        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const redirectUri = process.env.GOOGLE_CONTACTS_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google-contacts/callback`

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/contatos?google_error=no_credentials', request.url))
        }

        // Trocar code por tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code, client_id: clientId, client_secret: clientSecret,
                redirect_uri: redirectUri, grant_type: 'authorization_code',
            }),
        })

        const tokens = await tokenRes.json()
        if (!tokens.access_token) {
            console.error('[Google Contacts] Token error:', tokens)
            return NextResponse.redirect(new URL('/contatos?google_error=token_fail', request.url))
        }

        // Buscar contatos via People API
        const peopleRes = await fetch(
            'https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,birthdays&pageSize=1000',
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        )
        const peopleData = await peopleRes.json()
        const connections = peopleData.connections || []

        // Processar contatos
        let importados = 0
        for (const person of connections) {
            const nome = person.names?.[0]?.displayName || null
            const phoneRaw = person.phoneNumbers?.[0]?.canonicalForm || person.phoneNumbers?.[0]?.value || null
            const email = person.emailAddresses?.[0]?.value || null
            const birthday = person.birthdays?.[0]?.date || null

            // Precisa de pelo menos nome e telefone
            if (!nome || !phoneRaw) continue

            // Normalizar telefone
            let telefone = phoneRaw.replace(/\D/g, '')
            if (telefone.startsWith('0')) telefone = telefone.slice(1)
            if (!telefone.startsWith('55')) telefone = '55' + telefone
            if (telefone.length < 12) continue // muito curto

            // Verificar duplicata
            const existing = await prisma.contato.findFirst({
                where: { clinicaId: Number(clinicaId), telefone },
            })
            if (existing) continue

            // Montar data de nascimento
            let dataNascimento: Date | null = null
            if (birthday && birthday.month && birthday.day) {
                const year = birthday.year || 1900
                dataNascimento = new Date(year, birthday.month - 1, birthday.day)
            }

            await prisma.contato.create({
                data: {
                    clinicaId: Number(clinicaId),
                    nome,
                    telefone,
                    email: email || null,
                    dataNascimento,
                    origem: 'google',
                    etapa: 'novo',
                },
            })
            importados++
        }

        console.log(`[Google Contacts] ✅ ${importados} contatos importados para clínica ${clinicaId}`)
        return NextResponse.redirect(new URL(`/contatos?google_imported=${importados}`, request.url))
    } catch (err: any) {
        console.error('[Google Contacts] Erro:', err)
        return NextResponse.redirect(new URL('/contatos?google_error=server_error', request.url))
    }
}
