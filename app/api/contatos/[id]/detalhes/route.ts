import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { midiasPendentesDoContato } from '@/lib/triagem'

// GET /api/contatos/[id]/detalhes
// Retorna os dados completos do contato, histórico de agendamentos e fichas preenchidas
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        const { id } = await context.params
        const contatoId = Number(id)

        if (isNaN(contatoId)) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
        }

        // 1. Buscar contato e conferir propriedade
        const contato = await prisma.contato.findFirst({
            where: { id: contatoId, clinicaId: cid }
        })

        if (!contato) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // 2. Buscar agendamentos do paciente
        const agendamentos = await prisma.agendamento.findMany({
            where: { contatoId, clinicaId: cid },
            orderBy: { data: 'desc' }
        })

        // 3. Buscar fichas de anamnese respondidas
        const fichas = await prisma.fichaPreenchida.findMany({
            where: { contatoId, clinicaId: cid },
            orderBy: { dataAssinatura: 'desc' }
        })

        // 3.5. Buscar mídias do paciente (fotos, desenhos)
        const midias = await prisma.midiaContato.findMany({
            where: { contatoId, clinicaId: cid },
            orderBy: { createdAt: 'desc' }
        })

        // 3.55. Buscar marcações estéticas (Face/Body Map)
        const marcacoes = await prisma.marcacaoEstetica.findMany({
            where: { contatoId, clinicaId: cid },
            orderBy: { createdAt: 'desc' }
        })

        // 4. Montar a linha do tempo enriquecida
        // Unir agendamentos e fichas assinadas em ordem cronológica
        const timeline: any[] = []

        agendamentos.forEach(a => {
            timeline.push({
                id: `agendamento_${a.id}`,
                tipo: 'procedimento',
                titulo: a.procedimento,
                data: a.data.toISOString(),
                valor: a.valor ? Number(a.valor) : null,
                status: a.status,
                detalhes: a.observacao || 'Procedimento agendado',
                icone: 'Calendar'
            })
        })

        fichas.forEach(f => {
            timeline.push({
                id: `ficha_${f.id}`,
                tipo: 'documento',
                titulo: `Assinatura de Documento: ${f.titulo}`,
                data: f.dataAssinatura.toISOString(),
                valor: null,
                status: 'assinado',
                detalhes: `Assinatura digital efetuada pelo IP ${f.ipOrigem}. Hash SHA-256: ${f.hashIntegridade.substring(0, 16)}...`,
                icone: 'ShieldCheck',
                documento: f
            })
        })

        // 3.6. Triagem: fotos que a cliente mandou e ainda esperam a doutora.
        // Desde 05/10 a IARA não pausa mais por foto; o quadro aparece
        // enquanto houver foto sem decisão (lib/triagem.ts).
        let midiasTriagem: typeof midias = []
        let midiasTriagemIncompleta = false
        try {
            const pendentes = new Set((await midiasPendentesDoContato(cid, contato.id)).map(m => m.id))
            midiasTriagem = midias
                .filter(m => pendentes.has(m.id))
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        } catch (err) {
            console.error('[GET /api/contatos/[id]/detalhes] Erro ao buscar fotos pendentes:', err)
            // A tela avisa e manda a doutora para a Galeria
            midiasTriagemIncompleta = true
        }
        const emTriagem = midiasTriagem.length > 0 || midiasTriagemIncompleta

        // Ordenar do mais novo para o mais antigo
        timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

        return NextResponse.json({
            contato,
            emTriagem,
            midiasTriagem,
            midiasTriagemIncompleta,
            timeline,
            fichas,
            agendamentos,
            midias,
            marcacoes
        })
    } catch (err) {
        console.error('[GET /api/contatos/[id]/detalhes] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao buscar prontuário' }, { status: 500 })
    }
}
