import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ==========================================
// Chat IA de Suporte — Assistente Técnico
// POST /api/admin/suporte-ia
// IA que entende o sistema IARA e executa ações
// ==========================================

const SYSTEM_PROMPT = `Você é o TÉCNICO DE SUPORTE da IARA — IA de atendimento para clínicas de estética.

CONTEXTO DO SISTEMA:
- 29 fluxos N8N (F01 a F29) processam mensagens de WhatsApp, Instagram, SMS e Voz
- Banco PostgreSQL com tabelas: users, mensagens_processadas, procedimentos, feedbacks, memoria_clientes, agendamentos
- Painel Next.js em /admin

FLUXO PRINCIPAL:
F01 (Webhook) → F02 (Normaliza) → F03 (Catraca: verifica créditos/status) → F04 (Maestro: router) → F06 (IA Texto: cérebro com 30 nós) → F09 (Mensageiro: envia resposta)

TABELAS PRINCIPAIS:
- users: id, nome_clinica, status, plano (1-4), creditos, idioma, canal_principal, pausa_iara, telefone_dra, instancia
- procedimentos: id, user_id, nome, preco, duracao
- feedbacks: id, user_id, feedback, created_at
- mensagens_processadas: id, user_id, telefone, tipo, mensagem, created_at
- memoria_clientes: id, user_id, telefone_cliente, resumo, preferencias, updated_at

COMANDOS SQL QUE VOCÊ PODE SUGERIR:
Sempre que possível, dê o SQL pronto para eu executar. Exemplos:
- Ver clínica: SELECT * FROM users WHERE nome_clinica ILIKE '%nome%';
- Recarregar créditos: UPDATE users SET creditos = creditos + 100 WHERE id = X;
- Reativar: UPDATE users SET status = 'ativo' WHERE id = X;
- Despausar: UPDATE users SET pausa_iara = false WHERE id = X;
- Mudar idioma: UPDATE users SET idioma = 'pt-PT' WHERE id = X;
- Mudar plano: UPDATE users SET plano = 2 WHERE id = X;
- Ver mensagens: SELECT * FROM mensagens_processadas WHERE user_id = X ORDER BY created_at DESC LIMIT 10;
- Limpar memória: DELETE FROM memoria_clientes WHERE user_id = X;
- Adicionar feedback: INSERT INTO feedbacks (user_id, feedback, created_at) VALUES (X, 'texto', NOW());

REGRAS:
1. Responda em português brasileiro, casual e direto
2. Quando o problema é claro, EXECUTE o SQL automaticamente (marque com [SQL_EXECUTE])
3. Quando não tem certeza, mostre o SQL e pergunte se eu quero executar (marque com [SQL_SUGGEST])
4. Nunca DELETE de tabelas do sistema (users, etc). Só DELETE de feedbacks, memoria_clientes, mensagens_processadas
5. Nunca UPDATE em massa (sem WHERE). Sempre específico por user_id
6. Se não conseguir resolver, diga qual fluxo N8N verificar e o que procurar
7. Seja breve. Máximo 3-4 frases + o SQL

FORMATO DE SQL:
Quando tiver SQL pra executar automaticamente:
[SQL_EXECUTE]
SELECT * FROM users WHERE id = 42;
[/SQL_EXECUTE]

Quando tiver SQL pra sugerir:
[SQL_SUGGEST]
UPDATE users SET creditos = 100 WHERE id = 42;
[/SQL_SUGGEST]`

export async function POST(request: NextRequest) {
    try {
        const { mensagem, historico, clinicaId } = await request.json()

        if (!mensagem) {
            return NextResponse.json({ erro: 'Mensagem obrigatória' }, { status: 400 })
        }

        // Contexto da clínica selecionada
        let contextoClinica = ''
        if (clinicaId) {
            try {
                const cli = await prisma.$queryRawUnsafe(
                    'SELECT id, nome_clinica, status, plano, creditos, idioma, pausa_iara, canal_principal FROM users WHERE id = $1',
                    parseInt(clinicaId)
                ) as any[]
                if (cli[0]) {
                    contextoClinica = `\n\nCLÍNICA SELECIONADA: ${JSON.stringify(cli[0])}`
                }
            } catch { }
        }

        // Chamar Claude
        const messages = [
            ...(historico || []).slice(-10),
            { role: 'user', content: mensagem },
        ]

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY || '',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1024,
                system: SYSTEM_PROMPT + contextoClinica,
                messages,
            }),
        })

        if (!response.ok) {
            // Fallback: tentar OpenAI
            const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 1024,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT + contextoClinica },
                        ...messages,
                    ],
                }),
            })
            if (!openaiRes.ok) {
                return NextResponse.json({ erro: 'Nenhuma IA disponível. Verifique ANTHROPIC_API_KEY ou OPENAI_API_KEY.' }, { status: 500 })
            }
            const openaiData = await openaiRes.json()
            const respostaGPT = openaiData.choices?.[0]?.message?.content || 'Erro ao processar'
            const sqlResults = await executarSQLs(respostaGPT)
            return NextResponse.json({ resposta: respostaGPT, sqlResults, modelo: 'gpt-4o-mini' })
        }

        const data = await response.json()
        const resposta = data.content?.[0]?.text || 'Erro ao processar'

        // Executar SQLs marcados com [SQL_EXECUTE]
        const sqlResults = await executarSQLs(resposta)

        return NextResponse.json({ resposta, sqlResults, modelo: 'claude-sonnet' })
    } catch (err: any) {
        return NextResponse.json({ erro: err.message }, { status: 500 })
    }
}

// Executar SQLs automáticos marcados no texto
async function executarSQLs(texto: string): Promise<any[]> {
    const results: any[] = []
    const regex = /\[SQL_EXECUTE\]\s*([\s\S]*?)\s*\[\/SQL_EXECUTE\]/g
    let match

    while ((match = regex.exec(texto)) !== null) {
        const sql = match[1].trim()

        // Segurança: bloquear comandos perigosos
        const sqlUpper = sql.toUpperCase()
        if (sqlUpper.includes('DROP') || sqlUpper.includes('TRUNCATE') || sqlUpper.includes('ALTER')) {
            results.push({ sql, erro: 'Comando bloqueado por segurança', executado: false })
            continue
        }
        // Bloquear DELETE/UPDATE sem WHERE
        if ((sqlUpper.includes('DELETE') || sqlUpper.includes('UPDATE')) && !sqlUpper.includes('WHERE')) {
            results.push({ sql, erro: 'DELETE/UPDATE sem WHERE bloqueado', executado: false })
            continue
        }

        try {
            const result = await prisma.$queryRawUnsafe(sql)
            results.push({ sql, resultado: result, executado: true })
        } catch (err: any) {
            results.push({ sql, erro: err.message, executado: false })
        }
    }

    return results
}
