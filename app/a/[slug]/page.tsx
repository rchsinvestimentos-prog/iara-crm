import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import PublicBioClient from './PublicBioClient'

interface PageProps {
    params: Promise<{ slug: string }>
}

export default async function PublicBookingPage({ params }: PageProps) {
    const { slug } = await params

    // Buscar profissional pelo slug (tenta link_config->>'slug' OU link_agendamento)
    const profs = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
            p.id, p.clinica_id, p.nome, p.tratamento, p.especialidade, p.bio, p.foto_url,
            p.horario_semana, p.almoco_semana, p.atende_sabado, p.horario_sabado,
            p.almoco_sabado, p.atende_domingo, p.horario_domingo, p.almoco_domingo,
            p.intervalo_atendimento,
            p.link_config, p.whatsapp,
            c.nome_clinica, c.nome as nome_doutora, c.plano,
            c.horario_semana as cli_horario_semana, c.almoco_semana as cli_almoco_semana,
            c.atende_sabado as cli_atende_sabado, c.horario_sabado as cli_horario_sabado,
            c.almoco_sabado as cli_almoco_sabado,
            c.atende_domingo as cli_atende_domingo, c.horario_domingo as cli_horario_domingo,
            c.almoco_domingo as cli_almoco_domingo,
            c.intervalo_atendimento as cli_intervalo
        FROM profissionais p
        LEFT JOIN users c ON c.id = p.clinica_id
        WHERE p.ativo = true
          AND (p.link_config->>'slug' = $1 OR p.link_agendamento = $1)
        LIMIT 1
    `, slug)

    if (!profs[0]) return notFound()

    const prof = profs[0]
    const profId = prof.id
    const linkConfig = prof.link_config || {}

    // Buscar procedimentos do profissional
    const procedimentos = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, nome, preco_normal as valor, preco_minimo as desconto,
               parcelamento_padrao as parcelas, duracao_minutos as duracao, descricao
        FROM procedimentos
        WHERE profissional_id = $1 AND ativo = true
        ORDER BY created_at DESC
    `, profId)

    // Buscar cursos
    const cursos = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, nome, modalidade, valor, duracao, vagas, desconto, descricao, link
        FROM cursos
        WHERE profissional_id = $1 AND ativo = true
        ORDER BY "createdAt" DESC
    `, profId)

    // Buscar combos
    const combos = await prisma.$queryRawUnsafe<any[]>(`
        SELECT c.id, c.nome, c.descricao, c."valorOriginal" as valor_original,
               c."valorCombo" as valor_combo
        FROM combos c
        WHERE c.profissional_id = $1 AND c.ativo = true
        ORDER BY c."createdAt" DESC
    `, profId)

    for (const combo of combos) {
        const cp = await prisma.$queryRawUnsafe<any[]>(`
            SELECT p.nome FROM combo_procedimentos cp
            JOIN procedimentos p ON p.id::text = cp."procedimentoId"
            WHERE cp."comboId" = $1
        `, combo.id)
        combo.procedimentos = cp.map((x: any) => x.nome)
    }

    // Buscar promoções ativas
    const promocoes = await prisma.$queryRawUnsafe<any[]>(`
        SELECT p.id, p.nome, p.descricao, p."tipoDesconto" as tipo_desconto,
               p."valorDesconto" as valor_desconto,
               p."dataInicio" as data_inicio, p."dataFim" as data_fim
        FROM promocoes p
        WHERE p.profissional_id = $1 AND p.ativo = true
          AND p."dataFim" >= CURRENT_DATE
        ORDER BY p."dataFim" ASC
    `, profId)

    for (const promo of promocoes) {
        const pp = await prisma.$queryRawUnsafe<any[]>(`
            SELECT pr.nome FROM promocao_procedimentos pp
            JOIN procedimentos pr ON pr.id::text = pp."procedimentoId"
            WHERE pp."promocaoId" = $1
        `, promo.id)
        promo.procedimentos = pp.map((x: any) => x.nome)
    }

    return (
        <PublicBioClient
            profissionalId={prof.id}
            clinicaId={prof.clinica_id || 0}
            plano={prof.plano}
            nome={prof.nome}
            tratamento={prof.tratamento}
            especialidade={prof.especialidade}
            bio={prof.bio}
            fotoUrl={prof.foto_url}
            linkConfig={linkConfig}
            nomeClinica={prof.nome_clinica || prof.nome_doutora}
            whatsapp={prof.whatsapp}
            procedimentos={procedimentos.map((p: any) => ({
                ...p, valor: Number(p.valor), desconto: Number(p.desconto)
            }))}
            cursos={cursos}
            combos={combos}
            promocoes={promocoes}
        />
    )
}
