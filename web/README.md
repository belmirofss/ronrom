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

- [`LayoutBase.astro`](src/layouts/LayoutBase.astro): `<html lang="pt-BR">`, o `<head>` com a fonte, o slot nomeado `head` (para o `<Seo>` da #32), o link "Pular para o conteúdo", o [`Cabecalho`](src/components/layout/Cabecalho.astro), o `<main id="conteudo" tabindex="-1">` com o conteúdo da página e o [`Rodape`](src/components/layout/Rodape.astro). Prop `titulo` (opcional).
- [`LayoutComBarraLateral.astro`](src/layouts/LayoutComBarraLateral.astro): o `LayoutBase` com uma grade conteúdo + `<aside>`. A barra lateral entra pelo slot `barra-lateral` e cai para baixo do conteúdo abaixo de 960px; sem esse slot, o conteúdo ocupa a largura toda e não há `<aside>`.
- [`Container.astro`](src/components/layout/Container.astro): centraliza o conteúdo em `--container-max` com o `--gutter` nas laterais. `largura="leitura"` usa a `--coluna-leitura` (texto do post) e `as` troca o elemento (padrão `div`).

```astro
<LayoutComBarraLateral titulo="Reviews">
  <Seo slot="head" ... />
  <h1>Reviews</h1>
  <BarraLateral slot="barra-lateral" />
</LayoutComBarraLateral>
```

Regras da casca:

- **Landmarks únicos:** um `<header>`, um `<nav aria-label="Principal">`, um `<main>` e um `<footer>` por página. Páginas e componentes não criam outro `<main>`. Os únicos outros `<nav>` são o `Breadcrumb` (`aria-label="Trilha de navegação"`) e a `Paginacao` (`aria-label="Paginação"`), cada um com nome próprio; os grupos de links do rodapé são listas com título, sem `<nav>`.
- **Seção atual:** o cabeçalho marca a seção com `aria-current` pelo prefixo da rota (`estadoDaSecao`, em [`src/lib/navegacao.ts`](src/lib/navegacao.ts)): `"page"` na própria página da seção (`/reviews`) e `"true"` nas páginas dentro dela (`/reviews/filmes/...`). "Início" só fica ativo em `/`.
- **Celular:** os 4 links da navegação ficam sempre visíveis, sem menu hambúrguer, e quebram linha se não couberem. Todo link do cabeçalho e do rodapé tem pelo menos 44px de altura.
- **Rodapé:** o link "Área da autora" aponta para `STUDIO_URL` (padrão `https://ronrom.sanity.studio`, veja [`docs/ambientes.md`](../docs/ambientes.md#variáveis-de-ambiente)), e o ano é o do build, no fuso de São Paulo.

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

### Vitrine

Com o `pnpm dev` rodando, http://localhost:4321/vitrine mostra todos os estados desses componentes: as 10 notas, os 3 tamanhos, os chips nos dois tons (link, estático e sobre a miniatura), trilhas de review, pensamento, categoria e formato, e a paginação na primeira, no meio e na última página. A página ([`src/vitrine/Componentes.astro`](src/vitrine/Componentes.astro)) fica fora de `src/pages`: uma integração no `astro.config.mjs` injeta a rota só no `astro dev`, então ela não existe no build. Componente novo em `ui/` entra na vitrine no mesmo PR.
