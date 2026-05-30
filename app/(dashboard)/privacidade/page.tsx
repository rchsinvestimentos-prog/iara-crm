'use client'

export default function PrivacidadePage() {
    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Política de Privacidade — IARA</h1>
            <div className="prose prose-sm max-w-none space-y-4" style={{ color: 'var(--text-secondary, #9CA3AF)' }}>

                <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>Última atualização: Março de 2025 — Em conformidade com a LGPD (Lei 13.709/2018)</p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>1. Dados Coletados</h2>
                <p className="text-[13px] leading-relaxed">Coletamos os seguintes dados:</p>
                <ul className="text-[13px] space-y-1 list-disc pl-5">
                    <li><strong>Da clínica contratante:</strong> nome, email, telefone, endereço, CNPJ, dados bancários (via Hotmart), procedimentos, preços, horários de funcionamento</li>
                    <li><strong>Dos pacientes (via WhatsApp):</strong> nome, número de telefone, mensagens enviadas e recebidas, áudios, fotos compartilhadas, histórico de agendamentos</li>
                    <li><strong>Dados de uso:</strong> logs de acesso ao painel, ações realizadas, configurações alteradas</li>
                </ul>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>2. Finalidade do Tratamento</h2>
                <p className="text-[13px] leading-relaxed">Os dados são utilizados para:</p>
                <ul className="text-[13px] space-y-1 list-disc pl-5">
                    <li>Operação do serviço de atendimento automatizado (IARA)</li>
                    <li>Agendamento e gestão de consultas</li>
                    <li>Melhoria contínua da qualidade das respostas da IA</li>
                    <li>Segurança e resolução de disputas (backup de conversas)</li>
                    <li>Comunicação com a clínica contratante</li>
                    <li>Cumprimento de obrigações legais</li>
                </ul>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>3. Base Legal (LGPD)</h2>
                <p className="text-[13px] leading-relaxed">
                    O tratamento de dados é fundamentado nas seguintes bases legais da LGPD:
                </p>
                <ul className="text-[13px] space-y-1 list-disc pl-5">
                    <li><strong>Execução de contrato</strong> (Art. 7°, V) — prestação do serviço contratado</li>
                    <li><strong>Legítimo interesse</strong> (Art. 7°, IX) — melhoria do serviço e segurança</li>
                    <li><strong>Cumprimento de obrigação legal</strong> (Art. 7°, II) — manutenção de registros</li>
                </ul>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>4. Armazenamento e Segurança</h2>
                <p className="text-[13px] leading-relaxed">
                    Os dados são armazenados em servidores com criptografia, acesso restrito por autenticação e monitoramento contínuo.
                    Todas as conversas do WhatsApp são armazenadas de forma segura e acessíveis apenas ao administrador da conta e à equipe técnica autorizada.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>5. Compartilhamento</h2>
                <p className="text-[13px] leading-relaxed">
                    Os dados <strong>não são vendidos ou compartilhados</strong> com terceiros para fins de marketing.
                    Podem ser compartilhados apenas com:
                </p>
                <ul className="text-[13px] space-y-1 list-disc pl-5">
                    <li>Provedores de infraestrutura (hospedagem, banco de dados)</li>
                    <li>Provedores de IA (OpenAI, para processamento de mensagens)</li>
                    <li>Autoridades legais, quando exigido por lei</li>
                </ul>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>6. Direitos do Titular</h2>
                <p className="text-[13px] leading-relaxed">
                    Conforme a LGPD, o titular dos dados tem direito a:
                </p>
                <ul className="text-[13px] space-y-1 list-disc pl-5">
                    <li>Confirmação da existência de tratamento</li>
                    <li>Acesso aos dados</li>
                    <li>Correção de dados incompletos ou inexatos</li>
                    <li>Eliminação de dados desnecessários</li>
                    <li>Portabilidade dos dados</li>
                    <li>Revogação do consentimento</li>
                </ul>
                <p className="text-[13px] leading-relaxed">
                    Para exercer seus direitos, entre em contato pelo email: <strong>suporte@iara.click</strong>
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>7. Retenção de Dados</h2>
                <p className="text-[13px] leading-relaxed">
                    Os dados são mantidos durante a vigência do contrato e por <strong>12 meses</strong> após o cancelamento,
                    exceto quando houver obrigação legal de retenção por prazo superior.
                </p>

                <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        Ao utilizar a IARA, você declara estar ciente e de acordo com esta Política de Privacidade.
                    </p>
                </div>
            </div>
        </div>
    )
}
