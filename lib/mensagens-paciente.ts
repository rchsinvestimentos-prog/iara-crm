// ============================================
// MENSAGENS PRONTAS PARA A PACIENTE — em português, espanhol e inglês
// ============================================
// Textos que a IARA manda sem passar pela IA: lembretes, pesquisa de
// satisfação, aniversário, "recebi sua foto". Antes viviam soltos em cada
// rota, só em português; uma paciente de Madri recebia "Oi Lucía! Aqui é a
// IARA...".
//
// O texto em português é exatamente o que já saía antes — mudar aqui muda
// para todas as clínicas do Brasil. Português de Portugal continua usando o
// texto brasileiro, como sempre usou.
//
// Quem chama decide o idioma: idiomaDaPaciente() para mensagem que a IARA
// manda sozinha, idiomaDaMensagem() quando há uma mensagem nova da paciente.

import { linguaDoIdioma, localeDoIdioma } from '@/lib/engine/idioma'

type Base = { idioma: string | null | undefined; nome: string; nomeIA: string; nomeClinica: string }

/** "quinta-feira, 19 de novembro" / "jueves, 19 de noviembre" / "Thursday, November 19" */
export function diaPorExtenso(data: Date, idioma: string | null | undefined): string {
    return data.toLocaleDateString(localeDoIdioma(idioma), { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "15:00" / "15:00" / "03:00 PM" */
export function horaCurta(data: Date, idioma: string | null | undefined): string {
    return data.toLocaleTimeString(localeDoIdioma(idioma), { hour: '2-digit', minute: '2-digit' })
}

export function lembreteVespera(p: Base & { dia: string; hora: string; linkMaps: string }): string {
    const maps = p.linkMaps ? `\n📍 ${p.linkMaps}` : ''
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `¡Hola, ${p.nome}! 😊 Soy ${p.nomeIA}, de ${p.nomeClinica}.

Te escribo para recordarte tu cita de mañana 📅

🗓 *${p.dia}* a las *${p.hora}*${maps}

Si necesitas cambiarla o tienes cualquier duda, escríbeme por aquí 💛`
        case 'en': return `Hi ${p.nome}! 😊 This is ${p.nomeIA} from ${p.nomeClinica}.

Just a quick reminder about your appointment tomorrow! 📅

🗓 *${p.dia}* at *${p.hora}*${maps}

If you need to reschedule or have any questions, just message me here! 💛`
        default: return `Oi ${p.nome}! 😊 Aqui é a ${p.nomeIA}, da ${p.nomeClinica}.

Passando para lembrar do seu agendamento de amanhã! 📅

🗓 *${p.dia}* às *${p.hora}*${maps}

Se precisar remarcar ou tiver alguma dúvida, é só falar aqui! 💛`
    }
}

export function lembreteDuasHoras(p: Base & { hora: string; linkMaps: string | null }): string {
    const maps = p.linkMaps ? `📍 ${p.linkMaps}\n` : ''
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `¡Hola, ${p.nome}! 😊 Soy ${p.nomeIA}, de ${p.nomeClinica}.

Solo te recuerdo que tu cita es *dentro de 2 horas* (a las *${p.hora}*) ⏰

${maps}Si necesitas algo, escríbeme 💛`
        case 'en': return `Hi ${p.nome}! 😊 This is ${p.nomeIA} from ${p.nomeClinica}.

Just a reminder that your appointment is *in 2 hours* (at *${p.hora}*)! ⏰

${maps}If you need anything, just message me! 💛`
        default: return `Oi ${p.nome}! 😊 Aqui é a ${p.nomeIA}, da ${p.nomeClinica}.

Só passando pra lembrar que seu agendamento é *daqui a 2 horas* (às *${p.hora}*)! ⏰

${maps}Se precisar de algo, é só me chamar! 💛`
    }
}

export function pesquisaNps(p: Base & { linkGoogle: string }): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `¡Hola, ${p.nome}! 😊 Soy ${p.nomeIA}, de ${p.nomeClinica}.

Te escribo un momento para saber qué tal fue tu experiencia ayer 💛

Del 0 al 10, ¿cómo valorarías nuestra atención?${p.linkGoogle ? `\n\nSi puedes dejarnos también una reseña en Google, nos ayuda muchísimo ⭐\n${p.linkGoogle}` : ''}`
        case 'en': return `Hi ${p.nome}! 😊 This is ${p.nomeIA} from ${p.nomeClinica}.

Just checking in to see how your visit went yesterday! 💛

On a scale of 0 to 10, how would you rate our service?${p.linkGoogle ? `\n\nIf you have a moment, a quick Google review would help us a lot! ⭐\n${p.linkGoogle}` : ''}`
        default: return `Oi ${p.nome}! 😊 Aqui é a ${p.nomeIA}, da ${p.nomeClinica}.

Passando rapidinho pra saber como foi sua experiência ontem! 💛

De 0 a 10, como você avalia nosso atendimento?${p.linkGoogle ? `\n\nSe puder também deixar uma avaliaçãozinha no Google, ajuda muito a gente! ⭐\n${p.linkGoogle}` : ''}`
    }
}

export function followupAbandono(p: Base): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `¡Hola, ${p.nome}! 😊 Soy ${p.nomeIA}, de ${p.nomeClinica}.

Vi que nos quedó una conversación pendiente y no quiero que te pierdas esta oportunidad 💫

¿Quieres que te ayude a encontrar el mejor horario? Es un momento 📅`
        case 'en': return `Hi ${p.nome}! 😊 This is ${p.nomeIA} from ${p.nomeClinica}.

I saw we didn't get to finish our chat, and I don't want you to miss out! 💫

Want me to help you find the best time? It only takes a minute! 📅`
        default: return `Oi ${p.nome}! 😊 Aqui é a ${p.nomeIA}, da ${p.nomeClinica}.

Vi que a gente ficou de conversar e não quero que você perca essa oportunidade! 💫

Quer que eu te ajude a encontrar o melhor horário? É rapidinho! 📅`
    }
}

// ---------------------------------------------
// Aniversário (só os textos padrão; o texto que a clínica escreveu vence)
// ---------------------------------------------

type Aniv = { idioma: string | null | undefined; nome: string; nomeClinica: string }

export function aniversarioDoMes(p: Aniv): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `💜 ${p.nome}, ¡este mes es tu cumpleaños! En ${p.nomeClinica} te hemos preparado algo especial 🎁✨`
        case 'en': return `💜 ${p.nome}, your birthday is this month! ${p.nomeClinica} has something special for you! 🎁✨`
        default: return `💜 ${p.nome}, seu aniversário é esse mês! A ${p.nomeClinica} preparou algo especial pra você! 🎁✨`
    }
}

export function parabensDoDia(p: Aniv): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `🎂 ¡Feliz cumpleaños, ${p.nome}! 🎉\n\nTe escribimos desde ${p.nomeClinica}. ¡Que tengas un día tan especial como tú! 💜✨`
        case 'en': return `🎂 Happy birthday, ${p.nome}!!! 🎉\n\nIt's ${p.nomeClinica} here! We hope your day is as special as you are! 💜✨`
        default: return `🎂 Parabéns, ${p.nome}!!! 🎉\n\nAqui é da ${p.nomeClinica}! Que esse dia seja tão especial quanto você! 💜✨`
    }
}

/** Linhas que o cron junta ao parabéns quando a clínica liga desconto, combo ou cupom. */
export function extrasDoParabens(idioma: string | null | undefined) {
    switch (linguaDoIdioma(idioma)) {
        case 'es': return {
            presente: (pct: number, dias: number) => `\n\n🎁 Regalo: ${pct}% de descuento válido durante ${dias} días!`,
            cupom: (cupom: string) => `\n\n🎟️ Tu cupón: ${cupom}`,
        }
        case 'en': return {
            presente: (pct: number, dias: number) => `\n\n🎁 Gift: ${pct}% off, valid for ${dias} days!`,
            cupom: (cupom: string) => `\n\n🎟️ Your coupon: ${cupom}`,
        }
        default: return {
            presente: (pct: number, dias: number) => `\n\n🎁 Presente: ${pct}% de desconto válido por ${dias} dias!`,
            cupom: (cupom: string) => `\n\n🎟️ Seu cupom: ${cupom}`,
        }
    }
}

export function descontoAniversario7Dias(p: Aniv & { desconto: number; faltam: number }): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `💜 ${p.nome}, ¡aún estás a tiempo! Tu descuento de cumpleaños del ${p.desconto}% sigue en pie. Quedan ${p.faltam} días. ¿Quieres reservar? 😊`
        case 'en': return `💜 ${p.nome}, there's still time! Your ${p.desconto}% birthday discount is still valid. ${p.faltam} days left. Want to book? 😊`
        default: return `💜 ${p.nome}, ainda dá tempo! Seu desconto de aniversário de ${p.desconto}% continua valendo! Faltam ${p.faltam} dias. Quer agendar? 😊`
    }
}

export function descontoAniversario15Dias(p: Aniv & { desconto: number; faltam: number }): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `✨ ${p.nome}, ¡tu regalo de cumpleaños (${p.desconto}% de descuento) sigue disponible! Quedan ${p.faltam} días. ¡Aprovéchalo! 🎁`
        case 'en': return `✨ ${p.nome}, your birthday gift (${p.desconto}% OFF) is still available! ${p.faltam} days left. Enjoy! 🎁`
        default: return `✨ ${p.nome}, seu presente de aniversário (${p.desconto}% OFF) ainda está disponível! Restam ${p.faltam} dias. Aproveite! 🎁`
    }
}

export function descontoAniversarioUltimoAviso(p: Aniv & { desconto: number; faltam: number }): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `🔔 ${p.nome}, ¡ÚLTIMO AVISO! Tu descuento de cumpleaños del ${p.desconto}% caduca en ${p.faltam} días. ¡No dejes pasar esta oportunidad! 💜`
        case 'en': return `🔔 ${p.nome}, LAST REMINDER! Your ${p.desconto}% birthday discount expires in ${p.faltam} days. Don't miss it! 💜`
        default: return `🔔 ${p.nome}, ÚLTIMO AVISO! Seu desconto de aniversário de ${p.desconto}% expira em ${p.faltam} dias! Não deixe essa chance passar! 💜`
    }
}

// ---------------------------------------------
// Outras
// ---------------------------------------------

export function pedidoAvaliacaoGoogle(p: { idioma: string | null | undefined; nome: string | null | undefined; linkGoogle: string }): string {
    switch (linguaDoIdioma(p.idioma)) {
        case 'es': return `¡Hola${p.nome ? `, ${p.nome}` : ''}! 😊 Nos alegra mucho tu valoración. Si puedes, déjanos también un comentario en Google: ${p.linkGoogle} — ¡Muchísimas gracias! 💜`
        case 'en': return `Hi${p.nome ? ` ${p.nome}` : ''}! 😊 We're so happy with your rating! If you can, please leave us a review on Google too: ${p.linkGoogle} — Thank you so much! 💜`
        default: return `Oi ${p.nome || ''}! 😊 Ficamos muito felizes com sua avaliação! Se puder, deixe um comentário no nosso Google também: ${p.linkGoogle} — Agradecemos demais! 💜`
    }
}

export function retornoCombinado(idioma: string | null | undefined): string {
    switch (linguaDoIdioma(idioma)) {
        case 'es': return '¡Hola! Te escribimos tal como quedamos 😊'
        case 'en': return "Hi! We're getting in touch as we agreed. 😊"
        default: return 'Olá! Estamos entrando em contato conforme combinado. 😊'
    }
}

/** Mídia recebida com "encaminhar foto" desligado: só confirma. */
export function midiaRecebida(idioma: string | null | undefined): string {
    switch (linguaDoIdioma(idioma)) {
        case 'es': return '¡Recibido! ✨ Se lo paso al equipo, ¿vale? 😊'
        case 'en': return "Got it! ✨ I'll pass it on to the team 😊"
        default: return 'Recebi! ✨ Vou encaminhar pra equipe, tá? 😊'
    }
}

/**
 * Foto, vídeo ou documento que foi para a triagem da doutora.
 * maisUma: já havia outra mídia esperando parecer nesta conversa.
 */
export function midiaParaTriagem(idioma: string | null | undefined, tipo: string, maisUma: boolean): string {
    const lingua = linguaDoIdioma(idioma)
    if (lingua === 'es') {
        const oQue = tipo === 'document' ? 'tu documento' : tipo === 'video' ? 'tu vídeo' : 'tu foto'
        return maisUma
            ? `¡He recibido ${oQue}! ✨ Ya se lo he enviado a la doctora, junto con lo que mandaste antes. En cuanto lo revise, te respondemos 😊`
            : `¡He recibido ${oQue}! ✨ Se lo acabo de enviar a la doctora para que le eche un vistazo. En cuanto lo vea, te respondemos, ¿vale? 😊`
    }
    if (lingua === 'en') {
        const oQue = tipo === 'document' ? 'your document' : tipo === 'video' ? 'your video' : 'your photo'
        return maisUma
            ? `Got ${oQue}! ✨ I've sent it to the doctor along with what you sent earlier. We'll get back to you as soon as it's been reviewed 😊`
            : `Got ${oQue}! ✨ I've just sent it to the doctor to take a look. We'll get back to you as soon as possible 😊`
    }
    const oQue = tipo === 'document' ? 'seu documento' : 'sua ' + (tipo === 'image' ? 'foto' : tipo === 'video' ? 'vídeo' : 'documento')
    return maisUma
        ? `Recebi ${oQue}! ✨ Já encaminhei pra Doutora, junto com o que você mandou antes. Assim que ela analisar, te damos o retorno 😊`
        : `Recebi ${oQue}! ✨ Já encaminhei agora mesmo pra Doutora dar uma olhada. Assim que ela ver, já te damos um retorno, tá? 😊`
}

/** Áudio chegou mas a clínica desligou a transcrição. */
export function semOuvirAudio(idioma: string | null | undefined): string {
    switch (linguaDoIdioma(idioma)) {
        case 'es': return '¡Hola! Ahora mismo no puedo escuchar audios 🙈 ¿Me lo escribes? Así te ayudo enseguida 😊'
        case 'en': return "Hi! I can't listen to voice messages right now 🙈 Could you send it as text? That way I can help you right away! 😊"
        default: return 'Oi! No momento não estou conseguindo ouvir áudios 🙈 Pode me mandar por texto? Assim consigo te ajudar rapidinho! 😊'
    }
}
