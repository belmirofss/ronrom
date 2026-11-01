# Deploy

Como uma mudança chega ao ar, como conferir e o que fazer quando algo dá errado. A configuração do projeto na Vercel, os limites do Hobby e as variáveis de ambiente estão em [`ambientes.md`](ambientes.md).

São caminhos independentes:

| O que muda          | Gatilho                                   | Onde vai ao ar                                                                                    |
| ------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Código do site      | push numa branch ou merge na `main`       | Vercel: preview por branch, produção pela `main`                                                  |
| Conteúdo do site    | a autora publica no Studio                | Vercel: rebuild de produção pelo deploy hook                                                      |
| Studio              | `pnpm studio:deploy` ou push na `main`    | Sanity: https://ronrom.sanity.studio                                                              |
| Prévia de rascunhos | merge na `main` (lê os rascunhos na hora) | Vercel: https://ronrom-previa.vercel.app ([veja](ambientes.md#prévia-de-rascunhos-ronrom-previa)) |

## Código: preview e produção

1. **Push numa branch ou PR:** a Vercel builda um **preview** e comenta o link no PR. Os previews ficam atrás da Vercel Authentication: abra logado na conta do dono.
2. **Merge na `main`** (squash): a Vercel builda e publica em **produção**, em https://ronrom.blog.
3. **Ignored Build Step:** num preview, se desde o último deploy da branch só mudaram `docs/`, `studio/`, `.github/` ou arquivos `.md`, o deploy termina como `CANCELED` em segundos, sem build ([`scripts/vercel-ignorar-build.sh`](../scripts/vercel-ignorar-build.sh)). Ele ainda conta na cota diária de deploys. **Produção sempre builda**, mesmo num merge só de docs, para não cancelar o rebuild de conteúdo pelo deploy hook ([veja abaixo](#por-que-a-produção-não-pula-o-build)).

Install, build, Ignored Build Step e região ficam em [`web/vercel.json`](../web/vercel.json), que tem prioridade sobre o painel.

Os builds do Hobby rodam um de cada vez: com vários pushes seguidos, os deploys esperam na fila (`QUEUED`).

### Conferir um deploy

A rota de fumaça devolve o commit que está no ar:

```bash
curl -s https://ronrom.blog/api/health
```

O `commit` da resposta tem que ser o hash do merge na `main` (`git log -1 --format=%H origin/main`). Num preview, abra `/api/health` no navegador logado na Vercel. Mais verificações (cabeçalhos, cache das páginas estáticas) em [`ambientes.md`](ambientes.md#conferir-em-produção) e, para os cabeçalhos de segurança e a CSP, em [`cabecalhos.md`](cabecalhos.md#conferir).

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

### Fluxo

1. A autora publica, edita ou exclui um documento no dataset `production`. Rascunhos e o dataset `development` não disparam nada.
2. O [webhook GROQ do Sanity](#o-webhook-no-sanity) faz um `POST` na URL do Deploy Hook `sanity-publish` da Vercel, que aponta para a `main`.
3. A Vercel responde na hora com um job `PENDING` e enfileira um deploy de **produção** do último commit da `main`. Na lista de Deployments, ele aparece marcado como disparado pelo hook.
4. O build busca o conteúdo atual do Sanity, gera as páginas e publica. O que estava no ar continua no ar até o build terminar; se o build falhar, nada muda e a Vercel manda e-mail para o dono.
5. Todo dia às 04:17 (horário de Brasília), o workflow [`rebuild-diario.yml`](../.github/workflows/rebuild-diario.yml) chama o mesmo hook, como rede de segurança se algum webhook falhar.

**Tempo esperado:** cerca de **25 segundos** entre o clique em **Publicar** e a mudança no ar (medido em 30/10/2026 publicando uma categoria, com o site ainda sem posts). O Sanity chama o hook no mesmo segundo, a Vercel leva uns 6 segundos para responder e o build leva de 14 a 17 segundos. O tempo cresce com o número de posts. Se a fila tiver outro build na frente (o Hobby builda um de cada vez), soma o tempo dele. Se passar de alguns minutos, reavalie a decisão do [ADR 0005](adr/0005-rebuild-por-deploy-hook.md). Para medir de novo, veja [conferir o webhook](#conferir-o-webhook).

### O hook na Vercel

| Campo  | Valor                                                     |
| ------ | --------------------------------------------------------- |
| Nome   | `sanity-publish`                                          |
| Branch | `main`                                                    |
| Onde   | Vercel → projeto `ronrom` → Settings → Git → Deploy Hooks |

A URL do hook fica em dois lugares, e só neles: no [webhook do Sanity](#o-webhook-no-sanity) e no secret **`VERCEL_DEPLOY_HOOK_URL`** do GitHub (Settings → Secrets and variables → Actions), usado pelo rebuild diário. Ela nunca vai para o código, para uma issue ou para um PR. Para cadastrar ou trocar o secret, cole a URL quando o comando pedir (assim ela não fica no histórico do terminal):

```bash
gh secret set VERCEL_DEPLOY_HOOK_URL
```

Limites ([deploy hooks](https://vercel.com/docs/deploy-hooks) e [limits](https://vercel.com/docs/limits), conferidos em 29/10/2026):

- Até **5 hooks por projeto** no Hobby. Hoje existe um só; crie outro só se surgir outra fonte de dados.
- Até **60 disparos por hora** no projeto, somando todos os hooks.
- Cada disparo é um deploy e conta na cota de **100 deploys por dia** (e 60 a cada 5 minutos), junto com os pushes e os previews.
- **Um build de cada vez:** um disparo durante outro build espera na fila (`QUEUED`).
- Vários disparos seguidos para o mesmo commit **cancelam os deploys anteriores daquele hook**, então uma rajada de edições na publicação vira um build só.

A documentação da Vercel não diz o que acontece com um disparo acima do limite. Há relatos de hooks ficando `PENDING` sem nunca buildar depois de estourar a cota. Se um post publicado não aparecer, veja se o deploy existe na lista de Deployments; se não existir, a cota do dia pode ter acabado (ela volta em 24 horas, e um [disparo manual](#disparar-um-rebuild-à-mão) resolve depois disso).

### O webhook no Sanity

Fica em sanity.io/manage → projeto "Ronrom" → API → Webhooks. Ele não é versionado: os valores abaixo são a fonte da verdade, e qualquer mudança no painel deve vir para esta tabela.

| Campo        | Valor                                                                              |
| ------------ | ---------------------------------------------------------------------------------- |
| Name         | `vercel-rebuild-producao`                                                          |
| Description  | `Rebuild de produção na Vercel ao publicar (docs/deploy.md)`                       |
| URL          | a URL do Deploy Hook `sanity-publish` (a mesma do secret `VERCEL_DEPLOY_HOOK_URL`) |
| Dataset      | `production`                                                                       |
| Trigger on   | Create, Update e Delete                                                            |
| Filter       | `_type in ["post", "categoria", "formato", "configuracoes", "sobre"]`              |
| Projection   | `{_id, _type}`                                                                     |
| Status       | habilitado                                                                         |
| HTTP method  | `POST`                                                                             |
| HTTP headers | nenhum                                                                             |
| API version  | `v2025-02-19`                                                                      |
| Drafts       | desligado                                                                          |
| Versions     | desligado                                                                          |
| Secret       | vazio                                                                              |

Por que assim:

- **Dataset `production`:** só ele. O `development` nunca dispara deploy de produção.
- **Drafts e Versions desligados:** o Sanity ignora os IDs `drafts.*` e `versions.*`, então salvar um rascunho não dispara nada. Com eles ligados, quase toda tecla no Studio viraria um deploy.
- **Create, Update e Delete:** publicar um documento novo é um create; publicar uma edição, um update; despublicar ou excluir um publicado, um delete.
- **Filter:** só os tipos que o site mostra. Upload de imagem (`sanity.imageAsset`) e documentos internos do Sanity não disparam build. Um tipo novo que o site passe a mostrar precisa entrar neste filtro (o [`schemaTypes/index.ts`](../studio/schemaTypes/index.ts) lembra disso).
- **Projection `{_id, _type}`:** a Vercel ignora o corpo do `POST`. Com a projeção vazia o Sanity mandaria o documento inteiro, que não precisa sair dali.
- **Sem secret:** a Vercel não confere assinatura. Quem protege o hook é a própria URL ([rotação](#rotacionar-a-url-do-hook)).

Limites e comportamento ([pricing](https://www.sanity.io/pricing) e [webhooks](https://www.sanity.io/docs/webhooks), conferidos em 29/10/2026):

- O plano Free permite **2 webhooks GROQ** por projeto (o Growth, 4). Este é o primeiro; sobra um.
- Um pedido de cada vez por webhook, com timeout de 30 segundos. Resposta `2xx` é sucesso; `429` e `5xx` são tentados de novo **duas vezes, com 30 segundos de intervalo**; outro `4xx` é dado como não entregue e não volta a ser tentado. Se as três tentativas falharem, o [rebuild diário](#fluxo) cobre a mudança.
- Cada documento alterado gera uma entrega. Publicar vários documentos de uma vez (rodar a taxonomia em `production`, por exemplo) dispara vários deploys seguidos: a Vercel cancela os anteriores e builda um só, mas todos contam no limite de 60 disparos por hora do hook.

Para criar, com a URL do hook à mão (Vercel → Settings → Git → Deploy Hooks): em API → Webhooks → **Create webhook**, preencha os campos da tabela e salve. Confira depois, em **Edit webhook**, se Create, Update e Delete ficaram marcados: só com Create, um post novo vai ao ar, mas edições e despublicações não. Para conferir pela CLI, da raiz, com `sanity login` feito e `SANITY_STUDIO_PROJECT_ID` no `studio/.env`:

```bash
pnpm --filter studio sanity hooks list
```

A saída mostra a URL completa do hook: não cole em issue, PR ou print. Ela não mostra o filtro, os eventos nem os interruptores de rascunho; esses só aparecem no painel.

### Conferir o webhook

Os três critérios, no Studio publicado (dataset `production`):

1. **Publicar dispara deploy:** edite e publique um documento. Em segundos aparece um deploy novo de produção na lista de Deployments da Vercel, marcado como disparado pelo hook. Depois do build, a mudança está no ar, sem commit nenhum.
2. **Rascunho não dispara:** edite sem publicar. Nenhum deploy novo aparece, e o webhook não ganha tentativa nova.
3. **`development` não dispara:** publique algo pelo `pnpm studio:dev` (dataset `development`). Nenhum deploy novo aparece.

**Histórico de entregas:**

- **No painel:** API → Webhooks → menu de três pontos do webhook → **Show attempt log**. Abre em outra aba a lista das tentativas, a mais recente primeiro: `resultCode` (a Vercel responde `201`), `duration`, `isFailure` e a resposta da Vercel com o `job` em `PENDING`. Lista vazia (`[]`) quer dizer que nada disparou o webhook.
- **Na Vercel:** Deployments → o deploy novo de produção mostra **Created: Deploy Hook**.
- **Pela CLI** (da raiz, com `sanity login` feito e `SANITY_STUDIO_PROJECT_ID` no `studio/.env`):

  ```bash
  pnpm --filter studio sanity hooks logs vercel-rebuild-producao --detailed
  ```

  O `sanity hooks attempt <id>` mostra os detalhes de uma tentativa.

**Medir o tempo:** anote a hora do clique em **Publicar**, a do deploy na lista de Deployments (entrega do webhook) e a do `Ready` (no ar). A diferença total é o número de [tempo esperado](#fluxo); atualize-o quando ele mudar de ordem de grandeza.

### Disparar um rebuild à mão

Qualquer um dos três:

- **GitHub Actions** (não precisa da URL): Actions → **rebuild-diario** → **Run workflow**, ou

  ```bash
  gh workflow run rebuild-diario.yml
  ```

- **Painel da Vercel:** Deployments → o deploy de produção atual → **Redeploy**. Deixe marcado **Use project's Ignore Build Step** (produção sempre builda).
- **Direto no hook** (só quem tem a URL): `curl -X POST "<url-do-hook>"`. A resposta é `{"job":{"id":"…","state":"PENDING",…}}`.

Para conferir: na lista de Deployments da Vercel, o deploy novo deve terminar como `Ready` (não `Canceled`). O `/api/health` continua mostrando o mesmo `commit`, porque o código não mudou; o que muda é o conteúdo das páginas.

### Por que a produção não pula o build

O deploy pelo hook rebuilda o commit que já está no ar, e a Vercel não diz ao Ignored Build Step que o deploy veio de um hook (nenhuma [variável de sistema](https://vercel.com/docs/environment-variables/system-environment-variables) indica isso, conferido em 29/10/2026). Comparar os commits cancelaria o build em dois casos:

- **Mesmo commit:** o último deploy bom da `main` é o próprio commit, então o diff fica vazio.
- **Só docs desde o último deploy bom:** um merge só de docs na `main` termina `CANCELED` e não conta como deploy bom. O hook rebuilda esse commit, o diff contra o último deploy bom só acha docs, e o build seria cancelado de novo, até o próximo merge que mexesse no site.

Por isso o [`vercel-ignorar-build.sh`](../scripts/vercel-ignorar-build.sh) segue com o build sempre que `VERCEL_ENV` é `production`, e só compara commits nos previews. O custo é um build de produção a cada merge só de docs, que leva segundos e já contava na cota como deploy cancelado.

### Rotacionar a URL do hook

A URL do hook é um segredo: qualquer um com ela dispara deploys de produção e gasta a cota. Se ela vazar (num print, num log, numa issue), troque-a:

1. Na Vercel, em Settings → Git → Deploy Hooks, crie um hook novo `sanity-publish` para a `main` e apague o antigo. A Vercel não gera uma URL nova para um hook que já existe.
2. Atualize a URL no webhook do Sanity (sanity.io/manage → projeto → API → Webhooks).
3. Atualize o secret com `gh secret set VERCEL_DEPLOY_HOOK_URL` (ou em Settings → Secrets and variables → Actions).
4. Rode o `rebuild-diario` à mão e confira se o deploy saiu `Ready`. Depois publique algo no Studio e confira se ele aparece no ar.

## Studio

O Studio não passa pela Vercel: é publicado pelo Sanity em https://ronrom.sanity.studio, com `pnpm studio:deploy` (pede `sanity login` ou `SANITY_AUTH_TOKEN`). A #12 automatiza o deploy em push na `main` que mude `studio/`. Detalhes em [`studio/README.md`](../studio/README.md).

Uma mudança só no Studio não gera build de preview do site (o Ignored Build Step pula `studio/`); o merge na `main` builda a produção, que [nunca pula o build](#por-que-a-produção-não-pula-o-build), mas o site sai igual. Se um schema novo mudar o que o site consulta, o PR precisa mudar também o código em `web/`, e aí o site builda normalmente.
