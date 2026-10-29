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
