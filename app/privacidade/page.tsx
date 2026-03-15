export default function PrivacidadePage() {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', color: '#333', lineHeight: 1.7 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Política de Privacidade</h1>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>Última atualização: Março de 2026</p>

            <p>A <strong>IARA</strong> ("nós") é uma plataforma de assistente virtual inteligente para clínicas de estética. Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações dos usuários.</p>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>1. Informações Coletadas</h2>
            <p>Podemos coletar as seguintes informações quando você utiliza nossos serviços:</p>
            <ul style={{ paddingLeft: 24 }}>
                <li><strong>Dados de identificação:</strong> nome, e-mail, telefone, CPF (quando fornecido voluntariamente)</li>
                <li><strong>Dados de contatos:</strong> ao integrar com o Google Contacts, acessamos nome, telefone, e-mail e data de nascimento dos seus contatos, mediante sua autorização explícita</li>
                <li><strong>Dados de agenda:</strong> ao integrar com o Google Calendar, acessamos informações de agendamentos para gerenciamento de compromissos</li>
                <li><strong>Dados de uso:</strong> interações com a plataforma, mensagens processadas, configurações de preferência</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>2. Uso das Informações</h2>
            <p>As informações coletadas são utilizadas exclusivamente para:</p>
            <ul style={{ paddingLeft: 24 }}>
                <li>Prestar o serviço de assistente virtual para sua clínica</li>
                <li>Gerenciar contatos e agendamentos</li>
                <li>Enviar notificações e lembretes autorizados (ex: aniversários, follow-ups)</li>
                <li>Melhorar a experiência do usuário</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>3. Compartilhamento de Dados</h2>
            <p>Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:</p>
            <ul style={{ paddingLeft: 24 }}>
                <li>Quando necessário para prestação do serviço (ex: APIs do Google, WhatsApp)</li>
                <li>Quando exigido por lei ou ordem judicial</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>4. Google API — Uso Limitado</h2>
            <p>O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo seguirá a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener" style={{ color: '#6366f1' }}>Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>5. Segurança</h2>
            <p>Utilizamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia em trânsito (HTTPS) e controle de acesso baseado em autenticação.</p>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>6. Seus Direitos</h2>
            <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem o direito de:</p>
            <ul style={{ paddingLeft: 24 }}>
                <li>Acessar seus dados pessoais</li>
                <li>Solicitar correção de dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusão dos seus dados</li>
                <li>Revogar o consentimento a qualquer momento</li>
            </ul>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>7. Contato</h2>
            <p>Para dúvidas sobre esta Política de Privacidade ou para exercer seus direitos, entre em contato conosco através do e-mail: <a href="mailto:suportepscomvc@gmail.com" style={{ color: '#6366f1' }}>suportepscomvc@gmail.com</a></p>

            <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #e5e7eb', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                © {new Date().getFullYear()} IARA — Assistente Virtual para Clínicas de Estética
            </div>
        </div>
    )
}
