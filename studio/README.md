# Studio (Sanity)

Painel de edição do Ronrom, feito com o [Sanity Studio](https://www.sanity.io/docs/studio) (v6, TypeScript). Fica no monorepo ao lado do site (`web/`) para que schemas, consultas GROQ e tipos gerados andem juntos. O Studio publicado é hospedado pelo Sanity em `https://ronrom.sanity.studio`; ele não faz parte do build do Astro nem da Vercel.

## Rodar localmente

1. Instale as dependências na raiz do repositório: `pnpm install`.
2. Copie `studio/.env.example` para `studio/.env` e preencha as variáveis (tabela abaixo).
3. Na raiz, rode `pnpm studio:dev` e abra `http://localhost:3333`. O Studio pede login com uma conta que seja membro do projeto no Sanity.

| Comando (na raiz)    | O que faz                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm studio:dev`    | Sobe o Studio em `http://localhost:3333`                                                     |
| `pnpm studio:build`  | Gera o Studio estático em `studio/dist`                                                      |
| `pnpm studio:deploy` | Faz o build e publica em `ronrom.sanity.studio` (pede `sanity login` ou `SANITY_AUTH_TOKEN`) |
| `pnpm typecheck`     | Roda o `tsc --noEmit` no site e no Studio                                                    |

Para outros comandos da CLI: `pnpm --filter studio sanity <comando>` (ex.: `pnpm --filter studio sanity login`).

**Primeiro deploy:** o `pnpm studio:deploy` pergunta o hostname (use `ronrom`) e mostra o `appId` do Studio publicado. Coloque esse valor em `deployment.appId` no `sanity.cli.ts` e commite (o `appId` não é segredo). Assim os próximos deploys, inclusive no CI, não perguntam nada.

`deployment.autoUpdates` fica desligado: o Studio publicado roda a versão do `pnpm-lock.yaml`, e atualizar o Sanity é um PR de dependência como outro qualquer.

## Variáveis de ambiente

Ficam em `studio/.env` (não versionado). O Sanity só expõe ao Studio as variáveis com prefixo `SANITY_STUDIO_`.

| Variável                   | Exemplo       | Uso                                                        |
| -------------------------- | ------------- | ---------------------------------------------------------- |
| `SANITY_STUDIO_PROJECT_ID` | `a1b2c3d4`    | ID do projeto "Ronrom" em sanity.io/manage                 |
| `SANITY_STUDIO_DATASET`    | `development` | Dataset que o Studio edita (`development` ou `production`) |

Sem elas o Studio não abre e mostra qual variável falta.

### Tokens

Tokens **nunca** entram no código nem em `.env` versionado. São criados em sanity.io/manage → projeto → API → Tokens e guardados nos Secrets do GitHub (Settings → Secrets and variables → Actions) e nas variáveis de ambiente da Vercel.

| Nome do token   | Permissão | Variável                | Onde fica       | Uso                                      |
| --------------- | --------- | ----------------------- | --------------- | ---------------------------------------- |
| `viewer`        | Viewer    | `SANITY_API_READ_TOKEN` | GitHub e Vercel | Ler rascunhos no preview e fazer backup  |
| `editor-deploy` | Editor    | `SANITY_AUTH_TOKEN`     | GitHub          | Seed de conteúdo e `sanity deploy` no CI |

`SANITY_AUTH_TOKEN` é o nome que a CLI do Sanity lê para autenticar sem `sanity login`.

## Projeto no Sanity (plano Free)

Configuração feita uma vez, em [sanity.io/manage](https://www.sanity.io/manage), com a conta do dono do repositório:

- **Projeto:** "Ronrom", plano Free (até 20 usuários, 2 datasets públicos, 10 mil documentos, papéis Administrator e Viewer, histórico de 3 dias, sem backups).
- **Datasets:** `production` e `development`, ambos públicos (o Free não permite privados).
- **CORS** (API → CORS origins): `http://localhost:3333` **com** credenciais (o Studio faz login por cookie) e `http://localhost:4321` sem credenciais (Astro dev). Os domínios de produção e de preview da Vercel entram depois.

Pela CLI, depois de `pnpm --filter studio sanity login`:

```bash
pnpm --filter studio sanity datasets create production --visibility public
pnpm --filter studio sanity datasets create development --visibility public
pnpm --filter studio sanity cors add http://localhost:3333 --credentials
pnpm --filter studio sanity cors add http://localhost:4321 --no-credentials
pnpm --filter studio sanity tokens add viewer --role viewer
pnpm --filter studio sanity tokens add editor-deploy --role editor
```

### Rascunhos em dataset público

Num dataset público, qualquer pessoa lê os documentos publicados sem token, mas os rascunhos (IDs `drafts.*`) e versões só aparecem para quem tem token. Para conferir, esta consulta sem token deve voltar `0` mesmo com um rascunho salvo no Studio:

```bash
curl "https://<projectId>.apicdn.sanity.io/v2025-02-19/data/query/development?query=count(*%5B_id%20in%20path(%22drafts.**%22)%5D)"
```

Por isso o preview de rascunhos no site usa o token `viewer`, e nada sensível deve ser guardado em documentos publicados.
