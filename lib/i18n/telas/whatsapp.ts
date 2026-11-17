// Traduções desta tela. Chave = o texto em português, exatamente como está no código.
// app/(dashboard)/instancias/page.tsx (menu "WhatsApp": conexões, QR Code) e
// components/UpgradeOverlay.tsx (aviso de upgrade usado em várias telas).
import type { Dicionario } from '@/components/IdiomaProvider'

export const es: Dicionario = {
    // app/(dashboard)/instancias/page.tsx — cabeçalho e avisos
    'Conexões': 'Conexiones',
    'Conecte seus canais para a IARA começar a atender': 'Conecta tus canales para que IARA empiece a atender',
    'Verificando suas conexões...': 'Comprobando tus conexiones...',
    'Erro ao conectar': 'Error al conectar',
    'Erro ao criar conexão': 'Error al crear la conexión',
    'Erro ao gerar QR Code. Tente novamente.': 'Error al generar el QR Code. Inténtalo de nuevo.',
    'Erro de rede: {erro}': 'Error de red: {erro}',
    'tente novamente': 'inténtalo de nuevo',
    'Erro ao desconectar': 'Error al desconectar',
    'Deseja REMOVER este canal completamente? A IARA vai parar de atender e a instância será deletada.': '¿Quieres ELIMINAR este canal por completo? IARA dejará de atender y la instancia se borrará.',
    'Deseja DESCONECTAR o WhatsApp? Você precisará escanear o QR Code novamente.': '¿Quieres DESCONECTAR WhatsApp? Tendrás que escanear el QR Code de nuevo.',

    // Estado da conexão
    'Conectado': 'Conectado',
    'Aguardando QR Code': 'Esperando QR Code',
    'Desconectado': 'Desconectado',

    // WhatsApp
    '{n} números conectados': '{n} números conectados',
    '{n} número conectado': '{n} número conectado',
    'Nenhum número conectado': 'Ningún número conectado',
    'Conecte seu número para a IARA atender': 'Conecta tu número para que IARA atienda',
    'Conectando...': 'Conectando...',
    'Conectar': 'Conectar',
    'Escanear QR': 'Escanear QR',
    'Desconectar WhatsApp': 'Desconectar WhatsApp',
    'Desconectar': 'Desconectar',
    'Desconectar canal': 'Desconectar canal',
    'Adicionar outro número': 'Añadir otro número',

    // WhatsApp Oficial
    'WhatsApp Oficial': 'WhatsApp oficial',
    'Em breve': 'Próximamente',
    'Conexão direta com a Meta, com selo de empresa verificada': 'Conexión directa con Meta, con insignia de empresa verificada',
    'Sem risco de bloqueio do número': 'Sin riesgo de bloqueo del número',
    'Selo verde de empresa verificada no seu perfil': 'Insignia verde de empresa verificada en tu perfil',
    'Envio de campanhas liberado pela própria Meta': 'Envío de campañas autorizado por la propia Meta',
    'Estamos em processo de aprovação junto à Meta. Você não precisa fazer nada agora — sua conexão atual continua funcionando normalmente, e avisaremos assim que puder migrar.': 'Estamos en proceso de aprobación con Meta. No tienes que hacer nada ahora: tu conexión actual sigue funcionando con normalidad y te avisaremos en cuanto puedas migrar.',

    // Instagram
    'Instagram DM com IA': 'Instagram DM con IA',
    'A IARA responde DMs do Instagram automaticamente, 24/7. Faça upgrade para o plano Pro!': 'IARA responde los DMs de Instagram automáticamente, 24/7. ¡Pásate al plan Pro!',
    'Respostas automáticas no Instagram DM': 'Respuestas automáticas en los DMs de Instagram',
    'Atendimento 24/7 também pelo Instagram': 'Atención 24/7 también por Instagram',
    'A IARA agenda consultas pelo DM': 'IARA reserva citas por DM',
    'Até 3 profissionais na equipe': 'Hasta 3 profesionales en el equipo',
    '12 vozes ultra realistas': '12 voces ultrarrealistas',
    'A IARA vai responder as DMs automaticamente': 'IARA responderá los DMs automáticamente',
    '{n} contas conectadas': '{n} cuentas conectadas',
    '{n} conta conectada': '{n} cuenta conectada',
    'Conecte para a IARA responder DMs': 'Conecta para que IARA responda DMs',
    'Erro ao iniciar conexão com Instagram': 'Error al iniciar la conexión con Instagram',
    'Erro ao conectar Instagram': 'Error al conectar Instagram',

    // Google Agenda
    'Google Agenda': 'Google Calendar',
    'Conecte para a IARA agendar consultas na sua agenda': 'Conecta para que IARA reserve citas en tu agenda',
    'Verificando a conexão...': 'Comprobando la conexión...',
    'Funcionando — IARA agenda e verifica horários automaticamente': 'Funcionando: IARA reserva citas y comprueba horarios automáticamente',
    'A agenda não está sincronizando.': 'La agenda no se está sincronizando.',
    'Reconectar': 'Reconectar',
    'Desconectar o Google Agenda? A IARA para de criar e consultar eventos nele. Os agendamentos já feitos continuam no seu Google.': '¿Desconectar Google Calendar? IARA dejará de crear y consultar eventos en él. Las citas ya reservadas se quedan en tu Google.',
    'Não consegui desconectar. Tente de novo.': 'No se ha podido desconectar. Inténtalo de nuevo.',

    // Apple Calendar
    'Conectada — IARA agenda no Apple Calendar automaticamente': 'Conectado: IARA reserva citas en Apple Calendar automáticamente',
    'Alternativa ao Google Agenda para quem usa iPhone/Mac': 'Alternativa a Google Calendar si usas iPhone/Mac',
    'Desconectar Apple Calendar?': '¿Desconectar Apple Calendar?',
    'Conectar Apple Calendar': 'Conectar Apple Calendar',
    'Como gerar a Senha de App:': 'Cómo generar la contraseña de app:',
    'Acesse': 'Entra en',
    'Faça login com seu Apple ID': 'Inicia sesión con tu Apple ID',
    'Vá em': 'Ve a',
    'Segurança': 'Seguridad',
    'Senhas de App': 'Contraseñas específicas de app',
    'Clique em': 'Haz clic en',
    'Gerar senha de app': 'Generar contraseña específica de app',
    'Dê o nome': 'Ponle el nombre',
    'e clique em': 'y haz clic en',
    'Criar': 'Crear',
    'Copie a senha gerada e cole abaixo': 'Copia la contraseña generada y pégala abajo',
    'Apple Calendar conectado!': '¡Apple Calendar conectado!',
    'A IARA agora vai sincronizar agendamentos com o seu Apple Calendar.': 'A partir de ahora, IARA sincronizará las citas con tu Apple Calendar.',
    'Apple ID (email)': 'Apple ID (correo electrónico)',
    'seu@icloud.com': 'tu@icloud.com',
    'Senha de App (gerada acima)': 'Contraseña de app (generada arriba)',
    'Preencha todos os campos.': 'Rellena todos los campos.',
    'Erro ao conectar.': 'Error al conectar.',
    'Erro de conexão. Tente novamente.': 'Error de conexión. Inténtalo de nuevo.',
    'Verificando...': 'Comprobando...',

    // Google Contatos
    'Google Contatos': 'Google Contactos',
    'Importe contatos do Google para o CRM': 'Importa contactos de Google al CRM',
    'Importar': 'Importar',

    // Dica
    'Dica': 'Consejo',
    'Para conectar o WhatsApp, basta escanear o QR Code com seu celular — como no WhatsApp Web. A IARA vai começar a atender automaticamente assim que conectar!': 'Para conectar WhatsApp, solo tienes que escanear el QR Code con tu móvil, como en WhatsApp Web. ¡IARA empezará a atender automáticamente en cuanto se conecte!',

    // Janela do QR Code
    'Escaneie o QR Code': 'Escanea el QR Code',
    'Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar': 'Abre WhatsApp en el móvil → Menú (⋮) → Dispositivos vinculados → Vincular un dispositivo',
    'Gerando QR Code...': 'Generando el QR Code...',
    'QR Code WhatsApp': 'QR Code de WhatsApp',
    'Código de pareamento:': 'Código de vinculación:',
    'Aguardando leitura do QR Code... ({s}s)': 'Esperando a que se escanee el QR Code... ({s}s)',
    'QR Code pode ter expirado.': 'Puede que el QR Code haya caducado.',
    'Gerar novo QR': 'Generar nuevo QR',

    // Janela de confirmação
    'Confirmar': 'Confirmar',
    'Sim, remover': 'Sí, eliminar',

    // components/UpgradeOverlay.tsx
    'Essencial': 'Esencial',
    'Disponível no plano {plano}. Faça upgrade para desbloquear!': 'Disponible en el plan {plano}. ¡Mejora tu plan para desbloquearlo!',
    'O que você ganha no {plano}': 'Lo que consigues con {plano}',
    'Seu plano:': 'Tu plan:',
    '{preco}/mês': '{preco}/mes',
    'Fazer Upgrade para {plano}': 'Pasar a {plano}',
    '12 vozes ultra realistas (ElevenLabs)': '12 voces ultrarrealistas (ElevenLabs)',
    'Atendimento em 4 idiomas': 'Atención en 4 idiomas',
    '3.000 mensagens/mês': '3.000 mensajes/mes',
    'Clone da sua própria voz': 'Clon de tu propia voz',
    'Profissionais ilimitados': 'Profesionales ilimitados',
    'Multi-clínica': 'Multiclínica',
    '2 WhatsApps conectados': '2 WhatsApps conectados',
    '5.000 mensagens/mês': '5.000 mensajes/mes',
}

export const en: Dicionario = {
    // app/(dashboard)/instancias/page.tsx — cabeçalho e avisos
    'Conexões': 'Connections',
    'Conecte seus canais para a IARA começar a atender': 'Connect your channels so IARA can start answering',
    'Verificando suas conexões...': 'Checking your connections...',
    'Erro ao conectar': 'Error connecting',
    'Erro ao criar conexão': 'Error creating the connection',
    'Erro ao gerar QR Code. Tente novamente.': 'Error generating the QR Code. Please try again.',
    'Erro de rede: {erro}': 'Network error: {erro}',
    'tente novamente': 'please try again',
    'Erro ao desconectar': 'Error disconnecting',
    'Deseja REMOVER este canal completamente? A IARA vai parar de atender e a instância será deletada.': 'Do you want to REMOVE this channel completely? IARA will stop answering and the instance will be deleted.',
    'Deseja DESCONECTAR o WhatsApp? Você precisará escanear o QR Code novamente.': 'Do you want to DISCONNECT WhatsApp? You will need to scan the QR Code again.',

    // Estado da conexão
    'Conectado': 'Connected',
    'Aguardando QR Code': 'Waiting for QR Code',
    'Desconectado': 'Disconnected',

    // WhatsApp
    '{n} números conectados': '{n} numbers connected',
    '{n} número conectado': '{n} number connected',
    'Nenhum número conectado': 'No number connected',
    'Conecte seu número para a IARA atender': 'Connect your number so IARA can answer',
    'Conectando...': 'Connecting...',
    'Conectar': 'Connect',
    'Escanear QR': 'Scan QR',
    'Desconectar WhatsApp': 'Disconnect WhatsApp',
    'Desconectar': 'Disconnect',
    'Desconectar canal': 'Disconnect channel',
    'Adicionar outro número': 'Add another number',

    // WhatsApp Oficial
    'WhatsApp Oficial': 'Official WhatsApp',
    'Em breve': 'Coming soon',
    'Conexão direta com a Meta, com selo de empresa verificada': 'Direct connection with Meta, with a verified business badge',
    'Sem risco de bloqueio do número': 'No risk of your number being blocked',
    'Selo verde de empresa verificada no seu perfil': 'Green verified business badge on your profile',
    'Envio de campanhas liberado pela própria Meta': 'Campaign sending approved by Meta itself',
    'Estamos em processo de aprovação junto à Meta. Você não precisa fazer nada agora — sua conexão atual continua funcionando normalmente, e avisaremos assim que puder migrar.': "We're going through Meta's approval process. You don't need to do anything right now — your current connection keeps working normally, and we'll let you know as soon as you can migrate.",

    // Instagram
    'Instagram DM com IA': 'Instagram DMs with AI',
    'A IARA responde DMs do Instagram automaticamente, 24/7. Faça upgrade para o plano Pro!': 'IARA answers Instagram DMs automatically, 24/7. Upgrade to the Pro plan!',
    'Respostas automáticas no Instagram DM': 'Automatic replies in Instagram DMs',
    'Atendimento 24/7 também pelo Instagram': '24/7 service on Instagram too',
    'A IARA agenda consultas pelo DM': 'IARA books appointments via DM',
    'Até 3 profissionais na equipe': 'Up to 3 professionals on the team',
    '12 vozes ultra realistas': '12 ultra-realistic voices',
    'A IARA vai responder as DMs automaticamente': 'IARA will answer DMs automatically',
    '{n} contas conectadas': '{n} accounts connected',
    '{n} conta conectada': '{n} account connected',
    'Conecte para a IARA responder DMs': 'Connect so IARA can answer DMs',
    'Erro ao iniciar conexão com Instagram': 'Error starting the Instagram connection',
    'Erro ao conectar Instagram': 'Error connecting Instagram',

    // Google Agenda
    'Google Agenda': 'Google Calendar',
    'Conecte para a IARA agendar consultas na sua agenda': 'Connect so IARA can book appointments in your calendar',
    'Verificando a conexão...': 'Checking the connection...',
    'Funcionando — IARA agenda e verifica horários automaticamente': 'Working — IARA books appointments and checks availability automatically',
    'A agenda não está sincronizando.': 'The calendar is not syncing.',
    'Reconectar': 'Reconnect',
    'Desconectar o Google Agenda? A IARA para de criar e consultar eventos nele. Os agendamentos já feitos continuam no seu Google.': 'Disconnect Google Calendar? IARA will stop creating and checking events in it. Appointments already booked stay in your Google account.',
    'Não consegui desconectar. Tente de novo.': "Couldn't disconnect. Please try again.",

    // Apple Calendar
    'Conectada — IARA agenda no Apple Calendar automaticamente': 'Connected — IARA books appointments in Apple Calendar automatically',
    'Alternativa ao Google Agenda para quem usa iPhone/Mac': 'An alternative to Google Calendar for iPhone/Mac users',
    'Desconectar Apple Calendar?': 'Disconnect Apple Calendar?',
    'Conectar Apple Calendar': 'Connect Apple Calendar',
    'Como gerar a Senha de App:': 'How to generate the app password:',
    'Acesse': 'Go to',
    'Faça login com seu Apple ID': 'Sign in with your Apple ID',
    'Vá em': 'Go to',
    'Segurança': 'Security',
    'Senhas de App': 'App-Specific Passwords',
    'Clique em': 'Click',
    'Gerar senha de app': 'Generate an app-specific password',
    'Dê o nome': 'Name it',
    'e clique em': 'and click',
    'Criar': 'Create',
    'Copie a senha gerada e cole abaixo': 'Copy the generated password and paste it below',
    'Apple Calendar conectado!': 'Apple Calendar connected!',
    'A IARA agora vai sincronizar agendamentos com o seu Apple Calendar.': 'IARA will now sync appointments with your Apple Calendar.',
    'Apple ID (email)': 'Apple ID (email)',
    'seu@icloud.com': 'you@icloud.com',
    'Senha de App (gerada acima)': 'App password (generated above)',
    'Preencha todos os campos.': 'Please fill in all fields.',
    'Erro ao conectar.': 'Error connecting.',
    'Erro de conexão. Tente novamente.': 'Connection error. Please try again.',
    'Verificando...': 'Checking...',

    // Google Contatos
    'Google Contatos': 'Google Contacts',
    'Importe contatos do Google para o CRM': 'Import contacts from Google into the CRM',
    'Importar': 'Import',

    // Dica
    'Dica': 'Tip',
    'Para conectar o WhatsApp, basta escanear o QR Code com seu celular — como no WhatsApp Web. A IARA vai começar a atender automaticamente assim que conectar!': 'To connect WhatsApp, just scan the QR Code with your cell phone — like in WhatsApp Web. IARA will start answering automatically as soon as it connects!',

    // Janela do QR Code
    'Escaneie o QR Code': 'Scan the QR Code',
    'Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar': 'Open WhatsApp on your cell phone → Menu (⋮) → Linked devices → Link a device',
    'Gerando QR Code...': 'Generating QR Code...',
    'QR Code WhatsApp': 'WhatsApp QR Code',
    'Código de pareamento:': 'Pairing code:',
    'Aguardando leitura do QR Code... ({s}s)': 'Waiting for the QR Code to be scanned... ({s}s)',
    'QR Code pode ter expirado.': 'The QR Code may have expired.',
    'Gerar novo QR': 'Generate new QR',

    // Janela de confirmação
    'Confirmar': 'Confirm',
    'Sim, remover': 'Yes, remove',

    // components/UpgradeOverlay.tsx
    'Essencial': 'Essential',
    'Disponível no plano {plano}. Faça upgrade para desbloquear!': 'Available on the {plano} plan. Upgrade to unlock it!',
    'O que você ganha no {plano}': 'What you get with {plano}',
    'Seu plano:': 'Your plan:',
    '{preco}/mês': '{preco}/mo',
    'Fazer Upgrade para {plano}': 'Upgrade to {plano}',
    '12 vozes ultra realistas (ElevenLabs)': '12 ultra-realistic voices (ElevenLabs)',
    'Atendimento em 4 idiomas': 'Service in 4 languages',
    '3.000 mensagens/mês': '3,000 messages/month',
    'Clone da sua própria voz': 'A clone of your own voice',
    'Profissionais ilimitados': 'Unlimited professionals',
    'Multi-clínica': 'Multi-clinic',
    '2 WhatsApps conectados': '2 connected WhatsApps',
    '5.000 mensagens/mês': '5,000 messages/month',
}
