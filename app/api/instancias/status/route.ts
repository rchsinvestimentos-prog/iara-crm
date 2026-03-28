import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// GET /api/instancias/status?id=123 — Verifica status de conexão na Evolution API
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const instanceId = searchParams.get('id');

    if (!instanceId) {
      return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
    }

    // Buscar instância e verificar pertencimento
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

    // Verificar status na Evolution API
    const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${evolutionInstance}`, {
      headers: { 'apikey': apiKey },
      signal: AbortSignal.timeout(5000),
    });

    if (!stateRes.ok) {
      return NextResponse.json({
        connected: false,
        status: 'desconectado',
        error: `Evolution respondeu ${stateRes.status}`,
      });
    }

    const stateData = await stateRes.json();
    const state = stateData?.instance?.state || stateData?.state || 'close';
    const connected = state === 'open';

    // Se conectado, buscar número do WhatsApp
    let number = '';
    if (connected) {
      try {
        // Tentar buscar info da instância para pegar o número
        const infoRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${evolutionInstance}`, {
          headers: { 'apikey': apiKey },
          signal: AbortSignal.timeout(5000),
        });

        if (infoRes.ok) {
          const infoData = await infoRes.json();
          // Evolution v2 retorna array, v1 retorna objeto
          const info = Array.isArray(infoData) ? infoData[0] : infoData;
          number = info?.instance?.owner
            || info?.owner
            || info?.instance?.wuid?.replace('@s.whatsapp.net', '')
            || '';
        }
      } catch { /* não é crítico */ }
    }

    // Atualizar status no banco
    const newStatus = connected ? 'conectado' : 'desconectado';

    if (!isLegado) {
      try {
        if (connected && number) {
          await prisma.$queryRaw`
            UPDATE instancias_clinica
            SET status_conexao = ${newStatus}, numero_whatsapp = ${number}
            WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
          `;
        } else {
          await prisma.$queryRaw`
            UPDATE instancias_clinica
            SET status_conexao = ${newStatus}
            WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
          `;
        }
      } catch (dbErr) {
        console.error('[Status] Erro ao atualizar DB:', dbErr);
      }
    }

    return NextResponse.json({
      connected,
      status: newStatus,
      state,
      number,
    });

  } catch (err: any) {
    console.error('[Status] Erro:', err);
    return NextResponse.json({
      connected: false,
      status: 'desconectado',
      error: err?.message,
    });
  }
}
