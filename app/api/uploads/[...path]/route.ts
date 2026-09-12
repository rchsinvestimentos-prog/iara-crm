import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { readFile, stat, unlink } from 'fs/promises'
import { resolve, relative, sep, extname, isAbsolute } from 'path'
import { authOptions, getClinicaId, isAdmin, isProfissional } from '@/lib/auth'

const UPLOADS_DIR = resolve(process.env.UPLOADS_DIR || '/app/uploads')

const MIME: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm',
    // Comprovante de sinal chega como PDF, e sem o tipo certo o navegador
    // baixava o arquivo em vez de mostrar para a doutora conferir.
    '.pdf': 'application/pdf', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav',
}

/**
 * Quem pode abrir cada pasta de UPLOADS_DIR.
 *
 * Antes, o middleware liberava sem login QUALQUER caminho terminado em
 * .png/.jpg/.webp/... — inclusive a foto que a paciente manda no WhatsApp e o
 * comprovante do sinal (confirmado em produção em 12/09/2026). A regra do
 * middleware continua (ela serve também às imagens de public/), mas quem
 * decide aqui é esta rota, pasta por pasta:
 *
 *   avatars/          pública — foto de perfil da clínica (página de agendamento)
 *   <id>/foto/        pública — fotos dos profissionais, mostradas em /a/[slug]
 *   <id>/<resto>/     só a própria clínica (dona ou equipe) ou admin:
 *                     media/ (fotos, PDFs e vídeos da paciente), audio/ (voz
 *                     da doutora para clonagem), video/
 *   audios/           qualquer pessoa logada — áudios das conversas; a pasta
 *                     não é separada por clínica
 *   qualquer outra    ninguém
 */
type Regra =
    | { tipo: 'publica' }
    | { tipo: 'logado' }
    | { tipo: 'clinica'; clinicaId: number }

function regraDaPasta(partes: string[]): Regra | null {
    if (partes.length < 2) return null
    const [primeira, segunda] = partes
    if (primeira === 'avatars') return { tipo: 'publica' }
    if (primeira === 'audios') return { tipo: 'logado' }
    if (/^\d+$/.test(primeira)) {
        if (segunda === 'foto' && partes.length >= 3) return { tipo: 'publica' }
        return { tipo: 'clinica', clinicaId: Number(primeira) }
    }
    return null
}

/** Caminho absoluto e pastas relativas, ou null se sair de UPLOADS_DIR. */
function localizar(segmentos: string[]): { arquivo: string; partes: string[] } | null {
    const arquivo = resolve(UPLOADS_DIR, ...segmentos)
    const rel = relative(UPLOADS_DIR, arquivo)
    // startsWith(UPLOADS_DIR) sozinho deixava passar /app/uploads-outra-pasta.
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
    return { arquivo, partes: rel.split(sep) }
}

/** A sessão é da clínica dona desta pasta? (dona, clínica ativa ou profissional da equipe) */
async function ehDaClinica(session: any, clinicaId: number): Promise<boolean> {
    if (!session?.user) return false
    if ((await getClinicaId(session)) === clinicaId) return true
    // Dona de várias clínicas navegando numa filha continua dona da própria conta.
    return !isProfissional(session) && Number(session.user.id) === clinicaId
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const { path } = await params
        const alvo = localizar(path)
        if (!alvo) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const regra = regraDaPasta(alvo.partes)
        if (!regra) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (regra.tipo !== 'publica') {
            const session = await getServerSession(authOptions)
            if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
            if (regra.tipo === 'clinica' && !isAdmin(session) && !(await ehDaClinica(session, regra.clinicaId))) {
                // 404 e não 403: não confirma para outra clínica que o arquivo existe.
                return NextResponse.json({ error: 'Not found' }, { status: 404 })
            }
        }

        const info = await stat(alvo.arquivo).catch(() => null)
        if (!info || !info.isFile()) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const buffer = await readFile(alvo.arquivo)
        const ext = extname(alvo.arquivo).toLowerCase()
        const headers: Record<string, string> = {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            // Arquivo protegido não pode ficar guardado em cache compartilhado.
            'Cache-Control': regra.tipo === 'publica' ? 'public, max-age=3600' : 'private, max-age=3600',
        }
        // SVG aberto direto no navegador executa script no domínio do painel.
        if (ext === '.svg') headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

        return new NextResponse(buffer, { headers })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

/**
 * Apaga um arquivo. Admin apaga qualquer um; a dona da clínica (não a
 * equipe) apaga os da pasta da própria clínica. A foto de perfil tem rota
 * própria (DELETE /api/auth/foto-perfil).
 *
 * Só remove o arquivo do disco: se ele estiver ligado a um registro (ex.:
 * prontuário), o registro continua e o link passa a dar 404.
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { path } = await params
        const alvo = localizar(path)
        if (!alvo) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const regra = regraDaPasta(alvo.partes)
        if (!regra) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        if (!isAdmin(session)) {
            if (isProfissional(session)) {
                return NextResponse.json({ error: 'Só a dona da clínica pode apagar arquivos' }, { status: 403 })
            }
            const clinicaDaPasta = /^\d+$/.test(alvo.partes[0]) ? Number(alvo.partes[0]) : null
            if (clinicaDaPasta === null) {
                return NextResponse.json({ error: 'Só o admin pode apagar este arquivo' }, { status: 403 })
            }
            if (!(await ehDaClinica(session, clinicaDaPasta))) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 })
            }
        }

        const info = await stat(alvo.arquivo).catch(() => null)
        if (!info || !info.isFile()) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        await unlink(alvo.arquivo)
        console.log(`[Uploads] 🗑️ ${alvo.partes.join('/')} apagado por ${session.user.email}`)
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[Uploads] Erro ao apagar:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
