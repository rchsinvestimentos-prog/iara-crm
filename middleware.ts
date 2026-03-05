import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

// Subdomínios do admin
const ADMIN_HOSTS = ['adm.iara.click', 'admin.iara.click']

function isAdminSubdomain(host: string): boolean {
    return ADMIN_HOSTS.some(h => host === h || host.startsWith(`${h}:`))
}

export async function middleware(request: NextRequest) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    const { pathname } = request.nextUrl
    const host = request.headers.get('host') || ''
    const isAdmin = isAdminSubdomain(host)

    // ─── Rotas públicas — não proteger ───
    const publicPaths = ['/login', '/api/auth']
    if (publicPaths.some(p => pathname.startsWith(p))) {
        if (pathname === '/login' && token) {
            // Admin logado no subdomain admin → vai pro /admin
            const dest = isAdmin ? '/admin' : '/dashboard'
            return NextResponse.redirect(new URL(dest, request.url))
        }
        return NextResponse.next()
    }

    // ─── Subdomain admin: rewrite automático ───
    if (isAdmin) {
        // Não precisa estar logado ainda? Redireciona pra login
        if (!token) {
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Precisa ser admin (userType do JWT)
        if ((token as any).userType !== 'admin' && (token as any).role !== 'admin') {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // adm.iara.click/ → /admin
        if (pathname === '/' || pathname === '') {
            return NextResponse.rewrite(new URL('/admin', request.url))
        }

        // adm.iara.click/clinicas → /admin/clinicas (se não começa com /admin)
        if (!pathname.startsWith('/admin') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
            return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url))
        }

        return NextResponse.next()
    }

    // ─── Rotas protegidas (app.iara.click) — precisa estar logado ───
    if (!token) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Rotas admin — precisa ser admin
    if (pathname.startsWith('/admin')) {
        if ((token as any).userType !== 'admin' && (token as any).role !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/',
        '/dashboard/:path*',
        '/conversas/:path*',
        '/habilidades/:path*',
        '/configuracoes/:path*',
        '/plano/:path*',
        '/admin/:path*',
        '/login',
        '/clinicas/:path*',
        '/cofre/:path*',
        '/diagnostico/:path*',
        '/feedback/:path*',
        '/financeiro/:path*',
        '/logs/:path*',
    ],
}
