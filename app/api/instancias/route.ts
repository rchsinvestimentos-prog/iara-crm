import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// GET — Lista instâncias do usuário
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plano: true }
  });

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  // Buscar instâncias da tabela instancias_clinica
  const instancias = await prisma.$queryRaw`
    SELECT 
      ic.id, ic.canal, ic.nome_instancia, ic.evolution_instance,
      ic.numero_whatsapp, ic.status_conexao, ic.ig_username,
      ic.nome_assistente, ic.idioma, ic.horario_inicio, ic.horario_fim,
      ic.atender_fds, ic.ativo, ic.created_at
    FROM instancias_clinica ic
    WHERE ic.user_id = ${user.id}
    ORDER BY ic.canal, ic.created_at
  ` as any[];

  // Buscar WhatsApp legado da tabela clinica (fluxo antigo via Configurações)
  const legado = await prisma.$queryRaw`
    SELECT evolution_instance, whatsapp_clinica, nome_assistente, evolution_apikey 
    FROM clinica WHERE id = ${user.id} LIMIT 1
  ` as any[];

  const clinicaLegado = legado?.[0];

  // Se tem WhatsApp no clinica mas NÃO tem na instancias_clinica, incluir
  if (clinicaLegado?.evolution_instance) {
    const jaTemNaInstancias = instancias.some(
      (i: any) => i.evolution_instance === clinicaLegado.evolution_instance
    );
    if (!jaTemNaInstancias) {
      instancias.unshift({
        id: -1, // ID virtual (indicando que é legado)
        canal: 'whatsapp',
        nome_instancia: clinicaLegado.whatsapp_clinica || 'WhatsApp Principal',
        evolution_instance: clinicaLegado.evolution_instance,
        numero_whatsapp: clinicaLegado.whatsapp_clinica || '',
        status_conexao: 'conectado', // se tem evolution_instance, foi conectado
        ig_username: null,
        nome_assistente: clinicaLegado.nome_assistente || 'IARA',
        idioma: 'pt-BR',
        horario_inicio: '08:00',
        horario_fim: '20:00',
        atender_fds: false,
        ativo: true,
        created_at: new Date(),
        _legado: true, // flag para o frontend saber que é legado
      });
    }
  }

  // Buscar Google Calendar da clinica
  let calendarConnected = false;
  let calendarId = '';
  try {
    const calData = await prisma.$queryRaw`
      SELECT google_calendar_token, google_calendar_id 
      FROM clinica WHERE id = ${user.id} LIMIT 1
    ` as any[];
    const cal = calData?.[0];
    calendarConnected = !!cal?.google_calendar_token;
    calendarId = cal?.google_calendar_id || '';
  } catch { }

  const limites = await prisma.$queryRaw`
    SELECT 
      max_instancias_whatsapp, max_instancias_instagram
    FROM users WHERE id = ${user.id}
  `;

  return NextResponse.json({
    instancias,
    limites: (limites as any[])[0] || { max_instancias_whatsapp: 1, max_instancias_instagram: 0 },
    plano: user.plano,
    calendarConnected,
    calendarId,
  });
}

// POST — Cria nova instância
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, plano: true }
  });

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const body = await req.json();
  const { canal, nome_instancia, nome_assistente, idioma } = body;

  if (!canal || !nome_instancia) {
    return NextResponse.json({ error: 'canal e nome_instancia obrigatórios' }, { status: 400 });
  }

  // Verificar limites do plano
  const contagem = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE canal = 'whatsapp' AND ativo) AS whatsapps,
      COUNT(*) FILTER (WHERE canal = 'instagram' AND ativo) AS instagrams
    FROM instancias_clinica
    WHERE user_id = ${user.id}
  ` as any[];

  const limites = await prisma.$queryRaw`
    SELECT max_instancias_whatsapp, max_instancias_instagram 
    FROM users WHERE id = ${user.id}
  ` as any[];

  const atual = contagem[0] || { whatsapps: 0, instagrams: 0 };
  const limite = limites[0] || { max_instancias_whatsapp: 1, max_instancias_instagram: 0 };

  if (canal === 'whatsapp' && Number(atual.whatsapps) >= Number(limite.max_instancias_whatsapp)) {
    return NextResponse.json({
      error: 'Limite de WhatsApps atingido',
      limite: limite.max_instancias_whatsapp,
      atual: atual.whatsapps,
      upgrade: true
    }, { status: 403 });
  }

  if (canal === 'instagram' && Number(atual.instagrams) >= Number(limite.max_instancias_instagram)) {
    return NextResponse.json({
      error: canal === 'instagram' && Number(limite.max_instancias_instagram) === 0
        ? 'Instagram disponível a partir do Plano 2'
        : 'Limite de Instagram atingido',
      limite: limite.max_instancias_instagram,
      atual: atual.instagrams,
      upgrade: true
    }, { status: 403 });
  }

  // Criar instância
  const instanceName = `iara_${user.id}_${canal}_${Date.now()}`;

  const result = await prisma.$queryRaw`
    INSERT INTO instancias_clinica (
      user_id, canal, nome_instancia, evolution_instance,
      nome_assistente, idioma, status_conexao
    ) VALUES (
      ${user.id}, ${canal}, ${nome_instancia}, ${instanceName},
      ${nome_assistente || 'IARA'}, ${idioma || 'pt-BR'}, 'desconectado'
    )
    RETURNING id, canal, nome_instancia, evolution_instance, status_conexao
  `;

  return NextResponse.json({
    success: true,
    instancia: (result as any[])[0],
    message: canal === 'whatsapp'
      ? 'Instância criada! Conecte via QR Code.'
      : 'Instância criada! Configure o token do Instagram.'
  });
}

// DELETE — Remove instância
export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  await prisma.$queryRaw`
    DELETE FROM instancias_clinica 
    WHERE id = ${Number(id)} AND user_id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
