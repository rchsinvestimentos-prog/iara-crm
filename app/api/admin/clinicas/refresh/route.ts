import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPermissions } from '@/lib/permissions'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!isAdmin(session)) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const adminRole = (session?.user as any)?.adminRole || ''
        const perms = getPermissions(adminRole)
        if (!perms.canEdit) {
            return NextResponse.json({ error: 'Você não tem permissão para editar' }, { status: 403 })
        }

        // 1. Atualizar updatedAt de todas as clínicas (clientes) para invalidar fingerprints
        await prisma.clinica.updateMany({
            where: { role: { not: 'admin' } },
            data: { updatedAt: new Date() }
        })

        // 2. Limpar toda a tabela cache_respostas no banco
        try {
            await prisma.$executeRaw`DELETE FROM cache_respostas`
        } catch (e) {
            console.error('[Admin] Erro ao limpar cache_respostas geral:', e)
        }

        return NextResponse.json({ message: '✅ Atualização geral concluída! Todas as clínicas foram atualizadas e os caches limpos.' })
    } catch (err: any) {
        console.error('Erro em POST /api/admin/clinicas/refresh:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
