import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// POST /api/instancias/disconnect — Desconecta WhatsApp/Instagram
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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

    const isLegado = Number(instanceId) === -1;

    // ============================================
    // Instância Legada (WhatsApp da tabela users)
    // ============================================
    if (isLegado) {
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
        // Se não tem Evolution API, apenas limpa do banco
        if (deleteInstance) {
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE users SET evolution_instance = NULL, evolution_apikey = NULL WHERE id = ${user.id}`
            );
          } catch { /* coluna pode não existir */ }
        }
        return NextResponse.json({ success: true, message: 'Instância removida' });
      }

      const legado = await prisma.$queryRaw`
        SELECT evolution_instance, evolution_apikey FROM users WHERE id = ${user.id} LIMIT 1
      ` as any[];

      if (legado.length > 0 && legado[0].evolution_instance) {
        const evolutionInstance = legado[0].evolution_instance;
        const apiKey = legado[0].evolution_apikey || EVOLUTION_API_KEY;

        // Logout
        try {
          await fetch(`${EVOLUTION_API_URL}/instance/logout/${evolutionInstance}`, {
            method: 'DELETE',
            headers: { 'apikey': apiKey },
            signal: AbortSignal.timeout(10000),
          });
          console.log(`[Disconnect] ✅ Logout OK para ${evolutionInstance}`);
        } catch (e) {
          console.error(`[Disconnect] Erro no logout:`, e);
        }

        // Delete se solicitado
        if (deleteInstance) {
          try {
            await fetch(`${EVOLUTION_API_URL}/instance/delete/${evolutionInstance}`, {
              method: 'DELETE',
              headers: { 'apikey': apiKey },
              signal: AbortSignal.timeout(10000),
            });
          } catch { }

          try {
            await prisma.$executeRawUnsafe(
              `UPDATE users SET evolution_instance = NULL, evolution_apikey = NULL WHERE id = ${user.id}`
            );
          } catch { }
        }
      }

      return NextResponse.json({ success: true, message: 'WhatsApp desconectado' });
    }

    // ============================================
    // Instância da tabela instancias_clinica
    // ============================================
    const rows = await prisma.$queryRaw`
      SELECT id, canal, evolution_instance FROM instancias_clinica
      WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
      LIMIT 1
    ` as any[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
    }

    const instancia = rows[0];
    const canal = instancia.canal;

    // ============================================
    // WhatsApp: Desconectar via Evolution API
    // ============================================
    if (canal === 'whatsapp' && instancia.evolution_instance) {
      if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
        // Logout
        try {
          await fetch(`${EVOLUTION_API_URL}/instance/logout/${instancia.evolution_instance}`, {
            method: 'DELETE',
            headers: { 'apikey': EVOLUTION_API_KEY },
            signal: AbortSignal.timeout(10000),
          });
          console.log(`[Disconnect] ✅ WhatsApp logout: ${instancia.evolution_instance}`);
        } catch (e) {
          console.error(`[Disconnect] Erro logout WhatsApp:`, e);
        }

        // Delete da Evolution se solicitado
        if (deleteInstance) {
          try {
            await fetch(`${EVOLUTION_API_URL}/instance/delete/${instancia.evolution_instance}`, {
              method: 'DELETE',
              headers: { 'apikey': EVOLUTION_API_KEY },
              signal: AbortSignal.timeout(10000),
            });
            console.log(`[Disconnect] 🗑️ WhatsApp instance deleted: ${instancia.evolution_instance}`);
          } catch { }
        }
      }
    }

    // ============================================
    // Instagram: Limpar config_instagram
    // ============================================
    if (canal === 'instagram') {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE config_instagram SET ativo = false WHERE user_id = $1`,
          user.id
        );
        console.log(`[Disconnect] ✅ Instagram desativado para user ${user.id}`);
      } catch (e) {
        console.log(`[Disconnect] ⚠️ config_instagram update skipped:`, e);
      }
    }

    // ============================================
    // Atualizar ou deletar no banco
    // ============================================
    if (deleteInstance) {
      await prisma.$queryRaw`
        DELETE FROM instancias_clinica
        WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
      `;
      console.log(`[Disconnect] 🗑️ Instância ${instanceId} (${canal}) removida do banco`);
    } else {
      await prisma.$queryRaw`
        UPDATE instancias_clinica
        SET status_conexao = 'desconectado'
        WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
      `;
      console.log(`[Disconnect] ✅ Instância ${instanceId} (${canal}) marcada como desconectada`);
    }

    return NextResponse.json({
      success: true,
      message: deleteInstance
        ? `${canal === 'instagram' ? 'Instagram' : 'WhatsApp'} removido com sucesso`
        : `${canal === 'instagram' ? 'Instagram' : 'WhatsApp'} desconectado com sucesso`,
    });

  } catch (err: any) {
    console.error('[Disconnect] Erro:', err);
    return NextResponse.json({ error: `Erro interno: ${err?.message}` }, { status: 500 });
  }
}
