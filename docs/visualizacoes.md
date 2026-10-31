# Contador de visualizações

O "Mais lidos" (#57) ordena os posts pelo total de visualizações de todo o tempo (decidido na #1). Quem conta é a rota sob demanda [`/api/views`](../web/src/pages/api/views.ts) (#56), que grava num Upstash Redis instalado pelo Marketplace da Vercel. Não há chave por dia nem por mês: um único ranking.

## Como uma visualização é contada

1. A página do post traz o [`RegistroDeVisualizacao`](../web/src/components/post/RegistroDeVisualizacao.astro), com o `_id` do post.
2. Depois de **5 segundos com a aba visível** (trocar de aba pausa a contagem), o script manda `{"id":"<_id>"}` para `POST /api/views` com `navigator.sendBeacon` e marca o post no `sessionStorage`. Na mesma aba, o post não é mandado de novo. Sem JS, nada é contado.
3. A rota ([`registrar.ts`](../web/src/lib/views/registrar.ts)) descarta, sem tocar no Redis:
   - qualquer deploy que não seja o de produção (`VERCEL_ENV` diferente de `production`): previews, testes E2E e `pnpm dev`;
   - requisições sem `User-Agent` ou com um `User-Agent` de bot, segundo o [`isbot`](https://github.com/omrilotan/isbot) (inclui `curl`);
   - um `id` fora da lista de posts publicados, que é gerada no build e embutida na função ([`ids-publicados.ts`](../web/src/lib/sanity/ids-publicados.ts)). Um post novo só conta depois do rebuild que o publica.
4. Para não contar a mesma pessoa duas vezes: `SET seen:{sha256(ip|ua|id|sal)} 1 NX EX 1800`. O sal é o token do Upstash mais o dia em São Paulo, então o IP nunca fica em claro e o hash não pode ser revertido testando todos os IPs. A chave expira em 30 minutos. Na virada do dia o sal muda, e quem estiver relendo um post à meia-noite pode contar de novo.
5. Se o `SET` criou a chave (visualização nova): `ZINCRBY views:all 1 <_id>`.

A resposta é **sempre `204`**, sem corpo e com `Cache-Control: no-store`, conte ou não. Um erro do Redis (fora do ar, cota estourada) vai para o log da função com o prefixo `[views]` e a visualização se perde; a página não percebe. Uma requisição cross-site com `Content-Type` de formulário (como `text/plain`, que é o que o `sendBeacon` manda) recebe `403` do próprio Astro (`security.checkOrigin`), antes de chegar à rota.

A rota fala com a API REST do Upstash direto, com `fetch`, sem o `@upstash/redis`: são só dois comandos.

## Custo

| Recurso                             | Por visualização                 | Cota grátis                             | Margem                             |
| ----------------------------------- | -------------------------------- | --------------------------------------- | ---------------------------------- |
| Comandos do Upstash                 | 2 se nova, 1 se repetida         | 500 mil/mês, 256 MB, 1 banco            | cerca de 250 mil visualizações/mês |
| Invocações de função (Vercel Hobby) | 1 por beacon, inclusive de bots  | 1 milhão/mês, junto com as outras rotas | sobra bem mais que a do Upstash    |
| Memória do Redis                    | uma chave `seen:` por 30 minutos | 256 MB                                  | o ranking tem uma entrada por post |

Cota do Upstash conferida em [upstash.com/pricing/redis](https://upstash.com/pricing/redis); confira no painel se o plano grátis pelo Marketplace é o mesmo e se há arquivamento por inatividade. Se a cota estourar, o Upstash recusa os comandos, a rota registra o erro no log e o site segue normal; só o ranking para de subir até o mês virar.

## Provisionar o Upstash (dono do repositório)

1. No painel da Vercel, projeto `ronrom` → **Storage** → **Create Database** → **Upstash for Redis** (Marketplace).
2. Plano **Free**, região **São Paulo (`sa-east-1`)**, perto das functions em `gru1` (`web/vercel.json`). Se a região não estiver disponível, use `us-east-1` e mude `regions` para `iad1`, para a função ficar perto do banco.
3. Ligue o banco ao projeto `ronrom` só no ambiente **Production**: os previews não contam, então não precisam do banco.
4. Confira em **Settings → Environment Variables** que a integração criou `KV_REST_API_URL` e `KV_REST_API_TOKEN`, os nomes do schema em [`web/astro.config.mjs`](../web/astro.config.mjs). Se vierem com outro nome, renomeie no schema, no [`web/.env.example`](../web/.env.example) e no [`ambientes.md`](ambientes.md#onde-vive-cada-variável).
5. Faça um redeploy da produção, para a função ler as variáveis.

Sem as duas variáveis, a rota segue respondendo `204` e não grava nada.

## Conferir em produção

No console do Upstash (aba **Data Browser** ou **CLI**), com o `_id` de um post:

1. Abra o post numa aba anônima e espere 5 segundos. No DevTools (aba Network), aparece o `POST /api/views` com `204`. `ZSCORE views:all <_id>` sobe 1.
2. Recarregue o post: não há outro beacon (o `sessionStorage` já marcou). Numa aba anônima nova, dentro de 30 minutos, o beacon sai mas o `ZSCORE` não muda.
3. Um bot e um `id` inválido não gravam nada (o `ZSCORE` não muda):

   ```bash
   curl -i -X POST https://ronrom-blog.vercel.app/api/views -H 'Content-Type: application/json' -A 'Googlebot/2.1' -d '{"id":"<_id>"}'
   ```

   ```bash
   curl -i -X POST https://ronrom-blog.vercel.app/api/views -H 'Content-Type: application/json' -A 'Mozilla/5.0' -d '{"id":"nao-existe"}'
   ```

Para ver o ranking inteiro: `ZRANGE views:all 0 -1 REV WITHSCORES`.
