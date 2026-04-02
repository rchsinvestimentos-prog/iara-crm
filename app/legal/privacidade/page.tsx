// Página PÚBLICA — Política de Privacidade
// URL: https://app.iara.click/legal/privacidade
// Necessária para o Meta App Review (Instagram)

export default function PrivacidadePublica() {
    return (
        <html lang="pt-BR">
            <head>
                <title>Política de Privacidade — IARA</title>
                <meta name="description" content="Política de Privacidade da IARA - Assistente de IA para clínicas de estética" />
            </head>
            <body style={{ background: '#0f0f1a', color: '#e0e0e8', fontFamily: 'system-ui, sans-serif', margin: 0, padding: '40px 20px' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #D99773, #C07A55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px' }}>I</div>
                        <h1 style={{ fontSize: '22px', fontWeight: '600', margin: 0 }}>Política de Privacidade — IARA</h1>
                    </div>

                    <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '24px' }}>Última atualização: Abril de 2026 — Em conformidade com a LGPD (Lei 13.709/2018)</p>

                    <Section title="1. Sobre a IARA">
                        <p>A IARA é uma assistente virtual de inteligência artificial especializada em atendimento, agendamento e gestão para clínicas de estética. A plataforma integra-se a canais de comunicação como WhatsApp e Instagram para automatizar o atendimento ao paciente em nome da clínica contratante.</p>
                    </Section>

                    <Section title="2. Dados Coletados">
                        <p><strong>Da clínica contratante:</strong> nome, email, telefone, endereço, CNPJ, procedimentos, preços, horários de funcionamento.</p>
                        <p><strong>Dos pacientes (via WhatsApp e Instagram):</strong> nome, número de telefone ou Instagram ID, mensagens enviadas e recebidas, áudios transcritos, fotos compartilhadas, histórico de agendamentos.</p>
                        <p><strong>Dados de uso:</strong> logs de acesso ao painel, ações realizadas, configurações alteradas.</p>
                    </Section>

                    <Section title="3. Finalidade do Tratamento">
                        <ul>
                            <li>Operação do serviço de atendimento automatizado (IARA) via WhatsApp e Instagram</li>
                            <li>Agendamento e gestão de consultas</li>
                            <li>Resposta automatizada a mensagens diretas e comentários no Instagram</li>
                            <li>Melhoria contínua da qualidade das respostas da IA</li>
                            <li>Segurança e resolução de disputas</li>
                            <li>Comunicação com a clínica contratante</li>
                            <li>Cumprimento de obrigações legais</li>
                        </ul>
                    </Section>

                    <Section title="4. Base Legal (LGPD)">
                        <ul>
                            <li><strong>Execução de contrato</strong> (Art. 7°, V) — prestação do serviço contratado</li>
                            <li><strong>Legítimo interesse</strong> (Art. 7°, IX) — melhoria do serviço e segurança</li>
                            <li><strong>Cumprimento de obrigação legal</strong> (Art. 7°, II) — manutenção de registros</li>
                        </ul>
                    </Section>

                    <Section title="5. Uso de Dados do Instagram">
                        <p>Quando uma clínica conecta sua conta profissional do Instagram à IARA, coletamos:</p>
                        <ul>
                            <li><strong>Mensagens diretas (DMs):</strong> conteúdo das mensagens recebidas e enviadas para fins de atendimento automatizado.</li>
                            <li><strong>Comentários:</strong> conteúdo dos comentários em publicações para resposta automática configurada pela clínica.</li>
                            <li><strong>Perfil do remetente:</strong> nome ou username do Instagram para identificação na conversa.</li>
                        </ul>
                        <p>Esses dados são utilizados <strong>exclusivamente</strong> para responder mensagens em nome da clínica e <strong>nunca são vendidos, compartilhados com terceiros para marketing, ou utilizados para fins publicitários.</strong></p>
                        <p>O acesso pode ser revogado a qualquer momento pela clínica, desconectando a integração no painel da IARA.</p>
                    </Section>

                    <Section title="6. Armazenamento e Segurança">
                        <p>Os dados são armazenados em servidores com criptografia, acesso restrito por autenticação e monitoramento contínuo. Todas as conversas são armazenadas de forma segura e acessíveis apenas ao administrador da conta e à equipe técnica autorizada.</p>
                    </Section>

                    <Section title="7. Compartilhamento">
                        <p>Os dados <strong>não são vendidos ou compartilhados</strong> com terceiros para fins de marketing. Podem ser compartilhados apenas com:</p>
                        <ul>
                            <li>Provedores de infraestrutura (hospedagem, banco de dados)</li>
                            <li>Provedores de IA (Anthropic, OpenAI — para processamento de mensagens)</li>
                            <li>Meta Platforms (para operação do Instagram Messaging)</li>
                            <li>Autoridades legais, quando exigido por lei</li>
                        </ul>
                    </Section>

                    <Section title="8. Direitos do Titular">
                        <p>Conforme a LGPD, o titular dos dados tem direito a:</p>
                        <ul>
                            <li>Confirmação da existência de tratamento</li>
                            <li>Acesso aos dados</li>
                            <li>Correção de dados incompletos ou inexatos</li>
                            <li>Eliminação de dados desnecessários</li>
                            <li>Portabilidade dos dados</li>
                            <li>Revogação do consentimento</li>
                        </ul>
                        <p>Para exercer seus direitos, entre em contato pelo email: <strong>suporte@iara.click</strong></p>
                    </Section>

                    <Section title="9. Retenção de Dados">
                        <p>Os dados são mantidos durante a vigência do contrato e por <strong>12 meses</strong> após o cancelamento, exceto quando houver obrigação legal de retenção por prazo superior.</p>
                    </Section>

                    <Section title="10. Exclusão de Dados">
                        <p>Para solicitar a exclusão de seus dados, acesse: <a href="https://app.iara.click/legal/exclusao-de-dados" style={{ color: '#D99773' }}>https://app.iara.click/legal/exclusao-de-dados</a></p>
                        <p>Ou entre em contato: <strong>suporte@iara.click</strong></p>
                    </Section>

                    <div style={{ marginTop: '40px', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px' }}>
                        Ao utilizar a IARA, você declara estar ciente e de acordo com esta Política de Privacidade.
                    </div>
                </div>
            </body>
        </html>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#D99773' }}>{title}</h2>
            <div style={{ fontSize: '14px', lineHeight: '1.7', opacity: 0.85 }}>{children}</div>
        </div>
    )
}
