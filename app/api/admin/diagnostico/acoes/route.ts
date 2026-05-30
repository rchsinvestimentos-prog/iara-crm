import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ==========================================
// API de Ações Rápidas — Suporte
// POST /api/admin/diagnostico/acoes
// Executa correções sem precisar de SQL
// ==========================================

const ACOES_DISPONIVEIS = {
    recarregar_creditos: {
        label: '🔋 Recarregar Créditos',
        desc: 'Adiciona 100 créditos à clínica',
    },
    reativar_clinica: {
        label: '✅ Reativar Clínica',
        desc: 'Muda status para "ativo"',
    },
    despausar_iara: {
        label: '▶️ Despausar IARA',
        desc: 'Remove pausa da IARA nesta clínica',
    },
    trocar_idioma: {
        label: '🌍 Trocar Idioma',
        desc: 'Muda o idioma da IARA para esta clínica',
    },
    trocar_plano: {
        label: '⬆️ Alterar Plano',
        desc: 'Muda o plano da clínica (1-4)',
    },
    resetar_memoria: {
        label: '🧹 Resetar Memória',
        desc: 'Limpa a Super Memória de todos os clientes desta clínica',
    },
    adicionar_feedback: {
        label: '📝 Adicionar Instrução',
        desc: 'Envia uma instrução especial para a IARA desta clínica',
    },
    enviar_teste: {
        label: '📱 Enviar Mensagem Teste',
        desc: 'Envia "Teste IARA ✅" pro WhatsApp da Dra',
    },
}

export async function GET() {
    return NextResponse.json({ acoes: ACOES_DISPONIVEIS })
}

export async function POST(request: NextRequest) {
    try {
        const { acao, clinicaId, parametros } = await request.json()

        if (!acao || !clinicaId) {
            return NextResponse.json({ erro: 'Ação e clinicaId obrigatórios' }, { status: 400 })
        }

        let resultado = { sucesso: false, mensagem: '', detalhes: '' }

        switch (acao) {
            case 'recarregar_creditos': {
                const qtd = parametros?.quantidade || 100
                await prisma.$executeRawUnsafe(
                    'UPDATE users SET creditos = creditos + $1 WHERE id = $2',
                    qtd, clinicaId
                )
                resultado = {
                    sucesso: true,
                    mensagem: `+${qtd} créditos adicionados`,
                    detalhes: `Clínica ${clinicaId} agora tem mais ${qtd} créditos.`,
                }
                break
            }

            case 'reativar_clinica': {
                await prisma.$executeRawUnsafe(
                    "UPDATE users SET status = 'ativo' WHERE id = $1",
                    clinicaId
                )
                resultado = {
                    sucesso: true,
                    mensagem: 'Clínica reativada',
                    detalhes: 'Status mudou para "ativo". IARA voltará a responder.',
                }
                break
            }

            case 'despausar_iara': {
                await prisma.$executeRawUnsafe(
                    'UPDATE users SET pausa_iara = false WHERE id = $1',
                    clinicaId
                )
                resultado = {
                    sucesso: true,
                    mensagem: 'IARA despausada',
                    detalhes: 'IARA voltará a responder mensagens desta clínica.',
                }
                break
            }

            case 'trocar_idioma': {
                const idioma = parametros?.idioma || 'pt-BR'
                const idiomas = ['pt-BR', 'pt-PT', 'en-US', 'es']
                if (!idiomas.includes(idioma)) {
                    resultado = { sucesso: false, mensagem: 'Idioma inválido', detalhes: `Use: ${idiomas.join(', ')}` }
                    break
                }
                await prisma.$executeRawUnsafe(
                    'UPDATE users SET idioma = $1 WHERE id = $2',
                    idioma, clinicaId
                )
                resultado = {
                    sucesso: true,
                    mensagem: `Idioma alterado para ${idioma}`,
                    detalhes: 'Na próxima mensagem, IARA já responderá no novo idioma.',
                }
                break
            }

            case 'trocar_plano': {
                const plano = parametros?.plano || 1
                if (plano < 1 || plano > 4) {
                    resultado = { sucesso: false, mensagem: 'Plano inválido', detalhes: 'Use: 1, 2, 3 ou 4' }
                    break
                }
                await prisma.$executeRawUnsafe(
                    'UPDATE users SET plano = $1 WHERE id = $2',
                    plano, clinicaId
                )
                resultado = {
                    sucesso: true,
                    mensagem: `Plano alterado para ${plano}`,
                    detalhes: `Clínica agora tem acesso ao Plano ${plano}.`,
                }
                break
            }

            case 'resetar_memoria': {
                await prisma.$executeRawUnsafe(
                    'DELETE FROM memoria_clientes WHERE user_id = $1',
                    clinicaId
                )
                resultado = {
                    sucesso: true,
                    mensagem: 'Memória resetada',
                    detalhes: 'Super Memória limpa. IARA começará do zero com cada cliente.',
                }
                break
            }

            case 'adicionar_feedback': {
                const feedback = parametros?.feedback
                if (!feedback) {
                    resultado = { sucesso: false, mensagem: 'Texto obrigatório', detalhes: '' }
                    break
                }
                await prisma.$executeRawUnsafe(
                    'INSERT INTO feedbacks (user_id, feedback, created_at) VALUES ($1, $2, NOW())',
                    clinicaId, feedback
                )
                resultado = {
                    sucesso: true,
                    mensagem: 'Instrução adicionada',
                    detalhes: `IARA vai obedecer: "${feedback}". Feedback da Dra = Lei.`,
                }
                break
            }

            case 'enviar_teste': {
                const evoUrl = process.env.EVOLUTION_API_URL
                const evoKey = process.env.EVOLUTION_API_KEY
                if (!evoUrl || !evoKey) {
                    resultado = { sucesso: false, mensagem: 'Evolution API não configurada', detalhes: '' }
                    break
                }
                // Buscar telefone da Dra
                const cli = await prisma.$queryRawUnsafe(
                    'SELECT telefone_dra, instancia FROM users WHERE id = $1',
                    clinicaId
                ) as any[]
                if (!cli[0]?.telefone_dra) {
                    resultado = { sucesso: false, mensagem: 'Telefone da Dra não cadastrado', detalhes: '' }
                    break
                }
                try {
                    await fetch(`${evoUrl}/message/sendText/${cli[0].instancia}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', apikey: evoKey },
                        body: JSON.stringify({
                            number: cli[0].telefone_dra,
                            text: '✅ Teste IARA — Conexão funcionando! Este é um teste do suporte.',
                        }),
                    })
                    resultado = {
                        sucesso: true,
                        mensagem: 'Mensagem teste enviada',
                        detalhes: `WhatsApp enviado para ${cli[0].telefone_dra}`,
                    }
                } catch (err: any) {
                    resultado = { sucesso: false, mensagem: 'Falha ao enviar', detalhes: err.message }
                }
                break
            }

            default:
                resultado = { sucesso: false, mensagem: 'Ação desconhecida', detalhes: '' }
        }

        // Se não resolveu, sugerir escalação
        if (!resultado.sucesso) {
            resultado.detalhes += '\n\n🔄 Se não resolveu: Verifique as Executions no N8N (menu lateral) e procure execuções com erro (vermelho) desta clínica.'
        }

        return NextResponse.json(resultado)
    } catch (err: any) {
        return NextResponse.json({
            sucesso: false,
            mensagem: 'Erro ao executar ação',
            detalhes: err.message + '\n\n🔄 Se persistir: Verifique se o banco está acessível e se a clínica existe.',
        }, { status: 500 })
    }
}
