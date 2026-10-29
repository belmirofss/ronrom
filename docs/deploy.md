# Deploy

Como uma mudança chega ao ar, como conferir e o que fazer quando algo dá errado. A configuração do projeto na Vercel, os limites do Hobby e as variáveis de ambiente estão em [`ambientes.md`](ambientes.md).

São dois caminhos independentes:

| O que muda       | Gatilho                                | Onde vai ao ar                                     |
| ---------------- | -------------------------------------- | -------------------------------------------------- |
| Código do site   | push numa branch ou merge na `main`    | Vercel: preview por branch, produção pela `main`   |
| Conteúdo do site | a autora publica no Studio             | Vercel: rebuild de produção pelo deploy hook (#17) |
| Studio           | `pnpm studio:deploy` ou push na `main` | Sanity: https://ronrom.sanity.studio               |

## Código: preview e produção

1. **Push numa branch ou PR:** a Vercel builda um **preview** e comenta o link no PR. Os previews ficam atrás da Vercel Authentication: abra logado na conta do dono.
2. **Merge na `main`** (squash): a Vercel builda e publica em **produção**, em https://ronrom-blog.vercel.app.
3. **Ignored Build Step:** se desde o último deploy da branch só mudaram `docs/`, `studio/`, `.github/` ou arquivos `.md`, o deploy termina como `CANCELED` em segundos, sem build ([`scripts/vercel-ignorar-build.sh`](../scripts/vercel-ignorar-build.sh)). Ele ainda conta na cota diária de deploys.

Install, build, Ignored Build Step e região ficam em [`web/vercel.json`](../web/vercel.json), que tem prioridade sobre o painel.

Os builds do Hobby rodam um de cada vez: com vários pushes seguidos, os deploys esperam na fila (`QUEUED`).

### Conferir um deploy

A rota de fumaça devolve o commit que está no ar:

```bash
curl -s https://ronrom-blog.vercel.app/api/health
```

O `commit` da resposta tem que ser o hash do merge na `main` (`git log -1 --format=%H origin/main`). Num preview, abra `/api/health` no navegador logado na Vercel. Mais verificações (cabeçalhos, cache das páginas estáticas) em [`ambientes.md`](ambientes.md#conferir-em-produção).

### Deploy com erro ou bloqueado

- **Build com erro:** a Vercel manda e-mail para o dono e mantém no ar o último deploy bom. Abra o deploy no painel, leia o log do build e reproduza com `pnpm build` local. O CI do PR costuma pegar o mesmo erro antes.
- **Bloqueado pelo autor do commit:** o e-mail do commit não é o do dono. Veja [como corrigir](desenvolvimento.md#deploy-bloqueado-pelo-autor-do-commit).
- **Refazer o mesmo commit:** no painel, abra o deploy e use **Redeploy**. Serve para deploy bloqueado, falha passageira ou variável de ambiente alterada (variável nova só vale a partir do próximo build).

### Voltar uma versão (rollback)

Quando um deploy de produção quebra o site, há dois caminhos:

1. **Reverter o código (preferível):** abra um PR com `git revert` do commit problemático e faça o merge. A `main` volta a refletir o que está no ar.
2. **Instant Rollback (emergência):** no painel, em Deployments, use **Instant Rollback**. No Hobby, só dá para voltar para o deploy de produção **imediatamente anterior**. Depois do rollback, a Vercel **desliga a promoção automática**: merges novos na `main` não vão para produção até alguém usar **Undo Rollback** (ou promover um deploy) no painel. Por isso, depois de corrigir, desfaça o rollback.

Documentação: [Instant Rollback](https://vercel.com/docs/instant-rollback), conferida em 29/10/2026.

## Conteúdo: rebuild ao publicar

O site é estático: um post novo só aparece depois de um build de produção. A decisão de usar um deploy hook para isso, e não renderização sob demanda, está no [ADR 0005](adr/0005-rebuild-por-deploy-hook.md).

> **Pendente.** O hook é criado na #17 e o webhook do Sanity na #27. Até lá, conteúdo novo só entra no ar com um **Redeploy** manual da produção ou com o próximo merge na `main`. A #17 completa esta seção com o tempo medido, o workflow de rebuild diário e o passo a passo de disparo manual.

Fluxo planejado:

1. A autora publica, edita ou exclui um documento no dataset `production`. Rascunhos e o dataset `development` não disparam nada.
2. O webhook GROQ do Sanity (#27) faz um `POST` na URL do Deploy Hook da Vercel (#17), que aponta para a `main`.
3. A Vercel builda a `main` com o conteúdo novo e publica em produção.
4. Um workflow diário do GitHub Actions chama o mesmo hook, como rede de segurança se algum webhook falhar.

Limites do Deploy Hook ([docs](https://vercel.com/docs/deploy-hooks), conferidos em 29/10/2026): até 5 hooks por projeto no Hobby e até 60 disparos por hora no projeto. Vários disparos seguidos para o mesmo commit cancelam os deploys anteriores daquele hook, então uma sequência de publicações vira um build só. Cada disparo conta na cota de 100 deploys por dia.

**Atenção para a #17:** um deploy pelo hook rebuilda o mesmo commit que já está no ar. Se o Ignored Build Step comparar o commit com ele mesmo, não vai achar mudança e vai cancelar o build. A #17 precisa testar isso e, se for o caso, fazer o script seguir com o build quando não houver commit novo.

### Rotacionar a URL do hook

A URL do hook é um segredo: qualquer um com ela dispara deploys de produção e gasta a cota. Ela fica só no webhook do Sanity e no secret `VERCEL_DEPLOY_HOOK_URL` do GitHub, nunca no código. Se vazar:

1. Na Vercel, em Settings → Git → Deploy Hooks, crie um hook novo para a `main` e apague o antigo (a Vercel não regenera a URL de um hook existente).
2. Atualize a URL no webhook do Sanity (sanity.io/manage → API → Webhooks).
3. Atualize o secret `VERCEL_DEPLOY_HOOK_URL` em Settings → Secrets and variables → Actions.
4. Publique algo no Studio e confira se o deploy saiu.

## Studio

O Studio não passa pela Vercel: é publicado pelo Sanity em https://ronrom.sanity.studio, com `pnpm studio:deploy` (pede `sanity login` ou `SANITY_AUTH_TOKEN`). A #12 automatiza o deploy em push na `main` que mude `studio/`. Detalhes em [`studio/README.md`](../studio/README.md).

Uma mudança só no Studio não gera build do site (o Ignored Build Step pula `studio/`). Se um schema novo mudar o que o site consulta, o PR precisa mudar também o código em `web/`, e aí o site builda normalmente.
