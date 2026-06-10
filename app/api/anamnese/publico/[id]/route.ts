import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fazerBackupNoGoogleDrive } from '@/lib/google-drive'
import { z } from 'zod'
import crypto from 'crypto'

const SubmitAnamneseSchema = z.object({
    contatoId: z.number().int(),
    respostas: z.record(z.any()), // {perguntaId: resposta}
    assinaturaPng: z.string(), // Base64 da assinatura
    pdfBase64: z.string().optional(), // PDF em base64 opcional enviado pelo client
})

// GET /api/anamnese/publico/[id]
// Rota pública para carregar as perguntas de um modelo de anamnese
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        const modelo = await prisma.modeloAnamnese.findUnique({
            where: { id },
            select: {
                id: true,
                titulo: true,
                perguntas: true,
                clinicaId: true,
                ativo: true,
            }
        })

        if (!modelo || !modelo.ativo) {
            return NextResponse.json({ error: 'Ficha de anamnese não encontrada ou inativa' }, { status: 404 })
        }

        // Buscar dados básicos da clínica para exibir na página (ex: Logo, nome)
        const clinica = await prisma.clinica.findUnique({
            where: { id: modelo.clinicaId },
            select: {
                nomeClinica: true,
                nome: true,
                avatarFotos: true,
            }
        })

        return NextResponse.json({
            modelo,
            clinica: {
                nome: clinica?.nomeClinica || clinica?.nome || 'Clínica',
                avatar: Array.isArray(clinica?.avatarFotos) && (clinica.avatarFotos as any).length > 0
                    ? (clinica.avatarFotos as any)[0]
                    : '/iara-avatar.png'
            }
        })
    } catch (err) {
        console.error('[GET /api/anamnese/publico/[id]] Erro:', err)
        return NextResponse.json({ error: 'Erro ao carregar perguntas' }, { status: 500 })
    }
}

// POST /api/anamnese/publico/[id]
// Rota pública para submeter as respostas, assinar e selar juridicamente
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: modeloId } = await context.params
        const body = await request.json()
        const validated = SubmitAnamneseSchema.parse(body)

        // 1. Validar modelo e contato
        const modelo = await prisma.modeloAnamnese.findUnique({
            where: { id: modeloId }
        })
        if (!modelo) {
            return NextResponse.json({ error: 'Modelo de anamnese não encontrado' }, { status: 404 })
        }

        const contato = await prisma.contato.findUnique({
            where: { id: validated.contatoId }
        })
        if (!contato) {
            return NextResponse.json({ error: 'Paciente não encontrado no CRM' }, { status: 404 })
        }

        // 2. Coletar metadados de auditoria jurídica (Trilha Jurídica)
        const ipOrigem = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
        const userAgent = request.headers.get('user-agent') || 'Desconhecido'
        const dataAssinatura = new Date()

        // 3. Gerar Hash de Integridade Criptográfica (SHA-256)
        const payloadString = JSON.stringify({
            contatoId: validated.contatoId,
            respostas: validated.respostas,
            assinaturaPng: validated.assinaturaPng,
            ipOrigem,
            userAgent,
            dataAssinatura: dataAssinatura.toISOString(),
        })
        const hashIntegridade = crypto.createHash('sha256').update(payloadString).digest('hex')

        // 4. Salvar ficha preenchida na base local
        const ficha = await prisma.fichaPreenchida.create({
            data: {
                clinicaId: modelo.clinicaId,
                contatoId: validated.contatoId,
                titulo: modelo.titulo,
                respostas: validated.respostas as any,
                assinaturaPng: validated.assinaturaPng,
                ipOrigem: ipOrigem.substring(0, 50),
                userAgent: userAgent.substring(0, 500),
                hashIntegridade,
                dataAssinatura,
            }
        })

        // 5. Iniciar upload de backup em PDF no Google Drive em segundo plano (se houver PDF em base64 fornecido pelo client)
        if (validated.pdfBase64) {
            const dateStr = dataAssinatura.toLocaleDateString('pt-BR').replace(/\//g, '-')
            const filename = `Ficha_Anamnese_${contato.nome?.replace(/\s+/g, '_')}_${dateStr}.pdf`
            
            fazerBackupNoGoogleDrive({
                clinicaId: modelo.clinicaId,
                pacienteNome: contato.nome || 'Paciente',
                pacienteTelefone: contato.telefone,
                documentoTitulo: modelo.titulo,
                pdfBase64: validated.pdfBase64,
                filename,
            }).catch(err => {
                console.error('[Google Drive Backup Async] Erro no upload em segundo plano:', err)
            })
        }

        return NextResponse.json({
            ok: true,
            fichaId: ficha.id,
            hash: hashIntegridade,
        })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: err.issues }, { status: 400 })
        }
        console.error('[POST /api/anamnese/publico/[id]] Erro:', err)
        return NextResponse.json({ error: 'Erro interno ao salvar prontuário' }, { status: 500 })
    }
}
