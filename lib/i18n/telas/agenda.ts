// Traduções desta tela. Chave = o texto em português, exatamente como está no código.
// app/(dashboard)/agenda/page.tsx ('Agenda' e 'Profissional' já estão em menu.ts;
// 'Salvando...' em comum.ts.)
//
// Os exemplos de horário ("08:00 às 18:00") usam "a" e "-" de propósito: é o
// que lib/engine/horarios.ts e app/api/agendamento-publico/horarios entendem.
// "to" ou "hasta" quebram a leitura do horário.
import type { Dicionario } from '@/components/IdiomaProvider'

export const es: Dicionario = {
    '{n} agendamento': '{n} cita',
    '{n} agendamentos': '{n} citas',
    'Novo': 'Nuevo',
    'Todos': 'Todos',
    'Mensal': 'Mes',
    'Semanal': 'Semana',
    'Diário': 'Día',
    '+{n} mais': '+{n} más',
    'Nenhum agendamento neste dia': 'No hay citas este día',
    'Nenhum agendamento para hoje': 'No hay citas para hoy',
    'Agendamentos de Hoje': 'Citas de hoy',
    'Agendamentos — {data}': 'Citas — {data}',

    // Status (STATUS_LABELS)
    'Pendente': 'Pendiente',
    'Confirmado': 'Confirmada',
    'Realizado': 'Realizada',
    'Cancelado': 'Cancelada',
    'Reagendado': 'Reprogramada',
    'Não compareceu': 'No se presentó',

    'Vinculado • Sync ativada': 'Vinculado • Sincronización activada',
    'Não conectado — Agenda funciona independente': 'No conectado — La agenda funciona por su cuenta',
    'Conectar': 'Conectar',
    'Gerenciar': 'Gestionar',
    'Configurações da Agenda': 'Ajustes de la agenda',
    'Horário de atendimento (Seg-Sex)': 'Horario de atención (lun-vie)',
    'Ex: 08:00 às 18:00': 'Ej.: 08:00 a 18:00',
    'Horário de almoço (Seg-Sex)': 'Horario de comida (lun-vie)',
    'Ex: 12:00 às 13:00': 'Ej.: 12:00 a 13:00',
    'Intervalo entre atendimentos (min)': 'Intervalo entre citas (min)',
    'Atende sábado': 'Abre los sábados',
    'Horário do sábado': 'Horario del sábado',
    'Atende domingo': 'Abre los domingos',
    'Horário do domingo': 'Horario del domingo',
    'Atende feriados': 'Abre en festivos',
    'Horário dos feriados': 'Horario de festivos',
    'Salvar configurações': 'Guardar ajustes',

    // Card do agendamento
    'Consulta': 'Consulta',

    // Modal "Novo Agendamento"
    'Novo Agendamento': 'Nueva cita',
    'Nome da paciente': 'Nombre de la paciente',
    'Ex: Maria Silva': 'Ej.: María García',
    'Ex: 41 99520-7443': 'Ej.: 41 99520-7443',
    'Procedimento': 'Tratamiento',
    'Selecione...': 'Selecciona...',
    'Ex: Botox': 'Ej.: Bótox',
    'Data': 'Fecha',
    'Horário': 'Hora',
    'Duração (min)': 'Duración (min)',
    'Observação': 'Observaciones',
    'Notas internas...': 'Notas internas...',
    'Preencha nome, telefone e procedimento': 'Rellena nombre, teléfono y tratamiento',
    'Erro ao criar': 'Error al crear',
    'Erro de conexão': 'Error de conexión',
    'Criando...': 'Creando...',
    'Criar Agendamento': 'Crear cita',
}

export const en: Dicionario = {
    '{n} agendamento': '{n} appointment',
    '{n} agendamentos': '{n} appointments',
    'Novo': 'New',
    'Todos': 'All',
    'Mensal': 'Month',
    'Semanal': 'Week',
    'Diário': 'Day',
    '+{n} mais': '+{n} more',
    'Nenhum agendamento neste dia': 'No appointments on this day',
    'Nenhum agendamento para hoje': 'No appointments today',
    'Agendamentos de Hoje': "Today's appointments",
    'Agendamentos — {data}': 'Appointments — {data}',

    // Status (STATUS_LABELS)
    'Pendente': 'Pending',
    'Confirmado': 'Confirmed',
    'Realizado': 'Completed',
    'Cancelado': 'Canceled',
    'Reagendado': 'Rescheduled',
    'Não compareceu': 'No-show',

    'Vinculado • Sync ativada': 'Linked • Sync on',
    'Não conectado — Agenda funciona independente': 'Not connected — The schedule works on its own',
    'Conectar': 'Connect',
    'Gerenciar': 'Manage',
    'Configurações da Agenda': 'Schedule settings',
    'Horário de atendimento (Seg-Sex)': 'Business hours (Mon-Fri)',
    'Ex: 08:00 às 18:00': 'e.g. 08:00 - 18:00',
    'Horário de almoço (Seg-Sex)': 'Lunch break (Mon-Fri)',
    'Ex: 12:00 às 13:00': 'e.g. 12:00 - 13:00',
    'Intervalo entre atendimentos (min)': 'Break between appointments (min)',
    'Atende sábado': 'Open on Saturdays',
    'Horário do sábado': 'Saturday hours',
    'Atende domingo': 'Open on Sundays',
    'Horário do domingo': 'Sunday hours',
    'Atende feriados': 'Open on holidays',
    'Horário dos feriados': 'Holiday hours',
    'Salvar configurações': 'Save settings',

    // Card do agendamento
    'Consulta': 'Consultation',

    // Modal "Novo Agendamento"
    'Novo Agendamento': 'New appointment',
    'Nome da paciente': 'Patient name',
    'Ex: Maria Silva': 'e.g. Jane Smith',
    'Ex: 41 99520-7443': 'e.g. 41 99520-7443',
    'Procedimento': 'Treatment',
    'Selecione...': 'Select...',
    'Ex: Botox': 'e.g. Botox',
    'Data': 'Date',
    'Horário': 'Time',
    'Duração (min)': 'Duration (min)',
    'Observação': 'Notes',
    'Notas internas...': 'Internal notes...',
    'Preencha nome, telefone e procedimento': 'Fill in name, phone and treatment',
    'Erro ao criar': 'Error creating',
    'Erro de conexão': 'Connection error',
    'Criando...': 'Creating...',
    'Criar Agendamento': 'Create appointment',
}
