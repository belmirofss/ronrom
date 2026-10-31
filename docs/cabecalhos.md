# Cabeçalhos, cache e redirects

Cabeçalhos HTTP de segurança e de cache do site e o mecanismo de redirects, definidos na #41 (INF-10). Os cabeçalhos ficam em [`web/vercel.json`](../web/vercel.json) (`headers`), valem para tudo o que a Vercel serve (páginas estáticas, assets, a 404 e as rotas sob demanda) e não existem no `astro dev`. Os redirects ficam em [`web/redirects.mjs`](../web/redirects.mjs).

## Cabeçalhos de segurança

| Cabeçalho                             | Valor                                                                                     | Onde        |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| `Strict-Transport-Security`           | `max-age=63072000; includeSubDomains`                                                     | tudo        |
| `X-Content-Type-Options`              | `nosniff`                                                                                 | tudo        |
| `Referrer-Policy`                     | `strict-origin-when-cross-origin`                                                         | tudo        |
| `Permissions-Policy`                  | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()`        | tudo        |
| `X-Frame-Options`                     | `DENY`                                                                                    | só produção |
| `Content-Security-Policy-Report-Only` | a [CSP](#csp), com `frame-ancestors 'none'` na produção e liberando o Studio nos previews | tudo        |
| `Reporting-Endpoints`                 | `csp="/api/csp-report"`, para onde o Chrome manda as violações                            | tudo        |

Por que assim:

- **HSTS** de dois anos, o mesmo `max-age` que a Vercel já manda nos `*.vercel.app`. Sem `preload`: só faz sentido no domínio próprio (#63), depois de ele estar estável, porque sair da lista de preload demora meses.
- **Referrer-Policy:** o player do YouTube recusa tocar sem a origem do site no `Referer`, então nada mais restrito que `strict-origin-when-cross-origin`.
- **Permissions-Policy enxuta:** desliga só o que o site nunca usa. Ela vale também para os iframes, então nada de `autoplay=()`, `fullscreen=()` ou `encrypted-media=()`, que quebrariam o player do YouTube. Só entram nomes que o Chrome reconhece: um nome desconhecido vira aviso no console.
- **Sem `Cross-Origin-Opener-Policy`:** o post do Instagram abre links em janela nova a partir do iframe, e o `same-origin` cortaria essa ligação. Não pesa na nota.

### Produção e previews

O `vercel.json` não distingue produção de preview, só o host do pedido. A primeira regra (`/(.*)`) vale para todo deploy; a segunda casa só com os hosts de produção (`ronrom-blog.vercel.app` e, desde já, `ronrom.com.br` e `www.ronrom.com.br`, da #63) e, por vir depois, sobrescreve a CSP e acrescenta o `X-Frame-Options`:

- **Produção:** `frame-ancestors 'none'` e `X-Frame-Options: DENY`. Ninguém põe o site num iframe.
- **Previews:** `frame-ancestors 'self' https://ronrom.sanity.studio http://localhost:3333`, para o Presentation do Sanity (#43) mostrar o preview dentro do Studio publicado e do Studio local.

Domínio de produção novo entra na regex do `has` da segunda regra, no mesmo PR que o configura. O teste [`csp.test.ts`](../web/src/lib/csp.test.ts) confere a regex.

## CSP

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' https://www.instagram.com https://cloud.umami.is;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://cdn.sanity.io https://i.ytimg.com;
font-src 'self';
connect-src 'self' https://cloud.umami.is https://api-gateway.umami.dev;
frame-src https://www.youtube-nocookie.com https://www.instagram.com;
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors …; report-uri /api/csp-report; report-to csp
```

| Origem                                    | Para quê                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `cdn.sanity.io`                           | Imagens do conteúdo ([`ImagemSanity`](../web/src/components/ui/ImagemSanity.astro)) |
| `i.ytimg.com`                             | Miniatura da fachada do YouTube (#40)                                               |
| `www.youtube-nocookie.com`                | Player do YouTube, depois do clique (#40)                                           |
| `www.instagram.com`                       | `embed.js` e o iframe do post, depois do clique (#40)                               |
| `cloud.umami.is`, `api-gateway.umami.dev` | Script e envio de eventos do Umami Cloud (#58)                                      |
| `data:`                                   | Imagens de placeholder das fixtures e SVGs pequenos que o Vite põe inline           |

- **Scripts:** só arquivos do próprio site, sem `'unsafe-inline'`. O Astro poria inline, dentro do HTML, os scripts menores que 4 kB (os das fachadas, por exemplo); o `vite.build.assetsInlineLimit` do [`astro.config.mjs`](../web/astro.config.mjs) desliga isso só para JS. **Não use `<script is:inline>`** nem atributos `on*=`: a CSP bloqueia. Se um dia for inevitável, acrescente o hash do script (`'sha256-…'`) ao `script-src`.
- **WebAssembly:** `'wasm-unsafe-eval'` no `script-src` deixa a busca (Pagefind, #54) compilar o WASM dela. Libera só WebAssembly, não `eval` de JavaScript. Detalhes em [`busca.md`](busca.md#csp).
- **Estilos:** `'unsafe-inline'` é necessário porque o Astro põe no HTML o `@font-face` da DM Sans e o CSS pequeno de cada página, e o `ImagemSanity` usa `style=` para o `aspect-ratio` e a cor de fundo. CSS injetado não executa código, então o risco é baixo.
- **Política dupla:** a CSP está duas vezes no `vercel.json` (previews e produção), que não aceita variável. Ao mudar uma, mude a outra: o [`csp.test.ts`](../web/src/lib/csp.test.ts) falha se elas diferirem em algo além do `frame-ancestors`.
- **Serviço novo** (outro embed, outro analytics): acrescente a origem na diretiva certa nas duas cópias e na tabela acima, no mesmo PR.

### Report-Only e a passagem para enforce

A CSP começa em `Content-Security-Policy-Report-Only`: o navegador não bloqueia nada, só avisa no console e manda o relatório. Os relatórios chegam no [`/api/csp-report`](../web/src/pages/api/csp-report.ts), que escreve uma linha `[csp] {…}` por violação no log da função (Vercel → projeto → Logs, filtre por `[csp]`). No Hobby o log fica só **1 hora**, então confira logo depois de navegar.

Para passar para o modo enforce:

1. Com a CSP em Report-Only em produção, navegue pelas páginas com cada tipo de bloco (YouTube, Instagram, imagens, analytics), com o DevTools aberto. Confira o console e os logs `[csp]`.
2. Para cada violação legítima, libere a origem nas duas cópias (e na tabela acima). Violação vinda de extensão do navegador (`chrome-extension://`, `moz-extension://`) é ruído: ignore.
   - **Vercel Toolbar nos previews:** a barra da Vercel (comentários, feedback) carrega `https://vercel.live/_next-live/feedback/feedback.js` e um iframe de `https://vercel.live`, e gera violações de `script-src-elem` e `frame-src` só nos previews (visto no preview desta PR, #41). Em produção ela não aparece. Antes do enforce, decida: liberar `https://vercel.live` só na cópia dos previews (em `script-src`, `frame-src`, `connect-src`, `img-src` e `style-src`, e ajustar o teste que compara as cópias) ou desligar a toolbar dos previews em Settings → General → Vercel Toolbar.
3. Sem violações legítimas por alguns dias de uso, troque a chave `Content-Security-Policy-Report-Only` por `Content-Security-Policy` nas duas regras do `vercel.json`, num PR próprio, e confira de novo os embeds no preview.
4. Mantenha o `report-uri`/`report-to`: com a política em vigor, os relatórios mostram o que foi bloqueado de verdade.

## Cache

| Caminho                     | `Cache-Control`                       | Quem define                                |
| --------------------------- | ------------------------------------- | ------------------------------------------ |
| `/_astro/*`                 | `public, max-age=31536000, immutable` | `vercel.json` (o adapter já manda o mesmo) |
| `/api/*`                    | `no-store`                            | `vercel.json` e cada rota                  |
| HTML e o resto de `public/` | `public, max-age=0, must-revalidate`  | padrão da Vercel                           |
| `/pagefind/*` (busca, #54)  | `public, max-age=0, must-revalidate`  | padrão da Vercel                           |

Os arquivos em `/_astro` têm o hash do conteúdo no nome, então podem ficar no cache para sempre: um build novo gera nomes novos. O HTML não pode: o navegador sempre revalida, e a CDN da Vercel guarda a página até o próximo deploy, que invalida o cache sozinho. Por isso conteúdo novo aparece assim que o rebuild termina (#17). Arquivos de `web/public` não têm hash: nunca dê cache longo para eles. O mesmo vale para `/pagefind/`: os pedaços do índice têm hash no nome, mas o `pagefind.js`, o `pagefind-entry.json` e o WASM não, e precisam mudar juntos a cada build ([`busca.md`](busca.md)).

## Redirects

Redirect fixo, de uma página que mudou de endereço ou de um atalho, entra em [`web/redirects.mjs`](../web/redirects.mjs):

```js
export const redirects = {
  '/contato': '/sobre', // 301
  '/promo': { status: 302, destination: '/reviews/cafes' }, // temporário: motivo aqui
};
```

O `astro.config.mjs` passa a lista para o `redirects` do Astro, e o adapter da Vercel transforma cada item numa rota do `.vercel/output/config.json` com o status certo, antes de procurar o arquivo estático: a URL antiga responde `301` com `Location`, sem página intermediária. Regras:

- Caminhos sem barra no final e sem domínio ([política de URLs](seo-urls.md)). A variante com barra recebe `308` para a sem barra e depois o redirect.
- `301` para mudança definitiva (o padrão); `302` só para algo temporário, com o motivo num comentário.
- Sem cadeias: aponte direto para o destino final, e ao mudar um destino atualize os redirects que apontavam para ele.
- Não redirecione um caminho que ainda existe como página: o redirect ganha e a página some.

Os redirects de post com slug, categoria ou formato alterados não entram aqui: saem do `slugsAnteriores` no Sanity, no build (#53), e se juntam a esta lista no `astro.config.mjs`. Redirect de domínio (`www` para o domínio sem `www`, `ronrom-blog.vercel.app` para o domínio próprio) é configurado em Settings → Domains da Vercel, na #63.

## Conferir

Em produção:

```bash
curl -sI https://ronrom-blog.vercel.app/ | grep -iE "strict-transport|content-security|x-frame|x-content-type|referrer|permissions|cache-control"
```

```bash
curl -sI https://ronrom-blog.vercel.app/api/health | grep -i cache-control
```

E a nota em [securityheaders.com](https://securityheaders.com/?q=https%3A%2F%2Fronrom-blog.vercel.app&followRedirects=on), que deve ser A ou melhor (A+ só depois do modo enforce). Para um asset, pegue um `/_astro/*.css` do HTML da home e confira o `immutable`. Nos previews, por causa da Vercel Authentication, confira os cabeçalhos no DevTools do navegador logado (aba Network, o documento).
