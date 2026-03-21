import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isProfissional, getProfissionalId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * GET /api/profissional/me
 * 
 * Retorna dados do profissional logado.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
                p.id, p.nome, p.email, p.whatsapp, p.tratamento, p.bio, p.especialidade,
                p.diferenciais, p.foto_url, p.horario_semana, p.almoco_semana,
                p.atende_sabado, p.horario_sabado, p.atende_domingo, p.horario_domingo,
                p.intervalo_atendimento, p.link_agendamento, p.cursos, p.redes_sociais_prof,
                p.ausencias, p.chave_pix, p.link_pagamento,
                p.termos_aceitos, p.disclaimer_pos_aceito, p.disclaimer_pos_aceito_em,
                p.link_config, p.senha_hash IS NOT NULL AS tem_senha,
                c.nome_clinica, c.nome as nome_doutora, c.nivel
            FROM profissionais p
            LEFT JOIN clinica c ON c.id = p.clinica_id
            WHERE p.id = $1
        `, profId)

        if (!rows[0]) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

        const p = rows[0]
        return NextResponse.json({
            id: p.id,
            nome: p.nome,
            email: p.email,
            whatsapp: p.whatsapp,
            tratamento: p.tratamento,
            bio: p.bio,
            especialidade: p.especialidade,
            diferenciais: p.diferenciais,
            fotoUrl: p.foto_url,
            horarioSemana: p.horario_semana,
            almocoSemana: p.almoco_semana,
            atendeSabado: p.atende_sabado,
            horarioSabado: p.horario_sabado,
            atendeDomingo: p.atende_domingo,
            horarioDomingo: p.horario_domingo,
            intervaloAtendimento: p.intervalo_atendimento,
            linkAgendamento: p.link_agendamento,
            cursos: p.cursos,
            redesSociais: p.redes_sociais_prof,
            ausencias: p.ausencias,
            chavePix: p.chave_pix,
            linkPagamento: p.link_pagamento,
            termosAceitos: p.termos_aceitos,
            disclaimerPosAceito: p.disclaimer_pos_aceito,
            disclaimerPosAceitoEm: p.disclaimer_pos_aceito_em,
            linkConfig: p.link_config,
            temSenha: p.tem_senha,
            nomeClinica: p.nome_clinica || p.nome_doutora,
            plano: p.nivel,
        })
    } catch (err: any) {
        console.error('[Profissional/me] Erro GET:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * PATCH /api/profissional/me
 * 
 * Atualiza dados do profissional logado.
 * Body: { nome, bio, whatsapp, horarioSemana, ... }
 *        { novaSenha } → trocar senha
 *        { aceitarTermos: true } → aceitar termos
 *        { aceitarDisclaimer: true, nomeCompleto, registroProfissional } → aceitar disclaimer pós
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!isProfissional(session)) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const profId = getProfissionalId(session)
        if (!profId) return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })

        const body = await request.json()

        // ─── Trocar senha ───
        if (body.novaSenha) {
            if (body.novaSenha.length < 6) {
                return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
            }
            const hash = await bcrypt.hash(body.novaSenha, 12)
            await prisma.$queryRawUnsafe(`
                UPDATE profissionais SET senha_hash = $1 WHERE id = $2
            `, hash, profId)
            return NextResponse.json({ ok: true, msg: 'Senha atualizada' })
        }

        // ─── Aceitar termos ───
        if (body.aceitarTermos) {
            await prisma.$queryRawUnsafe(`
                UPDATE profissionais SET termos_aceitos = NOW() WHERE id = $1
            `, profId)
            return NextResponse.json({ ok: true, msg: 'Termos aceitos' })
        }

        // ─── Aceitar disclaimer pós-procedimento ───
        if (body.aceitarDisclaimer) {
            const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') || 'unknown'

            await prisma.$queryRawUnsafe(`
                UPDATE profissionais 
                SET disclaimer_pos_aceito = true, 
                    disclaimer_pos_aceito_em = NOW()
                WHERE id = $1
            `, profId)

            console.log(`[Disclaimer] ✅ Profissional ${profId} aceitou pós-procedimento (IP: ${ip}, Nome: ${body.nomeCompleto || 'N/A'})`)
            return NextResponse.json({ ok: true, msg: 'Disclaimer aceito' })
        }

        // ─── Atualizar linkConfig ───
        if (body.linkConfig !== undefined) {
            await prisma.$queryRawUnsafe(`
                UPDATE profissionais SET link_config = $1::jsonb WHERE id = $2
            `, JSON.stringify(body.linkConfig), profId)
            return NextResponse.json({ ok: true, msg: 'Link config atualizado' })
        }

        // ─── Atualizar perfil geral ───
        const updates: string[] = []
        const values: any[] = []
        let idx = 1

        const fields: Record<string, string> = {
            nome: 'nome',
            bio: 'bio',
            whatsapp: 'whatsapp',
            tratamento: 'tratamento',
            especialidade: 'especialidade',
            diferenciais: 'diferenciais',
            fotoUrl: 'foto_url',
            horarioSemana: 'horario_semana',
            almocoSemana: 'almoco_semana',
            horarioSabado: 'horario_sabado',
            horarioDomingo: 'horario_domingo',
            linkAgendamento: 'link_agendamento',
            chavePix: 'chave_pix',
            linkPagamento: 'link_pagamento',
        }

        for (const [jsKey, dbCol] of Object.entries(fields)) {
            if (body[jsKey] !== undefined) {
                updates.push(`${dbCol} = $${idx}`)
                values.push(body[jsKey])
                idx++
            }
        }

        // Booleans
        if (body.atendeSabado !== undefined) {
            updates.push(`atende_sabado = $${idx}`)
            values.push(body.atendeSabado)
            idx++
        }
        if (body.atendeDomingo !== undefined) {
            updates.push(`atende_domingo = $${idx}`)
            values.push(body.atendeDomingo)
            idx++
        }
        if (body.intervaloAtendimento !== undefined) {
            updates.push(`intervalo_atendimento = $${idx}`)
            values.push(body.intervaloAtendimento)
            idx++
        }

        if (updates.length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
        }

        values.push(profId)
        await prisma.$queryRawUnsafe(`
            UPDATE profissionais SET ${updates.join(', ')} WHERE id = $${idx}
        `, ...values)

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[Profissional/me] Erro PATCH:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
