# URLs, slugs e URL base

Política de URLs do site (`web/`), definida na #13 (SEO-01). Canonical, sitemap, RSS, JSON-LD, redirects e o contador de visualizações partem daqui. Para mudar uma regra deste documento, abra um PR que altere o doc junto com o código.

## Regras gerais

- **Uma URL por página.** Toda página tem exatamente um endereço público; as outras variantes redirecionam ou dão 404.
- **Sem barra no final** (decidido na #1): `/reviews/filmes/dias-perfeitos`, nunca `/reviews/filmes/dias-perfeitos/`. A única URL que termina em `/` é a home.
- **Só minúsculas, sem acento, palavras separadas por hífen.** Vale para todo segmento: rotas fixas, categorias, formatos, tags e posts.
- **Caminhos em português**, iguais aos da navegação: `reviews`, `pensamentos`, `sobre`, `busca`, `pagina`.
- **Domínio nunca fica no código.** Links internos são caminhos relativos à raiz (`/sobre`); só canonical, `og:url`, sitemap, RSS e JSON-LD usam URL absoluta, sempre montada por `canonicalUrl` (veja [Helpers de rota](#helpers-de-rota)).

## URL base

O `site` do [`astro.config.mjs`](../web/astro.config.mjs) vem da variável `SITE_URL` (#8), e o código lê o mesmo valor por `URL_DO_SITE`, de [`@/lib/utils/site`](../web/src/lib/utils/site.ts). A ordem de resolução:

1. `SITE_URL`, quando definida (obrigatória em produção);
2. nos previews da Vercel, `https://` + `VERCEL_URL` (a URL do próprio deploy);
3. no resto (local e CI), `https://ronrom-blog.vercel.app`, o domínio de lançamento (#1, #10).

Onde cada valor é cadastrado: [`docs/ambientes.md`](ambientes.md#variáveis-de-ambiente). O domínio padrão aparece só no `astro.config.mjs` e no `web/.env.example`; qualquer outro lugar que precise da URL base usa `URL_DO_SITE` ou `canonicalUrl`.

**Troca para `ronrom.com.br` (#63):** mudar `SITE_URL` em Production na Vercel e redeployar já atualiza canonical, sitemap, RSS e JSON-LD. O domínio antigo passa a redirecionar para o novo (308, em Settings → Domains), e o Search Console recebe a mudança de endereço (#64). Os caminhos não mudam.

## Barra no final e formato do build

| Onde                                          | Configuração                | Efeito                                                                            |
| --------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| [`astro.config.mjs`](../web/astro.config.mjs) | `trailingSlash: 'never'`    | Rotas sob demanda e `astro dev` só aceitam a URL sem barra                        |
| [`astro.config.mjs`](../web/astro.config.mjs) | `build.format: 'directory'` | `src/pages/sobre.astro` gera `sobre/index.html`                                   |
| [`vercel.json`](../web/vercel.json)           | `"trailingSlash": false`    | A Vercel serve `sobre/index.html` em `/sobre` e redireciona `/sobre/` com **308** |

Por que `directory` e não `file`: o adapter `@astrojs/vercel` (#9) impõe `build.format: 'directory'` e traduz `trailingSlash: 'never'` para o `trailingSlash: false` da Vercel no `.vercel/output/config.json`. Deixar o mesmo valor explícito no `astro.config.mjs` e no `vercel.json` mantém o comportamento igual antes e depois do adapter. O adapter acusa erro se o `vercel.json` tiver `"trailingSlash": true`, que causaria loop de redirect.

Consequências:

- Nas páginas estáticas, quem redireciona a variante com barra é a Vercel, não o Astro. Em `astro dev`, `/sobre/` mostra um aviso do Astro em vez de redirecionar; é esperado.
- No build, `Astro.url.pathname` termina em `/` (efeito do formato `directory`). Não use `Astro.url` para montar canonical ou links: use os helpers de `rotas.ts`.
- `/sobre/index.html` pode responder 200, porque é o arquivo físico. Ninguém linka para ele e o canonical aponta para `/sobre`, então não vira conteúdo duplicado.
- A Vercel diferencia maiúsculas: `/Sobre` dá 404.

Para conferir num deploy (preview logado no navegador ou produção):

```bash
curl -sI https://ronrom-blog.vercel.app/sobre/
```

A resposta esperada é `308` com `location: /sobre`.

## Mapa de rotas

| Rota                                   | Arquivo em `src/pages`               | Conteúdo                                   | Indexável                | Issue |
| -------------------------------------- | ------------------------------------ | ------------------------------------------ | ------------------------ | ----- |
| `/`                                    | `index.astro`                        | Home                                       | sim                      | #44   |
| `/posts`                               | `posts/index.astro`                  | Todos os posts, mais recentes primeiro     | sim                      | #46   |
| `/reviews`                             | `reviews/index.astro`                | Todas as reviews                           | sim                      | #46   |
| `/reviews/[categoria]`                 | `reviews/[categoria]/index.astro`    | Reviews de uma categoria                   | sim                      | #46   |
| `/reviews/[categoria]/[slug]`          | `reviews/[categoria]/[slug].astro`   | Post do tipo review                        | sim, salvo `seo.noindex` | #42   |
| `/pensamentos`                         | `pensamentos/index.astro`            | Todos os pensamentos                       | sim                      | #46   |
| `/pensamentos/[formato]`               | `pensamentos/[formato]/index.astro`  | Pensamentos de um formato                  | sim                      | #46   |
| `/pensamentos/[formato]/[slug]`        | `pensamentos/[formato]/[slug].astro` | Post do tipo pensamento                    | sim, salvo `seo.noindex` | #42   |
| `/tags/[tag]`                          | `tags/[tag]/index.astro`             | Posts de uma tag                           | sim                      | #46   |
| `{listagem}/pagina/[n]`                | `{listagem}/pagina/[n].astro`        | Página `n` (a partir de 2) de uma listagem | sim, canonical para si   | #46   |
| `/sobre`                               | `sobre.astro`                        | Autora (texto do CMS)                      | sim                      | #47   |
| `/busca`                               | `busca.astro`                        | Busca do Pagefind (`/busca?q=termo`)       | não: `noindex,follow`    | #55   |
| `/privacidade`                         | `privacidade.astro`                  | Política de privacidade                    | sim                      | #59   |
| qualquer URL inexistente               | `404.astro` (gera `404.html`)        | Página não encontrada, com status 404      | não                      | #47   |
| `/rss.xml`                             | `rss.xml.ts`                         | Feed dos últimos 30 posts                  | —                        | #52   |
| `/sitemap-index.xml`, `/sitemap-*.xml` | gerados pelo `@astrojs/sitemap`      | Sitemap só com URLs canônicas              | —                        | #52   |
| `/robots.txt`                          | `robots.txt.ts`                      | Libera produção, bloqueia o resto          | —                        | #52   |
| `/posts-index.json`                    | `posts-index.json.ts`                | Dados dos cards para "Mais lidos"          | —                        | #57   |
| `/pagefind/*`                          | gerado no build                      | Índice da busca                            | —                        | #54   |
| `/api/health`                          | `api/health.ts` (sob demanda)        | Fumaça do deploy                           | —                        | #9    |
| `/api/views`                           | `api/views.ts` (sob demanda)         | Registra visualização (`POST {id}`)        | —                        | #56   |
| `/api/mais-lidos`                      | `api/mais-lidos.ts` (sob demanda)    | Ranking (`?limite=10`)                     | —                        | #57   |

Os nomes de arquivo são a sugestão para as issues de cada página; o que não pode mudar sem PR neste doc é a **rota pública**. Não existem `/tags` (índice de tags), `/reviews/[categoria]/[slug]/` com barra nem rota com `.html`. A home não é paginada.

### Paginação

- Listagens paginadas: `/posts`, `/reviews`, `/reviews/[categoria]`, `/pensamentos`, `/pensamentos/[formato]` e `/tags/[tag]`, com 12 itens por página (#1).
- A página 1 é a própria listagem. A página 2 em diante fica em `{listagem}/pagina/[n]`, por exemplo `/reviews/filmes/pagina/2` e `/tags/cafe/pagina/3`.
- `/pagina/1`, `/pagina/0` e páginas além da última não são geradas e dão 404 (critério da #46).
- Cada página tem canonical para ela mesma e fica indexável (#52); `prev`/`next` saem da camada de dados da listagem.

### Busca

`/busca` recebe o termo em `?q=`. É a única página com query string; o canonical é sempre `/busca`, sem parâmetros, e a página fica fora do sitemap. Nenhuma outra página usa parâmetros: filtros e paginação viram caminho.

### Slugs reservados

`pagina` não pode ser slug de categoria, formato, tag nem post: `/reviews/pagina/2` precisa significar sempre "página 2 das reviews". A validação de slug do Studio (#18, #19) recusa esse valor.

## Slugs

### Formato

- Expressão: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (minúsculas, números e hífens simples, sem hífen no começo ou no fim).
- Gerado do nome/título pelo `slugify` compartilhado do Studio ([`studio/lib/slug.ts`](../studio/lib/slug.ts), #18): normaliza para NFD, remove os acentos e a cedilha, passa para minúsculas, troca tudo o que não é letra ou número por hífen e junta hífens repetidos. Não remove palavras como "e" ou "de".
- Até 96 caracteres (limite padrão do campo slug do Sanity); o ideal é ficar em torno de 60.

| Título                   | Slug                     |
| ------------------------ | ------------------------ |
| Séries                   | `series`                 |
| Restaurantes e cafés     | `restaurantes-e-cafes`   |
| Opiniões                 | `opinioes`               |
| Café com pão de queijo   | `cafe-com-pao-de-queijo` |
| O Poderoso Chefão (1972) | `o-poderoso-chefao-1972` |
| Ação & aventura!         | `acao-aventura`          |

### Categorias (reviews)

Fixas: o script da #18 ([`studio/scripts/criar-taxonomia.ts`](../studio/scripts/criar-taxonomia.ts), dados em [`studio/lib/taxonomia.ts`](../studio/lib/taxonomia.ts)) cria estes documentos com `_id` fixo, em `development` e `production`.

| Nome                 | Slug                   | `_id`                            | `modeloFicha` | URL                             |
| -------------------- | ---------------------- | -------------------------------- | ------------- | ------------------------------- |
| Filmes               | `filmes`               | `categoria-filmes`               | `filme`       | `/reviews/filmes`               |
| Séries               | `series`               | `categoria-series`               | `serie`       | `/reviews/series`               |
| Livros               | `livros`               | `categoria-livros`               | `livro`       | `/reviews/livros`               |
| Restaurantes e cafés | `restaurantes-e-cafes` | `categoria-restaurantes-e-cafes` | `lugar`       | `/reviews/restaurantes-e-cafes` |
| Lugares              | `lugares`              | `categoria-lugares`              | `lugar`       | `/reviews/lugares`              |
| Comidas              | `comidas`              | `categoria-comidas`              | `comida`      | `/reviews/comidas`              |

### Formatos (pensamentos)

| Nome          | Slug       | `_id`              | URL                     |
| ------------- | ---------- | ------------------ | ----------------------- |
| Artigos       | `artigos`  | `formato-artigos`  | `/pensamentos/artigos`  |
| Textos        | `textos`   | `formato-textos`   | `/pensamentos/textos`   |
| Frases soltas | `frases`   | `formato-frases`   | `/pensamentos/frases`   |
| Opiniões      | `opinioes` | `formato-opinioes` | `/pensamentos/opinioes` |

O nome exibido pode mudar à vontade; o slug de categoria e de formato fica congelado, porque trocá-lo muda a URL de todos os posts daquela categoria. Se for inevitável, entra como redirect do caminho inteiro (`/reviews/antigo/[slug]` → `/reviews/novo/[slug]`) no mecanismo da #53, no mesmo PR.

### Posts e tags

- **Post:** slug gerado do título, **único entre todos os posts** (não só dentro da categoria), para que o slug sozinho identifique o post na URL e nos redirects. A URL inclui a categoria ou o formato, mas o slug não repete essa informação.
- **Tag:** slug gerado do nome, único entre as tags. A autora cria tags novas direto do post (#18).
- **Mudou o slug, a categoria ou o formato de um post publicado?** A URL antiga vira um redirect 301 para a nova no próximo build (#53). Para cobrir também a troca de categoria/formato, o `slugsAnteriores` guarda o **caminho completo** antigo (`/reviews/filmes/slug-antigo`), não só o slug. Quem preenche é o botão "Publicar" do Studio (#19): ao publicar um post que já estava no ar com outro endereço, ele acrescenta o caminho publicado à lista e tira dela o caminho novo, se a autora voltou a um endereço antigo. O Studio também mostra um aviso (não erro) no slug, na categoria e no formato quando eles diferem da versão publicada.

## Identificador estável do post

O identificador de um post em tudo o que precisa sobreviver a uma troca de slug é o **`_id` do documento publicado no Sanity**, nunca o slug nem a URL:

- contador de visualizações (`POST /api/views {id}` e o membro do sorted set `views:all`, #56);
- ranking de "Mais lidos" e o `/posts-index.json`, que juntam os dois lados pelo `_id` (#57);
- metadado `id` nos resultados do Pagefind, quando a busca precisar cruzar dados (#54);
- chaves de cache e listas geradas no build (por exemplo, a lista de `_id` válidos que a function do contador importa).

Regras:

- Use o `_id` sem o prefixo `drafts.`. Rascunho nunca conta visualização nem entra no ranking.
- O `_id` é gerado pelo Studio na criação do post e não muda. **Duplicar e apagar um post para "renomear" zera o contador**: troque o slug no próprio documento.
- A URL é sempre derivada do post atual com `urlDoPost`, nunca guardada junto da contagem.
- No JSON-LD, o `@id` das entidades continua sendo baseado na URL canônica (por exemplo, `{canonical}#post`), como pede o schema.org (#50).

## Helpers de rota

`web/src/lib/rotas.ts` (implementado na #33, com testes na #16) é a **única fonte de URLs do site**. Páginas, componentes, sitemap, RSS, JSON-LD, `<Seo>`, Pagefind e `/posts-index.json` chamam estes helpers; nenhum outro arquivo concatena caminhos de post, categoria, formato, tag ou paginação.

```ts
// Caminhos relativos à raiz, sem barra no final.
function urlDoPost(post: PostComRota): string;
function urlDaCategoria(slug: string): string; // /reviews/{slug}
function urlDoFormato(slug: string): string; // /pensamentos/{slug}
function urlDaTag(slug: string): string; // /tags/{slug}
function urlDaPagina(base: string, n: number): string;

// URL absoluta e canônica, a partir de um caminho.
function canonicalUrl(path: string): string;

// O mínimo que a consulta GROQ precisa trazer para montar a URL de um post.
type PostComRota =
  | { tipo: 'review'; slug: string; categoria: { slug: string } }
  | { tipo: 'pensamento'; slug: string; formato: { slug: string } };
```

### `urlDoPost(post)`

- Review: `/reviews/{categoria.slug}/{slug}`. Pensamento: `/pensamentos/{formato.slug}/{slug}`.
- Recebe os slugs já resolvidos pela consulta (`"slug": slug.current`, `categoria->{ "slug": slug.current }`).
- Lança erro, derrubando o build, se faltar slug, categoria (review) ou formato (pensamento), ou se algum slug não seguir o [formato](#formato). Link quebrado não chega a produção.

### `urlDaPagina(base, n)`

- `n === 1` devolve `base`; `n >= 2` devolve `{base}/pagina/{n}`.
- Lança erro para `n` que não seja inteiro maior ou igual a 1.

### `canonicalUrl(path)`

- Recebe um caminho começando com `/` e devolve a URL absoluta com `URL_DO_SITE` como origem (`new URL(path, URL_DO_SITE)`, que funciona com ou sem barra no fim da `SITE_URL`).
- Normaliza: remove query string e `#fragmento`, remove `index.html` ou `.html` do fim e remove a barra final, menos na home. Assim, `canonicalUrl('/sobre/')`, `canonicalUrl('/sobre/index.html')` e `canonicalUrl('/sobre')` dão o mesmo resultado.
- Lança erro se receber uma URL absoluta (`https://...`): a origem vem sempre da `SITE_URL`.

### Exemplos (viram casos de teste)

Com `SITE_URL=https://ronrom-blog.vercel.app`:

| Chamada                                                                                | Resultado                                                      |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `urlDoPost({ tipo: 'review', slug: 'dias-perfeitos', categoria: { slug: 'filmes' } })` | `/reviews/filmes/dias-perfeitos`                               |
| `urlDoPost({ tipo: 'pensamento', slug: 'sobre-gatos', formato: { slug: 'frases' } })`  | `/pensamentos/frases/sobre-gatos`                              |
| `urlDoPost({ tipo: 'review', slug: 'x' })` (sem categoria)                             | erro                                                           |
| `urlDaCategoria('restaurantes-e-cafes')`                                               | `/reviews/restaurantes-e-cafes`                                |
| `urlDaTag('cafe')`                                                                     | `/tags/cafe`                                                   |
| `urlDaPagina('/reviews/filmes', 1)`                                                    | `/reviews/filmes`                                              |
| `urlDaPagina('/reviews/filmes', 2)`                                                    | `/reviews/filmes/pagina/2`                                     |
| `urlDaPagina('/posts', 0)`                                                             | erro                                                           |
| `canonicalUrl('/')`                                                                    | `https://ronrom-blog.vercel.app/`                              |
| `canonicalUrl('/reviews/filmes/dias-perfeitos/')`                                      | `https://ronrom-blog.vercel.app/reviews/filmes/dias-perfeitos` |
| `canonicalUrl('/busca?q=cafe')`                                                        | `https://ronrom-blog.vercel.app/busca`                         |
| `canonicalUrl('https://outro.site/x')`                                                 | erro                                                           |

## Campos do Sanity usados pela área de SEO

Os nomes finais dos campos saem dos schemas (#18, #19, #21, #24); os do post já são os do [`studio/schemaTypes/post.ts`](../studio/schemaTypes/post.ts), os da ficha estão no [README do Studio](../studio/README.md#post), e os da autora e do site são os dos singletons [`sobre`](../studio/schemaTypes/sobre.ts) e [`configuracoes`](../studio/schemaTypes/configuracoes.ts). Toda consulta que alimenta uma página de post, listagem, sitemap, RSS ou JSON-LD traz o que estiver marcado para ela.

| Campo                                                 | Documento                     | Usado em                                                            |
| ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `_id`                                                 | post                          | Contador, ranking, `/posts-index.json`, lista de ids válidos        |
| `slug.current`                                        | post, categoria, formato, tag | URLs (`rotas.ts`)                                                   |
| `slugsAnteriores[]` (caminhos completos)              | post                          | Redirects 301 (#53)                                                 |
| `tipo` (`review` \| `pensamento`)                     | post                          | URL, JSON-LD (Review ou BlogPosting), filtros da busca              |
| `categoria->{nome, slug, modeloFicha, descricao}`     | post (review)                 | URL, breadcrumb, `itemReviewed` (#51), descrição da listagem        |
| `formato->{nome, slug, descricao}`                    | post (pensamento)             | URL, breadcrumb, `articleSection` (#50), descrição da listagem      |
| `tags[]->{nome, slug}`                                | post                          | Links de tag, `article:tag`, `keywords`, categorias do RSS          |
| `titulo`                                              | post                          | `<title>`, `og:title`, `headline`, RSS                              |
| `subtitulo`                                           | post                          | Fallback da description, metadado da busca                          |
| `capa{asset, alt, legenda, hotspot, crop}`            | post                          | `og:image` (1200×630 no hotspot), imagens do JSON-LD, RSS, cards    |
| `seo{titulo, descricao, imagem{asset, alt}, noindex}` | post                          | Sobrescreve título, description e imagem; `noindex` tira do sitemap |
| `dataDePublicacao`                                    | post                          | `article:published_time`, `datePublished`, ordenação, RSS `pubDate` |
| `_updatedAt`                                          | post, sobre                   | `article:modified_time`, `dateModified`, `lastmod` do sitemap       |
| `nota` (0,5 a 5, em meios)                            | post (review)                 | `reviewRating` (#51), metadado e filtro da busca                    |
| `ficha` (só os campos do `modeloFicha`)               | post (review)                 | `itemReviewed` tipado (#51), texto indexado pela busca              |
| `corpo` (Portable Text)                               | post                          | Fallback da description (~155 caracteres), `wordCount`, busca       |
| `texto` (Portable Text)                               | sobre                         | Conteúdo de `/sobre` (#47)                                          |
| `nome`, `bio`, `foto{asset, alt, hotspot, crop}`      | sobre                         | `Person` e `ProfilePage` (#50), barra lateral (#38)                 |
| `seo{descricao, imagem{asset, alt}}`                  | sobre, configuracoes          | Description e `og:image` de `/sobre` e o padrão do site             |
| `redes[]{rede, url}`                                  | configuracoes                 | `sameAs` do `Person` (#50)                                          |
| `fraseDaSemana{texto, autoria, data}`                 | configuracoes                 | Barra lateral (#38)                                                 |
| `postEmDestaque->`                                    | configuracoes                 | Destaque da home (#44); vazio usa o post mais recente               |

A nota vai de meio a 5 corações, em passos de meio (decidido na #1); o critério original da issue falava em 1–5.
