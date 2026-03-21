import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PublicBookingClient from './PublicBookingClient'

interface PageProps {
    params: { slug: string }
}

export default async function PublicBookingPage({ params }: PageProps) {
    const { slug } = params

    // Buscar profissional pelo slug (armazenado em linkConfig->slug)
    const profs = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
            p.id, p.nome, p.tratamento, p.especialidade, p.bio, p.foto_url,
            p.horario_semana, p.almoco_semana, p.atende_sabado, p.horario_sabado,
            p.atende_domingo, p.horario_domingo, p.intervalo_atendimento,
            p.link_config,
            c.nome_clinica, c.nome as nome_doutora
        FROM profissionais p
        LEFT JOIN users c ON c.id = p.clinica_id
        WHERE p.ativo = true
          AND p.link_config->>'slug' = $1
        LIMIT 1
    `, slug)

    if (!profs[0]) return notFound()

    const prof = profs[0]
    const linkConfig = prof.link_config || {}

    return (
        <PublicBookingClient
            nome={prof.nome}
            tratamento={prof.tratamento}
            especialidade={prof.especialidade}
            bio={prof.bio}
            fotoUrl={prof.foto_url}
            linkConfig={linkConfig}
            nomeClinica={prof.nome_clinica || prof.nome_doutora}
        />
    )
}
