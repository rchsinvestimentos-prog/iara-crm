import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
    params: Promise<{ slug: string }>
}

/**
 * /agendar/[slug] — Busca por link_agendamento e redireciona para /a/[slug]
 * Se o profissional existe mas o link_config não tem slug, sincroniza automaticamente.
 */
export default async function RedirectAgendar({ params }: PageProps) {
    const { slug } = await params

    // Verificar se existe profissional com esse slug em link_agendamento
    const profs = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, link_agendamento, link_config->>'slug' as config_slug
        FROM profissionais
        WHERE ativo = true
          AND (link_agendamento = $1 OR link_config->>'slug' = $1)
        LIMIT 1
    `, slug)

    if (!profs[0]) return notFound()

    const prof = profs[0]

    // Se link_config não tem slug mas link_agendamento tem, sincronizar agora
    if (prof.link_agendamento && !prof.config_slug) {
        try {
            await prisma.$executeRawUnsafe(`
                UPDATE profissionais 
                SET link_config = COALESCE(link_config, '{}'::jsonb) || jsonb_build_object('slug', $2::text)
                WHERE id = $1
            `, prof.id, prof.link_agendamento)
        } catch (e) {
            console.error('Erro ao sincronizar slug:', e)
        }
    }

    // Redirect para a página canônica
    redirect(`/a/${slug}`)
}
