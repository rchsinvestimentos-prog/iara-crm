'use client'

// Idioma do painel (o que a clínica vê na tela). Não tem nada a ver com o
// idioma em que a IARA fala com as pacientes, que é users.idioma.
//
// Como traduzir uma tela:
//   const { t, locale } = useT()
//   <h1>{t('Agendamentos da semana')}</h1>
//   t('{n} conversas hoje', { n: total })
//   data.toLocaleDateString(locale, ...)
// O texto em português é a própria chave. A tradução fica em
// lib/i18n/telas/<tela>.ts (espanhol da Espanha e inglês dos EUA). Texto sem
// tradução aparece em português, nunca em branco. Conferir com:
//   npx tsx scripts/checar-traducoes.ts <arquivos>

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'

export type Idioma = 'pt-BR' | 'pt-PT' | 'en-US' | 'es'
export type LinguaPainel = 'pt' | 'es' | 'en'
export type Dicionario = Record<string, string>
export type VariaveisTexto = Record<string, string | number>

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

/** Formato de data e número de cada idioma. */
const LOCALE: Record<Idioma, string> = {
    'pt-BR': 'pt-BR',
    'pt-PT': 'pt-PT',
    'en-US': 'en-US',
    'es': 'es-ES',
}

const LANG_HTML: Record<Idioma, string> = { 'pt-BR': 'pt-BR', 'pt-PT': 'pt-PT', 'en-US': 'en', 'es': 'es' }

const IDIOMAS = Object.keys(NOMES) as Idioma[]

function linguaDe(i: Idioma): LinguaPainel {
    return i === 'es' ? 'es' : i === 'en-US' ? 'en' : 'pt'
}

/** Troca o texto pela tradução (se houver) e preenche {variáveis}. */
export function traduzir(dic: Dicionario | null, texto: string, vars?: VariaveisTexto): string {
    // Só chave própria do dicionário: t() também recebe texto do banco (nome de
    // coluna do CRM, erro do servidor) e "constructor" não pode virar função.
    const traducao = dic && Object.prototype.hasOwnProperty.call(dic, texto) ? dic[texto] : undefined
    let s = typeof traducao === 'string' && traducao ? traducao : texto
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
    return s
}

type FuncaoT = (texto: string, vars?: VariaveisTexto) => string

interface IdiomaContextType {
    idioma: Idioma
    lingua: LinguaPainel
    locale: string
    setIdioma: (i: Idioma) => void
    t: FuncaoT
    flag: string
    nomeIdioma: string
    todosIdiomas: { id: Idioma; nome: string; flag: string }[]
}

const todosIdiomas = IDIOMAS.map(id => ({ id, nome: NOMES[id], flag: FLAGS[id] }))

const IdiomaContext = createContext<IdiomaContextType>({
    idioma: 'pt-BR',
    lingua: 'pt',
    locale: 'pt-BR',
    setIdioma: () => { },
    t: (texto, vars) => traduzir(null, texto, vars),
    flag: FLAGS['pt-BR'],
    nomeIdioma: NOMES['pt-BR'],
    todosIdiomas,
})

export function useIdioma() {
    return useContext(IdiomaContext)
}

/** Atalho para as telas: { t, locale, lingua }. */
export function useT() {
    const { t, locale, lingua } = useContext(IdiomaContext)
    return { t, locale, lingua }
}

function detectarIdioma(): Idioma {
    // 1. Escolha feita no seletor (fica neste navegador)
    try {
        const salvo = localStorage.getItem('iara-idioma') as Idioma | null
        if (salvo && IDIOMAS.includes(salvo)) return salvo
    } catch { /* navegador sem localStorage: segue para o idioma do navegador */ }

    // 2. Idioma do navegador
    if (typeof navigator !== 'undefined') {
        const lang = navigator.language || ''
        if (lang.startsWith('pt-PT')) return 'pt-PT'
        if (lang.startsWith('pt')) return 'pt-BR'
        if (lang.startsWith('en')) return 'en-US'
        if (lang.startsWith('es')) return 'es'
    }
    return 'pt-BR'
}

// Já avisados no console (só fora de produção), para não repetir a cada render.
const avisados = new Set<string>()

export function IdiomaProvider({ children }: { children: ReactNode }) {
    const [idioma, setIdiomaState] = useState<Idioma>('pt-BR')
    const [dicionario, setDicionario] = useState<Dicionario | null>(null)
    const lingua = linguaDe(idioma)

    useEffect(() => {
        setIdiomaState(detectarIdioma())
    }, [])

    useEffect(() => {
        document.documentElement.lang = LANG_HTML[idioma]
    }, [idioma])

    // Português é o texto do próprio código. As traduções só são baixadas
    // por quem escolheu espanhol ou inglês.
    useEffect(() => {
        if (lingua === 'pt') {
            setDicionario(null)
            return
        }
        let cancelado = false
        const carregar = () => import('@/lib/i18n/dicionario')
        // Uma segunda tentativa: logo depois de um deploy, a aba aberta pode
        // pedir um arquivo que já mudou de nome e a primeira falha.
        carregar()
            .catch(() => new Promise(ok => setTimeout(ok, 1500)).then(carregar))
            .then(m => { if (!cancelado) setDicionario(m.DICIONARIOS[lingua]) })
            .catch(err => {
                // Sem a tradução o painel continua em português, que funciona.
                console.error(`[Idioma] Não consegui carregar a tradução (${lingua}) — o painel fica em português até recarregar a página:`, err)
            })
        return () => { cancelado = true }
    }, [lingua])

    const setIdioma = useCallback((i: Idioma) => {
        setIdiomaState(i)
        try {
            localStorage.setItem('iara-idioma', i)
        } catch (err) {
            console.warn('[Idioma] Não consegui guardar a escolha neste navegador:', err)
        }
    }, [])

    const t = useCallback<FuncaoT>((texto, vars) => {
        if (dicionario && !Object.prototype.hasOwnProperty.call(dicionario, texto) && process.env.NODE_ENV !== 'production' && !avisados.has(texto)) {
            avisados.add(texto)
            console.warn(`[Idioma] Sem tradução (${lingua}): "${texto}"`)
        }
        return traduzir(dicionario, texto, vars)
    }, [dicionario, lingua])

    const valor = useMemo<IdiomaContextType>(() => ({
        idioma,
        lingua,
        locale: LOCALE[idioma],
        setIdioma,
        t,
        flag: FLAGS[idioma],
        nomeIdioma: NOMES[idioma],
        todosIdiomas,
    }), [idioma, lingua, setIdioma, t])

    return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}
