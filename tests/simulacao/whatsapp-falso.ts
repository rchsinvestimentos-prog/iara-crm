// ============================================
// WHATSAPP DE MENTIRA — no lugar da Evolution, só para a simulação
// ============================================
// A IARA fala com ele achando que é a Evolution. Nada sai para o WhatsApp de
// verdade: cada mensagem enviada é guardada, e /celular/<número> desenha a
// conversa daquele número com a cara do WhatsApp, para tirar print.

import http from 'http'
import fs from 'fs'

export interface MensagemSimulada {
    /** número do celular onde a mensagem aparece (cliente ou doutora) */
    numero: string
    /** 'dono' = quem segura o celular mandou; 'clinica' = a IARA/clínica mandou */
    de: 'dono' | 'clinica'
    tipo: 'texto' | 'imagem' | 'audio' | 'documento'
    texto?: string
    /** data URL da imagem (foto da cliente) ou URL da mídia enviada pela clínica */
    midia?: string
    hora: number
}

export class WhatsAppFalso {
    mensagens: MensagemSimulada[] = []
    private servidor?: http.Server
    /** foto que a cliente "mandou", devolvida quando a IARA pede para baixar */
    private midiasPendentes = new Map<string, string>()
    nomes = new Map<string, string>()

    constructor(public porta: number, private midiaPadrao: string) {}

    iniciar(): Promise<void> {
        this.servidor = http.createServer((req, res) => this.atender(req, res))
        return new Promise((resolve, reject) => {
            this.servidor!.once('error', reject)
            this.servidor!.listen(this.porta, () => resolve())
        })
    }

    parar() {
        this.servidor?.close()
    }

    /** O que a cliente (ou a doutora) digitou no celular dela */
    registrarDoDono(numero: string, m: Omit<MensagemSimulada, 'numero' | 'de' | 'hora'>) {
        this.mensagens.push({ numero, de: 'dono', hora: Date.now(), ...m })
    }

    guardarMidiaParaDownload(idMensagem: string, base64: string) {
        this.midiasPendentes.set(idMensagem, base64)
    }

    doNumero(numero: string) {
        return this.mensagens.filter(m => m.numero === numero)
    }

    private atender(req: http.IncomingMessage, res: http.ServerResponse) {
        let corpo = ''
        req.on('data', c => (corpo += c))
        req.on('end', () => {
            const url = req.url || ''
            const json = (o: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)) }
            let dados: any = {}
            try { dados = corpo ? JSON.parse(corpo) : {} } catch { /* corpo não-JSON */ }

            if (url.startsWith('/celular/')) {
                const [numero, query] = url.slice('/celular/'.length).split('?')
                const titulo = new URLSearchParams(query || '').get('titulo') || ''
                res.setHeader('Content-Type', 'text/html; charset=utf-8')
                return res.end(this.desenharCelular(decodeURIComponent(numero), titulo))
            }
            if (url.startsWith('/message/sendText/')) {
                this.mensagens.push({ numero: String(dados.number), de: 'clinica', tipo: 'texto', texto: dados.text, hora: Date.now() })
                return json({ key: { id: `sim-${Date.now()}` } })
            }
            if (url.startsWith('/message/sendMedia/')) {
                const tipo = dados.mediatype === 'image' ? 'imagem' : 'documento'
                this.mensagens.push({ numero: String(dados.number), de: 'clinica', tipo, texto: dados.caption, midia: dados.media, hora: Date.now() })
                return json({ key: { id: `sim-${Date.now()}` } })
            }
            if (url.startsWith('/message/sendWhatsAppAudio/')) {
                this.mensagens.push({ numero: String(dados.number), de: 'clinica', tipo: 'audio', hora: Date.now() })
                return json({ key: { id: `sim-${Date.now()}` } })
            }
            if (url.startsWith('/chat/getBase64FromMediaMessage/') || url.startsWith('/message/download-media/')) {
                const id = dados?.message?.key?.id
                return json({ base64: (id && this.midiasPendentes.get(id)) || this.midiaPadrao })
            }
            if (url.startsWith('/instance/connectionState/')) return json({ instance: { state: 'open' } })
            json({})
        })
    }

    // ---------------------------------------------
    // Desenho do celular (cara de WhatsApp)
    // ---------------------------------------------
    private desenharCelular(numero: string, titulo: string): string {
        const msgs = this.doNumero(numero)
        const contato = this.nomes.get(numero) || titulo || numero
        const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Formatação do WhatsApp: *negrito*, _itálico_, links
        const formatar = (t: string) => esc(t)
            .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
            .replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>')
            .replace(/(https?:\/\/[^\s<]+)/g, '<a>$1</a>')
            .replace(/\n/g, '<br>')
        const baloes = msgs.map(m => {
            const lado = m.de === 'dono' ? 'eu' : 'outro'
            let conteudo = ''
            if (m.tipo === 'imagem' && m.midia) conteudo += `<img src="${m.midia}" class="foto">`
            if (m.tipo === 'audio') conteudo += `<div class="audio">▶︎ ━━━━━━━━━━ 0:12</div>`
            if (m.tipo === 'documento') conteudo += `<div class="doc">📄 Documento</div>`
            if (m.texto) conteudo += `<div>${formatar(m.texto)}</div>`
            return `<div class="linha ${lado}"><div class="balao ${lado}">${conteudo}<span class="hora">${hora(m.hora)}${lado === 'eu' ? ' <span class="check">✓✓</span>' : ''}</span></div></div>`
        }).join('')
        return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif;background:#efeae2;height:100vh;display:flex;flex-direction:column}
.status{background:#f6f6f6;height:44px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;font-weight:600;font-size:15px}
.topo{background:#f6f6f6;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:10px;padding:6px 12px 10px}
.voltar{color:#007aff;font-size:28px;line-height:1}
.avatar{width:36px;height:36px;border-radius:50%;background:#25d366;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}
.nome{font-weight:600;font-size:16px}.sub{font-size:12px;color:#667781}
.conversa{flex:1;overflow:auto;padding:10px 10px 16px;background-color:#efeae2;background-image:radial-gradient(#e2dbd1 1px,transparent 1px);background-size:18px 18px}
.linha{display:flex;margin:3px 0}.linha.eu{justify-content:flex-end}
.balao{max-width:80%;padding:6px 8px 4px;border-radius:8px;font-size:15px;line-height:1.35;color:#111b21;box-shadow:0 1px .5px rgba(11,20,26,.13);word-wrap:break-word}
.balao.eu{background:#d9fdd3;border-top-right-radius:0}.balao.outro{background:#fff;border-top-left-radius:0}
.balao a{color:#027eb5;text-decoration:underline;word-break:break-all}
.hora{display:block;text-align:right;font-size:11px;color:#667781;margin-top:2px}.check{color:#53bdeb}
.foto{display:block;width:240px;max-width:100%;border-radius:6px;margin-bottom:4px}
.audio{color:#54656f;font-size:14px;padding:6px 0}.doc{padding:6px 0}
.dia{align-self:center;margin:6px auto;background:#fff;border-radius:7px;padding:4px 10px;font-size:12px;color:#54656f;width:max-content}
.rodape{background:#f6f6f6;padding:8px 10px 26px;display:flex;gap:8px;align-items:center}
.campo{flex:1;background:#fff;border-radius:18px;height:34px;border:1px solid #ddd}
.mic{width:34px;height:34px;border-radius:50%;background:#25d366}
</style></head><body>
<div class="status"><span>${hora(Date.now())}</span><span>●●●● 5G ▮</span></div>
<div class="topo"><span class="voltar">‹</span><div class="avatar">${esc(contato.charAt(0).toUpperCase())}</div><div><div class="nome">${esc(contato)}</div><div class="sub">online</div></div></div>
<div class="conversa" id="c"><div class="dia">HOJE</div>${baloes || '<div class="dia">Nenhuma mensagem ainda</div>'}</div>
<div class="rodape"><div class="campo"></div><div class="mic"></div></div>
<script>const c=document.getElementById('c');c.scrollTop=c.scrollHeight</script>
</body></html>`
    }
}

export function lerArquivoBase64(caminho: string): string {
    return fs.readFileSync(caminho).toString('base64')
}
