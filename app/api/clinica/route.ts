import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notificarMudancaConfig } from '@/lib/notificacao'
import { z } from 'zod'

// Validation schema — aceita todos os campos editáveis
const UpdateClinicaSchema = z.object({
    // ConfiguracoesTool
    nomeClinica: z.string().min(1).max(100).optional(),
    nomeAssistente: z.string().min(1).max(50).optional(),
    whatsappClinica: z.string().max(20).optional().nullable(),
    whatsappDoutora: z.string().max(20).optional().nullable(),
    tomAtendimento: z.string().max(100).optional().nullable(),
    endereco: z.string().max(500).optional().nullable(),
    diferenciais: z.string().max(5000).optional().nullable(),
    // Horários detalhados
    horarioSemana: z.string().max(50).optional().nullable(),
    almocoSemana: z.string().max(50).optional().nullable(),
    atendeSabado: z.boolean().optional().nullable(),
    horarioSabado: z.string().max(50).optional().nullable(),
    almocoSabado: z.string().max(50).optional().nullable(),
    atendeDomingo: z.boolean().optional().nullable(),
    horarioDomingo: z.string().max(50).optional().nullable(),
    almocoDomingo: z.string().max(50).optional().nullable(),
    atendeFeriado: z.boolean().optional().nullable(),
    horarioFeriado: z.string().max(50).optional().nullable(),
    almocoFeriado: z.string().max(50).optional().nullable(),
    intervaloAtendimento: z.number().min(0).max(120).optional().nullable(),
    antecedenciaMinima: z.string().max(200).optional().nullable(),
    daCursos: z.boolean().optional().nullable(),
    // horarioInicio / horarioFim / diasFuncionamento NÃO existem no Prisma
    // São ignorados no filtro abaixo
    // Perfil da profissional
    nomeDoutora: z.string().max(200).optional().nullable(),
    tratamentoDoutora: z.string().max(50).optional().nullable(),
    // AtendimentoTool
    humor: z.string().max(50).optional().nullable(),
    emojis: z.string().max(50).optional().nullable(),
    fraseDespedida: z.string().max(200).optional().nullable(),
    funcionalidades: z.string().max(5000).optional().nullable(),
    feedbacks: z.string().max(5000).optional().nullable(),
    modoIA: z.string().max(30).optional().nullable(),
    estiloAtendimento: z.enum(['direta', 'consultiva']).optional().nullable(),
    sempreLigada: z.boolean().optional().nullable(),
    blacklist: z.string().max(5000).optional().nullable(),
    mensagemAniversario: z.string().max(2000).optional().nullable(),
    mensagemForaHorario: z.string().max(2000).optional().nullable(),
    diasAtendimento: z.string().max(200).optional().nullable(),
    // VIP Personalization
    faqPersonalizado: z.any().optional().nullable(),
    cuidadosPos: z.string().max(5000).optional().nullable(),
    autorizouCuidadosPos: z.string().optional().nullable(),
    politicaCancelamento: z.string().max(5000).optional().nullable(),
    formasPagamento: z.any().optional().nullable(),
    linkMaps: z.string().max(500).optional().nullable(),
    redesSociais: z.any().optional().nullable(),
    mensagemBoasVindas: z.string().max(2000).optional().nullable(),
}).passthrough() // aceitar campos extras sem erro

// GET /api/clinica
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const clinica = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        if (!clinica) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { senha, ...safe } = clinica
        const userType = (session?.user as any)?.userType || 'clinica'
        return NextResponse.json({ ...safe, userType })
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PUT /api/clinica
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const validated = UpdateClinicaSchema.parse(body)

        // Buscar dados atuais para comparar depois
        const dadosAntigos = await prisma.clinica.findUnique({
            where: { id: clinicaId },
        })

        // Campos aceitos pelo Prisma (model Clinica)
        const PRISMA_FIELDS = new Set([
            'nome', 'email', 'telefone', 'role', 'parentId', 'aceiteTermos',
            'plano', 'nivel', 'status', 'creditosMensais', 'creditosDisponiveis',
            'totalAtendimentos', 'tokenAtivacao', 'proximaRenovacao',
            'nomeClinica', 'endereco',
            'nomeAssistente', 'personalidadeVoz', 'vozAssistente', 'tomAtendimento',
            'horarioSemana', 'almocoSemana', 'atendeSabado', 'horarioSabado', 'almocoSabado',
            'atendeDomingo', 'horarioDomingo', 'almocoDomingo',
            'atendeFeriado', 'horarioFeriado', 'almocoFeriado',
            'intervaloAtendimento', 'antecedenciaMinima',
            'aceitaDescontos', 'descontoMaximo',
            'evolutionInstance', 'whatsappClinica', 'whatsappDoutora',
            'nomeDoutora', 'tratamentoDoutora', 'evolutionApikey',
            'aprendizadoContinuo', 'diferenciais', 'daCursos',
            'humor', 'emojis', 'fraseDespedida', 'funcionalidades', 'feedbacks',
            'modoIA', 'sempreLigada', 'blacklist',
            'mensagemAniversario', 'mensagemForaHorario', 'diasAtendimento',
            'idioma', 'pais', 'moeda', 'timezone', 'canalPrincipal',
            'telefoneTwilio', 'twilioSid',
            'maxInstanciasWhatsapp', 'maxInstanciasInstagram',
            'googleCalendarToken', 'googleCalendarRefreshToken', 'googleCalendarId', 'googleTokenExpires',
            'avatarFotos', 'avatarVideo', 'paletaCores', 'vozClonada',
            'faqPersonalizado', 'cuidadosPos', 'autorizouCuidadosPos',
            'politicaCancelamento', 'formasPagamento', 'linkMaps', 'redesSociais',
            'mensagemBoasVindas', 'configuracoes', 'integracoes',
            'estiloAtendimento',
        ])

        // Filtrar: só campos válidos do Prisma e com valor definido
        const dataToUpdate: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(validated)) {
            if (value !== undefined && PRISMA_FIELDS.has(key)) {
                dataToUpdate[key] = value
            }
        }

        // Converter aceiteTermos string → Date pra Prisma
        if (dataToUpdate.aceiteTermos && typeof dataToUpdate.aceiteTermos === 'string') {
            dataToUpdate.aceiteTermos = new Date(dataToUpdate.aceiteTermos as string)
        }
        if (dataToUpdate.autorizouCuidadosPos && typeof dataToUpdate.autorizouCuidadosPos === 'string') {
            dataToUpdate.autorizouCuidadosPos = new Date(dataToUpdate.autorizouCuidadosPos as string)
        }

        const updated = await prisma.clinica.update({
            where: { id: clinicaId },
            data: dataToUpdate,
        })

        // Enviar notificação de confirmação por WhatsApp (async, não bloqueia)
        if (dadosAntigos) {
            notificarMudancaConfig(
                String(clinicaId),
                dadosAntigos as unknown as Record<string, unknown>,
                validated as unknown as Record<string, unknown>
            ).catch(err => console.error('[Notificação] Erro async:', err))
        }

        const { senha, ...safe } = updated
        return NextResponse.json(safe)
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[PUT /api/clinica] Erro:', err)
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
    }
}
