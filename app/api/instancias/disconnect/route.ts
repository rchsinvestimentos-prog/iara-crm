import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// POST /api/instancias/disconnect — Desconecta WhatsApp via Evolution API
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'EVOLUTION_API não configurada' }, { status: 500 });
    }

    const user = await prisma.clinica.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const body = await req.json();
    const { instanceId, deleteInstance } = body;

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId obrigatório' }, { status: 400 });
    }

    // Buscar instância
    let evolutionInstance = '';
    let apiKey = EVOLUTION_API_KEY;
    const isLegado = Number(instanceId) === -1;

    if (isLegado) {
      const legado = await prisma.$queryRaw`
        SELECT evolution_instance, evolution_apikey FROM users WHERE id = ${user.id} LIMIT 1
      ` as any[];

      if (legado.length > 0 && legado[0].evolution_instance) {
        evolutionInstance = legado[0].evolution_instance;
        if (legado[0].evolution_apikey) apiKey = legado[0].evolution_apikey;
      }
    } else {
      const rows = await prisma.$queryRaw`
        SELECT evolution_instance FROM instancias_clinica
        WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
        LIMIT 1
      ` as any[];

      if (rows.length > 0) {
        evolutionInstance = rows[0].evolution_instance;
      }
    }

    if (!evolutionInstance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
    }

    // 1. Deslogar da sessão WhatsApp (logout)
    try {
      const logoutRes = await fetch(`${EVOLUTION_API_URL}/instance/logout/${evolutionInstance}`, {
        method: 'DELETE',
        headers: { 'apikey': apiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (!logoutRes.ok) {
        console.warn(`[Disconnect] Logout retornou ${logoutRes.status} para ${evolutionInstance}`);
      } else {
        console.log(`[Disconnect] ✅ Logout OK para ${evolutionInstance}`);
      }
    } catch (e) {
      console.error(`[Disconnect] Erro no logout para ${evolutionInstance}:`, e);
    }

    // 2. Se solicitou delete completo da instância
    if (deleteInstance) {
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${evolutionInstance}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey },
          signal: AbortSignal.timeout(10000),
        });
        console.log(`[Disconnect] 🗑️ Instância ${evolutionInstance} deletada da Evolution`);
      } catch (e) {
        console.error(`[Disconnect] Erro ao deletar instância:`, e);
      }
    }

    // 3. Atualizar status no banco
    if (!isLegado) {
      if (deleteInstance) {
        // Deletar do banco se solicitou delete completo
        await prisma.$queryRaw`
          DELETE FROM instancias_clinica
          WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
        `;
      } else {
        // Apenas marcar como desconectado
        await prisma.$queryRaw`
          UPDATE instancias_clinica
          SET status_conexao = 'desconectado'
          WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
        `;
      }
    } else {
      // Instância legada — limpar evolution_instance se deleteInstance
      if (deleteInstance) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE users SET evolution_instance = NULL, evolution_apikey = NULL WHERE id = ${user.id}`
          );
        } catch { /* coluna pode não existir */ }
      }
    }

    return NextResponse.json({
      success: true,
      message: deleteInstance
        ? 'Instância desconectada e removida'
        : 'WhatsApp desconectado com sucesso',
    });

  } catch (err: any) {
    console.error('[Disconnect] Erro:', err);
    return NextResponse.json({ error: `Erro interno: ${err?.message}` }, { status: 500 });
  }
}
