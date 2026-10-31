# Testes

O que é conferido automaticamente, o que é conferido à mão e como escrever os testes do site. Definido na #16 (QA-04).

## Estratégia

Poucos testes, nos lugares certos:

- **Teste unitário só onde existe lógica pura que pode quebrar sem ninguém ver:** cálculos, formatação e mapeamentos. Uma data no dia errado ou uma URL canônica com barra sobrando passam despercebidas no preview e só aparecem no Google semanas depois.
- **Componente só é testado quando tem lógica condicional relevante:** hoje, apenas o `<Seo>`, a nota em corações, a ficha da review, o texto do post, as abas e o script do analytics. O resto é markup e já é coberto pelo E2E, pelo axe e pela revisão visual.
- **Sem teste de snapshot de HTML inteiro** e sem teste do que o próprio Astro ou o Sanity garantem.
- **O teste nasce no PR do utilitário.** As issues que criam utilitários (#33, #34, #40, #51) escrevem os testes junto, cobrindo os [casos listados abaixo](#casos-por-utilitário).

## O que é automático e o que é manual

| Verificação                                         | Ferramenta                      | Onde roda                                    | Bloqueia o merge?        | Issue    |
| --------------------------------------------------- | ------------------------------- | -------------------------------------------- | ------------------------ | -------- |
| Formatação, lint e tipos                            | Prettier, ESLint, `astro check` | `ci / quality`, em todo PR                   | sim                      | #5       |
| Testes unitários e de componente                    | Vitest + Container API do Astro | `ci / unit`, em todo PR                      | sim                      | #16      |
| Build (variáveis, rotas, `urlDoPost` com slug ruim) | `astro build`                   | `ci / build`, em todo PR                     | sim                      | #5       |
| Página 404 servida com status 404                   | `scripts/conferir-404.mjs`      | `ci / build`, depois do build                | sim                      | #47      |
| Links internos e âncoras                            | lychee no HTML do build         | `ci / links`, em todo PR                     | depois de estabilizar    | #45      |
| Smoke E2E dos caminhos principais                   | Playwright                      | Contra o preview da Vercel e a produção      | sim (check do PR)        | #49      |
| Acessibilidade automatizada (WCAG 2.1 AA)           | `@axe-core/playwright`          | Junto com o E2E                              | sim (serious/critical)   | #49      |
| Performance, SEO e boas práticas                    | Lighthouse CI                   | `lighthouse`, no preview e em produção       | sim (exceto Performance) | #60      |
| Links externos quebrados nos posts                  | lychee contra o sitemap         | `links-externos`, toda segunda, abre issue   | não                      | #62      |
| Dispositivos reais (iPhone/Safari, Android/Chrome)  | à mão                           | Antes do lançamento e em mudança visual      | —                        | #67      |
| Leitor de tela (NVDA, VoiceOver, TalkBack)          | à mão                           | Auditoria (#48) e checklist de go-live (#67) | —                        | #48, #67 |
| Revisão visual em 320, 768 e 1280px                 | à mão, prints no PR             | Em todo PR que muda algo visual              | —                        | —        |
| Fluxo da autora (publicar no Studio e ver no site)  | à mão, com a autora             | Onboarding e go-live                         | —                        | #31, #67 |
| Prévia de link (WhatsApp, Instagram, Telegram)      | à mão                           | Go-live                                      | —                        | #67      |

Metas, orçamento e como ler o resultado do Lighthouse CI: [`performance.md`](performance.md).

O que fica no manual é o que uma ferramenta não julga bem: se o leitor de tela anuncia a nota de um jeito que faz sentido, se o layout está bonito num celular de verdade, se a autora consegue publicar sem ajuda. O axe e o Lighthouse pegam regressões, mas não substituem essas passadas.

## Como rodar

Na raiz do repositório:

```bash
pnpm test
```

```bash
pnpm test:watch
```

O `pnpm test` roda o `test` de todo workspace que tiver o script (hoje, `web` e `studio`) e precisa passar em menos de 1 minuto, localmente e no CI. O `pnpm test:watch` roda os testes do site de novo a cada arquivo salvo. Para rodar um arquivo só, de dentro de `web/` ou `studio/`: `pnpm exec vitest run src/lib/rotas.test.ts`.

## Links internos

O job `ci / links` roda o [lychee](https://lychee.cli.rs/) no HTML que o `ci / build` publicou como artifact (`web-dist`), sem buildar de novo e sem rede. Ele confere:

- todo link que começa com `/` (navegação, cards, paginação, CSS, fontes e ícones) aponta para um arquivo do build ou para uma pasta com `index.html`;
- todo link absoluto para o próprio site (o canonical e o RSS, por exemplo) também, porque a `SITE_URL` é remapeada para a pasta do build;
- toda âncora (`#conteudo`, `/sobre#autora`) existe como `id` na página de destino.

Links externos ficam de fora: são checados toda semana, em produção (veja [Links externos](#links-externos)). O relatório sai no resumo da execução (Actions → a execução do `ci` → Summary).

**Ainda não bloqueia o merge.** O passo do lychee tem `continue-on-error: true`: com link quebrado, o check fica verde e a execução mostra um aviso. Quando o relatório estiver limpo por alguns PRs (páginas de post e RSS no ar), apague essa linha do [`ci.yml`](../.github/workflows/ci.yml) para o job passar a falhar.

**Exclusões** ficam no [`lychee.toml`](../lychee.toml), cada uma com o motivo e, se temporária, a issue que a remove. Página que ainda não existe não entra na lista: ela é exatamente o que o relatório deve mostrar.

Para rodar localmente, com o [lychee instalado](https://lychee.cli.rs/installation/), depois do `pnpm build`, na raiz do repositório (Git Bash no Windows):

```bash
lychee --root-dir "$PWD/web/dist/client" --remap "^https://ronrom-blog\.vercel\.app(/.*)?$ file://$PWD/web/dist/client\${1}" web/dist/client
```

## Links externos

O workflow [`links-externos`](../.github/workflows/links-externos.yml) roda toda segunda às 06:23 (Brasília) e pode ser rodado à mão em Actions → links-externos → Run workflow. Ele lista as páginas do sitemap de produção (`/sitemap-index.xml`) e passa ao lychee, que baixa cada uma e checa todos os links dela, externos e internos. A configuração é o [`lychee-externos.toml`](../lychee-externos.toml), com rede, tentativas repetidas e user agent de navegador.

O resultado fica na issue **"Links quebrados"** (labels `area:qa` e `prioridade:media`):

- **com link quebrado:** abre a issue ou, se já houver uma aberta, troca a lista e comenta. O relatório agrupa os erros pela página de origem, então dá para ir direto ao post;
- **sem link quebrado:** fecha a issue aberta, com um comentário;
- **erro na execução** (sitemap fora do ar, configuração inválida): o workflow falha e a issue não muda. O GitHub avisa por e-mail quem configurou o agendamento.

Link quebrado de verdade se corrige no post, no Studio; a issue fecha sozinha na checagem seguinte (ou rode o workflow à mão). Não feche a issue à mão com o link ainda quebrado: a próxima execução abre outra.

**Sites que bloqueiam robôs** (Instagram e Threads com 429 ou login, LinkedIn com 999, Facebook, X e TikTok) ficam nas exclusões do `lychee-externos.toml`, cada um com o motivo. Se um link aparece na issue mas abre normalmente no navegador, inclua o site lá. A resposta 429 (muitas requisições) é aceita para qualquer site, porque é limite de taxa, não link quebrado.

Para rodar localmente, com o [lychee instalado](https://lychee.cli.rs/installation/), na raiz do repositório (Git Bash no Windows):

```bash
lychee --config lychee-externos.toml $(curl -fsS https://ronrom-blog.vercel.app/sitemap-0.xml | grep -o '<loc>[^<]*</loc>' | sed -e 's|<loc>||' -e 's|</loc>||')
```

## Como escrever um teste

- **Onde:** em `web/src/**/*.test.ts` (site) ou `studio/lib/**/*.test.ts` (funções puras do Studio, como o `slugify`), ao lado do arquivo testado (`rotas.ts` e `rotas.test.ts`). Arquivos fora desse padrão não rodam.
- **Imports explícitos** de `vitest` (`describe`, `it`, `expect`), sem globais.
- **Nomes em português**, descrevendo o comportamento: `it('não vira o dia seguinte às 23h30 de Brasília')`.
- **Alias e módulos virtuais funcionam:** a config ([`web/vitest.config.ts`](../web/vitest.config.ts)) usa o `getViteConfig` do Astro, então `@/…`, `astro:env/client` e `astro:assets` resolvem como no build.
- **URL base fixa:** teste que depende da `SITE_URL` (como o de `canonicalUrl`) não pode depender do `web/.env` de quem roda. Fixe o valor com um mock:

  ```ts
  import { vi } from 'vitest';

  vi.mock('astro:env/client', () => ({ SITE_URL: 'https://ronrom-blog.vercel.app' }));
  ```

- **Fuso horário:** os testes rodam sempre em UTC (`TZ=UTC` no `vitest.config.ts`), como o build da Vercel. Assim, uma data formatada sem `timeZone: 'America/Sao_Paulo'` quebra o teste também numa máquina em Brasília, e não só no CI. O [`ambiente.test.ts`](../web/src/ambiente.test.ts) falha se essa configuração sumir.
- **Sem rede:** nenhum teste chama o Sanity, o YouTube ou outro serviço. Use as [fixtures](../web/src/lib/sanity/README.md#modo-fixtures) ou objetos montados no próprio teste. Para ler as fixtures pelas funções de `conteudo.ts`, ligue o modo fixtures com um mock, como no [`conteudo.test.ts`](../web/src/lib/sanity/conteudo.test.ts):

  ```ts
  vi.mock('astro:env/server', () => ({
    SANITY_FIXTURES: true,
    SANITY_PROJECT_ID: undefined,
    SANITY_DATASET: undefined,
    SANITY_API_VERSION: '2025-02-19',
  }));
  ```

### Teste de componente

Só para os componentes listados em [Componentes](#componentes). Use a [Container API](https://docs.astro.build/en/reference/container-reference/) do Astro para renderizar o `.astro` como string e conferir o HTML:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import Coracoes from '@/components/ui/Coracoes.astro';

describe('<Coracoes>', () => {
  it('anuncia a nota com vírgula decimal', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Coracoes, { props: { nota: 4.5 } });

    expect(html).toContain('aria-label="Nota: 4,5 de 5 corações"');
  });
});
```

Confira atributos e textos que importam (`aria-label`, `role`, rótulos visíveis), não a estrutura inteira do HTML.

## Casos por utilitário

Cada item abaixo vira pelo menos um `it` no PR da issue indicada. Quem implementa pode acrescentar casos; tirar um caso pede um PR que atualize este doc.

### Tempo de leitura: `tempoDeLeitura(portableText)` (#34)

- [ ] Texto vazio (`[]`, `undefined` ou só blocos sem texto) devolve `"1 min de leitura"`, o mínimo.
- [ ] Só imagens, vídeos e embeds, sem texto: `"1 min de leitura"`. Legendas e `alt` não contam como palavras.
- [ ] Texto curto (menos de 200 palavras): `"1 min de leitura"`.
- [ ] Arredonda para cima: 201 palavras dão `"2 min de leitura"`; 400, `"2 min de leitura"`.
- [ ] Texto longo (por exemplo, 2.000 palavras): `"10 min de leitura"`.
- [ ] Conta palavras de todos os blocos de texto (parágrafos, títulos, listas, citações) e de todos os `children` de um bloco, inclusive com marcas (negrito, link).
- [ ] Espaços repetidos, quebras de linha e pontuação solta não contam como palavras.

### Datas em pt-BR: `formatarData(iso)` (#34)

- [ ] `2026-03-14T12:00:00-03:00` vira `"14 de março de 2026"` (mês por extenso e minúsculo).
- [ ] **Virada de dia:** `2026-03-14T23:30:00-03:00` (23h30 em Brasília, já 15/03 em UTC) continua `"14 de março de 2026"`. Com o fuso de teste em UTC, esse caso falha se a formatação usar UTC ou o fuso da máquina.
- [ ] O mesmo instante escrito em UTC (`2026-03-15T02:30:00Z`) dá o mesmo resultado.
- [ ] Virada de ano: `2026-12-31T23:30:00-03:00` é `"31 de dezembro de 2026"`.
- [ ] Data inválida (`''`, `'ontem'`) lança erro, em vez de mostrar `"Invalid Date"`.

### Imagens do Sanity: `fontesDaImagem(imagem, proporcao?)` (#34)

As funções de [`web/src/lib/sanity/imagem.ts`](../web/src/lib/sanity/imagem.ts) tiram o projeto do CDN da URL do asset, sem depender do `web/.env`:

- [ ] Cada URL do `srcset` tem `auto=format`, `q=75` e o `w` da largura declarada; o `src` é a maior versão.
- [ ] Larguras fixas até 1920; numa imagem menor, nenhuma passa da largura dela, e a última é a própria largura (uma imagem de 200px só tem a versão de 200px).
- [ ] `width` e `height` da maior versão, na proporção do original ou da `proporcao` pedida.
- [ ] Com `proporcao`, cada versão tem `w`, `h` e `fit=crop`, e o `rect` muda com o hotspot (à esquerda, no meio e à direita), sem sair da imagem.
- [ ] O recorte do Studio (`crop`) vira o `rect` e reduz as larguras e as dimensões.
- [ ] Sem `largura` e `altura` no asset, as dimensões saem do `_id`.
- [ ] Asset apagado devolve `null`; fora do CDN (modo fixtures), o `src` é o `url` do asset e não há `srcset`.

### Slugs e URLs (#18, #33)

O `slugify` compartilhado (#18):

- [ ] `"Café com Pão"` vira `"cafe-com-pao"` (acentos e cedilha removidos, minúsculas, espaço vira hífen).
- [ ] Todos os exemplos da tabela de [slugs do `seo-urls.md`](seo-urls.md#formato), incluindo `"Ação & aventura!"` → `"acao-aventura"`.
- [ ] Hífens repetidos viram um só, sem hífen no começo nem no fim; o resultado sempre casa com `^[a-z0-9]+(?:-[a-z0-9]+)*$`.

Os helpers de `rotas.ts` (#33):

- [ ] Todos os exemplos da tabela de [exemplos do `seo-urls.md`](seo-urls.md#exemplos-viram-casos-de-teste), um `it` por linha.
- [ ] **Barra final consistente:** nenhum helper devolve caminho terminado em `/`, salvo a home; `canonicalUrl('/sobre/')`, `canonicalUrl('/sobre/index.html')` e `canonicalUrl('/sobre')` dão o mesmo resultado.
- [ ] **URL canônica absoluta:** a origem vem da `SITE_URL` (mockada no teste), funciona com e sem barra no fim dela, e a query string e o `#fragmento` saem.
- [ ] **Paginação:** `urlDaPagina(base, 1)` é a própria `base`; `2` em diante vira `{base}/pagina/{n}`; `0`, `-1`, `1.5` e `NaN` lançam erro.
- [ ] `urlDoPost` lança erro sem slug, sem categoria (review) ou sem formato (pensamento), e com slug fora do formato (`"Dias Perfeitos"`, `"pagina"`).

### Consultas GROQ (#25)

As consultas de [`web/src/lib/sanity/consultas.ts`](../web/src/lib/sanity/consultas.ts) rodam com o `groq-js` num dataset montado no teste, com o "agora" fixo:

- [ ] Nenhuma consulta devolve rascunho (`drafts.*`), versão de release (`versions.*`) ou post com data no futuro.
- [ ] Listagens em ordem do mais recente, com a fatia da página e o total; categoria ou formato inexistente vem `null`.
- [ ] O post só é achado no tipo e na categoria (ou formato) certos, com a ficha do modelo da categoria.
- [ ] Destaque com e sem escolha nas configurações, "Leia também" na ordem de prioridade, redirects e sitemap.

### Seed de desenvolvimento (#26)

O seed grava direto pela API, sem a validação do Studio. Os testes de [`studio/lib/seed.test.ts`](../studio/lib/seed.test.ts) conferem o conteúdo de exemplo com as mesmas regras:

- [ ] A trava aceita só o dataset `development`, e o filtro do `--reset` (rodado no `groq-js`) pega `seed-*` e `drafts.seed-*`, nunca a taxonomia, os singletons ou um `_id` que só contém `seed`.
- [ ] Uma review por categoria e um pensamento por formato, com frase curta, texto longo, post sem subtítulo e um post com todos os blocos do texto.
- [ ] Cada post passa nas regras de slug, nota, data, ficha do modelo da categoria, vídeo e galeria; toda referência aponta para um documento do seed ou da taxonomia, e todo objeto em array tem `_key`.
- [ ] Duas chamadas devolvem os mesmos documentos (o seed não usa a hora atual).

### Metadados de SEO (#32)

As regras de [`web/src/lib/seo.ts`](../web/src/lib/seo.ts) e o `ogImage` de [`web/src/lib/sanity/imagem.ts`](../web/src/lib/sanity/imagem.ts):

- [ ] `resumir` devolve o texto inteiro dentro do limite, corta sem quebrar palavra, fecha com reticências sem pontuação antes delas e corta uma palavra maior que o limite.
- [ ] Description do post: `seo.descricao`, depois o subtítulo, depois o começo do corpo (sem os subtítulos do texto), depois a do site.
- [ ] `seoDoPost`: título, imagem e `noindex` do SEO quando preenchidos; a capa quando a imagem do SEO perdeu o arquivo; a categoria ou o formato como seção.
- [ ] `ogImage` pede 1200×630 em JPG, `fit=crop`, qualidade 80 e o `rect` no hotspot; sem asset ou fora do CDN do Sanity devolve `null`.
- [ ] Sem imagem, vale a `og-padrao.jpg` com URL absoluta; o alt vem do `imageAlt`, depois da imagem, depois do título.

### JSON-LD (#50)

As entidades de [`web/src/lib/jsonld.ts`](../web/src/lib/jsonld.ts), com os documentos das fixtures:

- [ ] Cada página tem o seu grafo: home (WebSite e Person), `/sobre` (com o ProfilePage), pensamento (WebPage, BlogPosting e BreadcrumbList), review (WebPage, Review e BreadcrumbList; sem autora, sem a Review) e listagem (CollectionPage e BreadcrumbList).
- [ ] Nenhum `@id` repetido no grafo e nenhuma referência para um `@id` que não está nele, inclusive sem nome no Sobre (aí não há Person).
- [ ] O BreadcrumbList repete os itens da trilha, com URL absoluta e posição a partir de 1.
- [ ] O BlogPosting tem as datas em `-03:00`, sem `keywords`, a capa do CDN em 1200×630, 1200×900 e 1200×1200 e a imagem padrão fora do CDN.
- [ ] `serializarJsonLd` não deixa `<`, `>`, `&` nem U+2028 no texto, e o JSON continua lendo o mesmo valor.
- [ ] `isoNoFuso` converte UTC para `-03:00` sem virar o dia errado e escreve meia-noite como `00`.

### Nota em corações (#35)

A conversão da nota para corações fica numa função pura, usada pelo `Coracoes.astro` e pelo JSON-LD (#51):

- [ ] Todas as notas válidas, de `0.5` a `5` em passos de `0.5` (10 casos, com `it.each`), dão o número certo de corações cheios, meios e vazios, sempre 5 no total.
- [ ] `4.5` dá 4 cheios, 1 meio e 0 vazios; `0.5` dá 0 cheios, 1 meio e 4 vazios; `5` dá 5 cheios.
- [ ] Valor inválido (`0`, `5.5`, `4.3`, `-1`, `NaN`, ausente) lança erro, para a review não sair com nota errada.
- [ ] Texto acessível com vírgula decimal: `"Nota: 4,5 de 5 corações"`, `"Nota: 5 de 5 corações"` (sem `,0`).

### Rótulo dos cards de post (#36)

As funções de [`web/src/lib/card.ts`](../web/src/lib/card.ts), usadas pelo Destaque, pelo ItemDeLista e pelo CardDePost:

- [ ] A seção do card é a categoria na review e o formato no pensamento, nunca o contrário; sem ela, lança erro.
- [ ] O rótulo junta o tipo e a seção (`["Review", "Restaurantes e cafés"]`, `["Pensamento", "Frases soltas"]`).
- [ ] O botão do destaque diz "Ler review" na review e "Ler texto" no pensamento.

### Abas e home (#44)

A tecla das [abas](../web/src/lib/abas.ts) e a lista da [home](../web/src/lib/home.ts):

- [ ] ←/→ andam uma aba e dão a volta nas pontas; Home e End vão para a primeira e a última; outras teclas não movem o foco.
- [ ] "Últimos posts" tira o destaque e completa com o post seguinte, mantém a ordem, funciona com o destaque fora da lista e devolve menos posts quando não há o bastante.

### Categoria para tipo do JSON-LD (#51)

- [ ] Uma linha por categoria (com `it.each`), com fixture de ficha preenchida: `filmes` → `Movie`, `series` → `TVSeries`, `documentarios` → `Movie`, `livros` → `Book`, `restaurantes-e-cafes` → `Restaurant` ou `CafeOrCoffeeShop`, `lugares` → `TouristAttraction`.
- [ ] Fallback: categoria desconhecida vira `Thing`, sem quebrar o build.
- [ ] Campos vazios da ficha não aparecem no JSON-LD (sem `"director": undefined` nem string vazia).
- [ ] `reviewRating` usa a mesma nota da função dos corações, com `bestRating: 5` e `worstRating: 0.5`, e não há `AggregateRating`.

### ID de vídeo do YouTube (#40)

O `videoDoLink` de [`studio/lib/video.ts`](../studio/lib/video.ts), o mesmo que valida o link no Studio e monta o player do site, com os testes em [`studio/lib/video.test.ts`](../studio/lib/video.test.ts):

- [ ] Extrai o ID (11 caracteres) dos formatos `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID`, `youtube.com/embed/ID` e `youtube-nocookie.com/embed/ID`.
- [ ] Aceita `www.` e `m.`, `http` e `https`, e ignora parâmetros extras (`&t=42s`, `?si=…`, `&list=…`) em qualquer posição.
- [ ] URL que não é do YouTube, URL sem ID ou ID com tamanho errado devolve `null`, nunca um ID errado. O site não mostra o bloco nesse caso, e o Studio recusa o link.

### Texto do post: `prepararCorpo` e links (#39)

As regras de [`web/src/lib/corpo.ts`](../web/src/lib/corpo.ts), aplicadas pelo `<CorpoDoPost>` antes de renderizar:

- [ ] A âncora de cada subtítulo é o `slugify` do texto; repetidas ganham `-2`, `-3`..., sem repetir o `id="conteudo"` do `<main>`, e um subtítulo sem letra nem número vira `secao`.
- [ ] O outline não pula nível: h1 do editor vira h2, e h3 antes de qualquer h2 também vira h2.
- [ ] Blocos sem texto (parágrafo, subtítulo ou item de lista vazio, ou só uma quebra de linha) saem; item de lista com estilo de subtítulo vira texto normal.
- [ ] Link externo só com `http`, `https` ou `mailto`; `javascript:`, `tel:`, caminho relativo e vazio viram texto.
- [ ] Link interno monta o caminho com o `urlDoPost`; destino fora do ar (`post: null`) vira texto.

### Página Sobre (#47)

As regras de [`web/src/lib/sobre.ts`](../web/src/lib/sobre.ts), com o documento `sobre` das fixtures:

- [ ] Sem o documento, ou com o texto só de blocos vazios, a página mostra o estado vazio.
- [ ] O alt da foto é o do Studio; sem ele, "Foto de {nome}".
- [ ] Os metadados usam a description e a imagem do SEO; vazios, a bio e a foto (com o alt da foto); sem documento, os padrões do site.

### Contador de visualizações (#56)

[`registrar.test.ts`](../web/src/lib/views/registrar.test.ts), com um Redis em memória no lugar do Upstash:

- uma visualização nova grava com dois comandos (`SET … NX EX 1800` e `ZINCRBY views:all`); a mesma pessoa no mesmo post grava só o `SET` e não sobe o ranking;
- fora de produção, sem `User-Agent`, com `User-Agent` de bot (inclui `curl`), com `id` que não está publicado ou com corpo inválido, nenhum comando é mandado;
- a chave `seen:` é um sha256 sem o IP em claro, igual no mesmo dia de São Paulo e diferente no dia seguinte, com outro IP, navegador, post ou segredo;
- o cliente REST manda o comando com o token e lança o erro do Upstash.

O script do navegador (5 s de leitura com a aba visível, `sendBeacon` e `sessionStorage`) é conferido à mão em produção ([`visualizacoes.md`](visualizacoes.md#conferir-em-produção)).

### Mais lidos (#57)

- [`ranking.test.ts`](../web/src/lib/views/ranking.test.ts), com um Redis em memória: o topo sai com um comando só (`ZREVRANGE views:all 0 N WITHSCORES`), do mais para o menos lido, sem posts despublicados; sem Redis, a lista vazia; o `?limite` só aceita de 1 a 20 e recusa qualquer outro parâmetro; o `Cache-Control` é o de uma hora no CDN.
- [`mais-lidos.test.ts`](../web/src/lib/mais-lidos.test.ts): a junção do ranking com o índice segue a ordem do ranking, descarta ids que não estão no índice, não repete e completa com os mais recentes.
- [`indice-de-posts.test.ts`](../web/src/lib/indice-de-posts.test.ts): cada item do `/posts-index.json` tem URL, seção, nota, miniatura e tempo de leitura resolvidos, sem o texto do corpo nem o lqip.

O script da aba (busca preguiçosa, estados, montagem dos cards) é conferido à mão: abra a aba e veja os dois `GET` no DevTools.

### Componentes

Teste de componente (Container API) existe só para estes seis:

- **`Seo.astro` (#32):** uma tag de cada (`<title>`, description, canonical, robots, `og:title`, `og:image`, `twitter:card`), canonical e `og:image` absolutos, a tagline na home, `noindex,follow` pela prop (simulando o build de produção), as metas `article:*` só em `type="article"` e o aviso no build com título acima de 65 caracteres.
- **`Coracoes.astro` (#35):** um único `role="img"` com o `aria-label` da nota, os SVGs internos com `aria-hidden="true"`, e o número de corações cheios, meios e vazios renderizados para `4.5` e `5`.
- **`FichaDaReview.astro` (#42):** os rótulos certos para cada modelo de ficha (filme, série, livro, lugar), campos vazios ocultos (sem `<dt>` sem `<dd>`), a nota em corações presente e nada renderizado para quem não é review.
- **`Abas.astro` (#44):** um `tablist` com `aria-label` e um `tab` por aba, a primeira com `aria-selected="true"` e `tabindex="0"` e as outras com `"false"` e `-1`, o `aria-controls` de cada aba apontando para o painel, cada painel com o próprio título (para funcionar sem JS) e o conteúdo do slot, nada `hidden` no HTML do build, o slot `ao-lado` fora do `tablist` e o `data-abas-evento` do analytics só quando a prop `evento` vem.
- **`Umami.astro` (#58):** em produção, o script com `defer`, o website-id, o `data-domains` no host do site, o Do Not Track e o `data-exclude-search`; nos previews ou sem o `PUBLIC_UMAMI_ID`, nenhum `<script>`. A decisão em si ([`configurarUmami`](../web/src/lib/analytics.ts)) e o `registrarEvento` sem o script também têm teste unitário. O envio de verdade é conferido à mão em produção ([`analytics.md`](analytics.md#conferir-em-produção)).
- **`CorpoDoPost.astro` (#39):** com o artigo das fixtures que tem todos os blocos, só elementos semânticos (nenhuma `<div>` além do invólucro), subtítulos h2/h3 com âncora e sem h1, a lista de subnível dentro do `<li>`, o `rel="noopener noreferrer"` no link externo, o link interno resolvido (e só texto fora do ar), toda imagem com `loading="lazy"` e `alt`, as aspas da citação em destaque com `aria-hidden`, o vídeo do YouTube e o post do Instagram só como fachada (nenhum iframe nem `src` do YouTube ou do Instagram, com o link para o original e o rótulo "Reproduzir vídeo: …") e um tipo de bloco desconhecido sem quebrar nem aparecer.
