import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B0F19', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
        <img src="/iara-avatar.png" alt="IARA" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 4 }}>IARA</h1>
      <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 32, textAlign: 'center' }}>
        Assistente Virtual Inteligente para Clínicas de Estética
      </p>
      <p style={{ fontSize: 13, color: '#6B7280', maxWidth: 480, textAlign: 'center', lineHeight: 1.7, marginBottom: 32 }}>
        A IARA é uma plataforma de assistente virtual que automatiza o atendimento, agendamento e
        follow-up de pacientes via WhatsApp para clínicas de estética.
      </p>
      <Link
        href="/login"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #D99773, #C07A55)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 32px', borderRadius: 12, textDecoration: 'none', marginBottom: 48 }}
      >
        Acessar Painel →
      </Link>
      <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
        <Link href="/privacidade" style={{ color: '#9CA3AF', textDecoration: 'underline' }}>
          Política de Privacidade
        </Link>
        <span style={{ color: '#4B5563' }}>·</span>
        <Link href="/termos" style={{ color: '#9CA3AF', textDecoration: 'underline' }}>
          Termos de Serviço
        </Link>
      </div>
      <p style={{ marginTop: 32, fontSize: 11, color: '#374151' }}>
        © {new Date().getFullYear()} IARA — Todos os direitos reservados
      </p>
    </div>
  )
}
