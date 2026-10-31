# Analytics

O site usa o [Umami Cloud](https://umami.is), plano **Hobby** (grátis), escolhido na #58: não usa cookies nem `localStorage`, tem eventos customizados, um painel simples para a autora e link público de compartilhamento. O Web Analytics da Vercel fica desligado (`webAnalytics: { enabled: false }` no [`astro.config.mjs`](../web/astro.config.mjs)). Plano B, se o Umami deixar de servir: [GoatCounter](https://www.goatcounter.com).

O analytics é separado do [contador de visualizações](visualizacoes.md) do "Mais lidos": o contador é anônimo, roda no nosso servidor e conta todas as leituras (menos bots), com ou sem Do Not Track. O Umami só mede o tráfego do site para a autora.

## Planos grátis comparados

Conferidos na abertura da #58 (out/2026). Reconfira antes de trocar de serviço.

| Serviço                  | Cota                                  | Retenção         | Observação                                      |
| ------------------------ | ------------------------------------- | ---------------- | ----------------------------------------------- |
| Umami Cloud Hobby        | cerca de 100 mil eventos/mês, 3 sites | cerca de 6 meses | Sem cookies, eventos customizados, link público |
| Vercel Web Analytics     | 50 mil eventos/mês                    | 1 mês            | A coleta pausa ao estourar a cota               |
| Cloudflare Web Analytics | sem teto declarado                    | —                | Amostragem; o script é muito bloqueado          |
| GoatCounter              | "uso público razoável"                | —                | Mantido por doações                             |

## Como o script entra na página

O [`Umami.astro`](../web/src/components/layout/Umami.astro) fica no `<head>` do [`LayoutBase`](../web/src/layouts/LayoutBase.astro) e só gera a tag quando as duas condições valem ([`configurarUmami`](../web/src/lib/analytics.ts)):

- o build é o de produção (`VERCEL_ENV=production`) do site: previews, `pnpm dev`, o CI e a prévia de rascunhos (projeto `ronrom-previa`, com `PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true`) saem sem o script;
- a variável `PUBLIC_UMAMI_ID` (o website-id do Umami, um UUID) está cadastrada.

```html
<script
  defer
  src="https://cloud.umami.is/script.js"
  data-website-id="…"
  data-domains="ronrom-blog.vercel.app"
  data-do-not-track="true"
  data-exclude-search="true"
  data-exclude-hash="true"
></script>
```

| Atributo              | Por quê                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `defer`               | Não trava a renderização                                                                        |
| `data-domains`        | O host do `SITE_URL`: uma cópia do build servida em outro endereço não manda nada               |
| `data-do-not-track`   | Com o Do Not Track ligado no navegador, o script não manda nada (decidido na #1)                |
| `data-exclude-search` | A URL vai sem a query string, então nenhum texto digitado (como o de uma busca) chega ao painel |
| `data-exclude-hash`   | A URL vai sem o `#…`                                                                            |

O script vem de `cloud.umami.is` e manda os eventos para `api-gateway.umami.dev` (ou para o próprio `cloud.umami.is`), as duas origens liberadas na [CSP](cabecalhos.md#csp). A tag usa `is:inline` só para o Astro não tentar empacotar um arquivo de outra origem; o código vem do `src`, então a regra de não ter script inline continua valendo.

Não há proxy pela Vercel (o item opcional da #58): um rewrite para o `script.js` reduziria o bloqueio por adblock, mas os eventos passariam pela nossa borda e o Umami veria o IP da Vercel em vez do visitante, o que estraga o país e a cidade no painel. Fica para reavaliar se o bloqueio for grande.

## Eventos customizados

Os nomes ficam em `EVENTOS`, em [`analytics.ts`](../web/src/lib/analytics.ts). Nenhum evento leva texto digitado pela pessoa.

| Evento         | Quando                                    | Dados               | Onde                                                                        |
| -------------- | ----------------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `troca-de-aba` | A pessoa troca de aba (clique ou teclado) | `{ aba }`           | Abas "Últimos posts" e "Mais lidos" da home, pela prop `evento` do `<Abas>` |
| `rss`          | Clique no link do RSS                     | —                   | Rodapé, pelo atributo `data-umami-event`                                    |
| `busca`        | Busca com resultado, depois de 1 s parada | `{ resultados }`    | `/busca` (inclui quem chega pelo campo da home)                             |
| `filtro`       | Troca de um filtro da busca               | `{ filtro, valor }` | `/busca`; `valor` é o slug escolhido ou `todos`                             |

Dois jeitos de mandar um evento:

- **Clique simples:** o atributo `data-umami-event="<evento>"` no elemento (e `data-umami-event-<campo>="…"` para os dados). O script do Umami conta o clique sozinho.
- **Pelo código:** `registrarEvento(EVENTOS.busca, { resultados: 12 })`, de `@/lib/analytics`. Sem o script (fora de produção, com Do Not Track, bloqueado ou ainda carregando), não faz nada e nunca quebra a página.

Na `/busca`, o evento `busca` só sai 1 s depois do último resultado, então digitar letra por letra conta uma busca só, e leva apenas a quantidade de resultados, nunca o texto. O Umami aceita texto, número e booleano nos dados, e nomes de evento de até 50 caracteres.

## Configurar o Umami (dono do repositório)

1. Crie a conta em [cloud.umami.is](https://cloud.umami.is) no plano Hobby e adicione o site com o domínio de produção (`ronrom-blog.vercel.app`; troque pelo da #63 quando ele entrar).
2. Copie o **Website ID** (em Settings → Websites → Edit).
3. Na Vercel, projeto `ronrom` → **Settings → Environment Variables**, cadastre `PUBLIC_UMAMI_ID` só em **Production**. Não é segredo: o valor aparece no HTML.
4. Faça um redeploy da produção.
5. Em Settings → Websites → Edit → **Share URL**, ligue o link público e mande para a autora. Ele dá acesso só de leitura ao painel, sem login.

Quando o domínio próprio entrar (#63), o `data-domains` segue o `SITE_URL` sozinho; troque também o domínio do site no Umami.

## Conferir em produção

1. Abra o site numa aba anônima, com o DevTools aberto. Na aba Network, aparecem o `script.js` de `cloud.umami.is` e um `POST` para `/api/send` em `api-gateway.umami.dev` (ou `cloud.umami.is`).
2. Em Application → Cookies e Local Storage, nada do Umami (nem do site, além do `sessionStorage` do [contador](visualizacoes.md)).
3. Troque de aba na home, clique no RSS do rodapé, faça uma busca e troque um filtro na `/busca`: os eventos aparecem em **Events** no painel em até alguns minutos.
4. Com o Do Not Track ligado (Firefox: Configurações → Privacidade → "Enviar sinal de Não rastrear"), recarregue: o `script.js` carrega, mas não sai nenhum `POST`.
5. Num preview da Vercel, o `script.js` nem aparece no HTML.

O Lighthouse Best Practices (#60) precisa seguir em 95 ou mais com o script: ele não gera erro no console, e o `defer` o tira do caminho crítico.

## Política de privacidade

A `/privacidade` (#59) precisa explicar: o analytics é o Umami Cloud, sem cookies e sem dados pessoais; respeita o Do Not Track; a URL vai sem a query string; o contador de visualizações é separado, anônimo (o IP só entra num hash que expira em 30 minutos) e conta todas as leituras, menos as de bots.
