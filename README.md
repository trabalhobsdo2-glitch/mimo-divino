# Mimo Divino — loja virtual

Site completo (site + carrinho + checkout) para os dois produtos **Maria** e
**Jesus**, pronto para publicar no GitHub → Vercel e, depois, receber as
credenciais do Mercado Pago.

Não depende de nenhum framework — é HTML, CSS e JavaScript puros, então
qualquer editor de código funciona e não é preciso rodar `npm install` para
usar o site.

---

## 1. Estrutura do projeto

```
mimo-divino/
├── index.html              → página inicial (os dois produtos)
├── produto-maria.html      → página de produto — Maria
├── produto-jesus.html      → página de produto — Jesus
├── carrinho.html           → carrinho de compras
├── checkout.html           → checkout (dados, endereço, frete, pagamento)
├── obrigado.html           → página de retorno do Mercado Pago
├── css/styles.css          → todo o visual do site
├── js/
│   ├── products.js         → ⭐ preço, estoque e textos dos produtos (edite aqui)
│   ├── cart.js              → lógica do carrinho (localStorage)
│   ├── main.js               → menu mobile, galeria, abas, contador de quantidade
│   └── checkout.js           → busca de CEP, frete estimado, envio do pedido
├── api/
│   ├── create-preference.js → cria o pagamento no Mercado Pago (Vercel Function)
│   └── webhook.js            → recebe notificações do Mercado Pago
├── assets/
│   ├── images/                → fotos e artes usadas no site
│   ├── images/originais-fornecidas/ → TODAS as imagens que você enviou, sem cortes
│   ├── videos-originais/      → os dois vídeos que você enviou
│   └── icons/sprite.svg       → ícones (não usa emoji em nenhum lugar do site)
├── package.json
├── .env.example
└── .gitignore
```

---

## 2. Testar no seu computador antes de publicar

Não precisa de Node nem de instalação para o site em si — só para o
checkout ↔ Mercado Pago funcionar, porque isso depende de uma função de
servidor (explico no item 4).

**Opção rápida (só olhar o site, sem checkout funcionando):**
Abra `index.html` direto no navegador (duplo clique).

**Opção completa (com checkout, igual à Vercel):**
```bash
npm install -g vercel        # só na primeira vez
cd mimo-divino
vercel dev
```
Isso sobe o site em `http://localhost:3000` já com as funções da pasta `api/`
funcionando.

---

## 3. Publicar: GitHub → Vercel → domínio

1. Crie um repositório no GitHub e suba esta pasta:
   ```bash
   cd mimo-divino
   git init
   git add .
   git commit -m "Primeira versão do site Mimo Divino"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/mimo-divino.git
   git push -u origin main
   ```
2. Em [vercel.com](https://vercel.com), clique em **Add New → Project** e
   importe esse repositório. Não precisa mudar nenhuma configuração — a
   Vercel detecta sozinha que é um site estático com funções em `/api`.
3. Depois do primeiro deploy, vá em **Settings → Domains** e adicione o
   domínio que você comprar.

---

## 4. Ativar o Mercado Pago (quando estiver pronto)

O checkout já está todo construído — carrinho, formulário de entrega,
cálculo de frete e a etapa de pagamento —, só falta a chave do Mercado Pago
para ele passar a processar pagamentos de verdade.

1. Crie/acesse sua conta em [mercadopago.com.br](https://www.mercadopago.com.br)
   e vá em **Seu negócio → Configurações → Credenciais**.
2. Copie o **Access Token** (use o de teste para testar, e o de produção
   quando o site já estiver no ar).
3. No painel da Vercel: **Project → Settings → Environment Variables** e
   adicione:
   | Nome | Valor |
   |---|---|
   | `MP_ACCESS_TOKEN` | seu Access Token |
   | `SITE_URL` | `https://seudominio.com.br` (depois que tiver o domínio) |
4. Clique em **Redeploy** para as variáveis entrarem em vigor.

A partir daí, o botão **"Finalizar pedido"** do checkout vai criar o
pagamento de verdade e redirecionar o cliente para o Mercado Pago (Pix,
cartão ou boleto), e trazê-lo de volta para `obrigado.html` já com o status
do pagamento.

**Enquanto a chave não estiver configurada**, o checkout continua
funcionando normalmente até o fim do formulário, e mostra um aviso amigável
no lugar de quebrar — nada de erro feio para quem estiver testando o site.

---

## 5. O que eu assumi — revise antes de publicar de verdade

Como o seu briefing original previa **um** produto e no fim vieram fotos de
**dois** (Maria e Jesus), alguns valores foram definidos por mim e precisam
da sua confirmação:

| Item | O que foi usado | Onde mudar |
|---|---|---|
| Preço | R$ 29,90 para os dois | `js/products.js` → `price` |
| Estoque | 31 unidades para cada um | `js/products.js` → `stock` |
| Pilhas | "3 pilhas pequenas, não inclusas" — o tamanho exato (AA/AAA) não dá pra confirmar só pela foto | `js/products.js` → `specs` |
| Recursos do Jesus | assumi que ele também acende e toca melodia, igual à Maria — as fotos que comprovam isso (luz e música) só mostravam o modelo da Maria | `js/products.js` → `specs`, e as seções de recursos no `index.html`/`produto-jesus.html` |
| Frete no checkout | **é uma estimativa por região**, para o fluxo funcionar de ponta a ponta. **Troque por uma cotação real** (Melhor Envio, Correios etc.) antes de publicar — ver aviso no topo de `js/checkout.js` | `js/checkout.js` → `calculateShippingEstimate()` |

---

## 6. Por que os vídeos que você enviou não estão no site

Os dois vídeos mostram os bonecos ainda dentro da caixa do fornecedor,
embalados em plástico — são vídeos de conferência de estoque, não de
demonstração do produto em uso. Coloca-los na vitrine deixaria o site com
cara de "feito às pressas", o oposto do visual profissional que você pediu.

Por isso, em vez do vídeo, simulei visualmente o efeito de respiração com uma
animação suave na foto do produto (você vai ver o boneco "pulsar" bem de
leve na seção "Você vai notar isso no primeiro abraço").

Os vídeos originais continuam no projeto, em
`assets/videos-originais/`, caso queira usá-los em redes sociais — só não
estão linkados em nenhuma página do site. Se um dia você gravar um vídeo
real do boneco "respirando" fora da embalagem, me avise: é fácil trocar a
animação por ele.

---

## 7. Sobre o tom "para todas as fés"

Você pediu um site que não soasse ligado a uma única religião. Como os
produtos em si representam Maria e o Sagrado Coração de Jesus (símbolos
católicos), não dá para deixar o site 100% neutro sem perder a identidade do
produto — mas a linguagem do site evita termos doutrinários específicos
("reza", orações etc.) e usa palavras mais universais como *cuidado*, *fé*,
*esperança* e *conforto*. Também incluí uma pergunta no FAQ respondendo
diretamente que o produto não exige nenhuma religião específica de quem
compra.

---

## 8. Avaliações de clientes

Por princípio (e porque seu briefing original pedia isso explicitamente),
**não coloquei nenhum depoimento inventado**. A seção "Avaliações" mostra
hoje um aviso honesto de que as primeiras avaliações estão a caminho. Assim
que tiver avaliações reais, há um modelo pronto em comentário HTML dentro de
`index.html`, na seção `#avaliacoes` — é só copiar e preencher.

---

## 9. Limitações que valem a pena saber

- **Não há banco de dados.** O estoque mostrado (31 unidades) é fixo no
  código — ele não desce automaticamente a cada venda. Para isso, seria
  necessário um banco de dados simples (ex.: Vercel Postgres, Supabase) e
  ligar isso ao `api/webhook.js`, que já está preparado com um comentário
  indicando onde entraria essa lógica.
- **O carrinho fica salvo só no navegador da pessoa** (localStorage) — se
  ela trocar de aparelho, o carrinho não segue junto. Para um catálogo de
  2 produtos isso não costuma ser um problema real.
- **Não há disparo automático de e-mail de confirmação.** O Mercado Pago
  envia a notificação de pagamento dele mesmo, mas um e-mail com a cara da
  sua marca precisaria de um serviço de e-mail (ex.: Resend, SendGrid)
  ligado ao `api/webhook.js`.

Nenhuma dessas limitações impede o site de vender — só valem uma lembrança
para quando o volume de pedidos crescer.
