'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Idioma = 'pt-BR' | 'pt-PT' | 'en-US' | 'es'

interface Traducoes {
    // Sidebar
    dashboard: string
    conversas: string
    agendamentos: string
    habilidades: string
    instagram: string
    midia: string
    plano: string
    configuracoes: string
    sair: string
    // Dashboard
    bomDia: string
    boaTarde: string
    boaNoite: string
    resumo: string
    msgHoje: string
    conversasAtivas: string
    agendamentosSemana: string
    creditosRestantes: string
    // Geral
    carregando: string
    salvar: string
    cancelar: string
    voltar: string
    upgrade: string
    idioma: string
}

const TRADUCOES: Record<Idioma, Traducoes> = {
    'pt-BR': {
        dashboard: 'Dashboard', conversas: 'Conversas', agendamentos: 'Agendamentos',
        habilidades: 'Habilidades', instagram: 'Instagram', midia: 'Mídia',
        plano: 'Plano', configuracoes: 'Configurações', sair: 'Sair',
        bomDia: 'Bom dia', boaTarde: 'Boa tarde', boaNoite: 'Boa noite',
        resumo: 'Aqui está o resumo da sua',
        msgHoje: 'Mensagens hoje', conversasAtivas: 'Conversas ativas',
        agendamentosSemana: 'Agendamentos esta semana', creditosRestantes: 'Créditos restantes',
        carregando: 'Carregando...', salvar: 'Salvar', cancelar: 'Cancelar',
        voltar: 'Voltar', upgrade: 'Fazer Upgrade', idioma: 'Idioma',
    },
    'pt-PT': {
        dashboard: 'Painel', conversas: 'Conversas', agendamentos: 'Agendamentos',
        habilidades: 'Competências', instagram: 'Instagram', midia: 'Média',
        plano: 'Plano', configuracoes: 'Definições', sair: 'Sair',
        bomDia: 'Bom dia', boaTarde: 'Boa tarde', boaNoite: 'Boa noite',
        resumo: 'Aqui está o resumo da sua',
        msgHoje: 'Mensagens hoje', conversasAtivas: 'Conversas ativas',
        agendamentosSemana: 'Agendamentos esta semana', creditosRestantes: 'Créditos restantes',
        carregando: 'A carregar...', salvar: 'Guardar', cancelar: 'Cancelar',
        voltar: 'Voltar', upgrade: 'Atualizar Plano', idioma: 'Idioma',
    },
    'en-US': {
        dashboard: 'Dashboard', conversas: 'Conversations', agendamentos: 'Appointments',
        habilidades: 'Skills', instagram: 'Instagram', midia: 'Media',
        plano: 'Plan', configuracoes: 'Settings', sair: 'Log out',
        bomDia: 'Good morning', boaTarde: 'Good afternoon', boaNoite: 'Good evening',
        resumo: "Here's your summary for",
        msgHoje: 'Messages today', conversasAtivas: 'Active conversations',
        agendamentosSemana: 'Appointments this week', creditosRestantes: 'Credits remaining',
        carregando: 'Loading...', salvar: 'Save', cancelar: 'Cancel',
        voltar: 'Back', upgrade: 'Upgrade', idioma: 'Language',
    },
    'es': {
        dashboard: 'Panel', conversas: 'Conversaciones', agendamentos: 'Citas',
        habilidades: 'Habilidades', instagram: 'Instagram', midia: 'Media',
        plano: 'Plan', configuracoes: 'Ajustes', sair: 'Cerrar sesión',
        bomDia: 'Buenos días', boaTarde: 'Buenas tardes', boaNoite: 'Buenas noches',
        resumo: 'Aquí está el resumen de tu',
        msgHoje: 'Mensajes hoy', conversasAtivas: 'Conversaciones activas',
        agendamentosSemana: 'Citas esta semana', creditosRestantes: 'Créditos restantes',
        carregando: 'Cargando...', salvar: 'Guardar', cancelar: 'Cancelar',
        voltar: 'Volver', upgrade: 'Mejorar Plan', idioma: 'Idioma',
    },
}

const FLAGS: Record<Idioma, string> = {
    'pt-BR': '🇧🇷',
    'pt-PT': '🇵🇹',
    'en-US': '🇺🇸',
    'es': '🇪🇸',
}

const NOMES: Record<Idioma, string> = {
    'pt-BR': 'Português (BR)',
    'pt-PT': 'Português (PT)',
    'en-US': 'English',
    'es': 'Español',
}

interface IdiomaContextType {
    idioma: Idioma
    setIdioma: (i: Idioma) => void
    t: Traducoes
    flag: string
    nomeIdioma: string
    todosIdiomas: { id: Idioma; nome: string; flag: string }[]
}

const IdiomaContext = createContext<IdiomaContextType>({
    idioma: 'pt-BR',
    setIdioma: () => { },
    t: TRADUCOES['pt-BR'],
    flag: '🇧🇷',
    nomeIdioma: 'Português (BR)',
    todosIdiomas: [],
})

export function useIdioma() {
    return useContext(IdiomaContext)
}

function detectarIdioma(): Idioma {
    // 1. localStorage (escolha manual anterior)
    if (typeof window !== 'undefined') {
        const salvo = localStorage.getItem('iara-idioma') as Idioma
        if (salvo && TRADUCOES[salvo]) return salvo
    }

    // 2. Navegador
    if (typeof navigator !== 'undefined') {
        const lang = navigator.language || ''
        if (lang.startsWith('pt-PT') || lang === 'pt') return 'pt-PT'
        if (lang.startsWith('pt')) return 'pt-BR'
        if (lang.startsWith('en')) return 'en-US'
        if (lang.startsWith('es')) return 'es'
    }

    return 'pt-BR'
}

export function IdiomaProvider({ children }: { children: ReactNode }) {
    const [idioma, setIdiomaState] = useState<Idioma>('pt-BR')

    useEffect(() => {
        setIdiomaState(detectarIdioma())
    }, [])

    const setIdioma = (i: Idioma) => {
        setIdiomaState(i)
        localStorage.setItem('iara-idioma', i)
        // Atualizar lang do HTML
        document.documentElement.lang = i === 'pt-BR' ? 'pt-BR' : i === 'pt-PT' ? 'pt' : i === 'en-US' ? 'en' : 'es'
    }

    const todosIdiomas = (Object.keys(TRADUCOES) as Idioma[]).map(id => ({
        id,
        nome: NOMES[id],
        flag: FLAGS[id],
    }))

    return (
        <IdiomaContext.Provider value={{
            idioma,
            setIdioma,
            t: TRADUCOES[idioma],
            flag: FLAGS[idioma],
            nomeIdioma: NOMES[idioma],
            todosIdiomas,
        }}>
            {children}
        </IdiomaContext.Provider>
    )
}
