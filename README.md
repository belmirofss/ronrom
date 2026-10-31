# ronrom

[![ci](https://github.com/belmirofss/ronrom/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/belmirofss/ronrom/actions/workflows/ci.yml)

O **Ronrom** é um blog de reviews (filmes, séries, documentários, livros, restaurantes e outros lugares) e de pensamentos (textos, opiniões e frases soltas). A autora escreve no Sanity Studio; o site é gerado pelo Astro e publicado na Vercel. Quem mantém o código é o dono do repositório; a autora só usa o Studio.

| O quê        | Onde                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| Site         | https://ronrom-blog.vercel.app                                                       |
| Studio       | https://ronrom.sanity.studio (publicado pela #12)                                    |
| Vercel       | projeto `ronrom` no [painel da Vercel](https://vercel.com/dashboard), conta do dono  |
| Sanity       | projeto "Ronrom" (`fq2685cq`) em [sanity.io/manage](https://www.sanity.io/manage)    |
| CI           | [GitHub Actions](https://github.com/belmirofss/ronrom/actions)                       |
| Planejamento | [issues](https://github.com/belmirofss/ronrom/issues) e milestones M1 a M5 no GitHub |

## Stack

- **Site** (`web/`): [Astro](https://astro.build) 7 com TypeScript no modo `strictest`, saída estática e só algumas rotas sob demanda numa Vercel Function ([ADR 0001](docs/adr/0001-site-estatico-com-rotas-sob-demanda.md)).
- **CMS** (`studio/`): [Sanity Studio](https://www.sanity.io/docs/studio) 6, hospedado pelo Sanity. Conteúdo novo entra no site por rebuild ([ADR 0005](docs/adr/0005-rebuild-por-deploy-hook.md)).
- **Hospedagem:** Vercel, plano Hobby, com preview em todo PR e produção na `main`.
- **Contador de visualizações:** [Upstash Redis](https://upstash.com) pelo Marketplace da Vercel, no plano grátis (500 mil comandos/mês). Cada visualização nova custa cerca de 2 comandos, o que dá margem para cerca de 250 mil visualizações por mês ([`docs/visualizacoes.md`](docs/visualizacoes.md#custo)).
- **Ferramentas:** pnpm com workspaces ([ADR 0003](docs/adr/0003-pnpm-e-monorepo-web-studio.md)), ESLint e Prettier ([ADR 0002](docs/adr/0002-eslint-e-prettier-em-vez-de-biome.md)), GitHub Actions e Dependabot ([ADR 0004](docs/adr/0004-dependabot-para-atualizar-dependencias.md)).

## Pré-requisitos

- **Node 22**, a partir do 22.23.4. A versão exata está no `.nvmrc`: com o [fnm](https://github.com/Schniz/fnm) ou o nvm, `fnm use` ou `nvm use` lê o arquivo (no nvm-windows, rode `nvm install 22.23.4` e `nvm use 22.23.4`).
- **pnpm**, na versão fixada em `packageManager` no `package.json`. O jeito mais simples é o Corepack, que já vem com o Node 22: rode `corepack enable` uma vez e o `pnpm` certo é baixado sozinho.
- **Git** com o `user.email` igual a um e-mail verificado na sua conta do GitHub. Sem isso, a Vercel bloqueia o deploy (veja o [guia de desenvolvimento](docs/desenvolvimento.md#deploy-bloqueado-pelo-autor-do-commit)).

## Rodar localmente

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/belmirofss/ronrom.git
   ```

   ```bash
   cd ronrom
   ```

2. Instale as dependências na raiz. O `pnpm install` também instala o hook de pré-commit.

   ```bash
   pnpm install
   ```

3. (Opcional) Puxe as variáveis de ambiente da Vercel para `web/.env.local`. Só funciona com acesso ao projeto na Vercel; sem nenhuma variável, o site roda com as fixtures locais, sem Sanity e sem segredo. Dentro de `web/`, com a [Vercel CLI](https://vercel.com/docs/cli) logada na conta do dono:

   ```bash
   pnpm dlx vercel link --project ronrom
   ```

   ```bash
   pnpm dlx vercel env pull .env.local
   ```

   Sem acesso à Vercel, copie `web/.env.example` para `web/.env` e preencha só o que precisar. Detalhes em [`docs/ambientes.md`](docs/ambientes.md#variáveis-de-ambiente).

4. Na raiz, suba o site em http://localhost:4321:

   ```bash
   pnpm dev
   ```

Para o Studio, copie `studio/.env.example` para `studio/.env`, preencha o ID do projeto e rode `pnpm studio:dev` (http://localhost:3333). O passo a passo está em [`studio/README.md`](studio/README.md).

Antes de abrir uma branch ou um PR, leia o [guia de contribuição](CONTRIBUTING.md) e o [guia de desenvolvimento](docs/desenvolvimento.md).

## Scripts

Rode na raiz do repositório:

| Comando              | O que faz                                                   |
| -------------------- | ----------------------------------------------------------- |
| `pnpm install`       | Instala as dependências de todos os workspaces              |
| `pnpm dev`           | Sobe o site em `http://localhost:4321`                      |
| `pnpm build`         | Gera o site em `web/.vercel/output`                         |
| `pnpm check`         | Roda o `astro check` (diagnóstico de .astro e TS)           |
| `pnpm typecheck`     | Roda o `tsc --noEmit` no site e no Studio                   |
| `pnpm test`          | Roda os testes do site e do Studio (Vitest)                 |
| `pnpm test:watch`    | Roda os testes do site a cada arquivo salvo                 |
| `pnpm typegen`       | Gera os tipos das consultas GROQ (precisa do `studio/.env`) |
| `pnpm studio:dev`    | Sobe o Sanity Studio em `http://localhost:3333`             |
| `pnpm studio:build`  | Gera o Studio em `studio/dist`                              |
| `pnpm studio:deploy` | Publica o Studio em `ronrom.sanity.studio`                  |
| `pnpm lint`          | Roda o ESLint (TS, .astro e acessibilidade)                 |
| `pnpm lint:fix`      | Roda o ESLint corrigindo o que for automático               |
| `pnpm format`        | Formata tudo com o Prettier                                 |
| `pnpm format:check`  | Confere a formatação sem alterar arquivos                   |

Não há `pnpm preview`: o adapter da Vercel não suporta o comando. Teste as rotas sob demanda com o `pnpm dev` e o resto no preview do PR.

## Estrutura

Monorepo com workspaces do pnpm (`pnpm-workspace.yaml`):

```
.
├── web/                    # site em Astro 7
│   ├── public/             # arquivos servidos como estão (favicon etc.)
│   ├── integracao-pagefind.mjs # índice da busca no fim do build (veja docs/busca.md)
│   ├── vercel.json         # install, build, Ignored Build Step e região na Vercel
│   ├── vitest.config.ts    # testes do site (veja docs/testes.md)
│   └── src/
│       ├── assets/         # imagens e arquivos processados pelo build
│       ├── components/
│       │   ├── busca/      # campo de busca (home e /busca)
│       │   ├── home/       # blocos da página inicial
│       │   ├── layout/     # cabeçalho, rodapé e afins
│       │   ├── post/       # partes da página do post
│       │   └── ui/         # componentes genéricos reutilizáveis
│       ├── layouts/        # layouts de página (LayoutBase)
│       ├── lib/
│       │   ├── sanity/     # consultas GROQ, tipos gerados e cliente do Sanity
│       │   ├── utils/      # utilitários gerais
│       │   └── views/      # contador de visualizações e ranking
│       ├── pages/          # rotas do site (api/ para as rotas sob demanda)
│       ├── styles/         # CSS global e tokens
│       └── vitrine/        # vitrines dos componentes e do texto do post, só no dev (/vitrine)
├── studio/                 # Sanity Studio (veja studio/README.md)
│   └── schemaTypes/        # schemas de conteúdo
├── docs/                   # documentação e ADRs (veja a tabela abaixo)
├── scripts/                # scripts de infraestrutura (Ignored Build Step da Vercel)
├── lighthouserc.cjs        # Lighthouse CI e orçamento (budget.json); veja docs/performance.md
└── .github/                # CI, Dependabot e templates de issue e PR
```

Imports dentro de `web/src` usam o alias `@/*` (ex.: `import { NOME_DO_SITE } from '@/lib/utils/site'`).

## Documentação

| Documento                                                 | Conteúdo                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                      | Convenções de branch, commit, PR, CI, Dependabot, labels e milestones       |
| [`docs/desenvolvimento.md`](docs/desenvolvimento.md)      | Dia a dia: checks locais, dependências, lint e hooks, solução de problemas  |
| [`docs/ambientes.md`](docs/ambientes.md)                  | Projeto na Vercel, saída estática, limites do Hobby e variáveis de ambiente |
| [`docs/deploy.md`](docs/deploy.md)                        | Como uma mudança vai ao ar, como conferir, redeploy, rollback e rebuild     |
| [`docs/seo-urls.md`](docs/seo-urls.md)                    | Rotas, slugs, barra no final, URL base e helpers de URL                     |
| [`docs/cabecalhos.md`](docs/cabecalhos.md)                | Cabeçalhos de segurança, CSP, cache e redirects                             |
| [`docs/visualizacoes.md`](docs/visualizacoes.md)          | Contador de visualizações: regras, custo no Upstash, provisionar e conferir |
| [`docs/testes.md`](docs/testes.md)                        | O que é testado no CI e o que é conferido à mão, e como escrever testes     |
| [`docs/busca.md`](docs/busca.md)                          | Busca (Pagefind): o índice, a página /busca, o estado na URL e o dev        |
| [`docs/performance.md`](docs/performance.md)              | Metas de performance, orçamento, Lighthouse CI e Core Web Vitals de campo   |
| [`docs/adr/`](docs/adr/README.md)                         | Decisões de arquitetura e infraestrutura, com contexto e consequências      |
| [`web/README.md`](web/README.md#design-tokens-e-css-base) | Site: tokens de design, regra de contraste e carregamento da DM Sans        |
| [`studio/README.md`](studio/README.md)                    | Studio: rodar, variáveis, tokens e configuração do projeto no Sanity        |
