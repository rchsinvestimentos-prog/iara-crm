// Cenário: cliente manda fotos; a doutora decide pelo painel (05/10/2026).
// Confere as regras: aviso único, IARA não opina sobre foto, lembrete extra,
// decisão foto por foto, mensagem só sai com a aprovação da doutora,
// "me lembre" e "assumir" avisam a cliente, lembrete de 15 min.

import type { Simulacao } from '../rodar'

export default async function (sim: Simulacao) {
    const C = { numero: '5541988880001', nome: 'Valéria Santos' }
    const D = sim.numeroDoutora
    await sim.limparCliente(C.numero, C.nome)
    const daClinica = (n: string) => sim.whatsapp.doNumero(n).filter(m => m.de === 'clinica')
    const botao = (t: string | RegExp) => sim.painel.locator('button', { hasText: t }).first()
    const clicar = async (t: string | RegExp) => { await botao(t).evaluate((el: HTMLElement) => el.click()); await sim.painel.waitForTimeout(600) }

    // 1
    sim.passo('A cliente puxa conversa', 'Mensagem comum: a IARA responde normalmente.')
    const a1 = sim.qtdDaClinica(C.numero)
    await sim.clienteManda(C.numero, C.nome, 'Oi, boa tarde! Queria saber sobre harmonização')
    sim.verificar(await sim.novaMensagem(C.numero, a1) !== null, 'A IARA respondeu a cliente')
    await sim.printCelular(C.numero, 'Celular da cliente')

    // 2
    sim.passo('A cliente manda 2 fotos seguidas', 'Aviso único: um "Recebi" para a cliente e um alerta para a doutora, mesmo com 2 fotos. A IARA não pausa.')
    const antesC = daClinica(C.numero).length, antesD = daClinica(D).length
    await sim.clienteMandaFoto(C.numero, C.nome, 'foto-1.jpg')
    await sim.clienteMandaFoto(C.numero, C.nome, 'foto-2.jpg')
    sim.verificar(daClinica(C.numero).length - antesC === 1, `A cliente recebeu 1 "Recebi" (recebeu ${daClinica(C.numero).length - antesC})`)
    sim.verificar(daClinica(D).length - antesD === 1, `A doutora recebeu 1 alerta (recebeu ${daClinica(D).length - antesD})`)
    const pausa = await sim.prisma.$queryRaw`SELECT motivo FROM status_conversa WHERE user_id = 1 AND telefone_cliente = ${C.numero}` as any[]
    sim.verificar(pausa.length === 0, 'A IARA continua atendendo (sem pausa)')
    await sim.printCelular(C.numero, 'Celular da cliente')
    await sim.printCelular(D, 'Celular da doutora')

    // 3
    sim.passo('A cliente pergunta da foto antes da doutora ver', 'A IARA só pode dizer que a doutora está analisando. A doutora recebe um lembrete extra.')
    await sim.prisma.$executeRaw`UPDATE triagem_pendencia SET ultimo_lembrete_em = NOW() - INTERVAL '6 minutes' WHERE clinica_id = 1`
    const d3 = daClinica(D).length
    const a3 = sim.qtdDaClinica(C.numero)
    await sim.clienteManda(C.numero, C.nome, 'A doutora já viu minha foto? Quantas sessões vou precisar?')
    const resposta = (await sim.novaMensagem(C.numero, a3)) ?? ''
    sim.verificar(resposta !== '', 'A IARA respondeu a pergunta')
    sim.verificar(/analis/i.test(resposta), `A IARA disse que a doutora está analisando: "${resposta.slice(0, 120)}..."`)
    sim.verificar(!/\b\d+\s*sess/i.test(resposta), 'A IARA não chutou número de sessões')
    sim.verificar(daClinica(D).length === d3 + 1, 'A doutora recebeu lembrete extra')
    await sim.printCelular(C.numero, 'Celular da cliente')
    await sim.printCelular(D, 'Celular da doutora')

    // 4
    const contato = await sim.prisma.contato.findFirst({ where: { clinicaId: 1, telefone: C.numero } })
    sim.passo('A doutora toca no link do alerta', 'Abre o painel no celular, direto no quadro com as 2 fotos.')
    await sim.entrarNoPainel(true)
    await sim.painel.goto(`http://localhost:3333/clientes?contatoId=${contato.id}&triage=true`, { waitUntil: 'networkidle', timeout: 180000 })
    await sim.painel.waitForTimeout(2500)
    const min = sim.painel.getByText('Minimizar').first()
    if (await min.count()) await min.click().catch(() => {})
    sim.verificar(await sim.painel.getByText('2 arquivos aguardando avaliação').count() > 0, 'O quadro mostra as 2 fotos')
    await sim.printPainel('Painel da doutora (celular)')

    // 5
    sim.passo('A doutora comenta a foto 1 e responde à IARA', 'A foto 2 fica sem comentário: não entra na mensagem e continua sendo lembrada.')
    await sim.painel.locator('textarea[placeholder^="Ex.: vai precisar"]').fill('vai precisar de pelo menos 3 sessões para o resultado ficar bom')
    await clicar('Salvar comentário')
    await clicar('Responder à IARA')
    await sim.painel.getByText('Sim, pode mandar').first().waitFor({ timeout: 90000 })
    const proposta = await sim.painel.getByText(/Posso mandar isto/).first().textContent()
    sim.verificar(daClinica(C.numero).every(m => !/3 sess/.test(m.texto || '')), 'Nada saiu para a cliente antes da aprovação')
    sim.verificar(/ficou sem comentário/.test(proposta || ''), 'A IARA avisou que a foto 2 ficou sem comentário')
    const textoProposto = (proposta || '').replace(/^Entendi! Posso mandar isto para \S+\?/, '').split('A foto 2 ficou')[0]
    sim.verificar(textoProposto.trim().length > 20, 'A IARA escreveu uma proposta')
    sim.verificar(!/agend|consulta|marcar/i.test(textoProposto), 'A mensagem não inventa convite para agendar')
    sim.verificar(!/(suas|as) fotos/i.test(textoProposto), 'A mensagem não diz que todas as fotos foram avaliadas')
    await sim.painel.getByText(/Posso mandar isto/).first().scrollIntoViewIfNeeded()
    await sim.printPainel('A IARA pede permissão')

    // 6
    sim.passo('A doutora aprova: "Sim, pode mandar"', 'Só agora a mensagem sai para a cliente.')
    const a6 = sim.qtdDaClinica(C.numero)
    await clicar('Sim, pode mandar')
    const enviada = await sim.novaMensagem(C.numero, a6)
    sim.verificar(/3 sess/.test(enviada || ''), 'A cliente recebeu a mensagem aprovada')
    sim.verificar(/primeira foto/i.test(enviada || '') && !/(suas|as) fotos foram/i.test(enviada || ''), `A mensagem fala só da primeira foto: "${(enviada || '').slice(0, 140)}..."`)
    await sim.painel.waitForTimeout(2500)
    const pend = await sim.triagem.midiasPendentesDoContato(1, contato.id)
    sim.verificar(pend.length === 1, `A foto 2 continua esperando (${pend.length} pendente)`)
    await sim.printCelular(C.numero, 'Celular da cliente')
    await sim.printPainel('Painel depois do envio')

    // 7
    sim.passo('15 minutos sem decisão sobre a foto 2', 'O lembrete cobra só a foto que faltou.')
    await sim.prisma.$executeRaw`UPDATE triagem_pendencia SET proximo_lembrete_em = NOW() - INTERVAL '1 minute' WHERE clinica_id = 1 AND contato_id = ${contato.id}`
    const d7 = daClinica(D).length
    await sim.triagem.processarLembretes()
    sim.verificar(daClinica(D).length === d7 + 1 && /1 foto/.test(daClinica(D).at(-1)?.texto || ''), 'Lembrete de 15 min falando de 1 foto')
    await sim.printCelular(D, 'Celular da doutora')

    // 8
    sim.passo('A doutora toca em "Me lembre em 30 min"', 'A cliente é avisada de que a doutora está em atendimento.')
    await sim.painel.reload({ waitUntil: 'networkidle' })
    await sim.painel.waitForTimeout(2500)
    const a8 = sim.qtdDaClinica(C.numero)
    await clicar('Me lembre em 30 min')
    sim.verificar(/em atendimento/.test((await sim.novaMensagem(C.numero, a8)) || ''), 'A cliente recebeu "a Doutora está em atendimento"')
    await sim.painel.waitForTimeout(1500)
    await sim.printCelular(C.numero, 'Celular da cliente')

    // 9
    sim.passo('A doutora abre de novo e toca em "Deixa que eu assumo"', 'A cliente é avisada e a IARA pausa 3 horas.')
    await sim.painel.goto(`http://localhost:3333/clientes?contatoId=${contato.id}&triage=true`, { waitUntil: 'networkidle', timeout: 180000 })
    await sim.painel.waitForTimeout(2500)
    const a9 = sim.qtdDaClinica(C.numero)
    await clicar('Deixa que eu assumo')
    sim.verificar(/vai assumir/.test((await sim.novaMensagem(C.numero, a9)) || ''), 'A cliente recebeu "a Doutora vai assumir"')
    await sim.painel.waitForTimeout(1500)
    const p9 = await sim.prisma.$queryRaw`SELECT motivo FROM status_conversa WHERE user_id = 1 AND telefone_cliente = ${C.numero}` as any[]
    sim.verificar(p9[0]?.motivo === 'dra_assumiu', 'A IARA ficou pausada (doutora assumiu)')
    sim.verificar((await sim.triagem.midiasPendentesDoContato(1, contato.id)).length === 0, 'Nenhuma foto esperando: lembretes param')
    await sim.printCelular(C.numero, 'Celular da cliente')
    await sim.printPainel('Painel no fim')

    // 10
    const C2 = { numero: '5541988880002', nome: 'Bruna Lima' }
    await sim.limparCliente(C2.numero, C2.nome)
    sim.passo('Outra cliente manda 3 fotos; a doutora comenta só a segunda', 'A mensagem precisa falar da segunda foto, sem dizer que todas foram avaliadas.')
    await sim.clienteMandaFoto(C2.numero, C2.nome, 'foto-1.jpg')
    await sim.clienteMandaFoto(C2.numero, C2.nome, 'foto-2.jpg')
    await sim.clienteMandaFoto(C2.numero, C2.nome, 'foto-1.jpg')
    const contato2 = await sim.prisma.contato.findFirst({ where: { clinicaId: 1, telefone: C2.numero } })
    await sim.painel.goto(`http://localhost:3333/clientes?contatoId=${contato2.id}&triage=true`, { waitUntil: 'networkidle', timeout: 180000 })
    await sim.painel.waitForTimeout(2500)
    sim.verificar(await sim.painel.getByText('3 arquivos aguardando avaliação').count() > 0, 'O quadro mostra as 3 fotos')
    await sim.painel.locator('button[title^="Foto 2"]').first().evaluate((el: HTMLElement) => el.click())
    await sim.painel.waitForTimeout(500)
    await sim.painel.locator('textarea[placeholder^="Ex.: vai precisar"]').fill('nessa área o resultado já está ótimo, não precisa mexer')
    await clicar('Salvar comentário')
    await clicar('Responder à IARA')
    await sim.painel.getByText('Sim, pode mandar').first().waitFor({ timeout: 90000 })
    const prop2 = ((await sim.painel.getByText(/Posso mandar isto/).first().textContent()) || '').replace(/^Entendi! Posso mandar isto para \S+\?/, '').split(/As fotos .* ficaram/)[0]
    sim.verificar(/segunda/i.test(prop2), `A proposta fala da segunda foto: "${prop2.slice(0, 140)}..."`)
    sim.verificar(!/primeira/i.test(prop2), 'A proposta não fala da primeira foto')
    sim.verificar(!/(suas|as) fotos foram|todas as fotos/i.test(prop2), 'A proposta não diz que todas foram avaliadas')
    await sim.painel.getByText(/Posso mandar isto/).first().scrollIntoViewIfNeeded()
    await sim.printPainel('A IARA pede permissão (só a 2ª foto comentada)')
}
