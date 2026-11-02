# Ronrom 🐈

[![ci](https://github.com/belmirofss/ronrom/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/belmirofss/ronrom/actions/workflows/ci.yml)

**[ronrom.blog](https://ronrom.blog)** · o blog que a minha namorada sempre quis ter.

Ela queria um cantinho dela na internet para guardar o que anda vendo, lendo, comendo e pensando: reviews de filmes, séries, documentários, livros, restaurantes e lugares, com nota em corações, e textos e frases soltas. Sem rede social no meio, sem anúncio, com a cara dela. O Ronrom é esse lugar. Ela escreve num painel feito sob medida e o site atualiza sozinho.

## Feito com o Claude Code

O projeto inteiro (código, design, infraestrutura, CI, testes e esta documentação) foi construído com o **[Claude Code](https://claude.com/claude-code)**, usando o modelo **Claude Opus 5.5**. O trabalho foi organizado como um projeto de verdade: cada funcionalidade nasceu numa [issue](https://github.com/belmirofss/ronrom/issues), foi implementada numa branch, passou pelo CI e entrou por PR. O histórico de commits e de PRs mostra o caminho todo, do primeiro commit (28/10/2026) ao site no ar no domínio próprio.

## O que tem no site

- **Reviews** por categoria, com nota de meio a 5 corações e uma ficha técnica que muda conforme o tipo (diretor e duração num filme, editora e páginas num livro, endereço e faixa de preço num restaurante).
- **Pensamentos:** textos, opiniões e frases soltas.
- **Home** com mosaico de formas, post em destaque, abas "Últimos posts" e "Mais lidos" e a frase da semana.
- **Busca** instantânea, sem servidor, com filtros por tipo e categoria ([Pagefind](https://pagefind.app)).
- **Mais lidos:** contador de visualizações anônimo, sem cookies.
- **Mapa** dos lugares avaliados e **listas do ano** com o que ela leu e assistiu.
- **Prévia de rascunhos** dentro do editor: ela vê o post no layout do site antes de publicar e clica num texto para editar o campo.
- SEO caprichado (JSON-LD de review, sitemap, RSS, Open Graph), acessibilidade WCAG AA, CSP em modo enforce e analytics sem cookies ([Umami](https://umami.is)).

## Links

| O quê    | Onde                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| Site     | https://ronrom.blog                                                                 |
| Studio   | https://ronrom.sanity.studio (o painel da autora; pede login de membro do projeto)  |
| Issues   | [github.com/belmirofss/ronrom/issues](https://github.com/belmirofss/ronrom/issues)  |
| CI       | [GitHub Actions](https://github.com/belmirofss/ronrom/actions)                      |
| Decisões | [ADRs em `docs/adr`](docs/adr/README.md): por que cada peça da arquitetura é como é |

## Stack

- **Site** (`web/`): [Astro](https://astro.build) 7 com TypeScript no modo `strictest`. As páginas são estáticas, servidas pela CDN; só quatro rotas de API rodam numa função da Vercel ([ADR 0001](docs/adr/0001-site-estatico-com-rotas-sob-demanda.md)).
- **CMS** (`studio/`): [Sanity Studio](https://www.sanity.io/docs/studio) 6 em pt-BR, com a marca do Ronrom, hospedado pelo Sanity. Publicar um post dispara um rebuild do site por deploy hook ([ADR 0005](docs/adr/0005-rebuild-por-deploy-hook.md)).
- **Hospedagem:** [Vercel](https://vercel.com), plano Hobby, com preview em todo PR e produção na `main`.
- **Contador de visualizações:** [Upstash Redis](https://upstash.com) pelo Marketplace da Vercel, no plano grátis.
- **Ferramentas:** pnpm com workspaces ([ADR 0003](docs/adr/0003-pnpm-e-monorepo-web-studio.md)), ESLint e Prettier ([ADR 0002](docs/adr/0002-eslint-e-prettier-em-vez-de-biome.md)), Vitest, Lighthouse CI, lychee e Dependabot ([ADR 0004](docs/adr/0004-dependabot-para-atualizar-dependencias.md)).

Tudo roda nos planos grátis da Vercel, do Sanity, do Upstash e do Umami. O único custo é o domínio.

## Rodar localmente

Não precisa de conta em nenhum serviço: sem variáveis de ambiente, o site usa um conjunto de posts de exemplo (as _fixtures_), sem rede e sem segredo.

Pré-requisitos:

- **Node 22**, na versão do `.nvmrc` (`fnm use` ou `nvm use` leem o arquivo).
- **pnpm**, na versão do `packageManager` do `package.json`. O jeito mais simples é rodar `corepack enable` uma vez.

```bash
git clone https://github.com/belmirofss/ronrom.git
```

```bash
cd ronrom && pnpm install
```

```bash
pnpm dev
```

O site sobe em http://localhost:4321. A busca só funciona depois de um `pnpm build`, que gera o índice.

Para ligar o site a um projeto do Sanity, copie `web/.env.example` para `web/.env` e preencha (detalhes em [`docs/ambientes.md`](docs/ambientes.md#variáveis-de-ambiente)). Para o Studio, copie `studio/.env.example` para `studio/.env` e rode `pnpm studio:dev` ([`studio/README.md`](studio/README.md)).

## Scripts

Na raiz do repositório:

| Comando              | O que faz                                                   |
| -------------------- | ----------------------------------------------------------- |
| `pnpm dev`           | Sobe o site em `http://localhost:4321`                      |
| `pnpm build`         | Gera o site em `web/.vercel/output`                         |
| `pnpm check`         | Roda o `astro check` (diagnóstico de .astro e TS)           |
| `pnpm typecheck`     | Roda o `tsc --noEmit` no site e no Studio                   |
| `pnpm test`          | Roda os testes do site e do Studio (Vitest)                 |
| `pnpm test:watch`    | Roda os testes do site a cada arquivo salvo                 |
| `pnpm lint`          | Roda o ESLint (TS, .astro e acessibilidade)                 |
| `pnpm format`        | Formata tudo com o Prettier                                 |
| `pnpm typegen`       | Gera os tipos das consultas GROQ (precisa do `studio/.env`) |
| `pnpm studio:dev`    | Sobe o Sanity Studio em `http://localhost:3333`             |
| `pnpm studio:deploy` | Publica o Studio em `ronrom.sanity.studio`                  |
| `pnpm seed`          | Popula o dataset `development` com conteúdo de exemplo      |

Não há `pnpm preview`: o adapter da Vercel não suporta o comando. As rotas de API rodam no `pnpm dev`.

## Estrutura

```
.
├── web/                  # o site em Astro
│   └── src/
│       ├── components/   # componentes por área (home, post, busca, layout, ui…)
│       ├── layouts/      # casca das páginas
│       ├── lib/          # regras puras e testadas: URLs, SEO, JSON-LD, busca, contador…
│       │   └── sanity/   # consultas GROQ, tipos gerados, cliente e fixtures
│       ├── pages/        # rotas do site (api/ para as rotas sob demanda)
│       ├── previa/       # rotas e middleware da prévia de rascunhos
│       └── styles/       # tokens de design e CSS global
├── studio/               # Sanity Studio: schemas, inputs customizados, marca e scripts
├── docs/                 # documentação técnica e ADRs
├── scripts/              # Ignored Build Step da Vercel e checagem da 404
└── .github/              # CI, Lighthouse, Dependabot e templates
```

Imports dentro de `web/src` usam o alias `@/*` (ex.: `import { NOME_DO_SITE } from '@/lib/utils/site'`).

## Documentação

| Documento                                            | Conteúdo                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                 | Convenções de branch, commit, PR, CI, Dependabot e labels             |
| [`docs/desenvolvimento.md`](docs/desenvolvimento.md) | Checks locais, dependências, lint e hooks, solução de problemas       |
| [`docs/ambientes.md`](docs/ambientes.md)             | Projetos na Vercel, prévia de rascunhos, limites do Hobby e variáveis |
| [`docs/deploy.md`](docs/deploy.md)                   | Como código e conteúdo vão ao ar, rollback e rebuild por deploy hook  |
| [`docs/seo-urls.md`](docs/seo-urls.md)               | Rotas, slugs, indexação, sitemap, RSS e Search Console                |
| [`docs/cabecalhos.md`](docs/cabecalhos.md)           | Cabeçalhos de segurança, CSP, cache e redirects                       |
| [`docs/busca.md`](docs/busca.md)                     | Busca com o Pagefind: índice, página `/busca` e estados               |
| [`docs/visualizacoes.md`](docs/visualizacoes.md)     | Contador de visualizações e "Mais lidos"                              |
| [`docs/analytics.md`](docs/analytics.md)             | Analytics com o Umami, eventos e privacidade                          |
| [`docs/performance.md`](docs/performance.md)         | Metas, orçamento e Lighthouse CI                                      |
| [`docs/testes.md`](docs/testes.md)                   | O que é testado, o que é conferido à mão e como escrever testes       |
| [`docs/adr/`](docs/adr/README.md)                    | Decisões de arquitetura, com contexto e consequências                 |
| [`web/README.md`](web/README.md)                     | Design tokens, contraste, layouts e componentes do site               |
| [`studio/README.md`](studio/README.md)               | Schemas, inputs, prévia, seed, tokens e configuração do Sanity        |

## Conteúdo

Os textos e as fotos publicados em [ronrom.blog](https://ronrom.blog) são da autora e não fazem parte do código deste repositório.
