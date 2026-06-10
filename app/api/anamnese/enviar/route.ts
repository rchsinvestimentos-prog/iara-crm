import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, getClinicaId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const clinicaId = await getClinicaId(session)

        if (!clinicaId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const cid = Number(clinicaId)
        const body = await request.json()
        const { modeloId, contatoId, nome, telefone, mensagemCustomizada } = body

        if (!modeloId || !telefone) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
        }

        // 1. Validar modelo
        const modelo = await prisma.modeloAnamnese.findFirst({
            where: { id: modeloId, clinicaId: cid }
        })
        if (!modelo) {
            return NextResponse.json({ error: 'Modelo de anamnese não encontrado' }, { status: 404 })
        }

        // 2. Limpar telefone
        const cleanedPhone = telefone.replace(/\D/g, '')
        if (!cleanedPhone || cleanedPhone.length < 8) {
            return NextResponse.json({ error: 'Número de WhatsApp inválido' }, { status: 400 })
        }

        // 3. Buscar ou criar contato no CRM
        let contato = null
        if (contatoId) {
            contato = await prisma.contato.findFirst({
                where: { id: Number(contatoId), clinicaId: cid }
            })
        }

        if (!contato) {
            // Tentar achar pelo telefone limpo
            contato = await prisma.contato.findFirst({
                where: { telefone: cleanedPhone, clinicaId: cid }
            })
        }

        if (!contato) {
            // Criar contato no CRM automaticamente
            contato = await prisma.contato.create({
                data: {
                    clinicaId: cid,
                    nome: nome?.trim() || 'Paciente',
                    telefone: cleanedPhone,
                    origem: 'painel_anamnese',
                    etapa: 'novo'
                }
            })
        } else if (nome && nome.trim() && contato.nome === 'Paciente') {
            // Atualizar o nome se o anterior era apenas o genérico
            contato = await prisma.contato.update({
                where: { id: contato.id },
                data: { nome: nome.trim() }
            })
        }

        // 4. Gerar o link de anamnese seguro
        const baseUrl = process.env.NEXTAUTH_URL || 'https://app.iara.click'
        const linkAnamnese = `${baseUrl}/anamnese/${modeloId}?contatoId=${contato.id}`

        // 5. Preparar mensagem
        let textoMensagem = mensagemCustomizada || modelo.mensagemEnvio || 'Olá! Por favor, preencha sua Ficha de Anamnese pelo link seguro: {link_anamnese}'
        textoMensagem = textoMensagem
            .replace(/{nome_cliente}/g, contato.nome || 'Paciente')
            .replace(/{link_anamnese}/g, linkAnamnese)

        // 6. Tentar enviar via Evolution API (WhatsApp IARA) se a clínica estiver conectada
        const clinica = await prisma.clinica.findUnique({
            where: { id: cid },
            select: { evolutionInstance: true, evolutionApikey: true }
        })

        let enviadoIA = false
        let erroIA = null

        if (clinica?.evolutionInstance && process.env.EVOLUTION_API_URL) {
            try {
                const whatsNumber = cleanedPhone.startsWith('55') ? cleanedPhone : `55${cleanedPhone}`
                const apiKey = clinica.evolutionApikey || process.env.EVOLUTION_API_KEY || ''
                
                const evoRes = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${clinica.evolutionInstance}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey
                    },
                    body: JSON.stringify({
                        number: whatsNumber,
                        text: textoMensagem
                    })
                })

                if (evoRes.ok) {
                    enviadoIA = true
                } else {
                    const txt = await evoRes.text()
                    console.error('[Evolution API Anamnese Send] Erro:', txt)
                    if (txt.includes('Connection Closed') || txt.includes('closed') || txt.includes('disconnected') || txt.includes('not connected')) {
                        erroIA = 'O WhatsApp (Iara) da clínica está desconectado. Por favor, acesse o menu "WhatsApp" na barra lateral e reconecte seu número para realizar disparos automáticos.'
                    } else {
                        erroIA = `Instância respondeu com erro: ${txt.slice(0, 100)}`
                    }
                }
            } catch (err: any) {
                console.error('[Evolution API Anamnese Send] Falha de conexão:', err)
                erroIA = err.message || 'Erro de conexão com servidor WhatsApp.'
            }
        } else {
            erroIA = 'WhatsApp (Iara) não configurado ou desconectado para esta clínica.'
        }

        return NextResponse.json({
            ok: true,
            linkAnamnese,
            mensagemFormatada: textoMensagem,
            enviadoIA,
            erroIA,
            contatoId: contato.id
        })
    } catch (err: any) {
        console.error('[POST /api/anamnese/enviar] Erro:', err)
        return NextResponse.json({ error: `Erro interno ao processar envio: ${err.message || String(err)}` }, { status: 500 })
    }
}
