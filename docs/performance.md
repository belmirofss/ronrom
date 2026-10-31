# Performance e Lighthouse CI

As metas de performance do site, o orçamento de tamanho e como o Lighthouse CI as confere em cada deploy. Definido na #60 (SEO-13). Core Web Vitals contam para o ranking do Google, então uma regressão precisa aparecer no PR, antes do merge.

## Metas

| O quê                                   | Meta     | No preview do PR | Em produção |
| --------------------------------------- | -------- | ---------------- | ----------- |
| Lighthouse SEO                          | ≥ 95     | erro             | erro        |
| Lighthouse Acessibilidade               | ≥ 95     | erro             | erro        |
| Lighthouse Best Practices               | ≥ 95     | erro             | erro        |
| Lighthouse Performance (celular)        | ≥ 90     | aviso            | erro        |
| LCP (Largest Contentful Paint)          | < 2,5 s  | aviso            | erro        |
| CLS (Cumulative Layout Shift)           | < 0,1    | aviso            | erro        |
| TBT (Total Blocking Time, o INP do lab) | < 200 ms | aviso            | erro        |
| JS por página (gzip)                    | ≤ 50 KB  | erro             | erro        |
| Peso total da home (gzip)               | ≤ 1 MB   | erro             | erro        |
| Auditoria `is-crawlable` (SEO)          | passa    | fora (noindex)   | erro        |

Performance e as métricas só avisam no preview porque o runner do Actions varia muito de uma execução para outra: um erro ali bloquearia PR sem regressão. Em produção, onde a falha não bloqueia nada (o merge já aconteceu), elas viram erro para a regressão não passar quieta.

## Como roda

O workflow [`lighthouse`](../.github/workflows/lighthouse.yml) roda o [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) pela action [`treosh/lighthouse-ci-action`](https://github.com/treosh/lighthouse-ci-action), no perfil de celular do Lighthouse (Moto G Power, 4G lento, CPU 4x mais lenta), **3 execuções por página**, com a **mediana** como resultado.

**Gatilho.** A Vercel deste projeto não cria GitHub Deployments (só os commit statuses `Vercel – ronrom`), então o `deployment_status` nunca dispararia. Ela manda, a cada deploy pronto, um [`repository_dispatch`](https://vercel.com/docs/git/vercel-for-github) do tipo `vercel.deployment.success`, com a URL, o ambiente e o commit. O workflow:

1. ignora os eventos do `ronrom-previa` (a prévia de rascunhos manda os dela também);
2. marca o commit do deploy com o status `lighthouse (preview)` ou `lighthouse (producao)`, em andamento. É esse status que aparece nos checks do PR, porque o `repository_dispatch` roda na `main`, não no PR;
3. espera o `/api/health` do deploy responder com o commit certo (até 5 minutos);
4. escolhe as páginas e roda o Lighthouse;
5. publica os relatórios como artifact e o resultado no commit.

Um deploy cancelado pelo Ignored Build Step (PR que só mexe em `docs/`, `.github/` ou `.md`, veja [`ambientes.md`](ambientes.md#ignored-build-step)) não gera evento, e o PR fica sem o status `lighthouse`. Um push novo no PR cancela a execução do deploy anterior.

**As 5 páginas de referência:**

| Página        | Qual                                                       |
| ------------- | ---------------------------------------------------------- |
| Home          | `/`                                                        |
| Um review     | o review mais recente do `/posts-index.json` do deploy     |
| Um pensamento | o pensamento mais recente do `/posts-index.json` do deploy |
| Uma listagem  | `/reviews`                                                 |
| Busca         | `/busca`                                                   |

O review e o pensamento saem do próprio deploy porque o preview lê o dataset `development` e a produção, o `production`: um slug fixo existiria só num deles. Sem nenhum review ou pensamento publicado, a página fica de fora, com um aviso.

**Preview e produção:**

|                   | Preview (todo PR)                          | Produção (todo deploy da `main`, inclusive o rebuild diário) |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------ |
| URL               | a do deploy (`ronrom-<hash>-….vercel.app`) | o domínio do site (`SITE_URL`), o que o Google vê            |
| Vercel Auth       | passa com o segredo da Protection Bypass   | não tem                                                      |
| `is-crawlable`    | fora: todo preview tem `noindex` (#52)     | dentro                                                       |
| Performance e CWV | aviso                                      | erro                                                         |

As visitas do Lighthouse em produção não contam no "Mais lidos": o `isbot` reconhece o user agent `Chrome-Lighthouse` ([`visualizacoes.md`](visualizacoes.md)). O Umami também descarta robôs pelo user agent.

## Orçamento

O [`budget.json`](../budget.json) tem uma linha por limite: o padrão de URL das páginas (expressão regular), o tipo de recurso do Lighthouse (`script`, `total`, `image`, `font`, `stylesheet`…) e o máximo em KB transferidos, já com gzip.

O Lighthouse 12 tirou o suporte aos budgets nativos, então o [`lighthouserc.cjs`](../lighthouserc.cjs) transforma cada linha numa asserção do `resource-summary`. Para mudar um limite, mude o `budget.json` no PR, com o motivo na descrição.

**Pagefind.** O orçamento de JS não conta o Pagefind sob demanda: ele só entra na `/busca`. Lá, o `pagefind.js` (cerca de 14 KB) carrega com a página e entra na conta, então a `/busca` tem, na prática, um limite mais apertado; o índice e o WebAssembly baixam por `fetch` e não contam como script. Na última medição, a `/busca` usava cerca de 18 KB de JS, e as outras páginas, menos de 5 KB.

## Como ler o resultado

- **Nos checks do PR:** o status `lighthouse (preview)` leva à execução. Vermelho é asserção com erro; avisos não mudam a cor.
- **No resumo da execução** (Actions → a execução → Summary): a tabela com as quatro notas de cada página, na mediana, e as anotações de cada asserção que falhou ou avisou.
- **No artifact `lighthouse-preview`** (ou `lighthouse-producao`), guardado por 14 dias: o relatório HTML de cada execução, para abrir no navegador, e o JSON. O segredo da Protection Bypass sai dos arquivos antes do upload. Os relatórios não vão para o temporary-public-storage do Google: ficam só no artifact, que é privado.

Para rodar de novo contra qualquer deploy: Actions → lighthouse → Run workflow, com a URL base e o ambiente. A execução manual não marca commit.

## Rodar localmente

Na raiz, depois do `pnpm build` (com as fixtures), em Git Bash. O servidor estático do LHCI só serve as páginas com barra no final:

```bash
LHCI_AMBIENTE=preview pnpm dlx @lhci/cli@0.15.1 collect --config=lighthouserc.cjs --staticDistDir=web/dist/client --url=http://localhost/ --url=http://localhost/reviews/ --url=http://localhost/busca/
```

```bash
LHCI_AMBIENTE=preview pnpm dlx @lhci/cli@0.15.1 assert --config=lighthouserc.cjs
```

O resultado fica em `.lighthouseci/` (fora do Git). As notas de Performance locais não valem como referência: dependem da máquina.

## Configuração

Feito uma vez, pelo dono do repositório:

1. Na Vercel, no projeto `ronrom`: Settings → Deployment Protection → **Protection Bypass for Automation** → gere o segredo (se ainda não existir).
2. No GitHub: Settings → Secrets and variables → Actions → **New repository secret**, com o nome `VERCEL_AUTOMATION_BYPASS_SECRET` e o segredo do passo 1. Sem ele, a execução do preview falha logo no começo, com o motivo.
3. Depois do merge deste workflow, abra um PR qualquer e confira que o status `lighthouse (preview)` aparece. Se nenhuma execução aparecer em Actions → lighthouse depois do deploy, a Vercel não está mandando o `repository_dispatch`: confira a integração com o GitHub em Settings → Git, no projeto da Vercel.

## Core Web Vitals de campo

O Lighthouse mede no laboratório, num celular simulado. O que conta para o ranking são os dados de **campo**, dos visitantes reais no Chrome, agregados no [CrUX](https://developer.chrome.com/docs/crux) (Chrome UX Report) nos últimos 28 dias, no percentil 75. As metas de campo são as mesmas: LCP < 2,5 s, INP < 200 ms e CLS < 0,1.

Onde acompanhar, uma vez por mês e depois de mudança grande de layout:

- **Google Search Console → Experiência → Core Web Vitals** (depois da #64): agrupa as URLs com problema, separadas em celular e computador, e permite pedir a validação depois de uma correção. É o relatório principal.
- **[PageSpeed Insights](https://pagespeed.web.dev)** com uma URL do site: a parte de cima mostra o CrUX da página e do site inteiro; a de baixo é um Lighthouse avulso.
- **[CrUX Vis](https://cruxvis.withgoogle.com)**: a evolução das métricas do site ao longo dos meses.

**Site com pouco tráfego não tem dados de campo.** O CrUX só publica uma página ou um site com visitas suficientes, então no começo os três mostram "dados insuficientes". Até lá, o Lighthouse CI é o único sinal.

**Vercel Speed Insights** (RUM da própria Vercel) é opcional e fica desligado: no Hobby, a cota de eventos é pequena e o script seria mais um na página (e na CSP, em [`cabecalhos.md`](cabecalhos.md)). Vale ligar se os dados do CrUX demorarem e houver uma suspeita concreta de regressão no campo.

## Pendências conhecidas

- **CLS da `/busca`:** na medição da #60, com as fixtures, a `/busca` teve CLS de 0,34. O campo de busca só aparece quando o script roda (`hidden` sai no fim do carregamento) e empurra o rodapé para baixo. No preview isso é aviso; em produção, o status `lighthouse (producao)` fica vermelho até a correção, prevista junto com o visual definitivo da busca (#61).
