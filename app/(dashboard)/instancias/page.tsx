'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface Instancia {
    id: number;
    canal: string;
    nome_instancia: string;
    evolution_instance: string;
    numero_whatsapp: string;
    status_conexao: string;
    ig_username: string;
    nome_assistente: string;
    idioma: string;
    horario_inicio: string;
    horario_fim: string;
    atender_fds: boolean;
    ativo: boolean;
    _legado?: boolean;
}

interface Limites {
    max_instancias_whatsapp: number;
    max_instancias_instagram: number;
}

export default function ConexoesPage() {
    const [instancias, setInstancias] = useState<Instancia[]>([]);
    const [limites, setLimites] = useState<Limites>({ max_instancias_whatsapp: 1, max_instancias_instagram: 0 });
    const [plano, setPlano] = useState(1);
    const [loading, setLoading] = useState(true);
    const [calendarConnected, setCalendarConnected] = useState(false);
    const [calendarId, setCalendarId] = useState('');
    const [conectando, setConectando] = useState(false);

    // QR Code modal
    const [qrModal, setQrModal] = useState<{
        open: boolean;
        instanceId: number | null;
        instanceName: string;
        qrcode: string;
        pairingCode: string;
        loading: boolean;
        error: string;
        elapsed: number;
    }>({
        open: false,
        instanceId: null,
        instanceName: '',
        qrcode: '',
        pairingCode: '',
        loading: false,
        error: '',
        elapsed: 0,
    });

    // Disconnect state
    const [desconectando, setDesconectando] = useState<number | null>(null);

    // Confirm modal for disconnect
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        instanceId: number | null;
        deleteCompletamente: boolean;
        message: string;
    }>({
        open: false,
        instanceId: null,
        deleteCompletamente: false,
        message: '',
    });

    // Polling ref
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const elapsedRef = useRef<NodeJS.Timeout | null>(null);

    // ==================== Fetch Instâncias ====================

    const fetchInstancias = useCallback(async () => {
        try {
            const res = await fetch('/api/instancias');
            const data = await res.json();
            setInstancias(data.instancias || []);
            setLimites(data.limites || { max_instancias_whatsapp: 1, max_instancias_instagram: 0 });
            setPlano(data.plano || 1);
            setCalendarConnected(!!data.calendarConnected);
            setCalendarId(data.calendarId || '');
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchInstancias(); }, [fetchInstancias]);

    // ==================== Verificar status real ao carregar ====================

    useEffect(() => {
        if (instancias.length === 0) return;
        
        // Para cada instância WhatsApp, verificar status real
        instancias.forEach(inst => {
            if (inst.canal === 'whatsapp' && inst.evolution_instance) {
                fetch(`/api/instancias/status?id=${inst.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.connected && inst.status_conexao !== 'conectado') {
                            // Atualizar no state local
                            setInstancias(prev => prev.map(i =>
                                i.id === inst.id
                                    ? { ...i, status_conexao: 'conectado', numero_whatsapp: data.number || i.numero_whatsapp }
                                    : i
                            ));
                        } else if (!data.connected && inst.status_conexao === 'conectado') {
                            setInstancias(prev => prev.map(i =>
                                i.id === inst.id ? { ...i, status_conexao: 'desconectado' } : i
                            ));
                        }
                    })
                    .catch(() => { /* silencioso */ });
            }
        });
    }, [instancias.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // ==================== Conectar WhatsApp ====================

    async function conectarWhatsApp() {
        setConectando(true);
        try {
            const res = await fetch('/api/instancias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    canal: 'whatsapp',
                    nome_instancia: 'Recepção Clínica',
                    nome_assistente: 'IARA',
                    idioma: 'pt-BR'
                })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Erro ao conectar');
                return;
            }
            await fetchInstancias();
        } catch (e) {
            console.error(e);
            alert('Erro ao criar conexão');
        }
        setConectando(false);
    }

    async function conectarInstagram() {
        setConectando(true);
        try {
            const res = await fetch('/api/instancias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    canal: 'instagram',
                    nome_instancia: 'Instagram',
                    nome_assistente: 'IARA',
                    idioma: 'pt-BR'
                })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Erro ao conectar');
                return;
            }
            await fetchInstancias();
        } catch (e) {
            console.error(e);
            alert('Erro ao criar conexão');
        }
        setConectando(false);
    }

    // ==================== QR Code Flow ====================

    async function abrirQR(instanceId: number) {
        setQrModal({
            open: true,
            instanceId,
            instanceName: '',
            qrcode: '',
            pairingCode: '',
            loading: true,
            error: '',
            elapsed: 0,
        });

        try {
            const res = await fetch('/api/instancias/qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instanceId }),
            });

            const data = await res.json();

            if (data.connected) {
                // Já está conectado!
                setQrModal(prev => ({ ...prev, open: false, loading: false }));
                await fetchInstancias();
                return;
            }

            if (!res.ok || !data.qrcode) {
                setQrModal(prev => ({
                    ...prev,
                    loading: false,
                    error: data.error || 'Erro ao gerar QR Code. Tente novamente.',
                }));
                return;
            }

            setQrModal(prev => ({
                ...prev,
                loading: false,
                qrcode: data.qrcode,
                pairingCode: data.pairingCode || '',
                instanceName: data.instanceName || '',
            }));

            // Iniciar polling de status
            iniciarPolling(instanceId);
        } catch (e: any) {
            setQrModal(prev => ({
                ...prev,
                loading: false,
                error: `Erro de rede: ${e?.message || 'tente novamente'}`,
            }));
        }
    }

    function iniciarPolling(instanceId: number) {
        pararPolling();

        // Polling a cada 3 segundos
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/instancias/status?id=${instanceId}`);
                const data = await res.json();

                if (data.connected) {
                    onConexaoDetectada(instanceId, data.number);
                }
            } catch { /* silencioso */ }
        }, 3000);

        // Timer de elapsed
        elapsedRef.current = setInterval(() => {
            setQrModal(prev => ({ ...prev, elapsed: prev.elapsed + 1 }));
        }, 1000);
    }

    function pararPolling() {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        if (elapsedRef.current) {
            clearInterval(elapsedRef.current);
            elapsedRef.current = null;
        }
    }

    function onConexaoDetectada(instanceId: number, number?: string) {
        pararPolling();

        // Atualizar instância no state
        setInstancias(prev => prev.map(i =>
            i.id === instanceId
                ? { ...i, status_conexao: 'conectado', numero_whatsapp: number || i.numero_whatsapp }
                : i
        ));

        // Fechar modal com sucesso
        setQrModal(prev => ({
            ...prev,
            open: false,
            qrcode: '',
        }));

        // Refresh completo para pegar dados atualizados
        fetchInstancias();
    }

    function fecharQR() {
        pararPolling();
        setQrModal({
            open: false,
            instanceId: null,
            instanceName: '',
            qrcode: '',
            pairingCode: '',
            loading: false,
            error: '',
            elapsed: 0,
        });
    }

    // Cleanup polling on unmount
    useEffect(() => {
        return () => pararPolling();
    }, []);

    // ==================== Desconectar ====================

    function pedirDesconectar(id: number, deleteCompletamente: boolean = false) {
        const msg = deleteCompletamente
            ? 'Deseja REMOVER este canal completamente? A IARA vai parar de atender e a instância será deletada.'
            : 'Deseja DESCONECTAR o WhatsApp? Você precisará escanear o QR Code novamente.';

        setConfirmModal({
            open: true,
            instanceId: id,
            deleteCompletamente,
            message: msg,
        });
    }

    async function executarDesconectar() {
        if (!confirmModal.instanceId) return;

        const { instanceId, deleteCompletamente } = confirmModal;
        setConfirmModal(prev => ({ ...prev, open: false }));
        setDesconectando(instanceId);

        try {
            const res = await fetch('/api/instancias/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceId,
                    deleteInstance: deleteCompletamente,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || 'Erro ao desconectar');
            } else {
                await fetchInstancias();
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao desconectar');
        }

        setDesconectando(null);
    }

    // ==================== Helpers ====================

    const whatsapps = instancias.filter(i => i.canal === 'whatsapp');
    const instagrams = instancias.filter(i => i.canal === 'instagram');
    const whatsappsConectados = whatsapps.filter(i => i.status_conexao === 'conectado');
    const temWhatsApp = whatsapps.length > 0;
    const temInstagram = instagrams.length > 0;
    const podeAddWhatsApp = whatsapps.length < limites.max_instancias_whatsapp;
    const podeAddInstagram = instagrams.length < limites.max_instancias_instagram;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'conectado': return { icon: '🟢', label: 'Conectado', color: '#16a34a' };
            case 'qr_pendente': return { icon: '🟡', label: 'Aguardando QR Code', color: '#d97706' };
            default: return { icon: '🔴', label: 'Desconectado', color: '#dc2626' };
        }
    };

    const getNomeAmigavel = (inst: Instancia) => {
        if (inst.canal === 'instagram' && inst.ig_username) return `@${inst.ig_username}`;
        if (inst.numero_whatsapp && inst.numero_whatsapp.length > 5) {
            const num = inst.numero_whatsapp.replace(/\D/g, '');
            if (num.length >= 10) {
                const ddd = num.slice(-10, -8);
                const parte1 = num.slice(-8, -4);
                const parte2 = num.slice(-4);
                return `(${ddd}) ${parte1}-${parte2}`;
            }
            return inst.numero_whatsapp;
        }
        return inst.nome_instancia || 'WhatsApp';
    };

    if (loading) {
        return (
            <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ color: '#64748b', fontSize: 15 }}>Verificando suas conexões...</p>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#0F4C61' }}>
                    Conexões
                </h1>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
                    Conecte seus canais para a IARA começar a atender
                </p>
            </div>

            {/* ==================== WhatsApp ==================== */}
            <div style={{
                background: '#fff', borderRadius: 20, padding: '24px 28px',
                border: '1px solid #e2e8f0', marginBottom: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: temWhatsApp ? 20 : 0 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0
                    }}>💬</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>WhatsApp</h2>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>
                            {whatsappsConectados.length > 0
                                ? `${whatsappsConectados.length} número${whatsappsConectados.length > 1 ? 's' : ''} conectado${whatsappsConectados.length > 1 ? 's' : ''}`
                                : temWhatsApp ? 'Nenhum número conectado' : 'Conecte seu número para a IARA atender'
                            }
                        </p>
                    </div>
                    {!temWhatsApp && podeAddWhatsApp && (
                        <button
                            onClick={conectarWhatsApp}
                            disabled={conectando}
                            style={{
                                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                color: '#fff', border: 'none', borderRadius: 12,
                                padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                opacity: conectando ? 0.6 : 1, whiteSpace: 'nowrap'
                            }}
                        >
                            {conectando ? '⏳ Conectando...' : '+ Conectar'}
                        </button>
                    )}
                </div>

                {/* Cards WhatsApp conectados */}
                {whatsapps.map(inst => {
                    const status = getStatusInfo(inst.status_conexao);
                    const isDesconectando = desconectando === inst.id;

                    return (
                        <div key={inst.id} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 18px', borderRadius: 14,
                            background: inst.status_conexao === 'conectado' ? 'rgba(37,211,102,0.06)' : 'rgba(239,68,68,0.04)',
                            border: `1px solid ${inst.status_conexao === 'conectado' ? 'rgba(37,211,102,0.15)' : 'rgba(239,68,68,0.1)'}`,
                            marginBottom: 10
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>{status.icon}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>
                                        {inst.status_conexao === 'conectado' ? getNomeAmigavel(inst) : inst.nome_instancia}
                                    </span>
                                </div>
                                <div style={{ fontSize: 12, color: status.color, fontWeight: 500, marginTop: 3, marginLeft: 22 }}>
                                    {status.label}
                                    {inst.status_conexao === 'conectado' && inst.numero_whatsapp && (
                                        <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
                                            {inst.numero_whatsapp}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {inst.status_conexao !== 'conectado' && (
                                    <button
                                        onClick={() => abrirQR(inst.id)}
                                        style={{
                                            background: '#25D366', color: '#fff', border: 'none',
                                            borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                                            fontWeight: 600, fontSize: 13
                                        }}
                                    >📱 Escanear QR</button>
                                )}
                                {inst.status_conexao === 'conectado' && (
                                    <button
                                        onClick={() => pedirDesconectar(inst.id, false)}
                                        disabled={isDesconectando}
                                        style={{
                                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                            borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                            fontSize: 12, color: '#ef4444', fontWeight: 500,
                                            opacity: isDesconectando ? 0.5 : 1,
                                        }}
                                        title="Desconectar WhatsApp"
                                    >
                                        {isDesconectando ? '⏳' : '🔌 Desconectar'}
                                    </button>
                                )}
                                <button
                                    onClick={() => pedirDesconectar(inst.id, true)}
                                    disabled={isDesconectando}
                                    style={{
                                        background: 'none', border: '1px solid rgba(220,50,50,0.15)',
                                        borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                        fontSize: 13, color: '#94a3b8',
                                        opacity: isDesconectando ? 0.5 : 1,
                                    }}
                                    title="Remover canal"
                                >✕</button>
                            </div>
                        </div>
                    );
                })}

                {/* Botão adicionar mais WhatsApp */}
                {temWhatsApp && podeAddWhatsApp && (
                    <button
                        onClick={conectarWhatsApp}
                        disabled={conectando}
                        style={{
                            width: '100%', padding: '12px', borderRadius: 12,
                            border: '2px dashed rgba(37,211,102,0.3)', background: 'none',
                            color: '#25D366', fontWeight: 600, fontSize: 14,
                            cursor: 'pointer', marginTop: 4
                        }}
                    >+ Adicionar outro número</button>
                )}
            </div>

            {/* ==================== Instagram ==================== */}
            <div style={{
                background: '#fff', borderRadius: 20, padding: '24px 28px',
                border: '1px solid #e2e8f0', marginBottom: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: limites.max_instancias_instagram === 0 ? 0.7 : 1
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: temInstagram ? 20 : 0 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #E1306C, #833AB4, #405DE6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0
                    }}>📷</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Instagram</h2>
                            {limites.max_instancias_instagram === 0 && (
                                <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    background: 'linear-gradient(135deg, #D99773, #C07A55)',
                                    color: '#fff', padding: '2px 8px', borderRadius: 6
                                }}>PRO</span>
                            )}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>
                            {limites.max_instancias_instagram === 0
                                ? 'Responda DMs automaticamente · Disponível no Plano 2'
                                : temInstagram
                                    ? `${instagrams.length} conta${instagrams.length > 1 ? 's' : ''} conectada${instagrams.length > 1 ? 's' : ''}`
                                    : 'Conecte para a IARA responder DMs'
                            }
                        </p>
                    </div>
                    {limites.max_instancias_instagram === 0 ? (
                        <a href="/plano" style={{
                            background: 'linear-gradient(135deg, #D99773, #C07A55)',
                            color: '#fff', border: 'none', borderRadius: 12,
                            padding: '10px 20px', fontWeight: 600, fontSize: 14,
                            textDecoration: 'none', whiteSpace: 'nowrap'
                        }}>Fazer Upgrade</a>
                    ) : !temInstagram && podeAddInstagram ? (
                        <button
                            onClick={conectarInstagram}
                            disabled={conectando}
                            style={{
                                background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                                color: '#fff', border: 'none', borderRadius: 12,
                                padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                opacity: conectando ? 0.6 : 1, whiteSpace: 'nowrap'
                            }}
                        >
                            {conectando ? '⏳ Conectando...' : '+ Conectar'}
                        </button>
                    ) : null}
                </div>

                {/* Cards Instagram conectados */}
                {instagrams.map(inst => {
                    const status = getStatusInfo(inst.status_conexao);
                    return (
                        <div key={inst.id} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 18px', borderRadius: 14,
                            background: 'rgba(225,48,108,0.04)',
                            border: '1px solid rgba(225,48,108,0.1)',
                            marginBottom: 10
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 14 }}>{status.icon}</span>
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{getNomeAmigavel(inst)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: status.color, fontWeight: 500, marginTop: 3, marginLeft: 22 }}>
                                    {status.label}
                                </div>
                            </div>
                            {inst.status_conexao !== 'conectado' && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/instagram/auth');
                                            const data = await res.json();
                                            if (data.authUrl) {
                                                window.open(data.authUrl, '_blank');
                                            } else {
                                                alert(data.error || 'Erro ao iniciar conexão com Instagram');
                                            }
                                        } catch (e) {
                                            console.error(e);
                                            alert('Erro ao conectar Instagram');
                                        }
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                                        color: '#fff', border: 'none', borderRadius: 12,
                                        padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                        whiteSpace: 'nowrap'
                                    }}
                                >📲 Conectar</button>
                            )}
                            <button
                                onClick={() => pedirDesconectar(inst.id, true)}
                                style={{
                                    background: 'none', border: '1px solid rgba(220,50,50,0.15)',
                                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                    fontSize: 13, color: '#94a3b8'
                                }}
                                title="Remover canal"
                            >✕</button>
                        </div>
                    );
                })}
            </div>

            {/* ==================== Google Calendar ==================== */}
            <div style={{
                background: '#fff', borderRadius: 20, padding: '24px 28px',
                border: '1px solid #e2e8f0', marginBottom: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: calendarConnected
                            ? 'linear-gradient(135deg, #4285F4, #34A853)'
                            : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0
                    }}>🗓️</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Google Agenda</h2>
                            {calendarConnected && <span style={{ fontSize: 14 }}>🟢</span>}
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>
                            {calendarConnected
                                ? 'Conectada — IARA agenda e verifica horários automaticamente'
                                : 'Conecte para a IARA agendar consultas na sua agenda'
                            }
                        </p>
                    </div>
                    <button
                        onClick={() => window.open('/api/auth/google-calendar', '_self')}
                        style={{
                            background: calendarConnected
                                ? 'rgba(0,0,0,0.05)'
                                : 'linear-gradient(135deg, #4285F4, #34A853)',
                            color: calendarConnected ? '#64748b' : '#fff',
                            border: 'none', borderRadius: 12,
                            padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {calendarConnected ? '🔄 Reconectar' : '+ Conectar'}
                    </button>
                </div>
            </div>

            {/* ==================== Contatos Google ==================== */}
            <div style={{
                background: '#fff', borderRadius: 20, padding: '24px 28px',
                border: '1px solid #e2e8f0', marginBottom: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #4285F4, #EA4335)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, flexShrink: 0
                    }}>👥</div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>Google Contatos</h2>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#94a3b8' }}>
                            Importe contatos do Google para o CRM
                        </p>
                    </div>
                    <a
                        href="/contatos"
                        style={{
                            background: 'rgba(0,0,0,0.05)',
                            color: '#64748b', border: 'none', borderRadius: 12,
                            padding: '10px 20px', fontWeight: 600, fontSize: 14,
                            textDecoration: 'none', whiteSpace: 'nowrap'
                        }}
                    >📂 Importar</a>
                </div>
            </div>

            {/* ==================== Dica de Ajuda ==================== */}
            <div style={{
                background: 'rgba(15,76,97,0.04)', borderRadius: 16, padding: '18px 22px',
                border: '1px solid rgba(15,76,97,0.1)', marginTop: 8
            }}>
                <p style={{ margin: 0, fontSize: 14, color: '#0F4C61', fontWeight: 600, marginBottom: 6 }}>
                    💡 Dica
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                    Para conectar o WhatsApp, basta escanear o QR Code com seu celular — como no WhatsApp Web.
                    A IARA vai começar a atender automaticamente assim que conectar!
                </p>
            </div>

            {/* ==================== QR Code Modal ==================== */}
            {qrModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, backdropFilter: 'blur(4px)',
                }}
                    onClick={(e) => { if (e.target === e.currentTarget) fecharQR(); }}
                >
                    <div style={{
                        background: '#fff', borderRadius: 24, padding: '32px',
                        maxWidth: 440, width: '90vw',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                        textAlign: 'center',
                        border: '2px solid rgba(37,211,102,0.2)',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                            <span style={{ fontSize: 28 }}>📱</span>
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
                                Escaneie o QR Code
                            </h3>
                        </div>

                        <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
                            Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar
                        </p>

                        {/* QR Code display */}
                        {qrModal.loading && (
                            <div style={{ padding: '40px 0' }}>
                                <div style={{
                                    width: 40, height: 40, border: '3px solid #e2e8f0',
                                    borderTop: '3px solid #25D366', borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    margin: '0 auto 12px',
                                }} />
                                <p style={{ color: '#94a3b8', fontSize: 14 }}>Gerando QR Code...</p>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </div>
                        )}

                        {qrModal.error && (
                            <div style={{
                                padding: '24px', background: 'rgba(239,68,68,0.06)',
                                borderRadius: 16, marginBottom: 16,
                                border: '1px solid rgba(239,68,68,0.15)',
                            }}>
                                <p style={{ color: '#ef4444', fontSize: 14, margin: 0, fontWeight: 500 }}>
                                    ❌ {qrModal.error}
                                </p>
                            </div>
                        )}

                        {qrModal.qrcode && (
                            <div style={{
                                display: 'inline-block',
                                padding: 16,
                                background: '#fff',
                                borderRadius: 16,
                                border: '2px solid rgba(37,211,102,0.2)',
                                marginBottom: 16,
                            }}>
                                <img
                                    src={qrModal.qrcode.startsWith('data:') ? qrModal.qrcode : `data:image/png;base64,${qrModal.qrcode}`}
                                    alt="QR Code WhatsApp"
                                    style={{ width: 280, height: 280, display: 'block' }}
                                />
                            </div>
                        )}

                        {/* Pairing Code */}
                        {qrModal.pairingCode && (
                            <div style={{
                                background: 'rgba(37,211,102,0.06)',
                                borderRadius: 12, padding: '10px 16px',
                                marginBottom: 16,
                                border: '1px solid rgba(37,211,102,0.15)',
                            }}>
                                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Código de pareamento:</p>
                                <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: '#1e293b', letterSpacing: 4 }}>
                                    {qrModal.pairingCode}
                                </p>
                            </div>
                        )}

                        {/* Status do polling */}
                        {qrModal.qrcode && !qrModal.error && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 8, marginBottom: 16,
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#25D366',
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                }} />
                                <p style={{ margin: 0, fontSize: 13, color: '#25D366', fontWeight: 500 }}>
                                    Aguardando leitura do QR Code... ({qrModal.elapsed}s)
                                </p>
                                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
                            </div>
                        )}

                        {/* QR expirado (2 min) */}
                        {qrModal.elapsed > 120 && qrModal.qrcode && (
                            <div style={{
                                background: 'rgba(234,179,8,0.08)',
                                borderRadius: 12, padding: '10px 16px',
                                marginBottom: 16,
                                border: '1px solid rgba(234,179,8,0.2)',
                            }}>
                                <p style={{ margin: 0, fontSize: 13, color: '#d97706', fontWeight: 500 }}>
                                    ⚠️ QR Code pode ter expirado.
                                </p>
                            </div>
                        )}

                        {/* Botões */}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button
                                onClick={() => qrModal.instanceId && abrirQR(qrModal.instanceId)}
                                style={{
                                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                                    color: '#fff', border: 'none', borderRadius: 12,
                                    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                }}
                            >🔄 Gerar novo QR</button>
                            <button
                                onClick={fecharQR}
                                style={{
                                    background: 'rgba(0,0,0,0.05)', color: '#64748b',
                                    border: 'none', borderRadius: 12,
                                    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                }}
                            >Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== Modal Confirmar Desconexão ==================== */}
            {confirmModal.open && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                >
                    <div
                        style={{
                            background: '#fff', borderRadius: 20, padding: '32px 28px',
                            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                            ⚠️ Confirmar
                        </div>
                        <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
                            {confirmModal.message}
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                                style={{
                                    background: 'rgba(0,0,0,0.05)', color: '#64748b',
                                    border: 'none', borderRadius: 12,
                                    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                }}
                            >Cancelar</button>
                            <button
                                onClick={executarDesconectar}
                                style={{
                                    background: '#ef4444', color: '#fff',
                                    border: 'none', borderRadius: 12,
                                    padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                                }}
                            >Sim, remover</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
