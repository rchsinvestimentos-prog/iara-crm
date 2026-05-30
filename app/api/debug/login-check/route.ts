// ============================================
// DEBUG LOGIN — Verificar por que login falha
// ============================================
// POST /api/debug/login-check — Testa login sem autenticar
// TEMPORÁRIO — remover após resolver

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()
        
        if (!email) {
            return NextResponse.json({ error: 'Informe o email' }, { status: 400 })
        }

        const results: any = { email, checks: [] }

        // 1. Verificar se o email existe na tabela users (clinicas)
        const clinica = await prisma.clinica.findUnique({
            where: { email },
            select: { id: true, email: true, nome: true, nomeClinica: true, senha: true, status: true, role: true }
        })

        if (!clinica) {
            results.checks.push('❌ Email NÃO encontrado na tabela users')
            
            // Verificar se existe em admin_users
            const admin = await prisma.adminUser.findUnique({
                where: { email },
                select: { id: true, email: true, nome: true, ativo: true, senha: true }
            })
            
            if (admin) {
                results.checks.push('✅ Email encontrado em admin_users')
                results.admin = { id: admin.id, nome: admin.nome, ativo: admin.ativo }
                
                if (!admin.senha) {
                    results.checks.push('❌ Admin SEM senha cadastrada')
                } else if (admin.senha.startsWith('$2')) {
                    results.checks.push('✅ Senha admin é hash bcrypt')
                    if (password) {
                        const valida = await bcrypt.compare(password, admin.senha)
                        results.checks.push(valida ? '✅ Senha CORRETA!' : '❌ Senha INCORRETA')
                    }
                } else {
                    results.checks.push(`⚠️ Senha admin NÃO é bcrypt hash (começa com: ${admin.senha.substring(0,5)}...)`)
                    results.checks.push('💡 Senha parece estar em texto puro — precisa ser hashada')
                }
            } else {
                results.checks.push('❌ Email NÃO encontrado em admin_users')
                
                // Verificar em profissionais
                const prof = await prisma.$queryRawUnsafe<any[]>(`
                    SELECT id, nome, email, clinica_id, senha_hash IS NOT NULL as tem_senha 
                    FROM profissionais WHERE email = $1 AND ativo = true LIMIT 1
                `, email)
                
                if (prof.length > 0) {
                    results.checks.push('✅ Email encontrado em profissionais')
                    results.profissional = prof[0]
                } else {
                    results.checks.push('❌ Email NÃO encontrado em NENHUMA tabela')
                }
            }

            return NextResponse.json(results)
        }

        results.checks.push('✅ Email encontrado na tabela users')
        results.clinica = { 
            id: clinica.id, 
            nome: clinica.nomeClinica || clinica.nome, 
            status: clinica.status,
            role: clinica.role 
        }

        // 2. Verificar senha
        if (!clinica.senha) {
            results.checks.push('❌ Clínica SEM senha cadastrada (campo vazio)')
            return NextResponse.json(results)
        }

        const isBcryptHash = clinica.senha.startsWith('$2')
        results.senhaInfo = {
            temSenha: true,
            isBcrypt: isBcryptHash,
            tamanho: clinica.senha.length,
            primeiros5: clinica.senha.substring(0, 10) + '...',
        }

        if (!isBcryptHash) {
            results.checks.push(`⚠️ Senha NÃO é hash bcrypt!`)
            results.checks.push(`💡 Senha está em texto puro ou formato desconhecido`)
            results.checks.push(`💡 Precisa ser rehashada com bcrypt`)
            
            // Se a senha informada é exatamente igual ao texto puro...
            if (password && clinica.senha === password) {
                results.checks.push('✅ Senha em texto puro CONFERE — mas precisa ser hashada!')
            } else if (password) {
                results.checks.push('❌ Senha informada NÃO confere com o texto puro no banco')
            }
        } else {
            results.checks.push('✅ Senha é hash bcrypt')
            
            if (password) {
                const valida = await bcrypt.compare(password, clinica.senha)
                results.checks.push(valida ? '✅ Senha CORRETA! Login deveria funcionar.' : '❌ Senha INCORRETA — bcrypt.compare falhou')
            } else {
                results.checks.push('ℹ️ Envie "password" no body para testar a comparação')
            }
        }

        // 3. Listar TODAS as clínicas no banco
        const todas = await prisma.clinica.findMany({
            select: { id: true, email: true, nomeClinica: true, status: true },
            orderBy: { id: 'asc' }
        })
        results.todasClinicas = todas.map(c => ({
            id: c.id,
            email: c.email,
            nome: c.nomeClinica,
            status: c.status
        }))

        return NextResponse.json(results)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
