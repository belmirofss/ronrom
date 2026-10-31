# Busca

O índice da busca do site, gerado pelo [Pagefind](https://pagefind.app) no build, sem servidor (#54, SEO-07), e a página `/busca` e o campo da home que o usam (#55, SEO-08). Os estados e o visual dos resultados são da WEB-15 (#61), [mais abaixo](#estados-da-página).

## Como o índice é gerado

A integração [`web/integracao-pagefind.mjs`](../web/integracao-pagefind.mjs), registrada no [`astro.config.mjs`](../web/astro.config.mjs), roda no `astro:build:done`: chama a API Node do Pagefind (`createIndex` → `addDirectory` → `writeFiles`) sobre a saída estática do build (`web/dist/client`) e grava o índice em `web/dist/client/pagefind/`.

A ordem importa: a integração roda **antes** do adapter da Vercel copiar `dist/client` para `.vercel/output/static`, então o índice chega ao deploy (`/pagefind/`) e ao artifact `web-dist` do CI sem cópia própria. O build termina com uma linha como:

```
[ronrom:pagefind] Índice da busca: 10 posts (pt-br) de 34 páginas lidas, em /pagefind/.
```

Erro do Pagefind derruba o build. O `pagefind` é dependência de desenvolvimento do `web`: só o build usa o pacote; o navegador carrega os arquivos gerados.

## O que entra no índice

Só as páginas de post. A [`PaginaDoPost`](../web/src/components/post/PaginaDoPost.astro) marca o `<article>` com `data-pagefind-body`, e página sem esse atributo (home, listagens, Sobre, 404) fica fora. Dentro do post:

| Parte                             | No índice? | Por quê                                                     |
| --------------------------------- | ---------- | ----------------------------------------------------------- |
| Título, subtítulo e texto         | sim        | O subtítulo tem peso 5 (`data-pagefind-weight`; o h1 tem 7) |
| Ficha da review                   | sim        | Diretor, autor, endereço, cozinha ajudam a achar a review   |
| Trilha de navegação               | não        | `data-pagefind-ignore` no próprio `Breadcrumb`              |
| Autora, data e tempo de leitura   | não        | `data-pagefind-ignore` na linha de meta                     |
| Cabeçalho, rodapé e "Leia também" | não        | Ficam fora do `<article>`                                   |

## Filtros, metadados e ordenação

Saem de [`indiceDoPost`](../web/src/lib/busca.ts) e vão num `<div hidden data-pagefind-ignore>` dentro do `<article>`. O `data-pagefind-ignore` (sem `="all"`) tira o texto do índice, mas o Pagefind ainda lê os filtros, os metadados e a ordenação de dentro dele.

**Filtros** (`data-pagefind-filter`):

| Filtro      | Valores                                        | Em         |
| ----------- | ---------------------------------------------- | ---------- |
| `tipo`      | `Review` ou `Pensamento`                       | todo post  |
| `categoria` | nome da categoria (`Filmes`, `Séries`…)        | review     |
| `formato`   | nome do formato (`Textos`, `Opiniões`…)        | pensamento |
| `nota`      | `4,5 corações`, `1 coração` (`notaPorExtenso`) | review     |

**Metadados** (`data-pagefind-meta`), o que o resultado mostra: `title`, `url`, `image`, `image_alt`, `date`, `subtitulo` e `nota`. Campo vazio não entra.

- **Use `meta.url`, não o `url` do resultado.** O Pagefind calcula o `url` a partir do arquivo (`/reviews/filmes/dias-perfeitos/`, com barra) e, com o `trailingSlash: 'never'` do site, cada clique viraria um redirect 308. O `meta.url` é o caminho do `urlDoPost`, sem barra.
- **`image`:** a capa a 320 px de largura em 4:3 (a proporção dos cards) pelo CDN do Sanity. Nas fixtures, o próprio placeholder. Post sem capa fica sem `image` declarado, e o Pagefind usa a primeira imagem do texto, se houver.
- **`date`:** a data de publicação em ISO 8601, como vem do Sanity.

**Ordenação:** `data-pagefind-sort="date"`, com a mesma data ISO, que ordena certo como texto. Na API JS: `search(termo, { sort: { date: 'desc' } })`.

## Idioma e acentos

O Pagefind usa o `lang="pt-BR"` do `<html>` e gera o índice `pt-br`, com stemming em português (o `wasm.pt-br.pagefind`). Não há `forceLanguage`: se o `IDIOMA` do site mudar, o índice acompanha.

Acentos já funcionam sem campo extra: `cafe` acha "café" e o contrário (conferido no PR da #54).

## No `astro dev`

O índice só existe depois de um `pnpm build`. No dev, a integração serve `/pagefind/` a partir de `web/dist/client/pagefind`, o índice do último build, e avisa no terminal quando ele não existe. Esse índice pode estar desatualizado em relação ao conteúdo do dev; para atualizar, rode o build de novo.

## CSP

O Pagefind roda num Web Worker e compila WebAssembly, então o `script-src` tem `'wasm-unsafe-eval'` (libera só a compilação de WASM, não o `eval` de JavaScript). Veja [`cabecalhos.md`](cabecalhos.md#csp).

## Tamanho

Com as fixtures (10 posts), a primeira busca baixa cerca de 170 kB antes de compressão: `pagefind.js` (45 kB), `pagefind-worker.js` (41 kB), o WASM `pt-br` (72 kB, já comprimido) e um pedaço do índice (7 kB). O Pagefind divide o índice em pedaços e só baixa os dos termos buscados, então o total cresce devagar com o número de posts. A meta da #54 é ficar abaixo de ~300 kB na primeira busca.

## A página `/busca`

[`busca.astro`](../web/src/pages/busca.astro) é estática: quem busca é o script da página, no navegador. O estado, o carregamento do índice e o formato dos resultados ficam em [`busca-cliente.ts`](../web/src/lib/busca-cliente.ts), separado do `busca.ts` do build para não levar o código do Sanity ao navegador (testes em [`busca-cliente.test.ts`](../web/src/lib/busca-cliente.test.ts)).

**O campo de busca** ([`CampoDeBusca`](../web/src/components/busca/CampoDeBusca.astro)) é um `<form role="search" action="/busca" method="get">` com `input type="search" name="q"`. Na home, fica ao lado das abas e funciona sem JS: o navegador abre `/busca?q=café`. Na `/busca`, o mesmo componente recebe os filtros e o script assume o envio.

**Estado na URL.** A página lê e mantém sincronizados:

| Parâmetro     | Valor                                                | Filtro do Pagefind              |
| ------------- | ---------------------------------------------------- | ------------------------------- |
| `?q=`         | o termo                                              | (o termo da busca)              |
| `?tipo=`      | `review` ou `pensamento`; outro valor é ignorado     | `tipo` (`Review`, `Pensamento`) |
| `?categoria=` | nome da categoria ou do formato (`Filmes`, `Textos`) | `categoria` **ou** `formato`    |

Digitar troca a entrada do histórico (`replaceState`); enviar e trocar filtro criam uma nova (`pushState`), e o Voltar refaz a busca anterior. Sem termo, só com filtro (`/busca?categoria=Filmes`), a página lista os posts do filtro do mais recente para o mais antigo; com termo, a ordem é a de relevância. Sem termo nem filtro, pede para digitar algo.

**Carregamento.** O `pagefind.js` é importado só na primeira busca (`import()` com `@vite-ignore`, porque o arquivo só existe na saída do build), com `excerptLength: 24`. Cada busca espera 200 ms sem digitação nova, e uma resposta que chega depois de outra busca é descartada. Se o índice não carregar (no dev sem build, por exemplo), a página diz que a busca não carregou, e a próxima busca tenta de novo.

**Resultados.** O tipo `ResultadoDeBusca` é o contrato com a UI:

| Campo                | De onde vem                                    |
| -------------------- | ---------------------------------------------- |
| `url`                | `meta.url` (sem barra), ou o `url` sem a barra |
| `title`              | `meta.title`                                   |
| `excerpt`            | trecho do Pagefind, com o termo em `<mark>`    |
| `image`, `image_alt` | `meta.image`, `meta.image_alt`                 |
| `tipo`               | filtro `tipo` (`review` ou `pensamento`)       |
| `categoria`          | filtro `categoria` ou `formato`                |
| `nota`               | `meta.nota` (`4,5 corações`)                   |
| `data`               | `meta.date` (ISO 8601)                         |

O `excerpt` vai para o `innerHTML`: o Pagefind escapa o texto do post e só acrescenta os `<mark>`. Os outros campos entram como texto. A página mostra 10 resultados e um botão "Carregar mais", que busca os dados só dos 10 seguintes e leva o foco ao primeiro deles.

**Contagem, filtros e estados.** A contagem ("3 resultados para “café”.", "Nenhum resultado para “x”.") e os estados de carregando e erro saem num `role="status"` com `aria-live="polite"`. Os selects de tipo e categoria são montados com o `pagefind.filters()` do índice inteiro, com o total de posts de cada valor; categorias e formatos ficam numa lista só.

### Estados da página

O visual da WEB-15 (#61), todo com os tokens do site. A página usa a API JS do Pagefind e monta os resultados ela mesma, sem a UI pronta (`pagefind-ui`), então não há variáveis CSS do Pagefind para mapear: os estilos ficam no `busca.astro`.

| Estado           | Na tela                                                                                                                                     | No `role="status"`                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Digite algo      | só o texto do status                                                                                                                        | "Digite algo para buscar nas reviews e nos pensamentos."   |
| Carregando       | 3 resultados de [`Esqueleto`](../web/src/components/ui/Esqueleto.astro) na primeira busca; depois, a lista anterior esmaecida (`aria-busy`) | "Buscando…"                                                |
| Resultados       | a lista, com o termo em `<mark>` creme                                                                                                      | "3 resultados para “café”."                                |
| Nenhum resultado | o `EstadoVazio` com o termo buscado (ou "com esses filtros", sem termo)                                                                     | "Nenhum resultado para “x”.", visível só ao leitor de tela |
| Erro             | só o texto do status                                                                                                                        | "A busca não carregou. Recarregue a página…"               |

Cada resultado é um card clicável com um link só, o do título: o Tab passa de resultado em resultado, e o anel de foco contorna o card inteiro (`.card-clicavel`). O campo de busca (`CampoDeBusca`) é o mesmo da home: pílula com a lupa decorativa, borda vinho no hover e no foco, e o botão "Buscar".

**Sem JS** a parte interativa fica `hidden`, e um `<noscript>` explica que a busca precisa de JavaScript e lista as listagens (todos os posts, reviews e categorias, pensamentos e formatos).

**SEO.** `noindex,follow` em produção, canonical `/busca` sem parâmetros e fora do sitemap ([seo-urls.md](seo-urls.md#busca)).

## Como conferir

Depois de `pnpm build`, rode `pnpm dev` e, no console do navegador em qualquer página:

```js
const pagefind = await import('/pagefind/pagefind.js');
await pagefind.init();
const { results } = await pagefind.search('wenders', { filters: { tipo: 'Review' } });
await results[0].data(); // meta, filters, excerpt
await pagefind.filters(); // contagem por filtro
```
