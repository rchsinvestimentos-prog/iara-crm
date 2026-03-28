import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

// POST /api/instancias/qr — Gera QR Code para conectar WhatsApp
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
    const { instanceId } = body;

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId obrigatório' }, { status: 400 });
    }

    // Buscar instância (verificando que pertence ao usuário)
    let instancia: any = null;

    // Buscar na tabela instancias_clinica
    const rows = await prisma.$queryRaw`
      SELECT id, evolution_instance, canal, status_conexao
      FROM instancias_clinica
      WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
      LIMIT 1
    ` as any[];

    if (rows.length > 0) {
      instancia = rows[0];
    }

    // Se instanceId === -1, é instância legada (da tabela users)
    if (Number(instanceId) === -1) {
      const legado = await prisma.$queryRaw`
        SELECT evolution_instance, evolution_apikey FROM users WHERE id = ${user.id} LIMIT 1
      ` as any[];

      if (legado.length > 0 && legado[0].evolution_instance) {
        instancia = {
          id: -1,
          evolution_instance: legado[0].evolution_instance,
          canal: 'whatsapp',
          _apikey: legado[0].evolution_apikey,
        };
      }
    }

    if (!instancia || !instancia.evolution_instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
    }

    const apiKey = instancia._apikey || EVOLUTION_API_KEY;
    const instanceName = instancia.evolution_instance;

    // Primeiro verificar se a instância já existe na Evolution
    let instanceExists = false;
    const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || 'https://app.iara.click/api/webhook/evolution';

    try {
      const checkRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': apiKey },
        signal: AbortSignal.timeout(5000),
      });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const state = checkData?.instance?.state || checkData?.state;
        if (state === 'open') {
          // Já está conectado — mas garantir webhook
          try {
            await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
              body: JSON.stringify({
                webhook: {
                  enabled: true, url: webhookUrl, byEvents: false, base64: true,
                  events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
                },
              }),
            });
            console.log(`[QR] ✅ Webhook garantido para instância conectada ${instanceName}`);
          } catch { }

          return NextResponse.json({
            connected: true,
            message: 'WhatsApp já está conectado!'
          });
        }
        instanceExists = true;

        // Instância existe mas não está conectada — garantir webhook
        try {
          await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({
              webhook: {
                enabled: true, url: webhookUrl, byEvents: false, base64: true,
                events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
              },
            }),
          });
          console.log(`[QR] ✅ Webhook configurado para instância existente ${instanceName}`);
        } catch { }
      }
    } catch { /* instância pode não existir */ }

    // Se a instância não existe, criar na Evolution API
    if (!instanceExists) {
      try {
        const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
            webhook: {
              url: webhookUrl,
              byEvents: false,
              base64: true,
              events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
            },
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (createRes.ok) {
          const createData = await createRes.json();

          // Configurar webhook por endpoint separado (garantia extra)
          try {
            await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
              body: JSON.stringify({
                webhook: {
                  enabled: true,
                  url: webhookUrl,
                  byEvents: false,
                  base64: true,
                  events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
                },
              }),
            });
            console.log(`[QR] ✅ Webhook configurado para ${instanceName} → ${webhookUrl}`);
          } catch { console.warn(`[QR] ⚠️ webhook/set fallback falhou`) }

          // Se já veio QR na criação
          if (createData?.qrcode?.base64) {
            return NextResponse.json({
              qrcode: createData.qrcode.base64,
              pairingCode: createData?.qrcode?.pairingCode || null,
              instanceName,
            });
          }
        }
      } catch (e) {
        console.error('[QR] Erro ao criar instância:', e);
      }
    }

    // Gerar QR Code via connect
    const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: { 'apikey': apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!connectRes.ok) {
      const errText = await connectRes.text().catch(() => '');
      console.error(`[QR] Evolution connect falhou (${connectRes.status}):`, errText);
      return NextResponse.json({
        error: 'Erro ao gerar QR Code',
        details: `Evolution respondeu ${connectRes.status}`,
      }, { status: 502 });
    }

    const connectData = await connectRes.json();

    // Evolution API pode retornar QR em diferentes formatos
    const qrcode = connectData?.base64
      || connectData?.qrcode?.base64
      || connectData?.qrcode
      || null;

    const pairingCode = connectData?.paiCode
      || connectData?.pairingCode
      || connectData?.qrcode?.pairingCode
      || null;

    if (!qrcode) {
      return NextResponse.json({
        error: 'QR Code não retornado pela Evolution API',
        raw: connectData,
      }, { status: 502 });
    }

    // Atualizar status no banco
    if (Number(instanceId) !== -1) {
      await prisma.$queryRaw`
        UPDATE instancias_clinica 
        SET status_conexao = 'qr_pendente'
        WHERE id = ${Number(instanceId)} AND user_id = ${user.id}
      `;
    }

    return NextResponse.json({
      qrcode,
      pairingCode,
      instanceName,
    });

  } catch (err: any) {
    console.error('[QR] Erro:', err);
    return NextResponse.json({ error: `Erro interno: ${err?.message}` }, { status: 500 });
  }
}
