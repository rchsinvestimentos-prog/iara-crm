// ============================================
// SIMULAÇÃO COM PRINTS — testar a IARA como cliente e como doutora
// ============================================
// Roda o atendimento DE VERDADE da IARA (pipeline, IA, painel) na máquina,
// com um WhatsApp de mentira no lugar da Evolution. Cada passo tira print
// do celular da cliente, do celular da doutora e do painel da clínica, com
// a mesma cara que cada um vê, e monta um relatório.
//
// Uso:   npm run simulacao -- triagem-fotos
// Saída: tests/simulacao/relatorios/<cenário>-<data>/index.html (abre sozinho)
//
// Precisa: Postgres local (banco do .env), Chrome instalado e
// node_modules do belivv-crm (playwright-core) — ver navegador-isolado.
// NÃO manda nada para WhatsApp nenhum: a clínica de teste aponta para o
// WhatsApp de mentira (instância SIMULACAO).

import fs from 'fs'
import path from 'path'
import { spawn, execSync } from 'child_process'
import { WhatsAppFalso, lerArquivoBase64 } from './whatsapp-falso'

const RAIZ = path.resolve(__dirname, '../..')
const PORTA_WHATSAPP = 4790
const PORTA_PAINEL = 3333
const BASE = `http://localhost:${PORTA_PAINEL}`
const UPLOADS = path.join(__dirname, '.uploads')
const INSTANCIA = 'SIMULACAO'
const CLINICA_ID = 1 // conta de teste local (teste@iara.click)

// Antes de qualquer import da IARA: os módulos leem o ambiente ao carregar
process.env.EVOLUTION_API_URL = `http://127.0.0.1:${PORTA_WHATSAPP}`
process.env.EVOLUTION_API_KEY = 'simulacao'
process.env.UPLOADS_DIR = UPLOADS
process.env.NEXTAUTH_URL = BASE

const FOTOS_EXEMPLO = path.join(__dirname, 'fotos')

export interface Print { arquivo: string; legenda: string; tipo: 'celular' | 'painel' }
export interface Checagem { ok: boolean; texto: string }
export interface Passo { titulo: string; explicacao?: string; prints: Print[]; checagens: Checagem[] }

export class Simulacao {
    passos: Passo[] = []
    whatsapp!: WhatsAppFalso
    navegador: any
    painel: any
    pipeline: any
    triagem: any
    prisma: any
    numeroDoutora = ''
    private n = 0
    private nPrint = 0
    private dir: string
    private restaurarClinica?: () => Promise<void>

    constructor(public cenario: string) {
        const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
        this.dir = path.join(__dirname, 'relatorios', `${cenario}-${carimbo}`)
        fs.mkdirSync(this.dir, { recursive: true })
    }

    // ---------- montagem ----------
    async preparar() {
        fs.mkdirSync(UPLOADS, { recursive: true })
        this.whatsapp = new WhatsAppFalso(PORTA_WHATSAPP, lerArquivoBase64(path.join(FOTOS_EXEMPLO, 'foto-1.jpg')))
        try {
            await this.whatsapp.iniciar()
        } catch {
            throw new Error(`A porta ${PORTA_WHATSAPP} está ocupada (outro WhatsApp de mentira ligado?). Feche e rode de novo.`)
        }

        this.prisma = (await import('@/lib/prisma')).prisma
        this.pipeline = await import('@/lib/engine/pipeline')
        this.triagem = await import('@/lib/triagem')

        await this.prepararClinica()
        await this.garantirPainel()

        const { chromium } = require('/Users/rafaelrocha/Developer/belivv-crm/node_modules/playwright-core')
        this.navegador = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
    }

    /** Clínica de teste: WhatsApp de mentira, sempre aberta. Restaura no fim. */
    private async prepararClinica() {
        const antes = await this.prisma.clinica.findFirst({ where: { id: CLINICA_ID } })
        if (!antes) throw new Error(`Clínica ${CLINICA_ID} (teste@iara.click) não existe no banco local`)
        if (antes.email !== 'teste@iara.click') throw new Error(`A clínica ${CLINICA_ID} do banco local não é a conta de teste (é ${antes.email}) — simulação cancelada`)
        const campos = ['evolutionInstance', 'whatsappDoutora', 'sempreLigada', 'horarioSemana', 'atendeSabado', 'horarioSabado', 'atendeDomingo', 'horarioDomingo'] as const
        // O original fica num arquivo: se uma simulação for interrompida no meio,
        // a próxima não toma os valores de teste como se fossem os verdadeiros
        const arquivoOriginal = path.join(__dirname, '.clinica-original.json')
        let original: Record<string, unknown> = {}
        if (fs.existsSync(arquivoOriginal)) {
            original = JSON.parse(fs.readFileSync(arquivoOriginal, 'utf8'))
            console.log('[Simulação] Achei configuração original guardada de uma execução interrompida — vou restaurar dela no fim')
        } else {
            for (const c of campos) original[c] = (antes as any)[c]
            fs.writeFileSync(arquivoOriginal, JSON.stringify(original))
        }
        await this.prisma.clinica.update({
            where: { id: CLINICA_ID },
            data: {
                evolutionInstance: INSTANCIA,
                whatsappDoutora: original.whatsappDoutora || '5500000000001',
                sempreLigada: true,
                horarioSemana: '00:00 às 23:59', atendeSabado: true, horarioSabado: '00:00 às 23:59',
                atendeDomingo: true, horarioDomingo: '00:00 às 23:59',
            },
        })
        this.restaurarClinica = async () => {
            await this.prisma.clinica.update({ where: { id: CLINICA_ID }, data: original })
            fs.rmSync(arquivoOriginal, { force: true })
        }
        // Começa limpo: fotos esquecidas de testes anteriores nesta clínica não
        // podem gerar lembretes no meio da simulação (só banco local)
        await this.triagem.processarLembretes().catch(() => {}) // garante as tabelas
        await this.prisma.$executeRaw`
            INSERT INTO triagem_midia (midia_id, clinica_id, como)
            SELECT mc.id, mc.clinica_id, 'nada' FROM midia_contatos mc
            WHERE mc.clinica_id = ${CLINICA_ID} AND mc.anotacoes = 'Recebido via WhatsApp'
            ON CONFLICT (midia_id) DO NOTHING`
        await this.prisma.$executeRaw`DELETE FROM triagem_pendencia WHERE clinica_id = ${CLINICA_ID}`

        // O celular da doutora é quem recebe os alertas: profissional com WhatsApp, senão a dona
        const prof = await this.prisma.$queryRaw<{ whatsapp: string }[]>`
            SELECT whatsapp FROM profissionais WHERE clinica_id = ${CLINICA_ID} AND ativo = true AND whatsapp IS NOT NULL AND whatsapp <> '' ORDER BY ordem ASC LIMIT 1`
        const clinica = await this.prisma.clinica.findFirst({ where: { id: CLINICA_ID } })
        this.numeroDoutora = prof[0]?.whatsapp || clinica.whatsappDoutora
        this.whatsapp.nomes.set(this.numeroDoutora, 'IARA · ' + (clinica.nomeClinica || 'Clínica'))
    }

    /** Painel local apontando para o WhatsApp de mentira (sobe se não estiver no ar). */
    private async garantirPainel() {
        const marcador = path.join(__dirname, '.painel.json')
        const noAr = async () => { try { return (await fetch(`${BASE}/login`)).ok } catch { return false } }
        // Só reaproveita o painel que está de pé se o processo dele foi aberto
        // com o WhatsApp de mentira (senão poderia mandar para a Evolution real)
        const nosso = (() => {
            try {
                const pid = JSON.parse(fs.readFileSync(marcador, 'utf8')).pid
                const quemOcupa = execSync(`lsof -ti tcp:${PORTA_PAINEL} -sTCP:LISTEN`).toString().trim().split('\n')
                const ambiente = execSync(`ps eww -o command= -p ${quemOcupa.join(',')}`).toString()
                return quemOcupa.length > 0 && ambiente.includes(`EVOLUTION_API_URL=${process.env.EVOLUTION_API_URL}`) && !!pid
            } catch { return false }
        })()
        if (await noAr() && nosso) return
        if (await noAr()) {
            // Painel de outra origem pode estar falando com a Evolution real: troca pelo da simulação
            console.log('[Simulação] Reiniciando o painel local apontado para o WhatsApp de mentira...')
            try { execSync(`lsof -ti tcp:${PORTA_PAINEL} -sTCP:LISTEN | xargs kill`, { stdio: 'ignore' }) } catch { /* já parou */ }
            await new Promise(r => setTimeout(r, 2000))
        }
        const log = fs.openSync(path.join(__dirname, '.painel.log'), 'w')
        const filho = spawn('npx', ['next', 'dev', '-p', String(PORTA_PAINEL)], {
            cwd: RAIZ, detached: true, stdio: ['ignore', log, log],
            env: { ...process.env, EVOLUTION_API_URL: process.env.EVOLUTION_API_URL, EVOLUTION_API_KEY: 'simulacao', UPLOADS_DIR: UPLOADS },
        })
        filho.unref()
        fs.writeFileSync(marcador, JSON.stringify({ pid: filho.pid }))
        for (let i = 0; i < 90; i++) {
            if (await noAr()) return
            await new Promise(r => setTimeout(r, 2000))
        }
        throw new Error('O painel local não subiu em 3 minutos (veja tests/simulacao/.painel.log)')
    }

    async entrarNoPainel(celular = true) {
        const senha = fs.readFileSync(path.join(RAIZ, 'lib/auth.ts'), 'utf8').match(/credentials\?\.password === '([^']+)'/)?.[1]
        if (!senha) throw new Error('Não achei a senha da conta de teste em lib/auth.ts')
        const ctx = await this.navegador.newContext(celular
            ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
            : { viewport: { width: 1440, height: 900 } })
        this.painel = await ctx.newPage()
        this.painel.on('dialog', async (d: any) => {
            const msg = d.message()
            const ruim = /erro|falha|não consegui|NÃO /i.test(msg)
            this.verificar(!ruim, `Aviso na tela da doutora: "${msg}"`)
            await d.accept()
        })
        await this.painel.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 180000 })
        await this.painel.fill('input[type=email]', 'teste@iara.click')
        await this.painel.fill('input[placeholder="••••••••"]', senha)
        await this.painel.click('button[type=submit]')
        await this.painel.waitForURL((u: URL) => !u.pathname.startsWith('/login'), { timeout: 180000 })
    }

    /** Cada etapa da limpeza isolada; falha ao restaurar a clínica reprova a simulação. */
    async encerrar() {
        try { await this.navegador?.close() } catch (err) { console.error('[Simulação] Erro ao fechar o navegador:', err) }
        try { this.whatsapp?.parar() } catch (err) { console.error('[Simulação] Erro ao parar o WhatsApp de mentira:', err) }
        try {
            await this.restaurarClinica?.()
        } catch (err) {
            console.error('[Simulação] ❌ NÃO consegui restaurar a clínica de teste:', err)
            this.verificar(false, 'Restaurar a configuração da clínica de teste (veja tests/simulacao/.clinica-original.json)')
        }
    }

    // ---------- ações da cliente ----------
    async limparCliente(numero: string, nome: string) {
        // No celular da cliente, o topo mostra com quem ela conversa: a clínica
        const clinica = await this.prisma.clinica.findFirst({ where: { id: CLINICA_ID }, select: { nomeClinica: true } })
        this.whatsapp.nomes.set(numero, clinica?.nomeClinica || 'Clínica')
        await this.prisma.contato.deleteMany({ where: { clinicaId: CLINICA_ID, telefone: numero } })
        await this.prisma.$executeRaw`DELETE FROM historico_conversas WHERE user_id = ${CLINICA_ID} AND telefone_cliente = ${numero}`
        await this.prisma.$executeRaw`DELETE FROM status_conversa WHERE user_id = ${CLINICA_ID} AND telefone_cliente = ${numero}`
        await this.prisma.$executeRawUnsafe(`DELETE FROM triagem_resolvida WHERE user_id = $1 AND telefone_cliente = $2`, CLINICA_ID, numero)
            .catch((err: Error) => console.warn('[Simulação] triagem_resolvida não limpa (tabela pode não existir ainda):', err.message))
    }

    async clienteManda(numero: string, nome: string, texto: string) {
        this.whatsapp.registrarDoDono(numero, { tipo: 'texto', texto })
        await this.pipeline.processMessage({
            telefone: numero, pushName: nome, mensagem: texto, tipoMensagem: 'text', instancia: INSTANCIA,
            requestId: `sim-${Date.now()}`, canal: 'whatsapp', timestamp: Date.now(),
        })
    }

    async clienteMandaFoto(numero: string, nome: string, arquivo = 'foto-1.jpg', legenda = '') {
        const base64 = lerArquivoBase64(path.join(FOTOS_EXEMPLO, arquivo))
        const id = `sim-foto-${++this.n}-${Date.now()}`
        this.whatsapp.guardarMidiaParaDownload(id, base64)
        this.whatsapp.registrarDoDono(numero, { tipo: 'imagem', midia: `data:image/jpeg;base64,${base64}`, texto: legenda || undefined })
        await this.pipeline.processMessage({
            telefone: numero, pushName: nome, mensagem: legenda || '[imagem]', tipoMensagem: 'image', instancia: INSTANCIA,
            requestId: id, canal: 'whatsapp', timestamp: Date.now(), rawMessage: { key: { id } },
        })
    }

    /**
     * Espera chegar mensagem NOVA da clínica neste celular (até 30 s) e devolve a última.
     * Sem isso, um teste leria a mensagem antiga e passaria com a resposta faltando.
     */
    async novaMensagem(numero: string, antes: number): Promise<string | null> {
        for (let i = 0; i < 60; i++) {
            const da = this.whatsapp.doNumero(numero).filter(m => m.de === 'clinica')
            if (da.length > antes) return da[da.length - 1].texto || ''
            await new Promise(r => setTimeout(r, 500))
        }
        return null
    }

    qtdDaClinica(numero: string) {
        return this.whatsapp.doNumero(numero).filter(m => m.de === 'clinica').length
    }

    // ---------- relatório ----------
    passo(titulo: string, explicacao?: string) {
        this.passos.push({ titulo, explicacao, prints: [], checagens: [] })
        console.log(`\n▶ ${titulo}`)
    }

    verificar(ok: boolean, texto: string) {
        const p = this.passos[this.passos.length - 1]
        p?.checagens.push({ ok, texto })
        console.log(`  ${ok ? '✅' : '❌'} ${texto}`)
    }

    private async printDaPagina(pagina: any, legenda: string, tipo: Print['tipo']) {
        const arquivo = `${String(++this.nPrint).padStart(2, '0')}.png`
        await pagina.screenshot({ path: path.join(this.dir, arquivo) })
        this.passos[this.passos.length - 1].prints.push({ arquivo, legenda, tipo })
    }

    async printCelular(numero: string, legenda: string) {
        const ctx = await this.navegador.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
        const p = await ctx.newPage()
        await p.goto(`http://127.0.0.1:${PORTA_WHATSAPP}/celular/${numero}`)
        await p.waitForTimeout(300)
        await this.printDaPagina(p, legenda, 'celular')
        await ctx.close()
    }

    async printPainel(legenda: string) {
        // Esconde o selo do modo de desenvolvimento do Next (não existe para a clínica)
        await this.painel.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
        await this.painel.waitForTimeout(800)
        await this.printDaPagina(this.painel, legenda, 'painel')
    }

    gerarRelatorio(): string {
        const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
        const total = this.passos.flatMap(p => p.checagens)
        const falhas = total.filter(c => !c.ok).length
        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Simulação · ${esc(this.cenario)}</title>
<style>
body{font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;background:#f4f1ec;color:#1f2a2e;margin:0;padding:24px}
h1{font-size:22px;margin:0 0 4px}.resumo{margin:0 0 24px;color:#555}
.passo{background:#fff;border-radius:14px;padding:18px;margin:0 0 20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.passo h2{font-size:17px;margin:0 0 4px}.passo p{margin:0 0 12px;color:#555;font-size:14px}
.prints{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
figure{margin:0}figure img{display:block;border-radius:22px;border:1px solid #ddd;box-shadow:0 4px 14px rgba(0,0,0,.08)}
figure.celular img{width:270px}figure.painel img{width:270px}
figcaption{font-size:12px;color:#555;margin-top:6px;max-width:270px}
ul{margin:12px 0 0;padding-left:18px;font-size:14px}li.falha{color:#b00020;font-weight:600}
</style></head><body>
<h1>Simulação: ${esc(this.cenario)}</h1>
<p class="resumo">${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · ${total.length} checagens · ${falhas === 0 ? '✅ todas passaram' : `❌ ${falhas} falharam`}</p>
${this.passos.map((p, i) => `<section class="passo"><h2>${i + 1}. ${esc(p.titulo)}</h2>${p.explicacao ? `<p>${esc(p.explicacao)}</p>` : ''}
<div class="prints">${p.prints.map(pr => `<figure class="${pr.tipo}"><a href="${pr.arquivo}" target="_blank"><img src="${pr.arquivo}"></a><figcaption>${esc(pr.legenda)}</figcaption></figure>`).join('')}</div>
${p.checagens.length ? `<ul>${p.checagens.map(c => `<li class="${c.ok ? '' : 'falha'}">${c.ok ? '✅' : '❌'} ${esc(c.texto)}</li>`).join('')}</ul>` : ''}</section>`).join('')}
</body></html>`
        const arquivo = path.join(this.dir, 'index.html')
        fs.writeFileSync(arquivo, html)
        return arquivo
    }
}

// ---------- linha de comando ----------
async function main() {
    const nome = process.argv[2]
    const disponiveis = fs.readdirSync(path.join(__dirname, 'cenarios')).filter(f => f.endsWith('.ts')).map(f => f.replace(/\.ts$/, ''))
    if (!nome || !disponiveis.includes(nome)) {
        console.log(`Cenários: ${disponiveis.join(', ')}\nUso: npm run simulacao -- <cenário>`)
        process.exit(1)
    }
    const sim = new Simulacao(nome)
    // Ctrl-C no meio: devolve a clínica ao normal antes de sair
    for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
        process.once(sinal, async () => {
            console.log(`\n[Simulação] Interrompida (${sinal}) — restaurando a clínica de teste...`)
            await sim.encerrar()
            process.exit(130)
        })
    }
    let erro: unknown = null
    try {
        await sim.preparar()
        const cenario = await import(`./cenarios/${nome}`)
        await cenario.default(sim)
    } catch (err) {
        erro = err
        console.error('\n❌ A simulação parou com erro:', err)
        if (sim.passos.length) sim.verificar(false, `A simulação parou: ${(err as Error).message}`)
    } finally {
        await sim.encerrar().catch(e => console.error('Erro ao encerrar:', e))
    }
    const relatorio = sim.gerarRelatorio()
    console.log(`\n📄 Relatório: ${relatorio}`)
    if (!process.env.SEM_ABRIR) { try { execSync(`open "${relatorio}"`) } catch { /* sem navegador */ } }
    const falhas = sim.passos.flatMap(p => p.checagens).filter(c => !c.ok).length
    process.exit(erro || falhas ? 1 : 0)
}

if (require.main === module) main()
