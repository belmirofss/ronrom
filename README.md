# ronrom

Ronrom — blog de reviews e pensamentos (Astro + Sanity + Vercel)

## Requisitos

- Node 22.23.4 ou mais novo (versão em `.nvmrc`)
- pnpm (versão fixada em `packageManager` no `package.json`; com o Corepack ou o próprio pnpm, a versão certa é usada automaticamente)

## Comandos

Rode na raiz do repositório:

| Comando             | O que faz                                         |
| ------------------- | ------------------------------------------------- |
| `pnpm install`      | Instala as dependências de todos os workspaces    |
| `pnpm dev`          | Sobe o site em `http://localhost:4321`            |
| `pnpm build`        | Gera o site em `web/dist`                         |
| `pnpm preview`      | Serve o build localmente                          |
| `pnpm check`        | Roda o `astro check` (diagnóstico de .astro e TS) |
| `pnpm typecheck`    | Gera os tipos do Astro e roda o `tsc --noEmit`    |
| `pnpm lint`         | Roda o ESLint (TS, .astro e acessibilidade)       |
| `pnpm lint:fix`     | Roda o ESLint corrigindo o que for automático     |
| `pnpm format`       | Formata tudo com o Prettier                       |
| `pnpm format:check` | Confere a formatação sem alterar arquivos         |

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
└── studio/                 # Sanity Studio (criado na #7)
```

Imports dentro de `web/src` usam o alias `@/*` (ex.: `import { NOME_DO_SITE } from '@/lib/utils/site'`).

## Variáveis de ambiente

| Variável   | Padrão                      | Uso                                |
| ---------- | --------------------------- | ---------------------------------- |
| `SITE_URL` | `https://ronrom.vercel.app` | URL base do site (`site` do Astro) |

O schema completo das variáveis fica na #8.
