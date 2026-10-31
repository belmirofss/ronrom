# Como contribuir

O repositório é privado numa conta GitHub Free, onde [rulesets e branch protection não ficam disponíveis](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets). Nada no GitHub impede um push direto na `main` ou um PR fora do padrão: as regras abaixo valem por convenção, e os checks do CI são a barreira. **Não faça merge com check vermelho.**

Para instalar, rodar e entender a estrutura do projeto, veja o [README](README.md). Checks locais, dependências novas e solução de problemas estão no [guia de desenvolvimento](docs/desenvolvimento.md).

## Fluxo

1. Pegue (ou abra) uma issue.
2. Crie a branch a partir da `main` atualizada.
3. Faça commits pequenos; o hook de pré-commit roda o ESLint e o Prettier nos arquivos staged.
4. Abra o PR com `Closes #<numero>` na descrição e preencha o template.
5. Espere os checks ficarem verdes e faça **squash merge**. A branch é apagada automaticamente.

## Branches

Formato: `tipo/<numero-da-issue>-descricao-curta`, sempre a partir da `main`.

| Prefixo  | Uso                                        |
| -------- | ------------------------------------------ |
| `feat/`  | Funcionalidade nova                        |
| `fix/`   | Correção de bug                            |
| `chore/` | Configuração, infraestrutura, dependências |
| `docs/`  | Só documentação                            |

Exemplos: `feat/37-mosaico-de-formas`, `fix/53-redirect-slug-alterado`, `chore/5-workflow-ci`.

```bash
git switch main && git pull && git switch -c feat/37-mosaico-de-formas
```

## Commits e título do PR

[Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), com o **tipo em inglês** e a **descrição em pt-BR**:

```
tipo(escopo opcional): descrição no presente, começando com minúscula
```

- `feat(home): adiciona mosaico 3×3`
- `fix(post): corrige a data em fuso de São Paulo`
- `chore(deps): atualiza o astro para 7.2`
- `docs: explica as convenções de branch`

Tipos aceitos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Mudança que quebra compatibilidade leva `!` depois do tipo/escopo (`feat(cms)!: ...`).

Escopos sugeridos (não obrigatórios, sempre em minúsculas): `infra`, `cms`, `home`, `post`, `seo`, `busca`, `dados`, `deps`.

Como o merge é sempre squash, **o título do PR vira a mensagem do commit na `main`**. Por isso ele é validado no CI pelo check `pr / titulo` ([`.github/workflows/pr-titulo.yml`](.github/workflows/pr-titulo.yml)): título fora do padrão deixa o check vermelho. Para corrigir, basta editar o título do PR; o check roda de novo sozinho. As mensagens dos commits dentro da branch seguem o mesmo padrão, mas não são validadas.

## CI

Todo PR e todo push na `main` rodam o [`ci.yml`](.github/workflows/ci.yml), com três checks em paralelo e um quarto depois do build:

- `ci / quality`: `pnpm format:check`, `pnpm lint` e `pnpm check`.
- `ci / unit`: `pnpm test` (Vitest; o que é testado em [`docs/testes.md`](docs/testes.md)).
- `ci / build`: `pnpm build`, publicando as páginas estáticas (`web/dist/client`) como artifact `web-dist` por 3 dias.
- `ci / links`: depois do `build`, o lychee confere os links internos e as âncoras nesse artifact. Ainda não bloqueante; detalhes em [`docs/testes.md`](docs/testes.md#links-internos).

Para reproduzir localmente antes de abrir o PR, rode os mesmos comandos na raiz. Um push novo no PR cancela a execução anterior, para economizar a cota de minutos do Actions.

O [`studio.yml`](.github/workflows/studio.yml) publica o Studio em `ronrom.sanity.studio` a cada push na `main` que muda `studio/` (veja o [README do Studio](studio/README.md#deploy)).

O [`rebuild-diario.yml`](.github/workflows/rebuild-diario.yml) chama o deploy hook da Vercel todo dia às 04:17 (Brasília) e pode ser rodado à mão em Actions → rebuild-diario → Run workflow. Ele precisa do secret `VERCEL_DEPLOY_HOOK_URL` (veja o [deploy](docs/deploy.md#conteúdo-rebuild-ao-publicar)).

O [`links-externos.yml`](.github/workflows/links-externos.yml) checa toda segunda os links do site em produção, incluindo os externos dos posts, e mantém a issue "Links quebrados" com o que estiver quebrado (veja os [testes](docs/testes.md#links-externos)).

## Pull requests

- Um PR por issue, com `Closes #<numero>` na descrição para fechar a issue no merge.
- Preencha o checklist do template: build ok, acessibilidade revisada, prints mobile/desktop quando muda algo visual e o link do preview da Vercel.
- Só **squash merge** está habilitado nas configurações do repositório (merge commit e rebase merge ficam desligados), e a branch é apagada depois do merge.

## Dependências (Dependabot)

O [Dependabot](.github/dependabot.yml) abre PRs uma vez por mês (fuso de São Paulo), no máximo 5 abertos por ecossistema (`npm`, que cobre o pnpm, e `github-actions`). Minor e patch vêm agrupados (`astro`, `sanity`, `lint`, `minor-e-patch` e `actions`); cada major vem num PR separado. Os PRs já saem com título `chore(deps): ...` e o label `tipo:chore`. Correções de segurança chegam fora do calendário, assim que um alerta aparece na aba Security.

Não há auto-merge: revise e faça o squash merge à mão, só com o CI verde. Num major, leia o changelog antes. Para pedir algo ao bot, comente no PR (`@dependabot rebase`, `@dependabot recreate`). Se você der push na branch do bot, ele para de atualizar aquele PR.

**Preview da Vercel bloqueado num PR do bot.** No Hobby, em repo privado, a Vercel só implanta commits cujo autor é o dono do time, então o preview de um PR do `dependabot[bot]` pode sair bloqueado. É esperado e não impede o merge:

1. Confie no CI: typecheck, lint e build verdes bastam para patch e minor.
2. Se precisar ver o site (um major do Astro, por exemplo), crie o preview você mesmo, com um commit seu na branch do bot:

   ```bash
   gh pr checkout <numero> && git commit --allow-empty -m "chore: dispara o preview" && git push
   ```

   O bot deixa de rebasear esse PR; se a `main` andar, use `@dependabot recreate` e repita.

3. Depois do merge, confira se o deploy de produção saiu. Se foi bloqueado, use **Redeploy** no painel da Vercel.

Os workflows disparados pelo Dependabot não recebem os secrets de Actions: um secret que o CI precise também deve ser cadastrado em **Settings → Secrets and variables → Dependabot**.

## Issues

Use um dos templates (issues em branco estão desabilitadas):

- **Bug**: algo não funciona como deveria; já sai com o label `bug`.
- **Tarefa**: funcionalidade, configuração ou manutenção, com contexto, o que fazer, critérios de aceite e dependências.

Depois de abrir, aplique um label de cada grupo abaixo e o milestone.

## Labels

**Área** (onde a mudança acontece):

| Label           | Uso                                             |
| --------------- | ----------------------------------------------- |
| `area:infra`    | Infraestrutura, CI, Vercel, domínio             |
| `area:cms`      | Sanity: schemas, Studio, experiência de escrita |
| `area:frontend` | Componentes e páginas do site                   |
| `area:seo`      | SEO técnico, metadados, dados estruturados      |
| `area:dados`    | Busca, contador de visualizações, analytics     |
| `area:qa`       | Testes, acessibilidade, performance, lançamento |
| `area:docs`     | Documentação e guias                            |

**Tipo** (bugs usam o label `bug`):

| Label          | Uso                                         |
| -------------- | ------------------------------------------- |
| `tipo:feature` | Funcionalidade nova                         |
| `tipo:chore`   | Configuração, manutenção, tarefa de suporte |

**Prioridade**:

| Label              | Uso                          |
| ------------------ | ---------------------------- |
| `prioridade:alta`  | Bloqueia o lançamento        |
| `prioridade:media` | Importante, mas não bloqueia |
| `prioridade:baixa` | Desejável / futuro           |

## Milestones

| Milestone               | Escopo                                                          |
| ----------------------- | --------------------------------------------------------------- |
| M1 · Fundação           | Projeto Astro, CI, Vercel e convenções prontos                  |
| M2 · Conteúdo (CMS)     | Sanity com schemas, Studio da autora e integração de publicação |
| M3 · Site               | Páginas e componentes do layout Caderno funcionando             |
| M4 · SEO, busca e dados | SEO técnico, busca Pagefind, mais lidos e analytics             |
| M5 · Lançamento         | Testes, conteúdo inicial, domínio e go-live                     |
