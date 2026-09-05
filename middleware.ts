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
    const publicPaths = [
        '/login',
        // Termos e privacidade precisam abrir sem login: a verificação do app
        // no Google exige ler as duas, e atrás do login ela é reprovada.
        '/termos',
        '/privacidade',
        // Existe uma segunda cópia em /legal. Se for essa a URL cadastrada no
        // Google Cloud, o revisor cai no login e a verificação é reprovada.
        '/legal',
        '/api/auth',
        '/a/',
        '/agendar/',
        '/anamnese/',
        '/api/anamnese/publico/',
        '/api/setup-db'
    ]
    // Prefixo terminado em '/' abre a árvore inteira (é o caso de /a/ e
    // /agendar/); o resto casa exato. Sem isso, '/termos' abriria também um
    // '/termos-internos' futuro — o mesmo furo que já apareceu nos crons.
    const ehPublica = publicPaths.some(p =>
        p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)
    )
    if (ehPublica) {
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
        /*
         * Protege todas as rotas por padrão, EXCETO as que começam com:
         * - _next/static (Arquivos estáticos do Next)
         * - _next/image (Otimização de imagens do Next)
         * - favicon.ico, sitemap.xml, robots.txt (Arquivos de metadados)
         * - Arquivos de imagem genéricos (.png, .jpg, .svg, etc)
         * E as seguintes APIs PÚBLICAS:
         * - api/agendamento-publico
         * - api/auth
         * - api/webhook
         * - api/cron/
         * - api/pagamentos/webhook/  (avisos do Asaas e do Assiny)
         * - api/pagamentos/checkout-publico  (compra pela página de vendas)
         * - vozes/   (amostras de voz do catálogo, em public/vozes)
         *
         * api/cron precisa ficar fora daqui: quem chama é o cron-job.org, que
         * não tem sessão. Sem esta exceção, toda execução agendada era
         * redirecionada para /login com 307 e nunca chegava na rota — foi o
         * motivo de os crons aparecerem como falha e serem desativados.
         * Elas não ficam abertas: cada rota confere CRON_SECRET por conta.
         * A barra final é proposital — sem ela, um /api/cronometro futuro
         * escaparia da proteção por casar o prefixo. Vale o mesmo para os
         * webhooks de pagamento: só /api/pagamentos/webhook/ é liberado, e
         * não /api/pagamentos inteiro, onde vai ficar o checkout — esse
         * precisa de sessão para saber qual clínica está comprando.
         *
         * Cada webhook confere o próprio token e devolve 401 sem ele.
         *
         * vozes/ são as demonstrações do catálogo, iguais para todo mundo —
         * não têm nada de clínica nem de paciente. Áudio de paciente é servido
         * por /api/uploads, que continua protegido. Por isso a liberação é da
         * pasta e não da extensão .mp3: liberar a extensão abriria os uploads.
         */
        '/((?!_next/static|_next/image|api/agendamento-publico|api/auth|api/webhook|api/cron/|api/pagamentos/webhook/|api/pagamentos/checkout-publico|vozes/|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
