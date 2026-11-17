// Traduções desta tela. Chave = o texto em português, exatamente como está no código.
// Dashboard (app/(dashboard)/dashboard/page.tsx), OnboardingChecklist, PausarIARA e UpsellBanner.
import type { Dicionario } from '@/components/IdiomaProvider'

export const es: Dicionario = {
    // Dashboard — cabeçalho
    'Bom dia': 'Buenos días',
    'Boa tarde': 'Buenas tardes',
    'Boa noite': 'Buenas noches',
    'Dra.': 'Dra.',
    'Buscando dados da sua clínica...': 'Buscando los datos de tu clínica...',
    'Aqui está o resumo da sua assistente': 'Aquí tienes el resumen de tu asistente',

    // Dashboard — WhatsApp
    'WhatsApp desconectado': 'WhatsApp desconectado',
    'Sua IARA não está recebendo mensagens. Reconecte para continuar atendendo.': 'Tu IARA no está recibiendo mensajes. Vuelve a conectarla para seguir atendiendo.',
    'Reconectar': 'Reconectar',
    'WhatsApp conectado e ativo': 'WhatsApp conectado y activo',

    // Dashboard — clínica nova
    'Tudo pronto! Aguardando a primeira cliente.': '¡Todo listo! Esperando a la primera clienta.',
    'Tudo pronto! Agora é só conectar o WhatsApp.': '¡Todo listo! Ahora solo falta conectar WhatsApp.',
    'Sua {nome} está conectada e pronta para atender. Quando uma cliente mandar uma mensagem, ela vai aparecer aqui automaticamente!': 'Tu {nome} está conectada y lista para atender. ¡Cuando una clienta envíe un mensaje, aparecerá aquí automáticamente!',
    'Sua {nome} está configurada e aguardando a conexão do WhatsApp. Conecte para começar a atender!': 'Tu {nome} está configurada y esperando la conexión de WhatsApp. ¡Conéctalo para empezar a atender!',
    'Conectar WhatsApp': 'Conectar WhatsApp',
    'Configurar Clínica': 'Configurar clínica',
    'Personalizar IA': 'Personalizar IA',

    // Dashboard — alertas
    '{n} clientes sumiram': '{n} clientas han desaparecido',
    'Sem contato há mais de 30 dias • Clique para reengajar': 'Sin contacto desde hace más de 30 días • Haz clic para recuperarlas',
    '{n} avaliações • Ver pesquisa de satisfação': '{n} valoraciones • Ver encuesta de satisfacción',

    // Dashboard — resultados do mês
    'O que a {nome} fez por você este mês': 'Lo que {nome} ha hecho por ti este mes',
    'Resultados em tempo real': 'Resultados en tiempo real',
    'Tempo economizado': 'Tiempo ahorrado',
    'Faturamento estimado': 'Facturación estimada',
    'Contatos captados': 'Contactos captados',
    'Agendamentos no mês': 'Citas del mes',
    'Créditos usados': 'Créditos usados',

    // Dashboard — números
    'Mensagens': 'Mensajes',
    'Leads': 'Leads',
    'Agendamentos': 'Citas',
    'Créditos': 'Créditos',
    'hoje': 'hoy',
    'total': 'total',
    'próximos': 'próximas',
    'restantes': 'restantes',

    // Dashboard — próximos agendamentos
    'Próximos Agendamentos': 'Próximas citas',
    'Ver agenda': 'Ver agenda',
    'Nenhum agendamento próximo': 'No hay citas próximas',
    'Sua IARA agenda automaticamente': 'Tu IARA reserva las citas automáticamente',
    'Hoje': 'Hoy',
    'pendente': 'pendiente',
    'confirmado': 'confirmada',
    'agendado': 'reservada',
    'realizado': 'realizada',
    'concluido': 'completada',

    // Dashboard — conversas
    'Conversas': 'Conversaciones',
    'Ver todas': 'Ver todas',
    'Nenhuma conversa ainda': 'Aún no hay conversaciones',
    'Aparecerá aqui quando sua IARA começar a atender': 'Aparecerán aquí cuando tu IARA empiece a atender',
    'agora': 'ahora',

    // Dashboard — status da IARA
    '{nome} está ativa': '{nome} está activa',
    'Respondendo automaticamente • Plano {n}': 'Respondiendo automáticamente • Plan {n}',
    'Online': 'En línea',
    'Msgs hoje': 'Mensajes hoy',

    // Primeiros passos (OnboardingChecklist)
    'Verificando configurações...': 'Comprobando los ajustes...',
    'Primeiros passos — {done}/{total} concluídos': 'Primeros pasos — {done}/{total} completados',
    'Etapa 1 — Cadastre seus dados': 'Paso 1 — Registra tus datos',
    'Clínica, procedimentos e horários': 'Clínica, tratamientos y horarios',
    'Ir para Configurações': 'Ir a Ajustes',
    'Etapa 2 — Configure a sua Secretária': 'Paso 2 — Configura tu secretaria',
    'Humor, tom de voz e personalidade': 'Humor, tono de voz y personalidad',
    'Configurar IA': 'Configurar IA',
    'Etapa 3 — Conecte no Whats': 'Paso 3 — Conecta WhatsApp',
    'WhatsApp e Instagram para ela atender': 'WhatsApp e Instagram para que ella atienda',
    'Conectar agora': 'Conectar ahora',
    'Etapa 4 — Conecte seus Contatos': 'Paso 4 — Conecta tus contactos',
    'Importe do Google ou cadastre manualmente': 'Impórtalos de Google o regístralos a mano',
    'Importar contatos': 'Importar contactos',

    // Pausar / Modo Férias (PausarIARA)
    'Modo Férias': 'Modo vacaciones',
    'Férias': 'Vacaciones',
    'Férias até {data}': 'Vacaciones hasta el {data}',
    'Retomar {nome}': 'Reanudar {nome}',
    'Pausar {nome}': 'Pausar {nome}',
    'A {nome} fica pausada até a data de retorno e reativa automaticamente!': '¡{nome} se queda en pausa hasta la fecha de vuelta y se reactiva sola!',
    'Data de retorno': 'Fecha de vuelta',
    'Mensagem automática (opcional)': 'Mensaje automático (opcional)',
    'Olá! Estou de férias e retorno em breve.': '¡Hola! Estoy de vacaciones y vuelvo pronto.',
    'Enviada automaticamente para quem mandar mensagem durante as férias': 'Se envía automáticamente a quien te escriba durante las vacaciones',
    'Ativando...': 'Activando...',
    'Ativar Modo Férias': 'Activar modo vacaciones',
    'Cancelar Férias e Retomar Agora': 'Cancelar vacaciones y reanudar ahora',
    'Não consegui mudar agora. Tente de novo.': 'No he podido cambiarlo ahora. Inténtalo de nuevo.',
    'Não consegui mudar agora (a internet caiu?). Tente de novo.': 'No he podido cambiarlo ahora (¿se ha caído internet?). Inténtalo de nuevo.',
    'Não consegui ativar as férias agora. Tente de novo.': 'No he podido activar las vacaciones ahora. Inténtalo de nuevo.',
    'Não consegui ativar as férias agora (a internet caiu?). Tente de novo.': 'No he podido activar las vacaciones ahora (¿se ha caído internet?). Inténtalo de nuevo.',
    // Erros que /api/iara/pausar devolve e a tela mostra com t(erro)
    'A IARA já está ativa': 'IARA ya está activa',
    'Sua conta está desligada. Fale com o suporte para reativar.': 'Tu cuenta está desactivada. Habla con soporte para reactivarla.',
    'Ação inválida': 'Acción no válida',
    'Não autorizado': 'No autorizado',
    'Erro interno': 'Error interno',

    // Aviso de créditos (UpsellBanner)
    'Você já usou {n}% dos créditos!': '¡Ya has usado el {n}% de los créditos!',
    'Libere até 5x mais créditos com o plano {plano}': 'Consigue hasta 5 veces más créditos con el plan {plano}',
    'próximo plano': 'siguiente',
    'Upgrade': 'Mejorar plan',
}

export const en: Dicionario = {
    // Dashboard — cabeçalho
    'Bom dia': 'Good morning',
    'Boa tarde': 'Good afternoon',
    'Boa noite': 'Good evening',
    'Dra.': 'Dr.',
    'Buscando dados da sua clínica...': "Loading your clinic's data...",
    'Aqui está o resumo da sua assistente': "Here's the overview from your assistant",

    // Dashboard — WhatsApp
    'WhatsApp desconectado': 'WhatsApp disconnected',
    'Sua IARA não está recebendo mensagens. Reconecte para continuar atendendo.': "Your IARA isn't receiving messages. Reconnect to keep answering clients.",
    'Reconectar': 'Reconnect',
    'WhatsApp conectado e ativo': 'WhatsApp connected and active',

    // Dashboard — clínica nova
    'Tudo pronto! Aguardando a primeira cliente.': 'All set! Waiting for your first client.',
    'Tudo pronto! Agora é só conectar o WhatsApp.': 'All set! Now just connect WhatsApp.',
    'Sua {nome} está conectada e pronta para atender. Quando uma cliente mandar uma mensagem, ela vai aparecer aqui automaticamente!': 'Your {nome} is connected and ready to help. When a client sends a message, it will show up here automatically!',
    'Sua {nome} está configurada e aguardando a conexão do WhatsApp. Conecte para começar a atender!': 'Your {nome} is set up and waiting for WhatsApp to be connected. Connect it to start answering clients!',
    'Conectar WhatsApp': 'Connect WhatsApp',
    'Configurar Clínica': 'Set up clinic',
    'Personalizar IA': 'Customize AI',

    // Dashboard — alertas
    '{n} clientes sumiram': '{n} clients have gone quiet',
    'Sem contato há mais de 30 dias • Clique para reengajar': 'No contact in over 30 days • Click to re-engage',
    '{n} avaliações • Ver pesquisa de satisfação': '{n} ratings • View satisfaction survey',

    // Dashboard — resultados do mês
    'O que a {nome} fez por você este mês': 'What {nome} did for you this month',
    'Resultados em tempo real': 'Real-time results',
    'Tempo economizado': 'Time saved',
    'Faturamento estimado': 'Estimated revenue',
    'Contatos captados': 'New contacts',
    'Agendamentos no mês': 'Appointments this month',
    'Créditos usados': 'Credits used',

    // Dashboard — números
    'Mensagens': 'Messages',
    'Leads': 'Leads',
    'Agendamentos': 'Appointments',
    'Créditos': 'Credits',
    'hoje': 'today',
    'total': 'total',
    'próximos': 'upcoming',
    'restantes': 'remaining',

    // Dashboard — próximos agendamentos
    'Próximos Agendamentos': 'Upcoming appointments',
    'Ver agenda': 'View schedule',
    'Nenhum agendamento próximo': 'No upcoming appointments',
    'Sua IARA agenda automaticamente': 'Your IARA books appointments automatically',
    'Hoje': 'Today',
    'pendente': 'pending',
    'confirmado': 'confirmed',
    'agendado': 'booked',
    'realizado': 'done',
    'concluido': 'completed',

    // Dashboard — conversas
    'Conversas': 'Conversations',
    'Ver todas': 'View all',
    'Nenhuma conversa ainda': 'No conversations yet',
    'Aparecerá aqui quando sua IARA começar a atender': "They'll show up here once your IARA starts answering",
    'agora': 'now',

    // Dashboard — status da IARA
    '{nome} está ativa': '{nome} is active',
    'Respondendo automaticamente • Plano {n}': 'Replying automatically • Plan {n}',
    'Online': 'Online',
    'Msgs hoje': 'Msgs today',

    // Primeiros passos (OnboardingChecklist)
    'Verificando configurações...': 'Checking settings...',
    'Primeiros passos — {done}/{total} concluídos': 'Getting started — {done}/{total} completed',
    'Etapa 1 — Cadastre seus dados': 'Step 1 — Add your details',
    'Clínica, procedimentos e horários': 'Clinic, treatments and hours',
    'Ir para Configurações': 'Go to Settings',
    'Etapa 2 — Configure a sua Secretária': 'Step 2 — Set up your assistant',
    'Humor, tom de voz e personalidade': 'Mood, tone of voice and personality',
    'Configurar IA': 'Set up AI',
    'Etapa 3 — Conecte no Whats': 'Step 3 — Connect WhatsApp',
    'WhatsApp e Instagram para ela atender': 'WhatsApp and Instagram so she can reply',
    'Conectar agora': 'Connect now',
    'Etapa 4 — Conecte seus Contatos': 'Step 4 — Connect your contacts',
    'Importe do Google ou cadastre manualmente': 'Import from Google or add them manually',
    'Importar contatos': 'Import contacts',

    // Pausar / Modo Férias (PausarIARA)
    'Modo Férias': 'Vacation mode',
    'Férias': 'Vacation',
    'Férias até {data}': 'Vacation until {data}',
    'Retomar {nome}': 'Resume {nome}',
    'Pausar {nome}': 'Pause {nome}',
    'A {nome} fica pausada até a data de retorno e reativa automaticamente!': '{nome} stays paused until the return date and turns back on automatically!',
    'Data de retorno': 'Return date',
    'Mensagem automática (opcional)': 'Automatic message (optional)',
    'Olá! Estou de férias e retorno em breve.': "Hi! I'm on vacation and will be back soon.",
    'Enviada automaticamente para quem mandar mensagem durante as férias': 'Sent automatically to anyone who messages you during your vacation',
    'Ativando...': 'Turning on...',
    'Ativar Modo Férias': 'Turn on vacation mode',
    'Cancelar Férias e Retomar Agora': 'Cancel vacation and resume now',
    'Não consegui mudar agora. Tente de novo.': "Couldn't change it right now. Please try again.",
    'Não consegui mudar agora (a internet caiu?). Tente de novo.': "Couldn't change it right now (is the internet down?). Please try again.",
    'Não consegui ativar as férias agora. Tente de novo.': "Couldn't turn on vacation mode right now. Please try again.",
    'Não consegui ativar as férias agora (a internet caiu?). Tente de novo.': "Couldn't turn on vacation mode right now (is the internet down?). Please try again.",
    // Erros que /api/iara/pausar devolve e a tela mostra com t(erro)
    'A IARA já está ativa': 'IARA is already active',
    'Sua conta está desligada. Fale com o suporte para reativar.': 'Your account is turned off. Contact support to reactivate it.',
    'Ação inválida': 'Invalid action',
    'Não autorizado': 'Unauthorized',
    'Erro interno': 'Internal error',

    // Aviso de créditos (UpsellBanner)
    'Você já usou {n}% dos créditos!': "You've already used {n}% of your credits!",
    'Libere até 5x mais créditos com o plano {plano}': 'Unlock up to 5x more credits with the {plano} plan',
    'próximo plano': 'next',
    'Upgrade': 'Upgrade',
}
