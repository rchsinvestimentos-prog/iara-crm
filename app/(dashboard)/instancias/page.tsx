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

export default function InstanciasPage() {
    const [instancias, setInstancias] = useState<Instancia[]>([]);
    const [limites, setLimites] = useState<Limites>({ max_instancias_whatsapp: 1, max_instancias_instagram: 0 });
    const [plano, setPlano] = useState(1);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [novaInstancia, setNovaInstancia] = useState({ canal: 'whatsapp', nome_instancia: '', nome_assistente: 'IARA', idioma: 'pt-BR' });
    const [error, setError] = useState('');

    useEffect(() => { fetchInstancias(); }, []);

    async function fetchInstancias() {
        try {
            const res = await fetch('/api/instancias');
            const data = await res.json();
            setInstancias(data.instancias || []);
            setLimites(data.limites || { max_instancias_whatsapp: 1, max_instancias_instagram: 0 });
            setPlano(data.plano || 1);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function criarInstancia() {
        setError('');
        const res = await fetch('/api/instancias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novaInstancia)
        });
        const data = await res.json();
        if (!res.ok) {
            setError(data.error);
            return;
        }
        setShowModal(false);
        setNovaInstancia({ canal: 'whatsapp', nome_instancia: '', nome_assistente: 'IARA', idioma: 'pt-BR' });
        fetchInstancias();
    }

    async function removerInstancia(id: number) {
        if (!confirm('Tem certeza que deseja desconectar esta instância?')) return;
        await fetch(`/api/instancias?id=${id}`, { method: 'DELETE' });
        fetchInstancias();
    }

    const whatsapps = instancias.filter(i => i.canal === 'whatsapp');
    const instagrams = instancias.filter(i => i.canal === 'instagram');

    const statusIcon = (status: string) => {
        switch (status) {
            case 'conectado': return '🟢';
            case 'qr_pendente': return '🟡';
            default: return '🔴';
        }
    };

    const idiomas: Record<string, string> = {
        'pt-BR': '🇧🇷 Português (BR)',
        'pt-PT': '🇵🇹 Português (PT)',
        'en-US': '🇺🇸 English',
        'es': '🇪🇸 Español'
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📱 Instâncias & Canais</h1>
                    <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 14 }}>
                        Gerencie seus WhatsApps e Instagram conectados
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        background: 'linear-gradient(135deg, #c8956c, #a67850)',
                        color: '#fff', border: 'none', borderRadius: 12,
                        padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14
                    }}
                >
                    + Conectar Canal
                </button>
            </div>

            {/* Slots Overview */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24
            }}>
                <div style={{
                    background: 'rgba(37, 211, 102, 0.1)', borderRadius: 16, padding: 20,
                    border: '1px solid rgba(37, 211, 102, 0.2)'
                }}>
                    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>WhatsApp</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#25D366' }}>
                        {whatsapps.length} / {limites.max_instancias_whatsapp}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                        {limites.max_instancias_whatsapp - whatsapps.length > 0
                            ? `${limites.max_instancias_whatsapp - whatsapps.length} slot(s) disponível`
                            : 'Todos os slots em uso'}
                    </div>
                </div>
                <div style={{
                    background: 'rgba(225, 48, 108, 0.1)', borderRadius: 16, padding: 20,
                    border: '1px solid rgba(225, 48, 108, 0.2)'
                }}>
                    <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Instagram</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#E1306C' }}>
                        {instagrams.length} / {limites.max_instancias_instagram}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                        {limites.max_instancias_instagram === 0
                            ? 'Disponível a partir do Plano 2'
                            : limites.max_instancias_instagram - instagrams.length > 0
                                ? `${limites.max_instancias_instagram - instagrams.length} slot(s) disponível`
                                : 'Todos os slots em uso'}
                    </div>
                </div>
            </div>

            {/* Lista de WhatsApps */}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>💬 WhatsApp</h2>
            {whatsapps.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 40, borderRadius: 16,
                    background: 'rgba(0,0,0,0.03)', marginBottom: 24
                }}>
                    <p style={{ fontSize: 40 }}>📱</p>
                    <p style={{ fontWeight: 600 }}>Nenhum WhatsApp conectado</p>
                    <p style={{ opacity: 0.6, fontSize: 14 }}>Conecte seu primeiro número para a IARA começar a atender</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {whatsapps.map(inst => (
                        <div key={inst.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(0,0,0,0.02)', borderRadius: 16, padding: '16px 20px',
                            border: '1px solid rgba(0,0,0,0.06)'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>
                                    {statusIcon(inst.status_conexao)} {inst.nome_instancia}
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>
                                    {inst.numero_whatsapp || inst.evolution_instance} · {idiomas[inst.idioma] || inst.idioma} · {inst.nome_assistente}
                                </div>
                                <div style={{ fontSize: 12, opacity: 0.4, marginTop: 2 }}>
                                    ⏰ {inst.horario_inicio}-{inst.horario_fim} {inst.atender_fds ? '(inclui FDS)' : '(sem FDS)'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button style={{
                                    background: 'none', border: '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13
                                }}>⚙️ Config</button>
                                <button
                                    onClick={() => removerInstancia(inst.id)}
                                    style={{
                                        background: 'none', border: '1px solid rgba(220,50,50,0.2)',
                                        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                                        fontSize: 13, color: '#dc3232'
                                    }}
                                >🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lista de Instagram */}
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>📷 Instagram</h2>
            {limites.max_instancias_instagram === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 40, borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(225,48,108,0.05), rgba(131,58,180,0.05))',
                    marginBottom: 24, border: '1px dashed rgba(225,48,108,0.2)'
                }}>
                    <p style={{ fontSize: 40 }}>🔒</p>
                    <p style={{ fontWeight: 600 }}>Instagram disponível no Plano 2+</p>
                    <p style={{ opacity: 0.6, fontSize: 14 }}>A IARA responde DMs e comentários automaticamente</p>
                    <a href="/plano" style={{
                        display: 'inline-block', marginTop: 12,
                        background: 'linear-gradient(135deg, #E1306C, #833AB4)',
                        color: '#fff', borderRadius: 12, padding: '10px 24px',
                        textDecoration: 'none', fontWeight: 600, fontSize: 14
                    }}>Fazer Upgrade</a>
                </div>
            ) : instagrams.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 40, borderRadius: 16,
                    background: 'rgba(0,0,0,0.03)', marginBottom: 24
                }}>
                    <p style={{ fontSize: 40 }}>📷</p>
                    <p style={{ fontWeight: 600 }}>Nenhum Instagram conectado</p>
                    <p style={{ opacity: 0.6, fontSize: 14 }}>Conecte para a IARA responder DMs e comentários</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                    {instagrams.map(inst => (
                        <div key={inst.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'linear-gradient(135deg, rgba(225,48,108,0.04), rgba(131,58,180,0.04))',
                            borderRadius: 16, padding: '16px 20px',
                            border: '1px solid rgba(225,48,108,0.1)'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 15 }}>
                                    {statusIcon(inst.status_conexao)} @{inst.ig_username || inst.nome_instancia}
                                </div>
                                <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>
                                    {idiomas[inst.idioma] || inst.idioma} · {inst.nome_assistente}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button style={{
                                    background: 'none', border: '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13
                                }}>⚙️ Config</button>
                                <button
                                    onClick={() => removerInstancia(inst.id)}
                                    style={{
                                        background: 'none', border: '1px solid rgba(220,50,50,0.2)',
                                        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                                        fontSize: 13, color: '#dc3232'
                                    }}
                                >🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upgrade CTA */}
            {plano < 4 && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(200,149,108,0.1), rgba(166,120,80,0.1))',
                    borderRadius: 16, padding: 20, textAlign: 'center',
                    border: '1px solid rgba(200,149,108,0.2)'
                }}>
                    <p style={{ fontWeight: 600, margin: '0 0 4px' }}>
                        Precisa de mais canais?
                    </p>
                    <p style={{ opacity: 0.6, fontSize: 14, margin: '0 0 12px' }}>
                        {plano === 1 && 'Plano 2: +Instagram · Plano 3: +2 WhatsApps · Plano 4: +3 WhatsApps'}
                        {plano === 2 && 'Plano 3: até 2 WhatsApps · Plano 4: até 3 WhatsApps'}
                        {plano === 3 && 'Plano 4: até 3 WhatsApps conectados'}
                    </p>
                    <a href="/plano" style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #c8956c, #a67850)',
                        color: '#fff', borderRadius: 12, padding: '10px 24px',
                        textDecoration: 'none', fontWeight: 600, fontSize: 14
                    }}>Ver Planos</a>
                </div>
            )}

            {/* Modal de Nova Instância */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: 32, width: 440, maxWidth: '90vw'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700 }}>
                            + Conectar Novo Canal
                        </h3>

                        {error && (
                            <div style={{
                                background: 'rgba(220,50,50,0.1)', color: '#dc3232',
                                borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14
                            }}>{error}</div>
                        )}

                        <label style={{ display: 'block', marginBottom: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Canal</span>
                            <select
                                value={novaInstancia.canal}
                                onChange={e => setNovaInstancia({ ...novaInstancia, canal: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14
                                }}
                            >
                                <option value="whatsapp">💬 WhatsApp</option>
                                <option value="instagram">📷 Instagram</option>
                            </select>
                        </label>

                        <label style={{ display: 'block', marginBottom: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                Nome da instância
                            </span>
                            <input
                                type="text"
                                placeholder={novaInstancia.canal === 'whatsapp' ? 'Ex: Recepção, Dra. Ana' : 'Ex: @minhaclinica'}
                                value={novaInstancia.nome_instancia}
                                onChange={e => setNovaInstancia({ ...novaInstancia, nome_instancia: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14
                                }}
                            />
                        </label>

                        <label style={{ display: 'block', marginBottom: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                Nome da Assistente
                            </span>
                            <input
                                type="text"
                                placeholder="IARA"
                                value={novaInstancia.nome_assistente}
                                onChange={e => setNovaInstancia({ ...novaInstancia, nome_assistente: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14
                                }}
                            />
                        </label>

                        <label style={{ display: 'block', marginBottom: 24 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Idioma</span>
                            <select
                                value={novaInstancia.idioma}
                                onChange={e => setNovaInstancia({ ...novaInstancia, idioma: e.target.value })}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 10,
                                    border: '1px solid rgba(0,0,0,0.12)', fontSize: 14
                                }}
                            >
                                <option value="pt-BR">🇧🇷 Português (BR)</option>
                                <option value="pt-PT">🇵🇹 Português (PT)</option>
                                <option value="en-US">🇺🇸 English</option>
                                <option value="es">🇪🇸 Español</option>
                            </select>
                        </label>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: 12,
                                    border: '1px solid rgba(0,0,0,0.1)', background: 'none',
                                    cursor: 'pointer', fontSize: 14
                                }}
                            >Cancelar</button>
                            <button
                                onClick={criarInstancia}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: 12,
                                    background: 'linear-gradient(135deg, #c8956c, #a67850)',
                                    color: '#fff', border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: 14
                                }}
                            >Conectar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
