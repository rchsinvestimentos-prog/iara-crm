# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img "IARA" [ref=e11]
      - heading "Bem-vinda à IARA" [level=1] [ref=e13]
      - paragraph [ref=e14]: Acesse o painel da sua clínica
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: E-mail
        - textbox "seu@email.com" [ref=e19]: suportepscomvc@gmail.com
      - generic [ref=e20]:
        - generic [ref=e21]: Senha
        - generic [ref=e22]:
          - textbox "••••••••" [ref=e23]: Dpggs53cvL
          - button [ref=e24]:
            - img [ref=e25]
        - button "Esqueci minha senha" [ref=e29]
      - generic [ref=e30]:
        - img [ref=e31]
        - text: E-mail ou senha incorretos
      - button "Entrar" [ref=e33]:
        - text: Entrar
        - img [ref=e34]
    - paragraph [ref=e36]:
      - text: Precisa de ajuda?
      - link "Fale com o suporte" [ref=e37] [cursor=pointer]:
        - /url: "#"
    - paragraph [ref=e38]:
      - link "Política de Privacidade" [ref=e39] [cursor=pointer]:
        - /url: /privacidade
      - text: ·
      - link "Termos de Serviço" [ref=e40] [cursor=pointer]:
        - /url: /termos
  - alert [ref=e41]
```