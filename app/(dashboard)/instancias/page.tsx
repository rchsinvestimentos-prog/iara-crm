'use client';

import { useEffect, useState } from 'react';

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
    const [showQR, setShowQR] = useState<number | null>(null);
    const [conectando, setConectando] = useState(false);

    useEffect(() => { fetchInstancias(); }, []);

    async function fetchInstancias() {
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
    }

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

    async function desconectar(id: number) {
        if (!confirm('Deseja desconectar este canal? A IARA vai parar de atender nele.')) return;
        await fetch(`/api/instancias?id=${id}`, { method: 'DELETE' });
        fetchInstancias();
    }

    const whatsapps = instancias.filter(i => i.canal === 'whatsapp');
    const instagrams = instancias.filter(i => i.canal === 'instagram');
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
                            {temWhatsApp
                                ? `${whatsapps.length} número${whatsapps.length > 1 ? 's' : ''} conectado${whatsapps.length > 1 ? 's' : ''}`
                                : 'Conecte seu número para a IARA atender'
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
                                    <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>{getNomeAmigavel(inst)}</span>
                                </div>
                                <div style={{ fontSize: 12, color: status.color, fontWeight: 500, marginTop: 3, marginLeft: 22 }}>
                                    {status.label}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {inst.status_conexao !== 'conectado' && (
                                    <button
                                        onClick={() => setShowQR(inst.id)}
                                        style={{
                                            background: '#25D366', color: '#fff', border: 'none',
                                            borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                                            fontWeight: 600, fontSize: 13
                                        }}
                                    >📱 Escanear QR</button>
                                )}
                                <button
                                    onClick={() => desconectar(inst.id)}
                                    style={{
                                        background: 'none', border: '1px solid rgba(220,50,50,0.15)',
                                        borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                        fontSize: 13, color: '#94a3b8'
                                    }}
                                    title="Desconectar"
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
                            <button
                                onClick={() => desconectar(inst.id)}
                                style={{
                                    background: 'none', border: '1px solid rgba(220,50,50,0.15)',
                                    borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                                    fontSize: 13, color: '#94a3b8'
                                }}
                                title="Desconectar"
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
        </div>
    );
}
