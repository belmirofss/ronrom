# web

Site do Ronrom em Astro 7, com TypeScript no modo `strictest` e o alias `@/*` → `src/*`.

Os comandos e a estrutura de pastas estão no [README da raiz](../README.md).

## Design: tokens e CSS base

O layout "Caderno" vive em dois arquivos, importados uma vez pelo `LayoutBase`:

- [`src/styles/tokens.css`](src/styles/tokens.css): custom properties de cor, fonte, escala tipográfica, layout, espaçamento, raio, sombra e foco. **É o único arquivo com cor em hexadecimal**; o resto do site usa sempre `var(--...)`.
- [`src/styles/global.css`](src/styles/global.css): reset, tipografia padrão do `body` e dos títulos, links, foco global e os utilitários `.superficie-vinho` e `.visualmente-oculto`.

### Cores

| Token               | Valor     | Uso                                                     |
| ------------------- | --------- | ------------------------------------------------------- |
| `--cor-fundo`       | `#FBF5F1` | Fundo da página                                         |
| `--cor-texto`       | `#2E1220` | Texto principal e títulos                               |
| `--cor-texto-2`     | `#6B4655` | Texto secundário (datas, legendas, metadados)           |
| `--cor-vinho`       | `#7C0E44` | Links, destaques, fundo de blocos (`.superficie-vinho`) |
| `--cor-vinho-hover` | `#4F0729` | Hover de links e botões vinho                           |
| `--cor-malva`       | `#AA5E7A` | **Só decorativo** (formas, ícones grandes). Nunca texto |
| `--cor-rosa`        | `#D49A9A` | **Só decorativo**. Nunca texto sobre fundo claro        |
| `--cor-creme`       | `#F2DACE` | Superfícies (cards), texto e foco sobre vinho, seleção  |
| `--cor-borda`       | `#EBD3C8` | Bordas e divisórias (não é cor de texto)                |

### Regra de contraste

Toda combinação de texto e fundo precisa de **4,5:1** (WCAG AA, texto normal). Texto grande (24px, ou 18,66px em negrito) e componentes de interface (bordas de campo, ícones, anel de foco) precisam de 3:1.

- **Malva e rosa nunca em texto pequeno.** Malva no fundo dá 4,23:1 e no creme 3,42:1; rosa não passa de 2,2:1 em nenhum fundo claro. As duas são cores de ornamento.
- Rosa sobre vinho (4,44:1) só vale para texto grande.
- Sobre fundo vinho, o texto é creme (ou `--cor-fundo`), nunca `--cor-texto`.

Contrastes medidos (fórmula de luminância relativa do WCAG 2.1):

| Texto ↓ / fundo →   | fundo | creme | borda | vinho | vinho-hover |
| ------------------- | ----: | ----: | ----: | ----: | ----------: |
| `--cor-texto`       | 15,88 | 12,83 | 12,00 |     — |           — |
| `--cor-texto-2`     |  7,38 |  5,96 |  5,58 |     — |           — |
| `--cor-vinho`       |  9,70 |  7,83 |  7,33 |     — |           — |
| `--cor-vinho-hover` | 13,93 | 11,25 | 10,53 |     — |           — |
| `--cor-creme`       |     — |     — |     — |  7,83 |       11,25 |
| `--cor-fundo`       |     — |     — |     — |  9,70 |       13,93 |
| `--cor-malva` ✗     |  4,23 |  3,42 |  3,20 |  2,29 |        3,29 |
| `--cor-rosa` ✗      |  2,19 |  1,77 |  1,65 |  4,44 |        6,37 |

O anel de foco (3px, offset 2px) é vinho sobre os fundos claros (9,70:1) e creme dentro de `.superficie-vinho` (7,83:1).

### Tipografia

- **Fonte:** DM Sans 400, 500 e 700, só o subset latin, servida pelo próprio site. Os woff2 vêm do pacote `@fontsource/dm-sans` e passam pela [API de fontes do Astro](https://docs.astro.build/en/guides/fonts/) (`fonts` no `astro.config.mjs`), que gera o `@font-face` com `font-display: swap` e uma fonte de fallback (Arial) com `size-adjust`, `ascent-override` e `descent-override` calculados a partir das métricas da DM Sans. Nenhuma requisição vai para o Google Fonts. Só o woff2 400 tem `preload`.
- **Família:** `--fonte-texto` (já inclui o fallback ajustado).
- **Escala fluida** (`clamp`, de 360px a 1280px de viewport): `--texto-xs` (13→14px), `--texto-sm` (14→15), `--texto-base` (16→17), `--texto-lg` (18→20), `--texto-xl` (20→24), `--texto-2xl` (24→32), `--texto-3xl` (30→44), `--texto-4xl` (36→60) e `--texto-ronrom` (64→176px), o título gigante da home, com `--altura-linha-ronrom` e `--espacamento-ronrom`.
- **Corpo do post:** `--texto-post` (18px fixo) com `--altura-linha-post` (1,75).
- **Pesos:** `--peso-regular`, `--peso-medio`, `--peso-negrito`.

### Layout, espaçamento, raio e sombra

- `--container-max` (1120px), `--gutter` (`clamp(16px, 4vw, 40px)`) e `--coluna-leitura` (720px, a largura do texto do post).
- `--espaco-1` a `--espaco-10`: 4, 8, 12, 16, 24, 32, 48, 64, 96 e 128px.
- `--raio-sm` (4px), `--raio-md` (8px), `--raio-lg` (16px) e `--raio-pilula`.
- `--sombra-sm`, `--sombra-md` e `--sombra-lg`, feitas com `color-mix` sobre `--cor-texto`.

### Utilitários

- `.superficie-vinho`: fundo vinho, texto creme, links em creme (hover em `--cor-fundo`) e anel de foco creme.
- `.visualmente-oculto`: some da tela e continua para leitores de tela; reaparece ao receber foco (útil no link "pular para o conteúdo").

## Layouts e casca das páginas

Toda página usa um dos layouts de [`src/layouts`](src/layouts), que montam a casca comum: skip link, cabeçalho, `<main>` e rodapé.

- [`LayoutBase.astro`](src/layouts/LayoutBase.astro): `<html lang="pt-BR">`, o `<head>` com a fonte e o [`<Seo>`](#seo-meta-tags-e-ícones), o slot nomeado `head` (para o JSON-LD da página), o link "Pular para o conteúdo", o [`Cabecalho`](src/components/layout/Cabecalho.astro), o `<main id="conteudo" tabindex="-1">` com o conteúdo da página e o [`Rodape`](src/components/layout/Rodape.astro). Prop `seo` (obrigatória), repassada ao `<Seo>`.
- [`LayoutComBarraLateral.astro`](src/layouts/LayoutComBarraLateral.astro): o `LayoutBase` com uma grade conteúdo + `<aside>`. A barra lateral entra pelo slot `barra-lateral` e cai para baixo do conteúdo abaixo de 960px; sem esse slot, o conteúdo ocupa a largura toda e não há `<aside>`.
- [`Container.astro`](src/components/layout/Container.astro): centraliza o conteúdo em `--container-max` com o `--gutter` nas laterais. `largura="leitura"` usa a `--coluna-leitura` (texto do post) e `as` troca o elemento (padrão `div`).

```astro
<LayoutComBarraLateral seo={{ title: 'Reviews', description: '...', canonical: '/reviews' }}>
  <script type="application/ld+json" slot="head" set:html={JSON.stringify(jsonLd)} />
  <h1>Reviews</h1>
  <BarraLateral slot="barra-lateral" />
</LayoutComBarraLateral>
```

Regras da casca:

- **Landmarks únicos:** um `<header>`, um `<nav aria-label="Principal">`, um `<main>` e um `<footer>` por página. Páginas e componentes não criam outro `<main>`. Os únicos outros `<nav>` são o `Breadcrumb` (`aria-label="Trilha de navegação"`), a `Paginacao` (`aria-label="Paginação"`) e os dois menus da [barra lateral](#barra-lateral) (`"Categorias das reviews"` e `"Formatos dos pensamentos"`), cada um com nome próprio; os grupos de links do rodapé são listas com título, sem `<nav>`.
- **Seção atual:** o cabeçalho marca a seção com `aria-current` pelo prefixo da rota (`estadoDaSecao`, em [`src/lib/navegacao.ts`](src/lib/navegacao.ts)): `"page"` na própria página da seção (`/reviews`) e `"true"` nas páginas dentro dela (`/reviews/filmes/...`). "Início" só fica ativo em `/`.
- **Celular:** os 4 links da navegação ficam sempre visíveis, sem menu hambúrguer, e quebram linha se não couberem. Todo link do cabeçalho e do rodapé tem pelo menos 44px de altura.
- **Rodapé:** o link "Área da autora" aponta para `STUDIO_URL` (padrão `https://ronrom.sanity.studio`, veja [`docs/ambientes.md`](../docs/ambientes.md#variáveis-de-ambiente)), e o ano é o do build, no fuso de São Paulo.

## Barra lateral

A [`BarraLateral.astro`](src/components/barra-lateral/BarraLateral.astro) é o conteúdo do slot `barra-lateral` do `LayoutComBarraLateral` (home e, se quiser, as listagens). Ela mesma busca o Sanity (`buscarSobre`, `buscarConfiguracoes` e `buscarTaxonomia`), então a página só a coloca no slot. De cima para baixo:

- **Autora:** o gato do mosaico num quadrado vinho (decorativo, `aria-hidden`), "Oi, eu sou a {nome}" e a bio do singleton Sobre, com o link "Mais sobre mim" para `/sobre`. Nada da autora fica no código: sem `nome` no Sobre, o bloco some.
- **Reviews e Pensamentos:** dois `<nav>` separados, com as categorias e os formatos na ordem do menu do Studio e as URLs do `urlDaCategoria` e do `urlDoFormato`. Cada link mostra o total de posts no ar; o número fica `aria-hidden` e o leitor de tela ouve "Filmes, 3 posts" (ou "nenhum post"). Categoria sem post continua com link, porque a listagem existe vazia. O `aria-label` dos menus não é só "Reviews" e "Pensamentos" para não repetir o nome dos links do menu principal.
- **Frase da semana:** a [`FraseDaSemana.astro`](src/components/barra-lateral/FraseDaSemana.astro), com prop `frase` (o `fraseDaSemana` de Configurações do site). Bloco `.superficie-vinho` (texto creme, 7,83:1, e anel de foco creme), com `<figure>`, `<blockquote>` e a autoria, se houver, no `<figcaption>`. Sem texto (ou só com espaços), não renderiza nada.

No celular (abaixo de 960px) a barra lateral vem depois do conteúdo principal, pela ordem do HTML. Os dois menus repetem as categorias do rodapé, mas com outro papel: o rodapé não é `<nav>` e só lista as categorias. A lógica (frase vazia, URLs e o texto do total) está em [`src/lib/barra-lateral.ts`](src/lib/barra-lateral.ts), com teste.

```astro
<LayoutComBarraLateral seo={{ description: '...', canonical: '/' }}>
  <h1>...</h1>
  <BarraLateral slot="barra-lateral" />
</LayoutComBarraLateral>
```

## SEO: meta tags e ícones

O [`<Seo>`](src/components/seo/Seo.astro) concentra o `<head>` de todas as páginas, uma tag de cada: `<title>`, description, canonical, robots, Open Graph, Twitter card, o `<link>` do RSS e os ícones. Quem o renderiza é o `LayoutBase`, com a prop `seo`; a página não coloca outro `<title>` nem meta tag no slot `head`, que fica só para o JSON-LD (#50, #51).

| Prop                            | Uso                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `title`                         | Título sem o nome do site. Vira `"{title} · Ronrom"`; sem ele (a home), `"Ronrom · Reviews e pensamentos"`                  |
| `description`                   | Obrigatória. Vazia, vale a `DESCRICAO_DO_SITE` (`src/lib/utils/site.ts`)                                                    |
| `canonical`                     | Obrigatória: o caminho da página (`/sobre`). O `<Seo>` monta a URL absoluta com o `canonicalUrl`, também usada no `og:url`  |
| `image`, `imageAlt`             | Imagem do Sanity (capa, foto, imagem de compartilhamento). Sem ela, ou com o arquivo apagado, vale a `public/og-padrao.jpg` |
| `type`                          | `website` (padrão) ou `article`. Só `article` emite `article:published_time`, `modified_time`, `section` e um `tag` por tag |
| `noindex`                       | `noindex,follow` no lugar do padrão `index,follow,max-image-preview:large`                                                  |
| `publishedTime`, `modifiedTime` | Datas ISO 8601 do post (`dataDePublicacao` e `_updatedAt`)                                                                  |
| `tags`, `section`               | Nomes das tags e da categoria (review) ou do formato (pensamento)                                                           |

Regras:

- **Post:** a página do post (#42) monta as props com o `seoDoPost(post, urlDoPost(post))`, de [`src/lib/seo.ts`](src/lib/seo.ts). O título é o `seo.titulo` ou o título do post; a description é a `seo.descricao`, depois o subtítulo, depois os primeiros ~155 caracteres do texto, sem quebrar palavra; a imagem é a `seo.imagem` ou a capa.
- **Imagem de compartilhamento:** o `ogImage(imagem)` ([`src/lib/sanity/imagem.ts`](src/lib/sanity/imagem.ts)) pede ao CDN do Sanity um JPG de 1200×630 recortado no hotspot (JPG porque alguns crawlers não aceitam WebP nem AVIF). O `og:title` e o `twitter:title` vão sem o " · Ronrom", que já aparece no `og:site_name`.
- **Título longo:** acima de 65 caracteres (com o " · Ronrom"), o build mostra um aviso `[seo]` com a página. Não quebra o build: a autora encurta pelo "Título para o Google" do post.
- **Prévia de link:** depois do deploy, confira a URL no [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), no [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) e mandando o link no WhatsApp.

### Ícones e imagem de compartilhamento

Em [`public/`](public), todos com o gato do mosaico em vinho sobre rosa, o mesmo desenho do ícone do Studio (`studio/marca/IconeRonrom.tsx`):

- `favicon.svg`: o desenho original, em 32×32.
- `favicon.ico` (16, 32 e 48px), para navegadores sem SVG e leitores de RSS que pedem `/favicon.ico` direto.
- `apple-touch-icon.png` (180×180, sem cantos arredondados, que o iOS aplica sozinho).
- `og-padrao.jpg` (1200×630): o ícone sobre fundo creme, para as páginas sem imagem própria.

Os três últimos foram exportados do `favicon.svg` com o `sharp`. Se o desenho mudar, exporte de novo nos mesmos tamanhos.

## Componentes de interface

Os componentes genéricos ficam em [`src/components/ui`](src/components/ui). A lógica de cada um mora numa função pura em `src/lib`, com teste, para o JSON-LD e as páginas reaproveitarem sem passar pelo componente.

- [`Coracoes.astro`](src/components/ui/Coracoes.astro): a nota da review. Props `nota` (0,5 a 5, em passos de 0,5; fora disso o build quebra) e `tamanho` (`pequeno`, `medio` ou `grande`). Um único `role="img"` com `aria-label="Nota: 4,5 de 5 corações"` e os 5 SVGs com `aria-hidden`: o leitor de tela anuncia a nota uma vez. Coração cheio, meio ou só o contorno, tudo em vinho. A conversão está em [`src/lib/nota.ts`](src/lib/nota.ts) (`coracoesDaNota`, `rotuloDaNota` e `validarNota`, que o `reviewRating` do JSON-LD usa).
- [`ChipCategoria.astro`](src/components/ui/ChipCategoria.astro): o nome da categoria, do formato ou da tag num chip. Props `nome`, `href` (com ele, é link; sem ele, é texto, para ficar por cima da miniatura de um card que já é link) e `tom` (`creme`, com texto vinho, 7,83:1; ou `rosa`, com `--cor-texto`, 7,26:1).
- [`Breadcrumb.astro`](src/components/ui/Breadcrumb.astro): `<nav aria-label="Trilha de navegação">` com `<ol>`, separadores desenhados no CSS (nada é lido) e `aria-current="page"` no último item. Recebe `itens`, montados por `trilhaDoPost`, `trilhaDaCategoria` ou `trilhaDoFormato` ([`src/lib/trilha.ts`](src/lib/trilha.ts)); o BreadcrumbList do JSON-LD usa os mesmos itens, com `canonicalUrl(href)`.
- [`Paginacao.astro`](src/components/ui/Paginacao.astro): `<nav aria-label="Paginação">` com "Anterior", os números e "Próxima", só links (funciona sem JS). Props `base` (a URL da página 1), `atual` e `total` (de páginas, o `totalDePaginas` de `conteudo.ts`). As URLs saem do `urlDaPagina`. Mostra a primeira, a última, a atual e as vizinhas, com reticências no resto ([`src/lib/paginacao.ts`](src/lib/paginacao.ts)); a página atual tem `aria-current="page"`, e "Anterior" na primeira e "Próxima" na última ficam desabilitados (`<a>` sem `href`, fora da ordem de foco). Com uma página só, não renderiza nada.

```astro
<Breadcrumb itens={trilhaDoPost(post)} />
<Coracoes nota={post.nota} tamanho="grande" />
<ChipCategoria nome={categoria.nome} href={urlDaCategoria(categoria.slug)} />
<Paginacao base={urlDaCategoria('filmes')} atual={pagina} total={totalDePaginas(total)} />
```

- [`EstadoVazio.astro`](src/components/ui/EstadoVazio.astro): listagem sem post. Props `mensagem` (padrão "Ainda não tem nada por aqui.") e `link` (`{ rotulo, href }`, padrão "Que tal ver todos os posts?" para `/posts`), com o gato do mosaico decorativo em cima.

### Cards de post

Os três formatos de post nas listas ficam em [`src/components/post`](src/components/post). Todos recebem o card como a consulta devolve (`post`) e `nivelTitulo`, o nível do título conforme a página: h2 numa listagem, embaixo do h1; h3 embaixo de uma seção, como as abas da home ou o "Leia também".

| Componente                                                   | Onde                     | Card                                          | Mostra                                                                                                                                     | Título padrão |
| ------------------------------------------------------------ | ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| [`Destaque.astro`](src/components/post/Destaque.astro)       | Home                     | `buscarDestaque()`                            | Capa 4:3 com `prioridade`, "Destaque · Review · Filmes", título, subtítulo, corações, data, tempo de leitura e "Ler review" ou "Ler texto" | h2            |
| [`ItemDeLista.astro`](src/components/post/ItemDeLista.astro) | Abas da home e listagens | `buscarUltimos()`, `buscarPostsDoTipo()` etc. | Miniatura 4:3 com o chip da seção, "Review · Filmes", título, subtítulo, corações, data e tempo de leitura                                 | h2            |
| [`CardDePost.astro`](src/components/post/CardDePost.astro)   | "Leia também"            | `buscarLeiaTambem()`                          | Capa 4:3 com o chip da seção, título e data                                                                                                | h3            |

Regras:

- **Um link só por card, no título.** O `::after` do link cobre o card inteiro (`.card-clicavel` e `.card-clicavel__link`, em [`global.css`](src/styles/global.css)), então capa, chip e o botão do destaque também levam ao post, mas o leitor de tela e o Tab encontram um link só, com o título como nome. Nada mais dentro do card pode ser link ou botão: o chip é texto e o "Ler review" é só visual (`aria-hidden`). O anel de foco contorna o card todo.
- **Título primeiro no HTML.** O rótulo e a capa aparecem antes do título na tela, mas vêm depois dele no HTML (`order` no CSS), para quem navega por títulos ouvir o nome do post antes do resto. As capas dos cards são decorativas (`alt=""`): o título já diz do que se trata.
- **Corações só em review**, e subtítulo ausente não deixa espaço: o parágrafo não é renderizado. O rótulo e o chip saem de [`src/lib/card.ts`](src/lib/card.ts) (`rotuloDoCard`, `secaoDoCard` e `chamadaDoCard`), que quebra o build com review sem categoria ou pensamento sem formato.
- **Largura do próprio card**, não da tela: o Destaque e o ItemDeLista usam container queries, porque a coluna principal muda de largura com a barra lateral. Estreito, como no celular, a capa fica em cima do texto; título de 3 linhas ou mais e categoria longa ("Restaurantes e cafés") cabem em 320px. A prop `sizes` ajusta o `sizes` da capa quando o card fica numa coluna diferente da padrão.

```astro
<Destaque post={destaque} />
<ul role="list">
  {posts.map((post) => (
    <li>
      <ItemDeLista post={post} nivelTitulo={3} />
    </li>
  ))}
</ul>
<CardDePost post={post} />
<EstadoVazio link={{ rotulo: 'Ver todas as reviews', href: '/reviews' }} />
```

### Vitrine

Com o `pnpm dev` rodando, http://localhost:4321/vitrine/corpo mostra o [texto do post](#texto-do-post-portable-text) com todos os blocos, e http://localhost:4321/vitrine mostra todos os estados desses componentes: as 10 notas, os 3 tamanhos, os chips nos dois tons (link, estático e sobre a miniatura), trilhas de review, pensamento, categoria e formato, a paginação na primeira, no meio e na última página, os cards de post com o conteúdo do Sanity (ou das fixtures), inclusive título e categoria longos e pensamento sem subtítulo em 320px, o estado vazio, a frase da semana (com e sem autoria, longa e vazia) e a barra lateral com o conteúdo das fixtures. A página ([`src/vitrine/Componentes.astro`](src/vitrine/Componentes.astro)) fica fora de `src/pages`: uma integração no `astro.config.mjs` injeta a rota só no `astro dev`, então ela não existe no build. Componente novo em `ui/` entra na vitrine no mesmo PR.

## Imagens, datas e tempo de leitura

Componentes em [`src/components/ui`](src/components/ui) usados em quase toda página:

- [`ImagemSanity.astro`](src/components/ui/ImagemSanity.astro): toda imagem que vem do Sanity (capas, foto da autora, imagens do texto e da galeria). Props: `imagem` (o objeto que as consultas devolvem), `alt` (obrigatório; `""` só em imagem decorativa), `sizes`, `proporcao?` e `prioridade?`. Gera o `srcset` no CDN do Sanity respeitando o recorte e o hotspot, sempre com `width`, `height`, `loading="lazy"` e `decoding="async"`, e o `lqip` de fundo enquanto a imagem carrega. Como as URLs são montadas: [README do conteúdo](src/lib/sanity/README.md#imagens).
- [`Data.astro`](src/components/ui/Data.astro): `<time datetime>` com a data por extenso no fuso de Brasília (`formatarData`, em [`src/lib/utils/data.ts`](src/lib/utils/data.ts)). Prop `iso`.

```astro
<ImagemSanity
  imagem={post.capa}
  alt={post.capa.alt ?? ''}
  proporcao={21 / 9}
  sizes="100vw"
  prioridade
/>
<Data iso={post.dataDePublicacao} /> · {tempoDeLeitura(post.corpo)}
```

Regras:

- **Proporções:** `4 / 3` nas capas do destaque e dos cards, `21 / 9` na capa do post e nenhuma nas imagens do texto, que ficam com a proporção do recorte.
- **`sizes` de verdade:** é por ele que o navegador escolhe a versão. Uma capa que ocupa um terço da tela no desktop pede algo como `"(min-width: 960px) 33vw, 100vw"`; com `100vw` em tudo, o celular baixa a imagem certa, mas o desktop baixa uma grande demais.
- **`prioridade` só na imagem do LCP:** a capa do post e o destaque da home. Ela troca o `lazy` por `loading="eager"` e `fetchpriority="high"`; em qualquer outra imagem, atrasa o que importa.
- **Tempo de leitura:** `tempoDeLeitura(corpo)`, em [`src/lib/utils/leitura.ts`](src/lib/utils/leitura.ts), conta as palavras dos blocos de texto (sem legendas, `alt`, vídeos e citações em destaque) a 200 por minuto, arredonda para cima, com mínimo de 1, e devolve `"X min de leitura"`.

## Texto do post (Portable Text)

O [`CorpoDoPost.astro`](src/components/post/CorpoDoPost.astro) renderiza o `corpo` da `CONSULTA_DO_POST` com o [`astro-portabletext`](https://github.com/theisel/astro-portabletext). A página do post (#42) o coloca na coluna de leitura (`<Container largura="leitura">`): 720px, texto de 18px com entrelinha 1,75 (`--texto-post` e `--altura-linha-post`). O espaço vertical entre os blocos fica todo no `CorpoDoPost`; os blocos não têm margem própria.

```astro
<Container largura="leitura">
  <CorpoDoPost corpo={post.corpo} />
</Container>
```

| Bloco do Studio            | HTML                                                                                                                         | Componente                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Parágrafo                  | `<p>`                                                                                                                        | [`corpo/Bloco.astro`](src/components/post/corpo/Bloco.astro)                     |
| Subtítulo, subtítulo menor | `<h2 id>`, `<h3 id>`                                                                                                         | `corpo/Bloco.astro`                                                              |
| Citação                    | `<blockquote><p>`, com um fio malva à esquerda                                                                               | `corpo/Bloco.astro`                                                              |
| Listas                     | `<ul>`/`<ol>`, com o subnível dentro do `<li>`                                                                               | padrão do `astro-portabletext`                                                   |
| Negrito, itálico           | `<strong>`, `<em>`                                                                                                           | padrão do `astro-portabletext`                                                   |
| Link externo               | `<a rel="noopener noreferrer">`, na mesma aba                                                                                | [`corpo/LinkExterno.astro`](src/components/post/corpo/LinkExterno.astro)         |
| Link para outro post       | `<a>` com o caminho do `urlDoPost`                                                                                           | [`corpo/LinkInterno.astro`](src/components/post/corpo/LinkInterno.astro)         |
| Imagem                     | `<figure>` com o `<ImagemSanity>` e o `<figcaption>` opcional                                                                | [`Figura.astro`](src/components/post/Figura.astro)                               |
| Galeria                    | `<ul>` de `<figure>`, recortadas em quadrado: duas colunas, ou três a partir de 600px com 3, 6, 9 ou 12 fotos                | [`corpo/Galeria.astro`](src/components/post/corpo/Galeria.astro)                 |
| Vídeo do YouTube           | `<figure>` com a fachada leve (miniatura e play) e a legenda; o player entra no clique                                       | [`VideoYoutube.astro`](src/components/post/VideoYoutube.astro)                   |
| Post do Instagram          | `<figure>` com um cartão: o link para o post e o botão "Carregar post aqui"                                                  | [`EmbedInstagram.astro`](src/components/post/EmbedInstagram.astro)               |
| Citação em destaque        | `<figure>` com `<blockquote>` e a fonte no `<figcaption>`: centralizada, maior, em vinho, com as aspas grandes `aria-hidden` | [`corpo/CitacaoDestaque.astro`](src/components/post/corpo/CitacaoDestaque.astro) |

Regras, aplicadas pelo `prepararCorpo` ([`src/lib/corpo.ts`](src/lib/corpo.ts), com teste) antes de renderizar:

- **Subtítulos sem pular nível.** O título do post é o único h1: um h1 vindo de fora do Studio vira h2, e um h3 antes de qualquer h2 também. Cada subtítulo tem um `id` para âncora, com o `slugify` das URLs (`"O papel lembra por mim"` → `#o-papel-lembra-por-mim`), `-2`, `-3`... nos repetidos e nunca `conteudo`, o id do `<main>`.
- **Sem bloco vazio.** Parágrafos, subtítulos e itens de lista sem texto (o Enter a mais no editor) não aparecem.
- **Links seguros.** Link externo só com `http`, `https` ou `mailto`, como no Studio; outro esquema (um `javascript:` vindo da API) vira texto. Link interno com o destino fora do ar também vira texto.
- **Imagens.** `alt` sempre (vem do Studio, onde é obrigatório) e `loading="lazy"`: nenhuma imagem do texto carrega antes de chegar perto da viewport. A imagem `larga` tem 960px a partir de 1100px de tela e ocupa a coluna abaixo disso; o `sizes` de cada variante segue essas larguras.
- **Vídeos só no clique.** O iframe do YouTube e o embed do Instagram pesam centenas de KB, derrubariam o LCP e o INP e gravariam cookies de terceiros. Por isso a página não faz nenhuma requisição a youtube.com nem a instagram.com antes de a leitora pedir; só a miniatura vem do `i.ytimg.com`, com `loading="lazy"`. O [`corpo/Video.astro`](src/components/post/corpo/Video.astro) tira o provedor e o ID do link com o `videoDoLink` do Studio ([`studio/lib/video.ts`](../studio/lib/video.ts): watch, `youtu.be`, Shorts, embed e `youtube-nocookie`, post e reel do Instagram); link que não é de vídeo não aparece.
  - **YouTube:** sem JS, a fachada é um link para o vídeo. O script da ilha a troca por um `<button aria-label="Reproduzir vídeo: <legenda>">` (Enter e Espaço) e, no clique, pelo iframe do `youtube-nocookie.com` com `autoplay=1`, com o foco no player.
  - **Instagram:** um cartão com "Ver post no Instagram", que funciona sem JS, e o botão "Carregar post aqui", que só aparece com JS. No clique, o blockquote oficial entra no lugar do cartão e o `embed.js` carrega uma vez para a página.
- **Bloco desconhecido** (um tipo novo no Studio antes de o site saber mostrá-lo): não aparece e não quebra o build; o `astro dev` avisa no terminal (`[corpo] O site ainda não sabe mostrar...`).
