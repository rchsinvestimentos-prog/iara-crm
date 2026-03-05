'use client'

export default function TermosPage() {
    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Termos de Uso — IARA</h1>
            <div className="prose prose-sm max-w-none space-y-4" style={{ color: 'var(--text-secondary, #9CA3AF)' }}>

                <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>Última atualização: Março de 2025</p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>1. Natureza do Serviço</h2>
                <p className="text-[13px] leading-relaxed">
                    A IARA é uma <strong>Inteligência Artificial</strong> desenvolvida para auxiliar clínicas de estética no atendimento, agendamento e comunicação com clientes.
                    A IARA <strong>não é uma profissional de saúde</strong>, não realiza diagnósticos, não prescreve tratamentos e não substitui o julgamento profissional de médicos, biomédicos ou esteticistas.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>2. Limitações da IA</h2>
                <p className="text-[13px] leading-relaxed">
                    Por ser uma Inteligência Artificial, a IARA pode cometer erros, incluindo mas não se limitando a:
                    informações imprecisas sobre procedimentos, agendamentos incorretos, respostas fora de contexto ou interpretações equivocadas de mensagens.
                    A clínica contratante é <strong>responsável por supervisionar</strong> as interações da IARA com seus clientes.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>3. Responsabilidade</h2>
                <p className="text-[13px] leading-relaxed">
                    A contratante reconhece que a IARA é uma ferramenta de <strong>auxílio</strong> e que toda decisão clínica, recomendação médica ou orientação sobre procedimentos
                    deve ser validada por um profissional habilitado antes de ser comunicada ao paciente.
                    A IARA e seus desenvolvedores <strong>não se responsabilizam</strong> por decisões clínicas baseadas exclusivamente em respostas geradas pela IA.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>4. Armazenamento de Dados</h2>
                <p className="text-[13px] leading-relaxed">
                    Todas as conversas realizadas pela IARA são <strong>armazenadas e registradas</strong> para fins de:
                    segurança, controle de qualidade, treinamento da IA e resolução de eventuais disputas.
                    Os dados são mantidos em servidores seguros e o acesso é restrito ao administrador da conta e à equipe técnica da IARA.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>5. Uso Adequado</h2>
                <p className="text-[13px] leading-relaxed">
                    A contratante se compromete a:
                </p>
                <ul className="text-[13px] space-y-1 list-disc pl-5">
                    <li>Não utilizar a IARA para finalidades ilegais ou antiéticas</li>
                    <li>Manter as informações da clínica atualizadas no painel</li>
                    <li>Supervisionar as respostas da IARA periodicamente</li>
                    <li>Não compartilhar credenciais de acesso com terceiros</li>
                    <li>Informar imediatamente sobre qualquer comportamento inadequado da IA</li>
                </ul>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>6. Propriedade Intelectual</h2>
                <p className="text-[13px] leading-relaxed">
                    A IARA, incluindo sua tecnologia, interface, marca e algoritmos, é propriedade exclusiva de seus desenvolvedores.
                    A contratante adquire apenas o <strong>direito de uso</strong> durante a vigência da assinatura.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>7. Cancelamento</h2>
                <p className="text-[13px] leading-relaxed">
                    O cancelamento da assinatura pode ser feito a qualquer momento pela plataforma de pagamento (Hotmart).
                    Após o cancelamento, o acesso ao painel e as funcionalidades da IARA serão desativados.
                    Os dados armazenados serão mantidos por <strong>12 meses</strong> após o cancelamento para fins legais.
                </p>

                <h2 className="text-[15px] font-semibold mt-6" style={{ color: 'var(--text-primary)' }}>8. Alterações nos Termos</h2>
                <p className="text-[13px] leading-relaxed">
                    Estes termos podem ser atualizados a qualquer momento. A contratante será notificada sobre alterações significativas
                    e o uso continuado do serviço constitui aceite dos novos termos.
                </p>

                <div className="mt-8 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-card, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        Ao utilizar a IARA, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso.
                    </p>
                </div>
            </div>
        </div>
    )
}
