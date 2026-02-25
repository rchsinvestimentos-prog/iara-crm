import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    const { pathname } = request.nextUrl

    // Rotas públicas — não proteger
    const publicPaths = ['/login', '/api/auth']
    if (publicPaths.some(p => pathname.startsWith(p))) {
        // Se já logado tentando acessar /login, redirecionar
        if (pathname === '/login' && token) {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return NextResponse.next()
    }

    // Rotas protegidas — precisa estar logado
    if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Rotas admin — precisa ser admin
    if (pathname.startsWith('/admin')) {
        if ((token as any).role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/conversas/:path*',
        '/habilidades/:path*',
        '/configuracoes/:path*',
        '/plano/:path*',
        '/admin/:path*',
        '/login',
    ],
}
