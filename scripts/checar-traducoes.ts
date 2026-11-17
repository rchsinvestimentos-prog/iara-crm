// Confere as traduções do painel (components/IdiomaProvider.tsx).
//
//   npx tsx scripts/checar-traducoes.ts arquivo1.tsx arquivo2.tsx ...
//
// Para cada t('texto') com texto fixo nos arquivos: avisa se falta a tradução
// em espanhol ou inglês, se a tradução perdeu um {placeholder}, e se o mesmo
// texto foi traduzido de jeitos diferentes em duas telas. No fim lista textos
// na tela que parecem ter ficado sem t() — é só uma pista, confira na mão.
// Sai com código 1 quando falta tradução.

import { readFileSync } from 'fs'
import { relative } from 'path'
import { DICIONARIOS, TELAS } from '../lib/i18n/dicionario'

const arquivos = process.argv.slice(2)
if (arquivos.length === 0) {
    console.error('Uso: npx tsx scripts/checar-traducoes.ts <arquivos .tsx>')
    process.exit(2)
}

// Palavras que ficam iguais em todo idioma.
const NAO_TRADUZ = new Set(['IARA', 'WhatsApp', 'Instagram', 'CRM', 'Google', 'Follow', 'UP', 'up', 'PIX', 'Pix', 'Evolution', 'QR', 'Code', 'IA'])

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

let erros = 0
const pistas: string[] = []

for (const arquivo of arquivos) {
    // Linhas de comentário viram linhas vazias (mantém a numeração): exemplo
    // de uso escrito num comentário não é chamada de verdade.
    const codigo = readFileSync(arquivo, 'utf8').split('\n').map(l => (/^\s*(\/\/|\*|\/\*)/.test(l) ? '' : l)).join('\n')
    const nome = relative(process.cwd(), arquivo)
    const linhaDe = (pos: number) => codigo.slice(0, pos).split('\n').length

    // t('...') / t("...") / t(`...`)
    for (const m of codigo.matchAll(/(?<![\w.])t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
        const [, aspas, bruto] = m
        const linha = linhaDe(m.index!)
        if (aspas === '`' && bruto.includes('${')) {
            console.log(`❌ ${nome}:${linha}  t() com \${...}: use t('... {nome} ...', { nome })  →  ${bruto}`)
            erros++
            continue
        }
        const chave = bruto.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n')
        for (const lingua of ['es', 'en'] as const) {
            const traducao = DICIONARIOS[lingua][chave]
            if (traducao === undefined) {
                console.log(`❌ ${nome}:${linha}  sem tradução em ${lingua}: "${chave}"`)
                erros++
            } else if (placeholders(traducao) !== placeholders(chave)) {
                console.log(`❌ ${nome}:${linha}  ${lingua} trocou os {placeholders}: "${chave}" → "${traducao}"`)
                erros++
            }
        }
    }

    // Pistas de texto que ficou sem t(): texto solto no JSX e atributos de texto.
    codigo.split('\n').forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(l) || l.includes('console.')) return
        const soltos = [...l.matchAll(/>\s*([^<>{}]*[A-Za-zÀ-ú]{3,}[^<>{}]*?)\s*(?=<|$)/g)].map(m => m[1])
            .filter(s => !/^[\w-]+=|=>|&&|\|\||\)\s*$/.test(s) && /[A-Za-zÀ-ú]{3,}/.test(s))
        const atributos = [...l.matchAll(/\b(placeholder|title|alt|aria-label)="([^"]*[A-Za-zÀ-ú]{3,}[^"]*)"/g)].map(m => m[2])
        // alert/confirm mostram o texto direto: precisam de t(). Já setErro('...')
        // pode guardar o texto em português e a tela mostrar t(erro) — aí basta
        // a chave existir no dicionário.
        const diretos = [...l.matchAll(/\b(alert|confirm)\(\s*(['"`])([^'"`]*[A-Za-zÀ-ú]{3,}[^'"`]*)\2/g)].map(m => m[3])
        const guardados = [...l.matchAll(/\bset[A-Z]\w*\(\s*(['"`])([^'"`]*[A-Za-zÀ-ú]{3,}[^'"`]*\s[^'"`]*)\1/g)].map(m => m[2])
            .filter(s => !(s in DICIONARIOS.es && s in DICIONARIOS.en))
        for (const s of [...soltos, ...atributos, ...diretos, ...guardados]) {
            if (s.split(/[^A-Za-zÀ-ú]+/).filter(Boolean).every(p => NAO_TRADUZ.has(p))) continue
            pistas.push(`   ${nome}:${i + 1}  ${s.trim().slice(0, 90)}`)
        }
    })
}

// Mesmo texto traduzido diferente em duas telas: a última ganha, o que confunde.
for (const lingua of ['es', 'en'] as const) {
    const visto = new Map<string, { tela: string; traducao: string }>()
    for (const [tela, dic] of Object.entries(TELAS)) {
        for (const [chave, traducao] of Object.entries(dic[lingua])) {
            const antes = visto.get(chave)
            if (antes && antes.traducao !== traducao) {
                console.log(`⚠️  ${lingua} "${chave}": "${antes.traducao}" (${antes.tela}) × "${traducao}" (${tela}) — vale o de ${tela}`)
            }
            visto.set(chave, { tela, traducao })
        }
    }
}

if (pistas.length) {
    console.log(`\n🔎 ${pistas.length} texto(s) que parecem estar sem t() — confira:`)
    console.log(pistas.join('\n'))
}
console.log(erros ? `\n❌ ${erros} problema(s) de tradução` : '\n✅ Todas as chamadas t() com texto fixo têm tradução em es e en')
process.exit(erros ? 1 : 0)
