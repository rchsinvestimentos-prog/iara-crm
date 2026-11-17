// Junta as traduções de todas as telas. Só é baixado por quem escolhe
// espanhol ou inglês (ver components/IdiomaProvider.tsx).
//
// Glossário — usar sempre as mesmas palavras:
//   pt                    es (da Espanha, "tú")     en (EUA)
//   Dashboard             Panel                     Dashboard
//   Configurar IARA       Configurar IARA           IARA settings
//   Conversas             Conversaciones            Conversations
//   Agenda                Agenda                    Schedule
//   Agendamento           Cita                      Appointment
//   Agendar               Reservar / Agendar cita   Book
//   Cliente / paciente    Clienta / paciente        Client / patient
//   Procedimento          Tratamiento               Treatment
//   Serviços              Servicios                 Services
//   Profissional          Profesional               Professional
//   Equipe                Equipo                    Team
//   Créditos              Créditos                  Credits
//   Plano                 Plan                      Plan
//   Configurações         Ajustes                   Settings
//   Salvar                Guardar                   Save
//   Excluir / Apagar      Eliminar                  Delete
//   Sair                  Cerrar sesión             Log out
//   Sinal (pagamento)     Señal                     Deposit
//   Avaliação (consulta)  Valoración                Consultation
//   Lembrete              Recordatorio              Reminder
//   Contatos              Contactos                 Contacts
//   Celular               Móvil                     Cell phone
//   IARA, WhatsApp, Instagram, CRM, Follow-up: não traduzir.

import type { Dicionario, LinguaPainel } from '@/components/IdiomaProvider'
import * as comum from './telas/comum'
import * as menu from './telas/menu'
import * as login from './telas/login'
import * as dashboard from './telas/dashboard'
import * as conversas from './telas/conversas'
import * as agenda from './telas/agenda'
import * as crm from './telas/crm'
import * as configuracoes from './telas/configuracoes'
import * as atendimento from './telas/atendimento'
import * as whatsapp from './telas/whatsapp'
import * as simulador from './telas/simulador'
import * as voz from './telas/voz'

export const TELAS = { comum, menu, login, dashboard, conversas, agenda, crm, configuracoes, atendimento, whatsapp, simulador, voz }

function juntar(lingua: 'es' | 'en'): Dicionario {
    const tudo: Dicionario = {}
    for (const tela of Object.values(TELAS)) Object.assign(tudo, tela[lingua])
    return tudo
}

export const DICIONARIOS: Record<Exclude<LinguaPainel, 'pt'>, Dicionario> = {
    es: juntar('es'),
    en: juntar('en'),
}
