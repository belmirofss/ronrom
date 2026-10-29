# ronrom

Ronrom — blog de reviews e pensamentos (Astro + Sanity + Vercel)

## Requisitos

- Node 22.23.4 ou mais novo (versão em `.nvmrc`)
- pnpm (versão fixada em `packageManager` no `package.json`; com o Corepack ou o próprio pnpm, a versão certa é usada automaticamente)

## Comandos

Rode na raiz do repositório:

| Comando          | O que faz                                        |
| ---------------- | ------------------------------------------------ |
| `pnpm install`   | Instala as dependências de todos os workspaces   |
| `pnpm dev`       | Sobe o site em `http://localhost:4321`           |
| `pnpm build`     | Gera o site em `web/dist`                        |
| `pnpm preview`   | Serve o build localmente                         |
| `pnpm check`     | Roda o `astro check` (diagnóstico de .astro e TS) |
| `pnpm typecheck` | Gera os tipos do Astro e roda o `tsc --noEmit`   |

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

| Variável   | Padrão                       | Uso                                  |
| ---------- | ---------------------------- | ------------------------------------ |
| `SITE_URL` | `https://ronrom.vercel.app`  | URL base do site (`site` do Astro)   |

O schema completo das variáveis fica na #8.
