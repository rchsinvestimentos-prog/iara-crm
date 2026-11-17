// Traduções desta tela. Chave = o texto em português, exatamente como está no código.
import type { Dicionario } from '@/components/IdiomaProvider'

export const es: Dicionario = {
    // Campo de tags
    'Digite uma tag e pressione Enter...': 'Escribe una etiqueta y pulsa Intro...',
    'Criar tag': 'Crear etiqueta',
    'Pressione Enter ou vírgula para adicionar': 'Pulsa Intro o coma para añadir',

    // Cabeçalho e filtros
    '{n} de {total} contatos': '{n} de {total} contactos',
    'filtrando por': 'filtrando por',
    'Buscar...': 'Buscar...',
    'Importar': 'Importar',
    'Adicionar': 'Añadir',
    'Coluna': 'Columna',
    'Filtrar:': 'Filtrar:',
    'Limpar filtro': 'Quitar filtro',
    '{n}% conversão': '{n}% conversión',

    // Colunas padrão (DEFAULT_COLUMNS em app/api/crm-colunas/route.ts)
    'Novo': 'Nuevo',
    'Importado': 'Importado',
    'Em conversa': 'En conversación',
    'Interessada': 'Interesada',
    'Agendada': 'Con cita',
    'Atendida': 'Atendida',
    'Retorno': 'Seguimiento',
    'Stand By': 'En espera',
    'Fidelizada': 'Fidelizada',

    // Cartões
    'Programar mensagem': 'Programar mensaje',
    'Clique para editar a mensagem': 'Haz clic para editar el mensaje',
    'Atrasado': 'Atrasado',
    'Cancelar mensagem': 'Cancelar mensaje',
    'Filtrar por "{tag}"': 'Filtrar por "{tag}"',
    'Nenhum contato': 'Sin contactos',
    'Sem colunas ainda': 'Aún no hay columnas',
    'Clique em "+ Coluna" para começar': 'Haz clic en "+ Columna" para empezar',

    // Confirmações
    'Excluir este contato?': '¿Eliminar este contacto?',
    'Cancelar a mensagem agendada?': '¿Cancelar el mensaje programado?',
    'Excluir esta coluna?': '¿Eliminar esta columna?',

    // Formulário de contato
    'Novo Contato': 'Nuevo contacto',
    'Nome *': 'Nombre *',
    'Telefone *': 'Teléfono *',
    'Nome': 'Nombre',
    'Telefone': 'Teléfono',
    'Email': 'Correo electrónico',
    'Notas': 'Notas',
    'Tags': 'Etiquetas',
    'Salvar Contato': 'Guardar contacto',
    'Salvar Alterações': 'Guardar cambios',

    // Mensagem programada
    'Programar Mensagem': 'Programar mensaje',
    'Data e Hora de Envio': 'Fecha y hora de envío',
    'Será enviada {data}': 'Se enviará el {data}',
    'Templates Rápidos': 'Plantillas rápidas',
    'Retorno padrão': 'Seguimiento estándar',
    'Lembrete de agendamento': 'Recordatorio de cita',
    'Pós-procedimento': 'Post-tratamiento',
    'Oferta especial': 'Oferta especial',
    'Retomar conversa': 'Retomar conversación',
    'Mensagem': 'Mensaje',
    '{n} caracteres': '{n} caracteres',
    'Agendar Envio': 'Programar envío',
    'Cancelar mensagem existente': 'Cancelar el mensaje existente',

    // Importar
    'Importar Contatos': 'Importar contactos',
    'Cole uma lista com Nome e Telefone (separados por vírgula, tab ou ponto-e-vírgula). Um contato por linha.': 'Pega una lista con nombre y teléfono (separados por coma, tabulador o punto y coma). Un contacto por línea.',
    '{n} linhas detectadas': '{n} líneas detectadas',

    // Nova coluna
    'Nova Coluna': 'Nueva columna',
    'Nome da Coluna': 'Nombre de la columna',
    'Ex: Pós-operatório': 'Ej.: Postoperatorio',
    'Cor': 'Color',
    'Criar Coluna': 'Crear columna',

    // Erros (da tela e da API de contatos)
    'Nome e Telefone são obrigatórios.': 'El nombre y el teléfono son obligatorios.',
    'Erro {status}': 'Error {status}',
    'Erro de conexão.': 'Error de conexión.',
    'Erro ao agendar': 'Error al programar',
    'Não autorizado': 'No autorizado',
    'Erro interno': 'Error interno',
    'Nome e telefone são obrigatórios': 'El nombre y el teléfono son obligatorios',
    'Contato não encontrado': 'Contacto no encontrado',
    'Data e mensagem são obrigatórios': 'La fecha y el mensaje son obligatorios',
    'Data inválida': 'Fecha no válida',
    'A data deve ser no futuro': 'La fecha debe ser futura',
}

export const en: Dicionario = {
    // Campo de tags
    'Digite uma tag e pressione Enter...': 'Type a tag and press Enter...',
    'Criar tag': 'Create tag',
    'Pressione Enter ou vírgula para adicionar': 'Press Enter or comma to add',

    // Cabeçalho e filtros
    '{n} de {total} contatos': '{n} of {total} contacts',
    'filtrando por': 'filtering by',
    'Buscar...': 'Search...',
    'Importar': 'Import',
    'Adicionar': 'Add',
    'Coluna': 'Column',
    'Filtrar:': 'Filter:',
    'Limpar filtro': 'Clear filter',
    '{n}% conversão': '{n}% conversion',

    // Colunas padrão (DEFAULT_COLUMNS em app/api/crm-colunas/route.ts)
    'Novo': 'New',
    'Importado': 'Imported',
    'Em conversa': 'In conversation',
    'Interessada': 'Interested',
    'Agendada': 'Booked',
    'Atendida': 'Treated',
    'Retorno': 'Follow-up',
    'Stand By': 'On hold',
    'Fidelizada': 'Loyal',

    // Cartões
    'Programar mensagem': 'Schedule message',
    'Clique para editar a mensagem': 'Click to edit the message',
    'Atrasado': 'Overdue',
    'Cancelar mensagem': 'Cancel message',
    'Filtrar por "{tag}"': 'Filter by "{tag}"',
    'Nenhum contato': 'No contacts',
    'Sem colunas ainda': 'No columns yet',
    'Clique em "+ Coluna" para começar': 'Click "+ Column" to get started',

    // Confirmações
    'Excluir este contato?': 'Delete this contact?',
    'Cancelar a mensagem agendada?': 'Cancel the scheduled message?',
    'Excluir esta coluna?': 'Delete this column?',

    // Formulário de contato
    'Novo Contato': 'New contact',
    'Nome *': 'Name *',
    'Telefone *': 'Phone *',
    'Nome': 'Name',
    'Telefone': 'Phone',
    'Email': 'Email',
    'Notas': 'Notes',
    'Tags': 'Tags',
    'Salvar Contato': 'Save contact',
    'Salvar Alterações': 'Save changes',

    // Mensagem programada
    'Programar Mensagem': 'Schedule message',
    'Data e Hora de Envio': 'Send date and time',
    'Será enviada {data}': 'Will be sent on {data}',
    'Templates Rápidos': 'Quick templates',
    'Retorno padrão': 'Standard follow-up',
    'Lembrete de agendamento': 'Appointment reminder',
    'Pós-procedimento': 'Post-treatment',
    'Oferta especial': 'Special offer',
    'Retomar conversa': 'Resume conversation',
    'Mensagem': 'Message',
    '{n} caracteres': '{n} characters',
    'Agendar Envio': 'Schedule send',
    'Cancelar mensagem existente': 'Cancel existing message',

    // Importar
    'Importar Contatos': 'Import contacts',
    'Cole uma lista com Nome e Telefone (separados por vírgula, tab ou ponto-e-vírgula). Um contato por linha.': 'Paste a list with name and phone (separated by comma, tab or semicolon). One contact per line.',
    '{n} linhas detectadas': '{n} lines detected',

    // Nova coluna
    'Nova Coluna': 'New column',
    'Nome da Coluna': 'Column name',
    'Ex: Pós-operatório': 'E.g. Post-op',
    'Cor': 'Color',
    'Criar Coluna': 'Create column',

    // Erros (da tela e da API de contatos)
    'Nome e Telefone são obrigatórios.': 'Name and phone are required.',
    'Erro {status}': 'Error {status}',
    'Erro de conexão.': 'Connection error.',
    'Erro ao agendar': 'Failed to schedule',
    'Não autorizado': 'Unauthorized',
    'Erro interno': 'Internal error',
    'Nome e telefone são obrigatórios': 'Name and phone are required',
    'Contato não encontrado': 'Contact not found',
    'Data e mensagem são obrigatórios': 'Date and message are required',
    'Data inválida': 'Invalid date',
    'A data deve ser no futuro': 'The date must be in the future',
}
