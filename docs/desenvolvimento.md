# Guia de desenvolvimento

O dia a dia de quem mexe no código. Para instalar e rodar o projeto pela primeira vez, comece pelo [README](../README.md); as convenções de branch, commit e PR estão no [CONTRIBUTING](../CONTRIBUTING.md).

## Checks locais

O CI roda estes comandos na raiz; rode os mesmos antes de abrir o PR:

```bash
pnpm format:check && pnpm lint && pnpm check && pnpm test && pnpm build
```

| Comando             | Check do CI    | O que pega                                                          |
| ------------------- | -------------- | ------------------------------------------------------------------- |
| `pnpm format:check` | `ci / quality` | Arquivo fora do padrão do Prettier (corrija com `pnpm format`)      |
| `pnpm lint`         | `ci / quality` | Erros do ESLint, inclusive de acessibilidade em `.astro`            |
| `pnpm check`        | `ci / quality` | Erros de tipo e diagnósticos do `astro check` no site               |
| `pnpm typegen`      | `ci / quality` | Tipos das consultas GROQ desatualizados (commite o arquivo gerado)  |
| `pnpm test`         | `ci / unit`    | Teste unitário ou de componente quebrado ([`testes.md`](testes.md)) |
| `pnpm build`        | `ci / build`   | Falha de build, variável de ambiente inválida, rota quebrada        |
| `pnpm typecheck`    | nenhum         | Erros de tipo no Studio (o `astro check` só cobre o site)           |

Mexeu no Studio? Rode também `pnpm typecheck` e `pnpm studio:build`, que o CI não roda. Mexeu num schema ou numa consulta GROQ? Rode `pnpm typegen` e commite o `web/src/lib/sanity/tipos.gerados.d.ts` ([como funciona](../web/src/lib/sanity/README.md)).

## Lint, formatação e hooks

- **ESLint** (flat config em `eslint.config.js`) com `typescript-eslint`, `eslint-plugin-astro` e as regras de acessibilidade do `jsx-a11y` para `.astro`. Por que não o Biome: [ADR 0002](adr/0002-eslint-e-prettier-em-vez-de-biome.md).
- **Prettier** com `prettier-plugin-astro` formata `.astro`, `.ts`, `.mjs`, `.json`, `.md` e `.yaml` (config em `.prettierrc`).
- **Pré-commit:** o `pnpm install` instala um hook (`simple-git-hooks`) que roda o `lint-staged`: `eslint --fix` e `prettier --write` só nos arquivos staged. Para pular numa emergência: `SKIP_SIMPLE_GIT_HOOKS=1 git commit ...`. O CI pega o que o hook deixou passar.
- **Fim de linha:** `.gitattributes` e `.editorconfig` forçam LF, utf-8 e 2 espaços, inclusive no Windows.
- **VS Code:** abra a pasta e instale as extensões recomendadas (Astro, ESLint, Prettier, EditorConfig); o arquivo é formatado ao salvar.

## Como adicionar uma dependência

Sempre pela raiz, escolhendo o workspace com `--filter`:

| Para                                       | Comando                             |
| ------------------------------------------ | ----------------------------------- |
| O site, em produção                        | `pnpm --filter web add <pacote>`    |
| O site, só em desenvolvimento (tipos etc.) | `pnpm --filter web add -D <pacote>` |
| O Studio                                   | `pnpm --filter studio add <pacote>` |
| Ferramenta do repositório (lint, hooks)    | `pnpm add -Dw <pacote>`             |

Antes de adicionar:

- **Precisa mesmo?** Cada pacote no `web` pode pesar no bundle do navegador ou na função da Vercel. Prefira a plataforma (Astro, APIs do navegador) quando ela resolve.
- **Mantido e com licença compatível?** Olhe a data do último release e as issues abertas.

Depois de adicionar:

- **Commite o `package.json` e o `pnpm-lock.yaml` juntos.** O CI e a Vercel instalam com `--frozen-lockfile` e falham se o lockfile não bater.
- **Scripts de instalação:** o pnpm bloqueia `postinstall` e afins. Se o pacote precisar compilar algo (como `esbuild` ou `sharp`), o install avisa; libere em `allowBuilds` no `pnpm-workspace.yaml`, só se confiar no pacote.
- **Versão muito nova:** o pnpm recusa versões publicadas há pouco (`minimumReleaseAge`), uma proteção contra pacotes comprometidos. Espere um ou dois dias ou, se for urgente, adicione a versão exata em `minimumReleaseAgeExclude` no `pnpm-workspace.yaml`.
- **Grupo do Dependabot:** pacotes do Astro, do Sanity e de lint já caem nos grupos certos do [`dependabot.yml`](../.github/dependabot.yml). Uma família nova de pacotes que precise subir junta merece um grupo próprio.
- **Variável de ambiente nova:** entra no schema do `astro.config.mjs`, no `web/.env.example` e na tabela do [`ambientes.md`](ambientes.md#onde-vive-cada-variável).
- **Decisão grande** (trocar uma ferramenta, adicionar um serviço externo): registre num [ADR](adr/README.md).

Para remover: `pnpm --filter <workspace> remove <pacote>`.

## Solução de problemas

### Diff de fim de linha no Windows

O `.gitattributes` (`* text=auto eol=lf`) faz o Git gravar e entregar LF em qualquer máquina, independentemente do `core.autocrlf`. Se mesmo assim aparecerem arquivos inteiros modificados sem mudança visível, ou o `pnpm format:check` acusar arquivos que você não tocou:

1. Confira o fim de linha no canto inferior direito do VS Code: tem que ser `LF`. O `.vscode/settings.json` já fixa `files.eol`, mas outros editores podem gravar CRLF.
2. Renormalize os arquivos e confira o que mudou:

   ```bash
   git add --renormalize .
   ```

   ```bash
   git status
   ```

3. Se o clone for anterior ao `.gitattributes`, um clone novo resolve de vez.

### Versão de Node errada

Sintomas: aviso `Unsupported engine` no `pnpm install`, o Astro recusando a versão ao subir ou o build gravando outro runtime (`nodejs24.x`) em `web/.vercel/output`. Confira com `node -v` e troque para a versão do `.nvmrc` (veja o [README](../README.md#rodar-localmente)). Depois de trocar, rode `pnpm install` de novo.

O build local com outro Node não vai para a Vercel, que usa o `engines.node` do `web/package.json` (`22.x`). Para trocar a versão do projeto, mude juntos o `.nvmrc`, os `engines` dos `package.json` e o `@types/node` ([detalhes](ambientes.md#região-e-versão-de-node)).

### Versão de pnpm errada ou `--frozen-lockfile` falhando no CI

O `pnpm` precisa ser o do `packageManager`. Com o Corepack ativo (`corepack enable`), isso é automático. Com um pnpm global de outra versão, ele delega para a versão certa, mas pode gerar um lockfile diferente do que o CI espera. Foi o que aconteceu no #79: o lockfile saiu sem o bloco `packageManagerDependencies` e o `pnpm install --frozen-lockfile` falhou no CI.

Se o `pnpm install --frozen-lockfile` falhar no CI e passar na sua máquina, gere o lockfile com o pnpm certo:

```bash
corepack enable && pnpm install
```

Commite o `pnpm-lock.yaml` atualizado.

### Hook de pré-commit não roda

O hook é instalado pelo script `prepare` no `pnpm install`. Se ele não rodar (clone novo sem install, ou `.git/hooks` limpo), reinstale:

```bash
pnpm exec simple-git-hooks
```

### Build falha com `EnvInvalidVariables`

Uma variável obrigatória está ausente ou com valor inválido; a mensagem lista cada uma. Variável vazia conta como ausente. Confira `web/.env` e `web/.env.local`, ou apague os dois para rodar com as fixtures. A tabela de variáveis está em [`ambientes.md`](ambientes.md#variáveis-de-ambiente).
