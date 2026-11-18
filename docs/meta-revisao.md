# Meta: app da IARA, revisão e liberação (Instagram + WhatsApp oficial)

Roteiro para criar o app da IARA na Meta, passar na revisão e liberar para as
clínicas. O código já está pronto; isto aqui é o que se faz nos painéis da Meta
e no EasyPanel.

## 1. Verificar a empresa (antes de tudo)

business.facebook.com → Configurações → Central de segurança → Verificação da empresa.
Documentos: CNPJ, comprovante de endereço, site e um e-mail do domínio. A Meta leva de 2 a 10 dias.
A revisão do app não começa sem isso.

## 2. Criar o app "IARA"

developers.facebook.com → Meus apps → Criar app → tipo **Empresa** → ligar ao portfólio da Be Livv.
Casos de uso: **Instagram** (mensagens e comentários, com login do Facebook) e **WhatsApp** (escolher "Tech Provider").

Configurações → Básico:

| Campo | Valor |
|---|---|
| Domínios do app | `app.iara.click` |
| Política de privacidade | `https://app.iara.click/privacidade` |
| Termos de serviço | `https://app.iara.click/termos` |
| URL de exclusão de dados | `https://app.iara.click/api/webhook/meta/exclusao-de-dados` |
| Categoria | Negócios e páginas |
| Ícone | 1024×1024, o avatar da IARA |

Login do Facebook para empresas → Configurações:

| Campo | Valor |
|---|---|
| URIs de redirecionamento OAuth válidos | `https://app.iara.click/api/instagram/callback` |
| Domínios permitidos para o SDK do JavaScript | `https://app.iara.click` |
| URL de retorno de desautorização | `https://app.iara.click/api/webhook/meta/desautorizar` |

Login do Facebook para empresas → **Configurações (Configurations)** → Criar configuração →
variação "WhatsApp Embedded Signup". O número que aparece é o `WHATSAPP_ES_CONFIG_ID`.

Webhooks (o token de verificação é o valor de `META_VERIFY_TOKEN` que já está no EasyPanel):

| Objeto | URL | Campos |
|---|---|---|
| Instagram | `https://app.iara.click/api/webhook/instagram` | messages, comments, messaging_postbacks |
| WhatsApp Business Account | `https://app.iara.click/api/webhook/whatsapp-oficial` | messages, smb_message_echoes, account_update |

## 3. Variáveis no EasyPanel (serviço do painel)

| Variável | O que pôr |
|---|---|
| `META_APP_ID` | id do app novo |
| `META_APP_SECRET` | chave secreta do app novo |
| `META_APP_SECRET_ANTERIOR` | a chave que hoje está em `META_APP_SECRET` (app "Be Livv CRM (OFICIAL)"), até as clínicas reconectarem |
| `WHATSAPP_ES_CONFIG_ID` | o número da configuração do passo 2 |
| `META_TESTE_EMAILS` | e-mails (separados por vírgula) das contas da IARA que podem conectar antes da aprovação: a sua de teste e a do revisor |

Sem `WHATSAPP_ES_CONFIG_ID` o card do WhatsApp oficial continua "Em breve" para todo mundo.
Fora de `META_TESTE_EMAILS`, o Instagram continua "Em breve" até a aprovação.

## 4. Conta de teste para o revisor

Criar no admin uma clínica de teste (ex.: `revisor.meta@iara.click`, senha forte), com a IARA ativa e
créditos. Pôr esse e-mail em `META_TESTE_EMAILS`. Na revisão, mandar o login e a senha nas instruções.

## 5. Vídeos e textos da revisão

Gravar a tela em inglês ou com legendas; o revisor precisa ver o fluxo inteiro, do login ao resultado.

**Instagram** (um vídeo serve para todas as permissões):
1. Entrar em app.iara.click com a conta de teste → menu WhatsApp → card Instagram → Conectar.
2. Janela do Facebook: escolher a página e o Instagram → permitir → volta mostrando "Instagram conectado".
3. De outra conta do Instagram, mandar uma DM para a conta conectada → a IARA responde em segundos.
4. (Se pedir `instagram_manage_comments`) comentar num post → a IARA responde o comentário.

Texto por permissão (colar no formulário):
- `instagram_basic`: "Shows the connected Instagram account's username in the clinic dashboard so the clinic knows which account IARA is answering for."
- `instagram_manage_messages`: "IARA is a virtual receptionist for aesthetic clinics. It reads incoming Instagram DMs sent to the clinic's account and replies within the 24-hour window to answer questions and book appointments."
- `instagram_manage_comments`: "Replies to comments on the clinic's posts with information about the treatment and an invitation to continue by DM."
- `pages_show_list` + `business_management`: "Lists the clinic's Facebook Pages (including Pages owned by a business portfolio) to find the Page linked to the Instagram professional account."
- `pages_read_engagement`: "Obtains the Page access token used to send the Instagram replies on behalf of the clinic."
- `pages_manage_metadata`: "Subscribes the clinic's Page to our app's webhooks so incoming Instagram messages reach IARA."

**WhatsApp** (2 vídeos; a Meta aceita gravar pelo próprio painel):
1. Painel do app → WhatsApp → Configuração da API → enviar a mensagem de teste para o seu celular e mostrar chegando no WhatsApp.
2. WhatsApp Manager → Modelos de mensagem → criar um modelo (ex.: lembrete de consulta) e enviar.

Pedir acesso avançado a `whatsapp_business_messaging` e `whatsapp_business_management`.

## 6. Depois da aprovação

- Instagram: me avise para eu ligar `INSTAGRAM_HABILITADO` em `lib/planos.ts`.
- WhatsApp oficial: `WHATSAPP_OFICIAL_HABILITADO=1` no EasyPanel abre o card para todas as clínicas.
  **Antes disso** falta a etapa 2 do WhatsApp oficial: modelos aprovados para os lembretes, aniversários,
  follow-up e avisos para a doutora (fora da janela de 24 h a Meta só aceita modelo).
- Clínicas que conectaram o Instagram pelo app antigo precisam conectar de novo; depois disso
  `META_APP_SECRET_ANTERIOR` pode sair.
