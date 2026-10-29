# ronrom

[![ci](https://github.com/belmirofss/ronrom/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/belmirofss/ronrom/actions/workflows/ci.yml)

Ronrom — blog de reviews e pensamentos (Astro + Sanity + Vercel)

Antes de abrir uma branch ou um PR, leia o [guia de contribuição](CONTRIBUTING.md) (convenções de commits, branches, PRs, labels e milestones).

## Requisitos

- Node 22, a partir do 22.23.4 (versão em `.nvmrc`; a mesma linha 22 roda as funções na Vercel)
- pnpm (versão fixada em `packageManager` no `package.json`; com o Corepack ou o próprio pnpm, a versão certa é usada automaticamente)

## Comandos

Rode na raiz do repositório:

| Comando              | O que faz                                         |
| -------------------- | ------------------------------------------------- |
| `pnpm install`       | Instala as dependências de todos os workspaces    |
| `pnpm dev`           | Sobe o site em `http://localhost:4321`            |
| `pnpm build`         | Gera o site em `web/.vercel/output`               |
| `pnpm check`         | Roda o `astro check` (diagnóstico de .astro e TS) |
| `pnpm typecheck`     | Roda o `tsc --noEmit` no site e no Studio         |
| `pnpm studio:dev`    | Sobe o Sanity Studio em `http://localhost:3333`   |
| `pnpm studio:build`  | Gera o Studio em `studio/dist`                    |
| `pnpm studio:deploy` | Publica o Studio em `ronrom.sanity.studio`        |
| `pnpm lint`          | Roda o ESLint (TS, .astro e acessibilidade)       |
| `pnpm lint:fix`      | Roda o ESLint corrigindo o que for automático     |
| `pnpm format`        | Formata tudo com o Prettier                       |
| `pnpm format:check`  | Confere a formatação sem alterar arquivos         |

## Lint, formatação e hooks

- **ESLint** (flat config em `eslint.config.js`) com `typescript-eslint`, `eslint-plugin-astro` e as regras de acessibilidade do `jsx-a11y` para `.astro`.
- **Prettier** com `prettier-plugin-astro` formata `.astro`, `.ts`, `.mjs`, `.json`, `.md` e `.yaml` (config em `.prettierrc`).
- **Pré-commit:** o `pnpm install` instala um hook (`simple-git-hooks`) que roda o `lint-staged`: `eslint --fix` e `prettier --write` só nos arquivos staged. Para pular numa emergência: `SKIP_SIMPLE_GIT_HOOKS=1 git commit ...`.
- **Fim de linha:** `.gitattributes` e `.editorconfig` forçam LF, utf-8 e 2 espaços, inclusive no Windows.
- **VS Code:** abra a pasta e instale as extensões recomendadas (Astro, ESLint, Prettier, EditorConfig); o arquivo é formatado ao salvar.

## Estrutura

Monorepo com workspaces do pnpm (`pnpm-workspace.yaml`):

```
.
├── web/                    # site em Astro 7
│   ├── public/             # arquivos servidos como estão (favicon etc.)
│   └── src/
│       ├── assets/         # imagens e arquivos processados pelo build
│       ├── components/
│       │   ├── home/       # blocos da página inicial
│       │   ├── layout/     # cabeçalho, rodapé e afins
│       │   ├── post/       # partes da página do post
│       │   └── ui/         # componentes genéricos reutilizáveis
│       ├── layouts/        # layouts de página (LayoutBase)
│       ├── lib/
│       │   ├── sanity/     # cliente e consultas do Sanity
│       │   ├── utils/      # utilitários gerais
│       │   └── views/      # contador de visualizações e ranking
│       ├── pages/          # rotas do site
│       └── styles/         # CSS global e tokens
├── studio/                 # Sanity Studio (veja studio/README.md)
│   └── schemaTypes/        # schemas de conteúdo
├── docs/                   # documentação (ambientes, limites da Vercel, política de URLs e ADRs)
└── scripts/                # scripts de infraestrutura (Ignored Build Step da Vercel)
```

Imports dentro de `web/src` usam o alias `@/*` (ex.: `import { NOME_DO_SITE } from '@/lib/utils/site'`).

## Deploy

O site é publicado na Vercel: a `main` vai para produção em https://ronrom-blog.vercel.app e cada PR ganha um preview, com o link comentado no PR. As páginas são estáticas; só as rotas com `export const prerender = false` (hoje, `/api/health`) rodam numa Vercel Function. Não há `pnpm preview`, porque o adapter da Vercel não suporta o comando: teste as rotas sob demanda com o `pnpm dev` e o resto no preview do PR. Configuração, limites do plano Hobby e o que pula build estão em [`docs/ambientes.md`](docs/ambientes.md). Rotas, slugs, barra no final e os helpers de URL estão em [`docs/seo-urls.md`](docs/seo-urls.md).

## Variáveis de ambiente

Nenhuma é necessária para rodar o site: sem o Sanity configurado, o build usa as fixtures locais. Para usar dados reais, copie `web/.env.example` para `web/.env` e preencha, ou puxe as da Vercel com `vercel env pull .env.local` dentro de `web/`.

O schema tipado (`astro:env`) fica em `web/astro.config.mjs`. A lista completa, onde cada variável vive (local, Vercel por ambiente, GitHub) e quem é dona estão em [`docs/ambientes.md`](docs/ambientes.md#variáveis-de-ambiente). As do Studio (`SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`) e os tokens do Sanity estão em [`studio/README.md`](studio/README.md) e em `studio/.env.example`.
